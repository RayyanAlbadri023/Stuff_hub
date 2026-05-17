import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import db from "@/app/lib/db";
import { RowDataPacket } from "mysql2";

export async function POST(req: Request) {
  try {
    const { firstName, lastName, phone, email, password } = await req.json();

    if (!firstName || !email || !password) {
      return NextResponse.json({ message: "firstName, email, password required" }, { status: 400 });
    }

    const [existing] = await db.query<RowDataPacket[]>(
      "SELECT id FROM users WHERE email = ? LIMIT 1",
      [email.trim().toLowerCase()]
    );

    if ((existing as RowDataPacket[]).length > 0) {
      return NextResponse.json({ message: "Email already exists" }, { status: 409 });
    }

    const hashed = await bcrypt.hash(password, 10);

    await db.query(
      "INSERT INTO users (firstName, lastName, phone, email, password) VALUES (?, ?, ?, ?, ?)",
      [
        firstName.trim(),
        lastName?.trim() || "",
        phone?.trim() || "",
        email.trim().toLowerCase(),
        hashed,
      ]
    );

    return NextResponse.json({ message: "User created" }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Server error";
    return NextResponse.json({ message }, { status: 500 });
  }
}
