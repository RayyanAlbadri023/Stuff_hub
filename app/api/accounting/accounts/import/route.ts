import { NextResponse, NextRequest } from "next/server";
import db from "@/app/lib/db";
import { isValidAccountType } from "@/app/lib/accounting";

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

    const snap = await db.ref("accounting/accounts").once("value");
    const codeToId = new Map<string, string>();
    snap.forEach((child) => {
      const d = child.val();
      if (d.code) codeToId.set(String(d.code), child.key as string);
    });

    const skipped: { row: number; reason: string }[] = [];
    const pending: { idx: number; code: string; name: string; type: string; parentCode: string }[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const code = pick(row, ["code", "Code", "Account Code"]);
      const name = pick(row, ["name", "Name", "Account Name"]);
      const type = pick(row, ["type", "Type", "Account Type"]).toLowerCase();
      const parentCode = pick(row, ["parentCode", "ParentCode", "Parent Code", "Parent"]);
      if (!code) { skipped.push({ row: i + 1, reason: "Missing code" }); continue; }
      if (!name) { skipped.push({ row: i + 1, reason: "Missing name" }); continue; }
      if (!isValidAccountType(type)) { skipped.push({ row: i + 1, reason: `Invalid type: ${type}` }); continue; }
      if (codeToId.has(code)) { skipped.push({ row: i + 1, reason: `Code already exists: ${code}` }); continue; }
      pending.push({ idx: i, code, name, type, parentCode });
    }

    // Pass 1: create every valid account first, so any of them can be used as a parent below.
    let createdCount = 0;
    for (const p of pending) {
      const record = { code: p.code, name: p.name, type: p.type, parentId: "", createdAt: new Date().toISOString() };
      const ref = await db.ref("accounting/accounts").push(record);
      codeToId.set(p.code, ref.key as string);
      createdCount++;
    }

    // Pass 2: link parents now that every code (existing + newly created) is known.
    for (const p of pending) {
      if (!p.parentCode) continue;
      const parentId = codeToId.get(p.parentCode);
      const ownId = codeToId.get(p.code);
      if (parentId && ownId) {
        await db.ref(`accounting/accounts/${ownId}`).update({ parentId });
      }
    }

    return NextResponse.json({ createdCount, skipped });
  } catch (err) {
    return NextResponse.json({ message: String(err) }, { status: 500 });
  }
}
