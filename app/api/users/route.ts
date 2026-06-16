import { NextResponse } from "next/server";
import db from "@/app/lib/db";

export async function GET() {
  try {
    const snapshot = await db.ref("users").once("value");
    const users: any[] = [];
    snapshot.forEach((child) => {
      const d = child.val();
      users.push({ id: child.key, firstName: d.firstName, lastName: d.lastName, email: d.email, phone: d.phone, role: d.role });
    });
    return NextResponse.json(users.reverse());
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
