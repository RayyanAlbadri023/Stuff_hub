import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import db from "@/app/lib/db";

export async function POST(req: Request) {
  try {
    const { firstName, lastName, phone, email, password } = await req.json();
    if (!firstName || !email || !password)
      return NextResponse.json({ message: "firstName, email, password required" }, { status: 400 });

    const normalizedEmail = email.trim().toLowerCase();
    const existing = await db.ref("users").orderByChild("email").equalTo(normalizedEmail).once("value");
    if (existing.exists())
      return NextResponse.json({ message: "Email already exists" }, { status: 409 });

    const hashed = await bcrypt.hash(password, 10);
    await db.ref("users").push({
      firstName: firstName.trim(),
      lastName: lastName?.trim() || "",
      phone: phone?.trim() || "",
      email: normalizedEmail,
      password: hashed,
      role: "employee",
      resetToken: null,
      resetTokenExpiry: null,
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({ message: "User created" }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ message: String(err) }, { status: 500 });
  }
}
