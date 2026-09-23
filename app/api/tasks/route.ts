import { NextResponse, NextRequest } from "next/server";
import db from "@/app/lib/db";

export async function GET(req: NextRequest) {
  try {
    const email = req.nextUrl.searchParams.get("email");
    const snapshot = await db.ref("tasks").once("value");
    const tasks: any[] = [];
    snapshot.forEach((child) => {
      const d = child.val();
      if (!email || d.assignedToEmail === email) {
        tasks.push({ id: child.key, ...d });
      }
    });
    return NextResponse.json({ tasks: tasks.reverse() });
  } catch (err) {
    return NextResponse.json({ message: String(err) }, { status: 500 });
  }
}

interface Assignee {
  id: string;
  name?: string;
  email?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, description, assignedToId, assignedToName, assignedToEmail, startDate, endDate } = body;

    // Accept either a single assignee (legacy) or a list of assignees (bulk assign to multiple employees).
    const assignees: Assignee[] = Array.isArray(body.assignees) && body.assignees.length > 0
      ? body.assignees
      : (assignedToId ? [{ id: assignedToId, name: assignedToName, email: assignedToEmail }] : []);

    if (!title || assignees.length === 0)
      return NextResponse.json({ message: "Title and at least one assignee are required" }, { status: 400 });

    const createdAt = new Date().toISOString();
    const updates: Record<string, unknown> = {};
    const ids: string[] = [];

    for (const a of assignees) {
      const key = db.ref("tasks").push().key;
      if (!key) continue;
      ids.push(key);
      updates[`tasks/${key}`] = {
        title,
        description: description || "",
        assignedToId: a.id,
        assignedToName: a.name || "",
        assignedToEmail: a.email || "",
        status: "task",
        startDate: startDate || "",
        endDate: endDate || "",
        createdAt,
      };
    }

    await db.ref().update(updates);

    return NextResponse.json({ message: "Task created", ids }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ message: String(err) }, { status: 500 });
  }
}
