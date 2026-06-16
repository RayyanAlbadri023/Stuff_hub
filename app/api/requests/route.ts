import { NextResponse, NextRequest } from "next/server";
import db from "@/app/lib/db";

export async function GET() {
  try {
    const [reqSnap, vacSnap] = await Promise.all([
      db.ref("requests").once("value"),
      db.ref("vacations").once("value"),
    ]);

    const requests: any[] = [];
    reqSnap.forEach((child) => {
      const d = child.val();
      requests.push({ id: child.key, userId: d.userId || null, name: d.name, email: d.email, type: d.type, message: d.message || null, start: null, end: null, days: null, status: d.status, createdAt: d.createdAt });
    });

    const vacations: any[] = [];
    vacSnap.forEach((child) => {
      const d = child.val();
      vacations.push({ id: child.key, userId: d.userId || null, name: d.name || "Employee", email: d.email || "", type: "vacation", message: null, start: d.startDate, end: d.endDate, days: d.days, status: d.status, createdAt: d.createdAt });
    });

    return NextResponse.json({ requests: [...requests.reverse(), ...vacations.reverse()] });
  } catch (err) {
    return NextResponse.json({ message: String(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type } = body;

    if (type === "vacation") {
      await db.ref("vacations").push({
        userId: body.userId || null,
        name: body.name || "Employee",
        email: body.email || "",
        startDate: body.start || null,
        endDate: body.end || null,
        days: body.days || null,
        status: "pending",
        createdAt: new Date().toISOString(),
      });
    } else {
      await db.ref("requests").push({
        userId: body.userId || null,
        name: body.name || "Employee",
        email: body.email || "",
        type,
        message: body.message || "",
        status: "pending",
        createdAt: new Date().toISOString(),
      });
    }

    return NextResponse.json({ message: "Request submitted" }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ message: String(err) }, { status: 500 });
  }
}
