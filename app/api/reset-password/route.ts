import { NextResponse, NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import db from "@/app/lib/db";
import { RowDataPacket } from "mysql2";

type UserRow = RowDataPacket & {
  id: number;
  email: string;
  resetToken: string;
  resetTokenExpiry: string | Date;
};

export async function POST(req: NextRequest) {
  try {
    const { token, newPassword } = await req.json();

    if (!token || !newPassword) {
      return NextResponse.json({ message: "Token and new password are required" }, { status: 400 });
    }

    const [rows] = await db.query<UserRow[]>(
      "SELECT id, email, resetToken, resetTokenExpiry FROM users WHERE resetToken = ? LIMIT 1",
      [token]
    );

    const user = rows[0];

    console.log("👤 User found:", user?.email ?? "NOT FOUND");
    console.log("⏰ Expiry from DB:", user?.resetTokenExpiry);
    console.log("🕐 Now:", new Date().toISOString());

    if (!user) {
      return NextResponse.json(
        { message: "Reset link not found. Please request a new one." },
        { status: 400 }
      );
    }

    // Compare expiry — handle both string and Date from MySQL
    const expiryDate = new Date(user.resetTokenExpiry);
    const now = new Date();

    console.log("📅 Expiry parsed:", expiryDate.toISOString(), "| Valid:", expiryDate > now);

    if (expiryDate <= now) {
      return NextResponse.json(
        { message: "Reset link has expired. Please request a new one." },
        { status: 400 }
      );
    }

    const hashed = await bcrypt.hash(newPassword, 10);

    await db.query(
      "UPDATE users SET password = ?, resetToken = NULL, resetTokenExpiry = NULL WHERE id = ?",
      [hashed, user.id]
    );

    return NextResponse.json({ message: "Password reset successful ✅" });
  } catch (err) {
    console.error("reset-password error:", err);
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
