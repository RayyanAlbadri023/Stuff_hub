import { NextResponse, NextRequest } from "next/server";
import db from "@/app/lib/db";
import { RowDataPacket } from "mysql2";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { email, role } = await req.json();

    await db.query(
      "UPDATE users SET email = ?, role = ? WHERE id = ?",
      [email, role, id]
    );

    const [rows] = await db.query<RowDataPacket[]>(
      "SELECT id, firstName, email, role FROM users WHERE id = ?",
      [id]
    );

    return NextResponse.json((rows as RowDataPacket[])[0]);
  } catch (err) {
    return NextResponse.json({ message: "Error updating user" }, { status: 500 });
  }
}
