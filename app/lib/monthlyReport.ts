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

export interface ReportTaskItem {
  title: string;
  status: "task" | "in_progress" | "done";
  assignedToName?: string;
  assignedToEmail?: string;
}

const TASK_STATUS_LABEL: Record<ReportTaskItem["status"], string> = {
  task: "Pending",
  in_progress: "In Progress",
  done: "Done",
};

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
  tasks?: ReportTaskItem[];
  companyLabel?: string;
}) {
  const { jsPDF } = await import("jspdf");
  const { omanizationStats: om, requests, expenses, tasks = [], companyLabel } = params;

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
  const pageBottom = 275;

  const ensureSpace = (needed: number = lineGap) => {
    if (y + needed > pageBottom) {
      doc.addPage();
      y = 20;
    }
  };

  const heading = (text: string) => {
    ensureSpace(lineGap + 4);
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text(text, left, y);
    y += lineGap + 2;
    doc.setDrawColor(230);
    doc.line(left, y - 6, 190, y - 6);
  };

  const row = (label: string, value: string) => {
    ensureSpace();
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(label, left, y);
    doc.text(value, 130, y);
    y += lineGap;
  };

  const subHeading = (text: string) => {
    ensureSpace(lineGap + 2);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(text, left, y);
    y += lineGap;
  };

  const taskLine = (title: string, status: string) => {
    ensureSpace();
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    const maxTitleWidth = 100;
    const wrapped = doc.splitTextToSize(`• ${title}`, maxTitleWidth);
    doc.text(wrapped, left + 2, y);
    doc.setFont("helvetica", "bold");
    doc.text(status, 165, y);
    y += lineGap * wrapped.length;
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
  y += 4;

  if (tasks.length > 0) {
    const taskPending = tasks.filter((tk) => tk.status === "task").length;
    const taskInProgress = tasks.filter((tk) => tk.status === "in_progress").length;
    const taskDone = tasks.filter((tk) => tk.status === "done").length;

    heading("Tasks by Employee");
    row("Total tasks:", String(tasks.length));
    row("Pending / In Progress / Done:", `${taskPending} / ${taskInProgress} / ${taskDone}`);
    y += 2;

    const byEmployee = new Map<string, { name: string; tasks: ReportTaskItem[] }>();
    for (const tk of tasks) {
      const key = tk.assignedToEmail || tk.assignedToName || "Unassigned";
      const name = tk.assignedToName || tk.assignedToEmail || "Unassigned";
      if (!byEmployee.has(key)) byEmployee.set(key, { name, tasks: [] });
      byEmployee.get(key)!.tasks.push(tk);
    }

    const sortedEmployees = [...byEmployee.values()].sort((a, b) => a.name.localeCompare(b.name));

    for (const { name, tasks: empTasks } of sortedEmployees) {
      const empPending = empTasks.filter((tk) => tk.status === "task").length;
      const empInProgress = empTasks.filter((tk) => tk.status === "in_progress").length;
      const empDone = empTasks.filter((tk) => tk.status === "done").length;

      ensureSpace(lineGap * 2);
      subHeading(`${name}  (${empPending} pending / ${empInProgress} in progress / ${empDone} done)`);
      for (const tk of empTasks) {
        taskLine(tk.title, TASK_STATUS_LABEL[tk.status]);
      }
      y += 3;
    }
  }

  y += 6;
  ensureSpace(10);
  doc.setFontSize(9);
  doc.setTextColor(150);
  doc.text(`Generated on ${now.toLocaleString("en-US")}`, left, y);

  doc.save(`monthly-report-${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}.pdf`);
}
