import { NextResponse } from "next/server";
import db from "@/app/lib/db";

export async function POST(req: Request) {
  try {
    const { userId, name, email, start, end, days } = await req.json();
    if (!start || !end)
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 });

    await db.ref("vacations").push({
      userId: userId || null,
      name: name || "Employee",
      email: email || "",
      startDate: start,
      endDate: end,
      days: days || null,
      status: "pending",
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({ message: "Vacation request created" }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ message: String(err) }, { status: 500 });
  }
}

export async function GET() {
  try {
    const snapshot = await db.ref("vacations").once("value");
    const vacations: any[] = [];
    snapshot.forEach((child) => {
      vacations.push({ id: child.key, ...child.val() });
    });
    return NextResponse.json({ vacations: vacations.reverse() });
  } catch (err) {
    return NextResponse.json({ message: String(err) }, { status: 500 });
  }
}
