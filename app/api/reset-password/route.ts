import { NextResponse, NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import db from "@/app/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { token, newPassword } = await req.json();
    if (!token || !newPassword)
      return NextResponse.json({ message: "Token and new password are required" }, { status: 400 });

    const snapshot = await db.ref("users").orderByChild("resetToken").equalTo(token).once("value");
    if (!snapshot.exists())
      return NextResponse.json({ message: "Reset link not found. Please request a new one." }, { status: 400 });

    let userId = ""; let user: any = {};
    snapshot.forEach((child) => { userId = child.key!; user = child.val(); });

    if (new Date(user.resetTokenExpiry) <= new Date())
      return NextResponse.json({ message: "Reset link has expired." }, { status: 400 });

    const hashed = await bcrypt.hash(newPassword, 10);
    await db.ref(`users/${userId}`).update({ password: hashed, resetToken: null, resetTokenExpiry: null });

    return NextResponse.json({ message: "Password reset successful ✅" });
  } catch (err) {
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
