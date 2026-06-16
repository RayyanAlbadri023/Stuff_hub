import { NextResponse, NextRequest } from "next/server";
import db from "@/app/lib/db";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { email, role } = await req.json();
    await db.ref(`users/${id}`).update({ email, role });
    const snap = await db.ref(`users/${id}`).once("value");
    const d = snap.val();
    return NextResponse.json({ id, firstName: d.firstName, email: d.email, role: d.role });
  } catch (err) {
    return NextResponse.json({ message: String(err) }, { status: 500 });
  }
}
