import { NextResponse, NextRequest } from "next/server";
import db from "@/app/lib/db";
import { isValidFinanceType } from "@/app/lib/finance";

interface ImportRow {
  [key: string]: unknown;
}

function pick(row: ImportRow, keys: string[]): string {
  for (const k of keys) {
    if (row[k] !== undefined && row[k] !== null && String(row[k]).trim() !== "") return String(row[k]).trim();
  }
  return "";
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ type: string }> }) {
  try {
    const { type } = await params;
    if (!isValidFinanceType(type)) {
      return NextResponse.json({ message: "Unknown finance record type" }, { status: 400 });
    }
    const body = await req.json();
    const rows: ImportRow[] = Array.isArray(body.rows) ? body.rows : [];

    let createdCount = 0;
    const skipped: { row: number; reason: string }[] = [];
    const ref = db.ref(`finance/${type}`);

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const name = pick(row, ["name", "Name"]);
      const date = pick(row, ["date", "Date"]);
      if (!name) { skipped.push({ row: i + 1, reason: "Missing name" }); continue; }
      if (!date) { skipped.push({ row: i + 1, reason: "Missing date" }); continue; }
      const record = {
        name,
        date,
        amount: Number(pick(row, ["amount", "Amount"])) || 0,
        category: pick(row, ["category", "Category"]),
        status: pick(row, ["status", "Status"]),
        ref: pick(row, ["ref", "Ref"]),
        note: pick(row, ["note", "Note"]),
        endDate: pick(row, ["endDate", "EndDate", "End Date"]),
        paymentDate: pick(row, ["paymentDate", "PaymentDate", "Payment Date"]),
        fileData: "",
        fileName: "",
        bankGuaranteeData: "",
        bankGuaranteeName: "",
        createdAt: new Date().toISOString(),
      };
      await ref.push(record);
      createdCount++;
    }

    return NextResponse.json({ createdCount, skipped });
  } catch (err) {
    return NextResponse.json({ message: String(err) }, { status: 500 });
  }
}
