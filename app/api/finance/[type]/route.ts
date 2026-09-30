import { NextResponse, NextRequest } from "next/server";
import db from "@/app/lib/db";
import { isValidFinanceType, type FinanceRecord } from "@/app/lib/finance";

// Matches the Shared Files upload limit: ~8MB raw file, ~1.4x for base64 overhead.
const MAX_FILE_DATA_LENGTH = 8 * 1024 * 1024 * 1.4;

export async function GET(_req: NextRequest, { params }: { params: Promise<{ type: string }> }) {
  try {
    const { type } = await params;
    if (!isValidFinanceType(type)) {
      return NextResponse.json({ message: "Unknown finance record type" }, { status: 400 });
    }
    const snap = await db.ref(`finance/${type}`).once("value");
    const records: FinanceRecord[] = [];
    snap.forEach((child) => {
      const d = child.val();
      records.push({
        id: child.key as string,
        name: d.name || "",
        amount: Number(d.amount) || 0,
        date: d.date || "",
        category: d.category || "",
        status: d.status || "",
        ref: d.ref || "",
        note: d.note || "",
        createdAt: d.createdAt || "",
        endDate: d.endDate || "",
        paymentDate: d.paymentDate || "",
        fileData: d.fileData || "",
        fileName: d.fileName || "",
        bankGuaranteeData: d.bankGuaranteeData || "",
        bankGuaranteeName: d.bankGuaranteeName || "",
      });
    });
    // Newest first.
    records.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
    return NextResponse.json({ records });
  } catch (err) {
    return NextResponse.json({ message: String(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ type: string }> }) {
  try {
    const { type } = await params;
    if (!isValidFinanceType(type)) {
      return NextResponse.json({ message: "Unknown finance record type" }, { status: 400 });
    }
    const body = await req.json();
    if (!body.name || !String(body.name).trim()) {
      return NextResponse.json({ message: "Name is required" }, { status: 400 });
    }
    if (!body.date) {
      return NextResponse.json({ message: "Date is required" }, { status: 400 });
    }
    if (body.fileData && String(body.fileData).length > MAX_FILE_DATA_LENGTH) {
      return NextResponse.json({ message: "Attachment is too large" }, { status: 400 });
    }
    if (body.bankGuaranteeData && String(body.bankGuaranteeData).length > MAX_FILE_DATA_LENGTH) {
      return NextResponse.json({ message: "Bank guarantee attachment is too large" }, { status: 400 });
    }
    const record = {
      name: String(body.name).trim(),
      amount: Number(body.amount) || 0,
      date: String(body.date),
      category: body.category ? String(body.category) : "",
      status: body.status ? String(body.status) : "",
      ref: body.ref ? String(body.ref) : "",
      note: body.note ? String(body.note) : "",
      createdAt: new Date().toISOString(),
      endDate: body.endDate ? String(body.endDate) : "",
      paymentDate: body.paymentDate ? String(body.paymentDate) : "",
      fileData: body.fileData ? String(body.fileData) : "",
      fileName: body.fileName ? String(body.fileName) : "",
      bankGuaranteeData: body.bankGuaranteeData ? String(body.bankGuaranteeData) : "",
      bankGuaranteeName: body.bankGuaranteeName ? String(body.bankGuaranteeName) : "",
    };
    const ref = await db.ref(`finance/${type}`).push(record);
    return NextResponse.json({ id: ref.key, ...record }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ message: String(err) }, { status: 500 });
  }
}
