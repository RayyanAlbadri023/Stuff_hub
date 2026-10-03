import { NextResponse, NextRequest } from "next/server";
import db from "@/app/lib/db";
import { sendMail } from "@/app/lib/mail";
import { getDocStatus } from "@/app/lib/workPermit";
import { stageFor, buildAlertEmail, type AlertKind, type AlertStage } from "@/app/lib/expiryAlerts";

// Scans every employee for an expired/soon-to-expire National ID or an
// ended/ending employment contract, and emails the employee once per stage
// change (so it fires once when a document flips to "expiring soon" and once
// more when it flips to "expired" — never every single day).
//
// This route does nothing on its own: something has to call it on a
// schedule (a Render Cron Job, an external pinger like cron-job.org, a
// GitHub Actions scheduled workflow, etc.) hitting it once a day, e.g.
//   GET https://<your-app>/api/notifications/check-expirations?secret=<CRON_SECRET>
//
// Set CRON_SECRET in the environment to require that secret; without it the
// route is unauthenticated (fine for a first test, not for production).
async function handle(req: NextRequest) {
  const requiredSecret = process.env.CRON_SECRET;
  if (requiredSecret) {
    const provided = req.nextUrl.searchParams.get("secret") || req.headers.get("x-cron-secret");
    if (provided !== requiredSecret) {
      return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const snap = await db.ref("users").once("value");
    const results: { userId: string; kind: AlertKind; stage: AlertStage; emailed: boolean }[] = [];
    const writes: Promise<unknown>[] = [];

    snap.forEach((child) => {
      const id = child.key as string;
      const d = child.val() || {};
      const email: string = d.email || "";
      const name = `${d.firstName ?? ""} ${d.lastName ?? ""}`.trim() || "Employee";

      const checks: { kind: AlertKind; expiry?: string; prevStage?: string }[] = [
        { kind: "nationalId", expiry: d.nationalIdExpiry, prevStage: d.nationalIdAlertStage },
        { kind: "contract", expiry: d.contractEnd, prevStage: d.contractAlertStage },
      ];

      for (const { kind, expiry, prevStage } of checks) {
        const stage = stageFor(getDocStatus(expiry));
        const stageField = kind === "nationalId" ? "nationalIdAlertStage" : "contractAlertStage";
        const normalizedPrev: AlertStage = prevStage === "expired" || prevStage === "expiring_soon" ? prevStage : "";

        if (stage && stage !== normalizedPrev) {
          writes.push(
            (async () => {
              let emailed = false;
              if (email) {
                const { subject, html } = buildAlertEmail(kind, stage, name, expiry || "");
                const sent = await sendMail(email, subject, html);
                emailed = !!sent?.success;
              }
              await db.ref(`users/${id}`).update({ [stageField]: stage });
              results.push({ userId: id, kind, stage, emailed });
            })()
          );
        } else if (!stage && normalizedPrev) {
          // Document is valid/missing again (renewed) — clear the recorded
          // stage so a future expiry on the new date triggers a fresh alert.
          writes.push(db.ref(`users/${id}`).update({ [stageField]: "" }));
        }
      }
    });

    await Promise.all(writes);
    return NextResponse.json({ checked: true, alertsSent: results.length, results });
  } catch (err) {
    return NextResponse.json({ message: String(err) }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  return handle(req);
}

export async function POST(req: NextRequest) {
  return handle(req);
}
