import { NextResponse, NextRequest } from "next/server";
import db from "@/app/lib/db";
import {
  DEFAULT_HEALTH_INSURANCE_SETTINGS,
  type HealthInsuranceSettings,
} from "@/app/lib/socialInsurance";

// Route path kept as-is (/api/settings/social-insurance) even though it now
// serves Health Insurance settings, so existing bookmarks/clients don't
// break. The data itself lives under a new "settings/healthInsurance" node.

export async function GET() {
  try {
    const snap = await db.ref("settings/healthInsurance").once("value");
    const settings: HealthInsuranceSettings = snap.exists()
      ? { ...DEFAULT_HEALTH_INSURANCE_SETTINGS, ...snap.val() }
      : DEFAULT_HEALTH_INSURANCE_SETTINGS;
    return NextResponse.json(settings);
  } catch (err) {
    return NextResponse.json({ message: String(err) }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = (await req.json()) as Partial<HealthInsuranceSettings>;
    const updates: Record<string, number> = {};
    if (body.monthlyPremium !== undefined) updates.monthlyPremium = Number(body.monthlyPremium) || 0;
    await db.ref("settings/healthInsurance").update(updates);
    const snap = await db.ref("settings/healthInsurance").once("value");
    return NextResponse.json({ ...DEFAULT_HEALTH_INSURANCE_SETTINGS, ...snap.val() });
  } catch (err) {
    return NextResponse.json({ message: String(err) }, { status: 500 });
  }
}
