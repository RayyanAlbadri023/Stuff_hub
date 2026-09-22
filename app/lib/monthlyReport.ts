// Builds and downloads a one-page monthly HR summary (Omanization status,
// this month's vacation requests, this month's expenses) as a PDF.
//
// jsPDF has no built-in RTL/Arabic text shaping, so the report is always
// rendered in English regardless of the site's active language — this
// matches the existing vacation-request PDF (app/veccation/page.tsx), which
// does the same.

import type { OmanizationStats } from "@/app/lib/omanization";

export interface ReportRequestItem {
  type: "vacation" | "suggestion" | "appeal" | "resignation";
  status: "pending" | "approved" | "rejected";
  days?: number;
  createdAt: string;
}

export interface ReportExpenseItem {
  amount: number;
  status: "pending" | "approved" | "rejected";
  createdAt?: string;
}

function isThisMonth(iso: string | undefined, now: Date): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return false;
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}

export async function downloadMonthlyReport(params: {
  omanizationStats: OmanizationStats;
  requests: ReportRequestItem[];
  expenses: ReportExpenseItem[];
  companyLabel?: string;
}) {
  const { jsPDF } = await import("jspdf");
  const { omanizationStats: om, requests, expenses, companyLabel } = params;

  const now = new Date();
  const monthLabel = now.toLocaleString("en-US", { month: "long", year: "numeric" });

  const vacationsThisMonth = requests.filter((r) => r.type === "vacation" && isThisMonth(r.createdAt, now));
  const vacPending = vacationsThisMonth.filter((r) => r.status === "pending").length;
  const vacApproved = vacationsThisMonth.filter((r) => r.status === "approved").length;
  const vacRejected = vacationsThisMonth.filter((r) => r.status === "rejected").length;
  const vacApprovedDays = vacationsThisMonth
    .filter((r) => r.status === "approved")
    .reduce((sum, r) => sum + (r.days ?? 0), 0);

  const expensesThisMonth = expenses.filter((e) => isThisMonth(e.createdAt, now));
  const expPending = expensesThisMonth.filter((e) => e.status === "pending").length;
  const expApproved = expensesThisMonth.filter((e) => e.status === "approved").length;
  const expRejected = expensesThisMonth.filter((e) => e.status === "rejected").length;
  const expApprovedAmount = expensesThisMonth
    .filter((e) => e.status === "approved")
    .reduce((sum, e) => sum + (e.amount || 0), 0);

  const doc = new jsPDF();
  let y = 20;
  const left = 20;
  const lineGap = 8;

  const heading = (text: string) => {
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(text, left, y);
    y += lineGap + 2;
    doc.setDrawColor(230);
    doc.line(left, y - 6, 190, y - 6);
  };

  const row = (label: string, value: string) => {
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(label, left, y);
    doc.text(value, 130, y);
    y += lineGap;
  };

  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("Monthly HR Report", left, y);
  y += 8;
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(monthLabel, left, y);
  if (companyLabel) doc.text(companyLabel, 190, y, { align: "right" });
  y += 12;

  heading("Omanization");
  row("Total employees:", String(om.totalEmployees));
  row("Omani employees:", String(om.omaniCount));
  row("Expatriate employees:", String(om.expatCount));
  row("Current Omanization rate:", `${om.currentPercentage}%`);
  row("Target rate:", `${om.targetPercentage}%`);
  row("Compliance status:", om.compliant ? "Compliant" : `Not compliant (needs ${om.gapCount} more Omani hire(s))`);
  y += 4;

  heading("Vacation Requests (this month)");
  row("Total requests:", String(vacationsThisMonth.length));
  row("Pending / Approved / Rejected:", `${vacPending} / ${vacApproved} / ${vacRejected}`);
  row("Total approved vacation days:", String(vacApprovedDays));
  y += 4;

  heading("Expenses (this month)");
  row("Total submitted:", String(expensesThisMonth.length));
  row("Pending / Approved / Rejected:", `${expPending} / ${expApproved} / ${expRejected}`);
  row("Total approved amount:", expApprovedAmount.toFixed(2));
  y += 8;

  doc.setFontSize(9);
  doc.setTextColor(150);
  doc.text(`Generated on ${now.toLocaleString("en-US")}`, left, 285);

  doc.save(`monthly-report-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}.pdf`);
}
