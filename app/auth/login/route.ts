import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import db from "@/app/lib/db";
import { RowDataPacket } from "mysql2";

type UserRow = RowDataPacket & {
  id: number;
  firstName: string;
  email: string;
  password: string;
  role: string;
};

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ message: "Email and password required" }, { status: 400 });
    }

    const [rows] = await db.query<UserRow[]>(
      "SELECT * FROM users WHERE email = ? LIMIT 1",
      [email.trim().toLowerCase()]
    );

    const foundUser = rows[0];

    if (!foundUser) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    const match = await bcrypt.compare(password, foundUser.password);

    if (!match) {
      return NextResponse.json({ message: "Wrong password" }, { status: 401 });
    }

    return NextResponse.json({
      message: "Login success",
      user: {
        id: foundUser.id,
        email: foundUser.email,
        role: foundUser.role || "employee",
        firstName: foundUser.firstName || "",
      },
    });
  } catch (err) {
    console.error("AUTH LOGIN ERROR:", err);
    return NextResponse.json({ message: "Server error", error: String(err) }, { status: 500 });
  }
}
