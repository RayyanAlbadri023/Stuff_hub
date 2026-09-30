import { NextResponse, NextRequest } from "next/server";
import db from "@/app/lib/db";
import { isValidFinanceType } from "@/app/lib/finance";

// Matches the Shared Files upload limit: ~8MB raw file, ~1.4x for base64 overhead.
const MAX_FILE_DATA_LENGTH = 8 * 1024 * 1024 * 1.4;

export async function PUT(req: NextRequest, { params }: { params: Promise<{ type: string; id: string }> }) {
  try {
    const { type, id } = await params;
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
    // Only update fields present in the record shape — createdAt is left untouched.
    const record = {
      name: String(body.name).trim(),
      amount: Number(body.amount) || 0,
      date: String(body.date),
      category: body.category ? String(body.category) : "",
      status: body.status ? String(body.status) : "",
      ref: body.ref ? String(body.ref) : "",
      note: body.note ? String(body.note) : "",
      endDate: body.endDate ? String(body.endDate) : "",
      paymentDate: body.paymentDate ? String(body.paymentDate) : "",
      fileData: body.fileData ? String(body.fileData) : "",
      fileName: body.fileName ? String(body.fileName) : "",
      bankGuaranteeData: body.bankGuaranteeData ? String(body.bankGuaranteeData) : "",
      bankGuaranteeName: body.bankGuaranteeName ? String(body.bankGuaranteeName) : "",
    };
    await db.ref(`finance/${type}/${id}`).update(record);
    return NextResponse.json({ id, ...record });
  } catch (err) {
    return NextResponse.json({ message: String(err) }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ type: string; id: string }> }) {
  try {
    const { type, id } = await params;
    if (!isValidFinanceType(type)) {
      return NextResponse.json({ message: "Unknown finance record type" }, { status: 400 });
    }
    await db.ref(`finance/${type}/${id}`).remove();
    return NextResponse.json({ message: "Deleted" });
  } catch (err) {
    return NextResponse.json({ message: String(err) }, { status: 500 });
  }
}
