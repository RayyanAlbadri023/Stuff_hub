import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import db from "@/app/lib/db";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();
    if (!email || !password)
      return NextResponse.json({ message: "Email and password required" }, { status: 400 });

    const snapshot = await db.ref("users").orderByChild("email").equalTo(email.trim().toLowerCase()).once("value");

    if (!snapshot.exists())
      return NextResponse.json({ message: "User not found" }, { status: 404 });

    let user: any = null;
    let userId: string = "";
    snapshot.forEach((child) => { user = child.val(); userId = child.key!; });

    const match = await bcrypt.compare(password, user.password);
    if (!match)
      return NextResponse.json({ message: "Wrong password" }, { status: 401 });

    const userData = { id: userId, email: user.email, role: user.role || "employee", firstName: user.firstName || "" };
    const response = NextResponse.json({ message: "Login success", user: userData });
    response.cookies.set("role", userData.role, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 7 });
    return response;
  } catch (err) {
    console.error("LOGIN ERROR:", err);
    return NextResponse.json({ message: "Server error", error: String(err) }, { status: 500 });
  }
}
