import { NextResponse, NextRequest } from "next/server";
import db from "@/app/lib/db";
import { isValidFinanceType } from "@/app/lib/finance";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ type: string; id: string }> }) {
  try {
    const { type, id } = await params;
    if (!isValidFinanceType(type)) {
      return NextResponse.json({ message: "Unknown finance record type" }, { status: 400 });
    }
    await db.ref(`finance/${type}/${id}`).remove();
    return NextResponse.json({ message: "Deleted" });
  } catch (err) {
    return NextResponse.json({ message: String(err) }, { status: 500 });
  }
}
