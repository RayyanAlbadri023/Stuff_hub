// Shared logic for the national-ID / contract expiry notification pipeline.
// Used by the /api/notifications/check-expirations cron endpoint (and
// reusable anywhere else that needs to know "has this employee already been
// alerted about this expiry stage").

import { getDocStatus, daysUntil, type DocStatus } from "@/app/lib/workPermit";

export type AlertStage = "" | "expiring_soon" | "expired";
export type AlertKind = "nationalId" | "contract";

/** Maps a document status to the alert stage that should be recorded/sent for it. */
export function stageFor(status: DocStatus): AlertStage {
  if (status === "expired") return "expired";
  if (status === "expiring_soon") return "expiring_soon";
  return "";
}

/** Convenience: go straight from an expiry date string to its alert stage. */
export function stageForExpiry(expiryDate?: string | null): AlertStage {
  return stageFor(getDocStatus(expiryDate));
}

// Formats "YYYY-MM-DD" as "DD/MM/YYYY" for the email body; falls back to the
// raw string if it isn't a plain ISO date.
function formatDate(isoDate: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : isoDate;
}

/** Builds the bilingual (Arabic/English) subject + HTML body for an alert email. */
export function buildAlertEmail(kind: AlertKind, stage: AlertStage, employeeName: string, expiryDate: string): { subject: string; html: string } {
  const isExpired = stage === "expired";
  const formattedDate = formatDate(expiryDate);
  const daysLeft = daysUntil(expiryDate);

  const subject =
    kind === "nationalId"
      ? isExpired
        ? "انتهت صلاحية البطاقة الشخصية / National ID Expired"
        : "البطاقة الشخصية توشك على الانتهاء / National ID Expiring Soon"
      : isExpired
        ? "انتهى عقد العمل / Employment Contract Ended"
        : "عقد العمل على وشك الانتهاء / Employment Contract Ending Soon";

  const arabicDocName = kind === "nationalId" ? "بطاقتك الشخصية (الرقم المدني)" : "عقد عملك";
  const arabicDaysNote = !isExpired && daysLeft !== null && daysLeft >= 0 ? ` (بعد ${daysLeft} يوم)` : "";

  const arabicMessage =
    kind === "nationalId"
      ? isExpired
        ? `انتهت صلاحية ${arabicDocName}. يرجى تجديدها وتحديث تاريخ الانتهاء الجديد في النظام في أقرب وقت ممكن.`
        : `${arabicDocName} على وشك الانتهاء. يرجى المبادرة بتجديدها.`
      : isExpired
        ? `انتهت مدة ${arabicDocName}. يرجى التواصل مع قسم الموارد البشرية لمعرفة الخطوات التالية.`
        : `${arabicDocName} على وشك الانتهاء. يرجى التواصل مع قسم الموارد البشرية.`;

  const englishDocName = kind === "nationalId" ? "Your National ID (Civil ID)" : "Your employment contract";
  const englishDaysNote = !isExpired && daysLeft !== null && daysLeft >= 0 ? ` (in ${daysLeft} day${daysLeft === 1 ? "" : "s"})` : "";

  const englishMessage =
    kind === "nationalId"
      ? isExpired
        ? `${englishDocName} has expired. Please renew it and update the new expiry date in the system as soon as possible.`
        : `${englishDocName} will expire soon. Please renew it in time.`
      : isExpired
        ? `${englishDocName} has ended. Please contact HR to discuss next steps.`
        : `${englishDocName} is ending soon. Please contact HR.`;

  const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px" dir="rtl">
      <h2 style="color:${isExpired ? "#dc2626" : "#F33615"}">${subject}</h2>
      <p>مرحبًا ${employeeName}،</p>
      <p>${arabicMessage}</p>
      <p style="font-size:16px"><strong>تاريخ الانتهاء:</strong> ${formattedDate}${arabicDaysNote}</p>
      <hr style="border:none;border-top:1px solid #eee;margin:20px 0" />
      <p dir="ltr" style="color:#555">Hello ${employeeName},<br/>${englishMessage}</p>
      <p dir="ltr" style="font-size:16px"><strong>Expiry date:</strong> ${formattedDate}${englishDaysNote}</p>
    </div>
  `;

  return { subject, html };
}
