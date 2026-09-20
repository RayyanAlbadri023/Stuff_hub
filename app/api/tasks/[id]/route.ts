import { NextResponse, NextRequest } from "next/server";
import db from "@/app/lib/db";

const VALID_STATUSES = ["task", "in_progress", "done"];

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { status } = await req.json();
    if (!VALID_STATUSES.includes(status))
      return NextResponse.json({ message: "Invalid status" }, { status: 400 });

    await db.ref(`tasks/${id}`).update({ status });
    return NextResponse.json({ message: "Updated" });
  } catch (err) {
    return NextResponse.json({ message: String(err) }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await db.ref(`tasks/${id}`).remove();
    return NextResponse.json({ message: "Deleted" });
  } catch (err) {
    return NextResponse.json({ message: String(err) }, { status: 500 });
  }
}
