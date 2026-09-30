import { NextResponse, NextRequest } from "next/server";
import db from "@/app/lib/db";
import { isValidAccountType } from "@/app/lib/accounting";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    if (!body.code || !String(body.code).trim()) {
      return NextResponse.json({ message: "Account code is required" }, { status: 400 });
    }
    if (!body.name || !String(body.name).trim()) {
      return NextResponse.json({ message: "Account name is required" }, { status: 400 });
    }
    if (!isValidAccountType(body.type)) {
      return NextResponse.json({ message: "Invalid account type" }, { status: 400 });
    }
    const record = {
      code: String(body.code).trim(),
      name: String(body.name).trim(),
      type: body.type,
      parentId: body.parentId ? String(body.parentId) : "",
    };
    await db.ref(`accounting/accounts/${id}`).update(record);
    return NextResponse.json({ id, ...record });
  } catch (err) {
    return NextResponse.json({ message: String(err) }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await db.ref(`accounting/accounts/${id}`).remove();
    return NextResponse.json({ message: "Deleted" });
  } catch (err) {
    return NextResponse.json({ message: String(err) }, { status: 500 });
  }
}
