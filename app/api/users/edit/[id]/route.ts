import { NextResponse, NextRequest } from "next/server";
import db from "@/app/lib/db";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const {
      firstName, lastName, phone,
      email, role, baseSalary, allowance, phoneAllowance, transportationAllowance, otherAllowance,
      nationality, countryName, insuranceNumber,
      workPermitNumber, workPermitExpiry, residencyNumber, residencyExpiry, passportNumber, passportExpiry,
      joinDate,
      contractType, contractStart, contractEnd, contractFile, contractFileName,
      residencyCardFile, residencyCardFileName, workPermitFile, workPermitFileName,
      personalIdFile, personalIdFileName, certifiedCvFile, certifiedCvFileName,
    } = await req.json();

    const updates: Record<string, unknown> = {};
    if (firstName !== undefined) updates.firstName = firstName;
    if (lastName !== undefined) updates.lastName = lastName;
    if (phone !== undefined) updates.phone = phone;
    if (email !== undefined) updates.email = email;
    if (role !== undefined) updates.role = role;
    if (baseSalary !== undefined) updates.baseSalary = Number(baseSalary) || 0;
    if (allowance !== undefined) updates.allowance = Number(allowance) || 0;
    if (phoneAllowance !== undefined) updates.phoneAllowance = Number(phoneAllowance) || 0;
    if (transportationAllowance !== undefined) updates.transportationAllowance = Number(transportationAllowance) || 0;
    if (otherAllowance !== undefined) updates.otherAllowance = Number(otherAllowance) || 0;
    if (nationality !== undefined) updates.nationality = nationality === "expat" ? "expat" : "omani";
    if (countryName !== undefined) updates.countryName = countryName;
    if (insuranceNumber !== undefined) updates.insuranceNumber = insuranceNumber;
    if (workPermitNumber !== undefined) updates.workPermitNumber = workPermitNumber;
    if (workPermitExpiry !== undefined) updates.workPermitExpiry = workPermitExpiry;
    if (residencyNumber !== undefined) updates.residencyNumber = residencyNumber;
    if (residencyExpiry !== undefined) updates.residencyExpiry = residencyExpiry;
    if (passportNumber !== undefined) updates.passportNumber = passportNumber;
    if (passportExpiry !== undefined) updates.passportExpiry = passportExpiry;
    if (joinDate !== undefined) updates.joinDate = joinDate;
    if (contractType !== undefined) updates.contractType = contractType === "fixed" ? "fixed" : "permanent";
    if (contractStart !== undefined) updates.contractStart = contractStart;
    if (contractEnd !== undefined) updates.contractEnd = contractEnd;
    if (contractFile !== undefined) updates.contractFile = contractFile;
    if (contractFileName !== undefined) updates.contractFileName = contractFileName;
    if (residencyCardFile !== undefined) updates.residencyCardFile = residencyCardFile;
    if (residencyCardFileName !== undefined) updates.residencyCardFileName = residencyCardFileName;
    if (workPermitFile !== undefined) updates.workPermitFile = workPermitFile;
    if (workPermitFileName !== undefined) updates.workPermitFileName = workPermitFileName;
    if (personalIdFile !== undefined) updates.personalIdFile = personalIdFile;
    if (personalIdFileName !== undefined) updates.personalIdFileName = personalIdFileName;
    if (certifiedCvFile !== undefined) updates.certifiedCvFile = certifiedCvFile;
    if (certifiedCvFileName !== undefined) updates.certifiedCvFileName = certifiedCvFileName;

    await db.ref(`users/${id}`).update(updates);
    const snap = await db.ref(`users/${id}`).once("value");
    const d = snap.val();
    return NextResponse.json({
      id,
      firstName: d.firstName,
      lastName: d.lastName,
      phone: d.phone,
      email: d.email,
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
