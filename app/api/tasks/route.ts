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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, description, assignedToId, assignedToName, assignedToEmail } = body;

    if (!title || !assignedToId)
      return NextResponse.json({ message: "Title and assignee are required" }, { status: 400 });

    const ref = await db.ref("tasks").push({
      title,
      description: description || "",
      assignedToId,
      assignedToName: assignedToName || "",
      assignedToEmail: assignedToEmail || "",
      status: "task",
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({ message: "Task created", id: ref.key }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ message: String(err) }, { status: 500 });
  }
}
