import { NextResponse } from "next/server";
import db from "@/app/lib/db";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "No id provided" }, { status: 400 });

    const snap = await db.ref(`users/${id}`).once("value");
    if (!snap.exists()) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const d = snap.val();
    return NextResponse.json({ firstName: d.firstName, email: d.email, role: d.role });
  } catch (err) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
