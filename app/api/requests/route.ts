import { NextResponse, NextRequest } from "next/server";
import db from "@/app/lib/db";
import { computeVacationBalance, type VacationRecord } from "@/app/lib/vacationBalance";

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
      const requestedDays = Number(body.days) || 0;
      const email = body.email || "";

      if (requestedDays <= 0 || !body.start || !body.end) {
        return NextResponse.json({ message: "Invalid vacation request" }, { status: 400 });
      }

      // Re-check the 30-day/year balance (with carry-forward) server-side
      // so the limit can't be bypassed by calling the API directly.
      if (email) {
        const vacSnap = await db.ref("vacations").once("value");
        const existing: VacationRecord[] = [];
        vacSnap.forEach((child) => {
          const d = child.val();
          if (d.email === email) {
            existing.push({ startDate: d.startDate, status: d.status, days: d.days });
          }
        });
        const { remaining } = computeVacationBalance(existing);
        if (requestedDays > remaining) {
          return NextResponse.json(
            { message: `Exceeds remaining vacation balance (${remaining} day(s) left)` },
            { status: 400 }
          );
        }
      }

      await db.ref("vacations").push({
        userId: body.userId || null,
        name: body.name || "Employee",
        email,
        startDate: body.start || null,
        endDate: body.end || null,
        days: requestedDays,
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
