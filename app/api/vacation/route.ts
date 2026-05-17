import { NextResponse } from "next/server";
import db from "@/app/lib/db";
import { RowDataPacket } from "mysql2";

export async function POST(req: Request) {
  try {
    const { userId, name, email, start, end, days } = await req.json();

    if (!start || !end) {
      return NextResponse.json({ message: "Missing required fields" }, { status: 400 });
    }

    await db.query(
      `INSERT INTO vacations (userId, name, email, startDate, endDate, days, status)
       VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
      [userId || null, name || "Employee", email || "", start, end, days || null]
    );

    return NextResponse.json({ message: "Vacation request created" }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("VACATION POST ERROR:", message);
    return NextResponse.json({ message: "Server error", error: message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const [rows] = await db.query<RowDataPacket[]>(
      "SELECT * FROM vacations ORDER BY createdAt DESC"
    );
    return NextResponse.json({ vacations: rows });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ message: "Server error", error: message }, { status: 500 });
  }
}
