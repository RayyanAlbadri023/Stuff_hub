import { NextResponse, NextRequest } from "next/server";
import db from "@/app/lib/db";
import { canAccessSection } from "@/app/lib/fileSections";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { requesterEmail } = await req.json().catch(() => ({}));

    const snap = await db.ref(`sharedFiles/${id}`).once("value");
    const file = snap.val();
    if (!file) {
      return NextResponse.json({ message: "File not found" }, { status: 404 });
    }

    const isOwner = requesterEmail && file.uploadedByEmail === requesterEmail;
    // Sections are isolated, so an admin/manager role alone is no longer
    // enough to delete someone else's file — the requester must actually
    // belong to that file's section (or hold the super-access email).
    const hasSectionAccess = canAccessSection(requesterEmail, file.section || "general");
    if (!isOwner && !hasSectionAccess) {
      return NextResponse.json({ message: "Not allowed to delete this file" }, { status: 403 });
    }

    await db.ref(`sharedFiles/${id}`).remove();
    return NextResponse.json({ message: "Deleted" });
  } catch (err) {
    return NextResponse.json({ message: String(err) }, { status: 500 });
  }
}
