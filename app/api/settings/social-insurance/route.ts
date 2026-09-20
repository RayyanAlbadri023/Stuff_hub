import { NextResponse, NextRequest } from "next/server";
import db from "@/app/lib/db";
import {
  DEFAULT_SOCIAL_INSURANCE_RATES,
  SOCIAL_INSURANCE_RATE_KEYS,
  type SocialInsuranceRates,
} from "@/app/lib/socialInsurance";

export async function GET() {
  try {
    const snap = await db.ref("settings/socialInsurance").once("value");
    const rates: SocialInsuranceRates = snap.exists()
      ? { ...DEFAULT_SOCIAL_INSURANCE_RATES, ...snap.val() }
      : DEFAULT_SOCIAL_INSURANCE_RATES;
    return NextResponse.json(rates);
  } catch (err) {
    return NextResponse.json({ message: String(err) }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = (await req.json()) as Partial<SocialInsuranceRates>;
    const updates: Record<string, number> = {};
    for (const key of SOCIAL_INSURANCE_RATE_KEYS) {
      if (body[key] !== undefined) updates[key] = Number(body[key]) || 0;
    }
    await db.ref("settings/socialInsurance").update(updates);
    const snap = await db.ref("settings/socialInsurance").once("value");
    return NextResponse.json({ ...DEFAULT_SOCIAL_INSURANCE_RATES, ...snap.val() });
  } catch (err) {
    return NextResponse.json({ message: String(err) }, { status: 500 });
  }
}
