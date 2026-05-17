import { NextResponse, NextRequest } from "next/server";
import db from "@/app/lib/db";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { status, source } = await req.json();

    if (!["approved", "rejected"].includes(status)) {
      return NextResponse.json({ message: "Invalid status" }, { status: 400 });
    }

    const table = source === "vacation" ? "vacations" : "requests";
    await db.query(`UPDATE ${table} SET status = ? WHERE id = ?`, [status, id]);

    return NextResponse.json({ message: "Updated" });
  } catch (err) {
    return NextResponse.json({ message: "Error updating" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // Try both tables
    await db.query("DELETE FROM requests WHERE id = ?", [id]).catch(() => {});
    await db.query("DELETE FROM vacations WHERE id = ?", [id]).catch(() => {});
    return NextResponse.json({ message: "Deleted" });
  } catch (err) {
    return NextResponse.json({ message: "Error deleting" }, { status: 500 });
  }
}
