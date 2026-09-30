import { NextResponse, NextRequest } from "next/server";
import db from "@/app/lib/db";
import { isBalanced, type JournalEntry, type JournalLine } from "@/app/lib/accounting";

// Matches the Shared Files upload limit: ~8MB raw file, ~1.4x for base64 overhead.
const MAX_FILE_DATA_LENGTH = 8 * 1024 * 1024 * 1.4;

function sanitizeLines(rawLines: unknown): JournalLine[] {
  if (!Array.isArray(rawLines)) return [];
  return rawLines
    .map((l) => {
      const r = l as Record<string, unknown>;
      return {
        accountId: String(r?.accountId || ""),
        debit: Number(r?.debit) || 0,
        credit: Number(r?.credit) || 0,
        note: r?.note ? String(r.note) : "",
      };
    })
    .filter((l) => l.accountId && (l.debit > 0 || l.credit > 0));
}

export async function GET() {
  try {
    const snap = await db.ref("accounting/entries").once("value");
    const entries: JournalEntry[] = [];
    snap.forEach((child) => {
      const d = child.val();
      entries.push({
        id: child.key as string,
        date: d.date || "",
        description: d.description || "",
        lines: Array.isArray(d.lines) ? d.lines : [],
        fileData: d.fileData || "",
        fileName: d.fileName || "",
        createdAt: d.createdAt || "",
      });
    });
    entries.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
    return NextResponse.json({ entries });
  } catch (err) {
    return NextResponse.json({ message: String(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.date) {
      return NextResponse.json({ message: "Date is required" }, { status: 400 });
    }
    if (!body.description || !String(body.description).trim()) {
      return NextResponse.json({ message: "Description is required" }, { status: 400 });
    }
    const lines = sanitizeLines(body.lines);
    if (lines.length < 2) {
      return NextResponse.json({ message: "At least two lines are required" }, { status: 400 });
    }
    if (!isBalanced(lines)) {
      return NextResponse.json({ message: "Debits must equal credits" }, { status: 400 });
    }
    if (body.fileData && String(body.fileData).length > MAX_FILE_DATA_LENGTH) {
      return NextResponse.json({ message: "Attachment is too large" }, { status: 400 });
    }
    const record = {
      date: String(body.date),
      description: String(body.description).trim(),
      lines,
      fileData: body.fileData ? String(body.fileData) : "",
      fileName: body.fileName ? String(body.fileName) : "",
      createdAt: new Date().toISOString(),
    };
    const ref = await db.ref("accounting/entries").push(record);
    return NextResponse.json({ id: ref.key, ...record }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ message: String(err) }, { status: 500 });
  }
}
