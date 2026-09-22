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
      otherAllowance: d.otherAllowance ?? 0,
      nationality: d.nationality ?? "omani",
      countryName: d.countryName ?? "",
      insuranceNumber: d.insuranceNumber ?? "",
      workPermitNumber: d.workPermitNumber ?? "",
      workPermitExpiry: d.workPermitExpiry ?? "",
      residencyNumber: d.residencyNumber ?? "",
      residencyExpiry: d.residencyExpiry ?? "",
      passportNumber: d.passportNumber ?? "",
      passportExpiry: d.passportExpiry ?? "",
      joinDate: d.joinDate ?? "",
      contractType: d.contractType ?? "permanent",
      contractStart: d.contractStart ?? "",
      contractEnd: d.contractEnd ?? "",
      contractFile: d.contractFile ?? "",
      contractFileName: d.contractFileName ?? "",
      residencyCardFile: d.residencyCardFile ?? "",
      residencyCardFileName: d.residencyCardFileName ?? "",
      workPermitFile: d.workPermitFile ?? "",
      workPermitFileName: d.workPermitFileName ?? "",
      personalIdFile: d.personalIdFile ?? "",
      personalIdFileName: d.personalIdFileName ?? "",
      certifiedCvFile: d.certifiedCvFile ?? "",
      certifiedCvFileName: d.certifiedCvFileName ?? "",
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
