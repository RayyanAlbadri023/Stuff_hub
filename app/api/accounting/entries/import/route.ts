import { NextResponse, NextRequest } from "next/server";
import db from "@/app/lib/db";
import { isBalanced, type JournalLine } from "@/app/lib/accounting";

interface ImportRow {
  [key: string]: unknown;
}

function pick(row: ImportRow, keys: string[]): string {
  for (const k of keys) {
    if (row[k] !== undefined && row[k] !== null && String(row[k]).trim() !== "") return String(row[k]).trim();
  }
  return "";
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rows: ImportRow[] = Array.isArray(body.rows) ? body.rows : [];

    const accSnap = await db.ref("accounting/accounts").once("value");
    const codeToId = new Map<string, string>();
    accSnap.forEach((child) => {
      const d = child.val();
      if (d.code) codeToId.set(String(d.code), child.key as string);
    });

    // Consecutive rows sharing the same date + description are one journal entry
    // (this is exactly how the export lays lines out, so a re-uploaded export round-trips).
    interface Group { date: string; description: string; lines: JournalLine[]; firstRow: number }
    const groups: Group[] = [];
    const skipped: { row: number; reason: string }[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const date = pick(row, ["date", "Date"]);
      const description = pick(row, ["description", "Description"]);
      const accountCode = pick(row, ["accountCode", "AccountCode", "Account Code", "account", "Account"]);
      const debit = Number(pick(row, ["debit", "Debit"])) || 0;
      const credit = Number(pick(row, ["credit", "Credit"])) || 0;
      if (!date || !description) { skipped.push({ row: i + 1, reason: "Missing date/description" }); continue; }
      const accountId = codeToId.get(accountCode);
      if (!accountId) { skipped.push({ row: i + 1, reason: `Unknown account code: ${accountCode}` }); continue; }
      if (debit <= 0 && credit <= 0) { skipped.push({ row: i + 1, reason: "Missing debit/credit" }); continue; }

      const last = groups[groups.length - 1];
      if (last && last.date === date && last.description === description) {
        last.lines.push({ accountId, debit, credit });
      } else {
        groups.push({ date, description, lines: [{ accountId, debit, credit }], firstRow: i + 1 });
      }
    }

    let createdCount = 0;
    for (const g of groups) {
      if (!isBalanced(g.lines)) {
        skipped.push({ row: g.firstRow, reason: "Unbalanced entry (debits ≠ credits)" });
        continue;
      }
      const record = {
        date: g.date,
        description: g.description,
        lines: g.lines,
        fileData: "",
        fileName: "",
        createdAt: new Date().toISOString(),
      };
      await db.ref("accounting/entries").push(record);
      createdCount++;
    }

    return NextResponse.json({ createdCount, skipped });
  } catch (err) {
    return NextResponse.json({ message: String(err) }, { status: 500 });
  }
}
