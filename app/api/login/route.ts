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
      return NextResponse.json(
        { message: "Email and password required" },
        { status: 400 }
      );
    }

    const [rows] = await db.query<UserRow[]>(
      "SELECT * FROM users WHERE email = ? LIMIT 1",
      [email.trim().toLowerCase()]
    );

    const user = rows[0];

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return NextResponse.json({ message: "Wrong password" }, { status: 401 });
    }

    const userData = {
      id: user.id,
      email: user.email,
      role: user.role || "employee",
      firstName: user.firstName || "",
    };

    const response = NextResponse.json({ message: "Login success", user: userData });

    // Set a simple role cookie — readable by proxy.ts on the server
    response.cookies.set("role", userData.role, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (err: unknown) {
    console.error("LOGIN ERROR:", err);
    return NextResponse.json({ message: "Server error", error: String(err) }, { status: 500 });
  }
}
