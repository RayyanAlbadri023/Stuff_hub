import { NextResponse } from "next/server";
import db from "@/app/lib/db";

export async function GET() {
  try {
    const snapshot = await db.ref("users").once("value");
    const users: any[] = [];
    snapshot.forEach((child) => {
      const d = child.val();
      users.push({
        id: child.key,
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
    });
    return NextResponse.json(users.reverse());
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
