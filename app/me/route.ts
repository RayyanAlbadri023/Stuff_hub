import { NextResponse } from "next/server";
import db from "@/app/lib/db";
import { RowDataPacket } from "mysql2";

type UserRow = RowDataPacket & {
  id: number;
  firstName: string;
  email: string;
  role: string;
};

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "No id provided" }, { status: 400 });
    }

    if (!/^\d+$/.test(id)) {
      return NextResponse.json({ error: "Invalid id format" }, { status: 400 });
    }

    const [rows] = await db.query<UserRow[]>(
      "SELECT id, firstName, email, role FROM users WHERE id = ? LIMIT 1",
      [Number(id)]
    );

    const foundUser = rows[0];

    if (!foundUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      firstName: foundUser.firstName,
      email: foundUser.email,
      role: foundUser.role,
    });
  } catch (err) {
    console.error("/api/me error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
