import { NextResponse, NextRequest } from "next/server";
import db from "@/app/lib/db";
import { isValidAccountType, type Account } from "@/app/lib/accounting";

export async function GET() {
  try {
    const snap = await db.ref("accounting/accounts").once("value");
    const accounts: Account[] = [];
    snap.forEach((child) => {
      const d = child.val();
      accounts.push({
        id: child.key as string,
        code: d.code || "",
        name: d.name || "",
        type: d.type,
        parentId: d.parentId || "",
        createdAt: d.createdAt || "",
      });
    });
    accounts.sort((a, b) => a.code.localeCompare(b.code));
    return NextResponse.json({ accounts });
  } catch (err) {
    return NextResponse.json({ message: String(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.code || !String(body.code).trim()) {
      return NextResponse.json({ message: "Account code is required" }, { status: 400 });
    }
    if (!body.name || !String(body.name).trim()) {
      return NextResponse.json({ message: "Account name is required" }, { status: 400 });
    }
    if (!isValidAccountType(body.type)) {
      return NextResponse.json({ message: "Invalid account type" }, { status: 400 });
    }
    const record = {
      code: String(body.code).trim(),
      name: String(body.name).trim(),
      type: body.type,
      parentId: body.parentId ? String(body.parentId) : "",
      createdAt: new Date().toISOString(),
    };
    const ref = await db.ref("accounting/accounts").push(record);
    return NextResponse.json({ id: ref.key, ...record }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ message: String(err) }, { status: 500 });
  }
}
