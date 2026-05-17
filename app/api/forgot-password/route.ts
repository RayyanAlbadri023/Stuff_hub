import { NextResponse, NextRequest } from "next/server";
import crypto from "crypto";
import db from "@/app/lib/db";
import { RowDataPacket } from "mysql2";

const SUCCESS_MSG = "Reset link sent! Please check your email 📩";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { email } = body;

    if (!email) {
      return NextResponse.json({ message: "Email is required" }, { status: 400 });
    }

    const [rows] = await db.query<RowDataPacket[]>(
      "SELECT id FROM users WHERE email = ? LIMIT 1",
      [email.trim().toLowerCase()]
    );

    const user = (rows as RowDataPacket[])[0];

    if (!user) {
      return NextResponse.json({ message: SUCCESS_MSG });
    }

    const token = crypto.randomBytes(32).toString("hex");

    // 24 hours from now, stored as a plain UTC string MySQL understands
    const expiry = new Date(Date.now() + 1000 * 60 * 60 * 24);
    const expiryStr = expiry.toISOString().slice(0, 19).replace("T", " ");

    await db.query(
      "UPDATE users SET resetToken = ?, resetTokenExpiry = ? WHERE id = ?",
      [token, expiryStr, user.id]
    );

    console.log("✅ Token saved for:", email, "| expiry:", expiryStr);

    const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
    const resetUrl = `${baseUrl}/reset?token=${token}`;

    try {
      const { Resend } = await import("resend");
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: "onboarding@resend.dev",
        to: email,
        subject: "Reset Your Password",
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px;border-radius:12px;background:#fff8f6;border:1px solid #ec510e33;">
            <h2 style="color:#ec510e;text-align:center;">Reset Your Password</h2>
            <p style="color:#555;text-align:center;">Click the button below. Link expires in <strong>24 hours</strong>.</p>
            <div style="text-align:center;margin:32px 0;">
              <a href="${resetUrl}" style="background:linear-gradient(to right,#ec510e,#ecbcaf);color:white;padding:14px 32px;border-radius:999px;text-decoration:none;font-weight:bold;font-size:16px;">
                Reset Password
              </a>
            </div>
            <p style="color:#aaa;font-size:12px;text-align:center;">If you didn't request this, ignore this email.</p>
          </div>
        `,
      });
    } catch (mailErr) {
      console.error("❌ Email send failed:", mailErr);
    }

    return NextResponse.json({ message: SUCCESS_MSG });
  } catch (err) {
    console.error("forgot-password error:", err);
    return NextResponse.json({ message: "Server error. Please try again." }, { status: 500 });
  }
}
