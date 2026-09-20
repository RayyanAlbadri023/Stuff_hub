import { NextResponse, NextRequest } from "next/server";
import db from "@/app/lib/db";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const snap = await db.ref(`users/${id}`).once("value");
    if (!snap.exists())
      return NextResponse.json({ message: "User not found" }, { status: 404 });

    const d = snap.val();
    return NextResponse.json({
      id,
      firstName: d.firstName,
      lastName: d.lastName,
      email: d.email,
      phone: d.phone,
      role: d.role,
      baseSalary: d.baseSalary ?? 0,
      allowance: d.allowance ?? 0,
      phoneAllowance: d.phoneAllowance ?? 0,
      transportationAllowance: d.transportationAllowance ?? 0,
      nationality: d.nationality ?? "omani",
      insuranceNumber: d.insuranceNumber ?? "",
      workPermitNumber: d.workPermitNumber ?? "",
      workPermitExpiry: d.workPermitExpiry ?? "",
      residencyNumber: d.residencyNumber ?? "",
      residencyExpiry: d.residencyExpiry ?? "",
      passportNumber: d.passportNumber ?? "",
      passportExpiry: d.passportExpiry ?? "",
      joinDate: d.joinDate ?? "",
    });
  } catch (err) {
    return NextResponse.json({ message: String(err) }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await db.ref(`users/${id}`).remove();
    return NextResponse.json({ message: "Deleted" });
  } catch (err) {
    return NextResponse.json({ message: String(err) }, { status: 500 });
  }
}
