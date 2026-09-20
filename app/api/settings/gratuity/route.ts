import { NextResponse, NextRequest } from "next/server";
import db from "@/app/lib/db";
import { DEFAULT_GRATUITY_SETTINGS, type GratuitySettings } from "@/app/lib/gratuity";

export async function GET() {
  try {
    const snap = await db.ref("settings/gratuity").once("value");
    const settings: GratuitySettings = snap.exists()
      ? { ...DEFAULT_GRATUITY_SETTINGS, ...snap.val() }
      : DEFAULT_GRATUITY_SETTINGS;
    return NextResponse.json(settings);
  } catch (err) {
    return NextResponse.json({ message: String(err) }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = (await req.json()) as Partial<GratuitySettings>;
    const updates: Record<string, unknown> = {};
    if (body.firstPeriodYears !== undefined) updates.firstPeriodYears = Number(body.firstPeriodYears) || 0;
    if (body.firstPeriodDaysPerYear !== undefined) updates.firstPeriodDaysPerYear = Number(body.firstPeriodDaysPerYear) || 0;
    if (body.secondPeriodDaysPerYear !== undefined) updates.secondPeriodDaysPerYear = Number(body.secondPeriodDaysPerYear) || 0;
    if (body.applicableTo !== undefined) updates.applicableTo = body.applicableTo === "all" ? "all" : "expat_only";
    await db.ref("settings/gratuity").update(updates);
    const snap = await db.ref("settings/gratuity").once("value");
    return NextResponse.json({ ...DEFAULT_GRATUITY_SETTINGS, ...snap.val() });
  } catch (err) {
    return NextResponse.json({ message: String(err) }, { status: 500 });
  }
}
