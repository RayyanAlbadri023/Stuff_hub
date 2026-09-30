// Finance module — shared types + calculation helpers.
//
// This is intentionally a simplified, single-shape record model so every
// sub-module (invoices, assets, vendors, sales, income, expenses, refunds,
// cards) can reuse the same list/search/add UI and the same math. It is a
// starting point, not a full double-entry accounting system — extend the
// shape or split it into dedicated collections later if you need more.

export const FINANCE_TYPES = [
  "invoices",
  "assets",
  "vendors",
  "sales",
  "income",
  "expenses",
  "refunds",
  "cards",
  "contracts",
] as const;

export type FinanceType = (typeof FINANCE_TYPES)[number];

export function isValidFinanceType(t: string): t is FinanceType {
  return (FINANCE_TYPES as readonly string[]).includes(t);
}

export interface FinanceRecord {
  id: string;
  name: string; // primary label: customer/asset/vendor/source/title/card holder/reason/institution
  amount: number; // monetary amount: invoice/value/balance/income/expense/refund
  date: string; // YYYY-MM-DD — also used as "contract start date" for contracts
  category?: string; // free-form category / invoice status / card type, per module
  status?: string; // secondary tag — invoice status, card type, etc.
  ref?: string; // reference code — invoice #, item, phone, card number
  note?: string; // description / contact info / reason
  createdAt?: string;
  // Contract-specific fields (module: "contracts")
  endDate?: string; // contract end date, YYYY-MM-DD
  paymentDate?: string; // YYYY-MM-DD
  fileData?: string; // base64 data URL of the attached contract/other file
  fileName?: string; // original file name of the attachment
  bankGuaranteeData?: string; // base64 data URL of the bank guarantee attachment
  bankGuaranteeName?: string; // original file name of the bank guarantee attachment
}

export interface FinanceFilter {
  q?: string; // free-text search against name/ref/note
  year?: string; // "2026"
  month?: string; // "01".."12"
  day?: string; // "2026-03-14" (exact date)
}

export function filterFinanceRecords(records: FinanceRecord[], filter: FinanceFilter): FinanceRecord[] {
  const q = (filter.q || "").trim().toLowerCase();
  return records.filter((r) => {
    if (q) {
      const haystack = `${r.name} ${r.ref || ""} ${r.note || ""} ${r.category || ""}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    if (filter.day && r.date !== filter.day) return false;
    if (filter.year || filter.month) {
      const [y, m] = (r.date || "").split("-");
      if (filter.year && y !== filter.year) return false;
      if (filter.month && m !== filter.month) return false;
    }
    return true;
  });
}

export function sumAmount(records: FinanceRecord[]): number {
  return Math.round(records.reduce((sum, r) => sum + (Number(r.amount) || 0), 0) * 100) / 100;
}

/** Totals a set of records per calendar year, e.g. { "2025": 1200, "2026": 800 }. */
export function yearlyTotals(records: FinanceRecord[]): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const r of records) {
    const year = (r.date || "").slice(0, 4);
    if (!year) continue;
    totals[year] = (totals[year] || 0) + (Number(r.amount) || 0);
  }
  for (const y of Object.keys(totals)) totals[y] = Math.round(totals[y] * 100) / 100;
  return totals;
}

/** Totals a set of records per month of a given year, e.g. index 0 = January. */
export function monthlyTotalsForYear(records: FinanceRecord[], year: string): number[] {
  const months = new Array(12).fill(0);
  for (const r of records) {
    const [y, m] = (r.date || "").split("-");
    if (y !== year) continue;
    const idx = Number(m) - 1;
    if (idx >= 0 && idx < 12) months[idx] += Number(r.amount) || 0;
  }
  return months.map((v) => Math.round(v * 100) / 100);
}

export function currentYear(): string {
  return String(new Date().getFullYear());
}

export function distinctYears(records: FinanceRecord[]): string[] {
  const years = new Set<string>();
  for (const r of records) {
    const y = (r.date || "").slice(0, 4);
    if (y) years.add(y);
  }
  return Array.from(years).sort().reverse();
}
