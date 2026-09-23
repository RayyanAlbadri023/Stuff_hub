import { NextResponse, NextRequest } from "next/server";
import db from "@/app/lib/db";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { requesterEmail, requesterRole } = await req.json().catch(() => ({}));

    const snap = await db.ref(`sharedFiles/${id}`).once("value");
    const file = snap.val();
    if (!file) {
      return NextResponse.json({ message: "File not found" }, { status: 404 });
    }

    const isOwner = requesterEmail && file.uploadedByEmail === requesterEmail;
    const isAdminOrManager = requesterRole === "admin" || requesterRole === "manager";
    if (!isOwner && !isAdminOrManager) {
      return NextResponse.json({ message: "Not allowed to delete this file" }, { status: 403 });
    }

    await db.ref(`sharedFiles/${id}`).remove();
    return NextResponse.json({ message: "Deleted" });
  } catch (err) {
    return NextResponse.json({ message: String(err) }, { status: 500 });
  }
}
