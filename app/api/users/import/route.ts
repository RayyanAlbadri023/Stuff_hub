import { NextResponse, NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import db from "@/app/lib/db";

// Default password given to bulk-imported employees. They should change it
// after their first login (same convention as scripts/seedEmployees.mjs).
const DEFAULT_PASSWORD = "123456";

type RawRow = Record<string, unknown>;

// Normalizes a column header so the sheet's exact wording/casing/spacing
// doesn't matter (e.g. "First Name", "first_name" and "FirstName" all match).
function normalizeKey(key: string): string {
  return key.trim().toLowerCase().replace(/[\s_-]+/g, "");
}

// Accepted column-header spellings per field, English and Arabic. Add more
// aliases here if a common variant is missing.
const FIELD_ALIASES: Record<string, string[]> = {
  firstName: ["firstname", "first", "الاسمالاول", "الاسمالأول", "الاسم"],
  lastName: ["lastname", "last", "الاسمالاخير", "الاسمالأخير", "اسمالعائلة"],
  email: ["email", "emailaddress", "البريدالالكتروني", "البريدالإلكتروني", "البريد"],
  phone: ["phone", "phonenumber", "mobile", "الهاتف", "رقمالهاتف", "الجوال"],
  baseSalary: ["basesalary", "salary", "الراتبالاساسي", "الراتبالأساسي", "الراتب"],
  countryName: ["country", "countryname", "nationality", "الجنسية", "الدولة"],
  joinDate: ["joindate", "startdate", "تاريخالتعيين", "تاريخالالتحاق"],
  role: ["role", "الدور", "الصلاحية"],
};

function pick(row: RawRow, field: keyof typeof FIELD_ALIASES): string {
  const aliases = FIELD_ALIASES[field];
  for (const key of Object.keys(row)) {
    if (aliases.includes(normalizeKey(key))) {
      const value = row[key];
      return value === undefined || value === null ? "" : String(value).trim();
    }
  }
  return "";
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rows: RawRow[] = Array.isArray(body?.rows) ? body.rows : [];
    if (rows.length === 0) {
      return NextResponse.json({ message: "No rows to import" }, { status: 400 });
    }

    // Load existing emails once so duplicates in the sheet (or already in
    // the system) are skipped instead of creating conflicting accounts.
    const existingSnap = await db.ref("users").once("value");
    const existingEmails = new Set<string>();
    existingSnap.forEach((child) => {
      const email = child.val()?.email;
      if (email) existingEmails.add(String(email).trim().toLowerCase());
    });

    const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

    const created: { row: number; email: string }[] = [];
    const skipped: { row: number; reason: string }[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i] ?? {};
      const firstName = pick(row, "firstName");
      const email = pick(row, "email").toLowerCase();

      if (!firstName || !email) {
        skipped.push({ row: i + 1, reason: "Missing first name or email" });
        continue;
      }
      if (existingEmails.has(email)) {
        skipped.push({ row: i + 1, reason: `Email already exists: ${email}` });
        continue;
      }

      const countryNameRaw = (pick(row, "countryName") || "oman").toLowerCase();
      const nationality = countryNameRaw === "oman" || countryNameRaw === "omani" ? "omani" : "expat";

      const newRef = db.ref("users").push();
      await newRef.set({
        firstName,
        lastName: pick(row, "lastName"),
        email,
        password: passwordHash,
        phone: pick(row, "phone"),
        role: pick(row, "role") || "employee",
        baseSalary: Number(pick(row, "baseSalary")) || 0,
        allowance: 0,
        phoneAllowance: 0,
        transportationAllowance: 0,
        otherAllowance: 0,
        nationality,
        countryName: nationality === "omani" ? "oman" : countryNameRaw,
        joinDate: pick(row, "joinDate"),
      });

      existingEmails.add(email);
      created.push({ row: i + 1, email });
    }

    return NextResponse.json({ createdCount: created.length, created, skipped });
  } catch (err) {
    return NextResponse.json({ message: String(err) }, { status: 500 });
  }
}
