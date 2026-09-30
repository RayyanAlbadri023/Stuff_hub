import { NextResponse, NextRequest } from "next/server";
import db from "@/app/lib/db";
import { isValidFinanceType, type FinanceRecord } from "@/app/lib/finance";

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
    const record = {
      name: String(body.name).trim(),
      amount: Number(body.amount) || 0,
      date: String(body.date),
      category: body.category ? String(body.category) : "",
      status: body.status ? String(body.status) : "",
      ref: body.ref ? String(body.ref) : "",
      note: body.note ? String(body.note) : "",
      createdAt: new Date().toISOString(),
    };
    const ref = await db.ref(`finance/${type}`).push(record);
    return NextResponse.json({ id: ref.key, ...record }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ message: String(err) }, { status: 500 });
  }
}
