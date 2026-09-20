import { NextResponse, NextRequest } from "next/server";
import db from "@/app/lib/db";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const {
      email, role, baseSalary, allowance, phoneAllowance, transportationAllowance,
      nationality, insuranceNumber,
      workPermitNumber, workPermitExpiry, residencyNumber, residencyExpiry, passportNumber, passportExpiry,
      joinDate,
    } = await req.json();

    const updates: Record<string, unknown> = {};
    if (email !== undefined) updates.email = email;
    if (role !== undefined) updates.role = role;
    if (baseSalary !== undefined) updates.baseSalary = Number(baseSalary) || 0;
    if (allowance !== undefined) updates.allowance = Number(allowance) || 0;
    if (phoneAllowance !== undefined) updates.phoneAllowance = Number(phoneAllowance) || 0;
    if (transportationAllowance !== undefined) updates.transportationAllowance = Number(transportationAllowance) || 0;
    if (nationality !== undefined) updates.nationality = nationality === "expat" ? "expat" : "omani";
    if (insuranceNumber !== undefined) updates.insuranceNumber = insuranceNumber;
    if (workPermitNumber !== undefined) updates.workPermitNumber = workPermitNumber;
    if (workPermitExpiry !== undefined) updates.workPermitExpiry = workPermitExpiry;
    if (residencyNumber !== undefined) updates.residencyNumber = residencyNumber;
    if (residencyExpiry !== undefined) updates.residencyExpiry = residencyExpiry;
    if (passportNumber !== undefined) updates.passportNumber = passportNumber;
    if (passportExpiry !== undefined) updates.passportExpiry = passportExpiry;
    if (joinDate !== undefined) updates.joinDate = joinDate;

    await db.ref(`users/${id}`).update(updates);
    const snap = await db.ref(`users/${id}`).once("value");
    const d = snap.val();
    return NextResponse.json({
      id,
      firstName: d.firstName,
      email: d.email,
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
