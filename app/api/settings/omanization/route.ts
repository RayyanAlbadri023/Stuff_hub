import { NextResponse, NextRequest } from "next/server";
import db from "@/app/lib/db";
import { DEFAULT_OMANIZATION_SETTINGS, type OmanizationSettings } from "@/app/lib/omanization";

export async function GET() {
  try {
    const snap = await db.ref("settings/omanization").once("value");
    const settings: OmanizationSettings = snap.exists()
      ? { ...DEFAULT_OMANIZATION_SETTINGS, ...snap.val() }
      : DEFAULT_OMANIZATION_SETTINGS;
    return NextResponse.json(settings);
  } catch (err) {
    return NextResponse.json({ message: String(err) }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = (await req.json()) as Partial<OmanizationSettings>;
    const updates: Record<string, unknown> = {};
    if (body.targetPercentage !== undefined) updates.targetPercentage = Number(body.targetPercentage) || 0;
    if (body.sectorLabel !== undefined) updates.sectorLabel = String(body.sectorLabel);
    await db.ref("settings/omanization").update(updates);
    const snap = await db.ref("settings/omanization").once("value");
    return NextResponse.json({ ...DEFAULT_OMANIZATION_SETTINGS, ...snap.val() });
  } catch (err) {
    return NextResponse.json({ message: String(err) }, { status: 500 });
  }
}
