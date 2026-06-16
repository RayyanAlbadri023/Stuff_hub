import { NextResponse, NextRequest } from "next/server";
import crypto from "crypto";
import db from "@/app/lib/db";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json().catch(() => ({}));
    if (!email) return NextResponse.json({ message: "Email is required" }, { status: 400 });

    const normalizedEmail = email.trim().toLowerCase();
    const snapshot = await db.ref("users").orderByChild("email").equalTo(normalizedEmail).once("value");
    if (!snapshot.exists()) return NextResponse.json({ message: "Reset link sent! Please check your email 📩" });

    let userId = "";
    snapshot.forEach((child) => { userId = child.key!; });

    const token = crypto.randomBytes(32).toString("hex");
    const expiry = new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString();
    await db.ref(`users/${userId}`).update({ resetToken: token, resetTokenExpiry: expiry });

    const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
    const resetUrl = `${baseUrl}/reset?token=${token}`;

    try {
      const { Resend } = await import("resend");
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: "onboarding@resend.dev", to: email, subject: "Reset Your Password",
        html: `<div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px"><h2 style="color:#ec510e">Reset Your Password</h2><p>Click below — expires in 24 hours.</p><a href="${resetUrl}" style="background:#ec510e;color:white;padding:14px 32px;border-radius:999px;text-decoration:none;font-weight:bold">Reset Password</a></div>`,
      });
    } catch (e) { console.error("Email error:", e); }

    return NextResponse.json({ message: "Reset link sent! Please check your email 📩" });
  } catch (err) {
    return NextResponse.json({ message: "Server error" }, { status: 500 });
  }
}
