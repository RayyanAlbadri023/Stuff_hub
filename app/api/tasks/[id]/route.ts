import { NextResponse, NextRequest } from "next/server";
import db from "@/app/lib/db";

const VALID_STATUSES = ["task", "in_progress", "done"];

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const updates: Record<string, unknown> = {};

    if (body.status !== undefined) {
      if (!VALID_STATUSES.includes(body.status))
        return NextResponse.json({ message: "Invalid status" }, { status: 400 });
      updates.status = body.status;
    }
    if (body.title !== undefined) updates.title = body.title;
    if (body.description !== undefined) updates.description = body.description;
    if (body.startDate !== undefined) updates.startDate = body.startDate;
    if (body.endDate !== undefined) updates.endDate = body.endDate;

    if (Object.keys(updates).length === 0)
      return NextResponse.json({ message: "No valid fields to update" }, { status: 400 });

    await db.ref(`tasks/${id}`).update(updates);
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
