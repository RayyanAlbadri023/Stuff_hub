import { NextResponse, NextRequest } from "next/server";
import db from "@/app/lib/db";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await db.query("DELETE FROM users WHERE id = ?", [id]);
    return NextResponse.json({ message: "Deleted" });
  } catch (err) {
    return NextResponse.json({ message: "Error deleting user" }, { status: 500 });
  }
}
