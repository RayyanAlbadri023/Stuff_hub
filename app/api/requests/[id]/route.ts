import { NextResponse, NextRequest } from "next/server";
import db from "@/app/lib/db";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { status, source } = await req.json();
    if (!["approved", "rejected"].includes(status))
      return NextResponse.json({ message: "Invalid status" }, { status: 400 });

    const collection = source === "vacation" ? "vacations" : "requests";
    await db.ref(`${collection}/${id}`).update({ status });
    return NextResponse.json({ message: "Updated" });
  } catch (err) {
    return NextResponse.json({ message: String(err) }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await Promise.all([
      db.ref(`requests/${id}`).remove(),
      db.ref(`vacations/${id}`).remove(),
    ]);
    return NextResponse.json({ message: "Deleted" });
  } catch (err) {
    return NextResponse.json({ message: String(err) }, { status: 500 });
  }
}
