import { NextResponse, NextRequest } from "next/server";
import db from "@/app/lib/db";

export async function GET(req: NextRequest) {
  try {
    const email = req.nextUrl.searchParams.get("email");
    const snap = await db.ref("expenses").once("value");

    const expenses: any[] = [];
    snap.forEach((child) => {
      const d = child.val();
      expenses.push({
        id: child.key,
        userId: d.userId || null,
        name: d.name || "Employee",
        email: d.email || "",
        amount: d.amount ?? 0,
        description: d.description || "",
        receiptImage: d.receiptImage || null,
        status: d.status || "pending",
        createdAt: d.createdAt,
      });
    });

    const filtered = email ? expenses.filter((e) => e.email === email) : expenses;
    return NextResponse.json({ expenses: filtered.reverse() });
  } catch (err) {
    return NextResponse.json({ message: String(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, name, email, amount, description, receiptImage } = body;

    if (!receiptImage) {
      return NextResponse.json({ message: "Receipt image is required" }, { status: 400 });
    }
    if (!amount || Number(amount) <= 0) {
      return NextResponse.json({ message: "Valid amount is required" }, { status: 400 });
    }

    await db.ref("expenses").push({
      userId: userId || null,
      name: name || "Employee",
      email: email || "",
      amount: Number(amount),
      description: description || "",
      receiptImage,
      status: "pending",
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({ message: "Expense submitted" }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ message: String(err) }, { status: 500 });
  }
}
