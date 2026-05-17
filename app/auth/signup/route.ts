import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import db from "@/app/lib/db";
import { RowDataPacket } from "mysql2";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ message: "Email and password required" }, { status: 400 });
    }

    const [rows] = await db.query<RowDataPacket[]>(
      "SELECT id FROM users WHERE email = ? LIMIT 1",
      [email.trim().toLowerCase()]
    );

    if (rows.length > 0) {
      return NextResponse.json({ message: "User already exists" }, { status: 400 });
    }

    const hashed = await bcrypt.hash(password, 10);

    await db.query(
      "INSERT INTO users (email, password, role) VALUES (?, ?, 'employee')",
      [email.trim().toLowerCase(), hashed]
    );

    return NextResponse.json({ message: "Account created" }, { status: 201 });
  } catch (err) {
    console.error("AUTH SIGNUP ERROR:", err);
    return NextResponse.json({ message: "Server error", error: String(err) }, { status: 500 });
  }
}
