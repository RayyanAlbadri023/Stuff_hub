import { NextResponse, NextRequest } from "next/server";
import db from "@/app/lib/db";
import { RowDataPacket } from "mysql2";

export async function GET() {
  try {
    let requests: RowDataPacket[] = [];
    let vacations: RowDataPacket[] = [];

    // requests table: id, name, email, type, message, status, userId, createdAt
    try {
      const [rows] = await db.query<RowDataPacket[]>(
        `SELECT 
          id,
          userId,
          name,
          email,
          type,
          message,
          NULL AS \`start\`,
          NULL AS \`end\`,
          NULL AS days,
          status,
          createdAt
        FROM requests
        ORDER BY createdAt DESC`
      );
      requests = rows;
    } catch (e) {
      console.error("requests query error:", e);
    }

    // vacations table: id, userId, startDate, endDate, days, status, createdAt, name, email
    try {
      const [rows] = await db.query<RowDataPacket[]>(
        `SELECT 
          id,
          userId,
          COALESCE(name, 'Employee') AS name,
          COALESCE(email, '') AS email,
          'vacation' AS type,
          NULL AS message,
          startDate AS \`start\`,
          endDate AS \`end\`,
          days,
          status,
          createdAt
        FROM vacations
        ORDER BY createdAt DESC`
      );
      vacations = rows;
    } catch (e) {
      console.error("vacations query error:", e);
    }

    const all = [...requests, ...vacations];

    return NextResponse.json({ requests: all });
  } catch (err) {
    console.error("GET /api/requests error:", err);
    return NextResponse.json({ message: String(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type } = body;

    if (type === "vacation") {
      await db.query(
        `INSERT INTO vacations (userId, name, email, startDate, endDate, days, status)
         VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
        [body.userId || null, body.name || "Employee", body.email || "", body.start || null, body.end || null, body.days || null]
      );
    } else {
      await db.query(
        `INSERT INTO requests (userId, name, email, type, message, status)
         VALUES (?, ?, ?, ?, ?, 'pending')`,
        [body.userId || null, body.name || "Employee", body.email || "", type, body.message || ""]
      );
    }

    return NextResponse.json({ message: "Request submitted" }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("POST /api/requests error:", message);
    return NextResponse.json({ message }, { status: 500 });
  }
}
