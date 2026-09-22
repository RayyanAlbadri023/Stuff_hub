// Shared vacation-balance logic.
//
// Policy:
//   - Every employee accrues 30 days per calendar year (Friday & Saturday
//     are not counted as vacation days when a request's day-count is
//     calculated, so the 30 days are all working days).
//   - Any days left unused at year-end carry over into the FIRST THREE
//     MONTHS ONLY of the following year (Jan 1 → Mar 31). Carried-over
//     days used within that window are charged against the carry pool,
//     never against the fresh annual 30. After March 31, whatever is left
//     of the carry pool simply expires — it is not added back or banked
//     further, and it never retroactively reduces the new year's annual
//     30 days.
//   - A request counts against the balance as soon as it is submitted
//     (status "pending"), not only once approved — this is what actually
//     stops an employee from booking more than the 30 (+ carry) days by
//     submitting several requests before any of them are approved. A
//     rejected request frees its days back up immediately.

export const ANNUAL_VACATION_DAYS = 30;
const RESERVING_STATUSES = new Set(["approved", "pending"]);

export type VacationRecord = {
  startDate?: string | null;
  status?: string | null;
  days?: number | null;
};

export type YearBalance = {
  year: number;
  annual: number;
  carriedIn: number;
  carryWindowOpen: boolean;
  carryExpired: boolean;
  totalAvailable: number;
  used: number;
  remaining: number;
};

function parsedRecords(records: VacationRecord[], year: number) {
  return records
    .filter((r) => RESERVING_STATUSES.has(r.status ?? "") && !!r.startDate)
    .map((r) => ({ date: new Date(r.startDate as string), days: r.days || 0 }))
    .filter((r) => !isNaN(r.date.getTime()) && r.date.getFullYear() === year);
}

/**
 * Computes the current vacation balance for one employee, given every
 * vacation record (pending or approved) belonging to them.
 */
export function computeVacationBalance(
  records: VacationRecord[],
  now: Date = new Date()
): YearBalance {
  const year = now.getFullYear();

  // How many of last year's 30 days were actually used, so we know what's
  // left to carry into this year.
  const usedLastYear = parsedRecords(records, year - 1).reduce((sum, r) => sum + r.days, 0);
  const leftoverLastYear = Math.max(0, ANNUAL_VACATION_DAYS - usedLastYear);

  const carryWindowEnd = new Date(year, 2, 31, 23, 59, 59, 999); // March 31
  const carryWindowOpen = now.getTime() <= carryWindowEnd.getTime();

  // Split this year's usage into what falls inside vs. outside the
  // Jan 1 → Mar 31 carry window, so carry days spent inside the window
  // are charged to the carry pool and never bleed into the annual 30
  // once the window closes.
  const thisYearRecords = parsedRecords(records, year);
  const usedInWindow = thisYearRecords
    .filter((r) => r.date.getTime() <= carryWindowEnd.getTime())
    .reduce((sum, r) => sum + r.days, 0);
  const usedAfterWindow = thisYearRecords
    .filter((r) => r.date.getTime() > carryWindowEnd.getTime())
    .reduce((sum, r) => sum + r.days, 0);

  const carryConsumed = Math.min(leftoverLastYear, usedInWindow);
  const carryRemaining = carryWindowOpen ? leftoverLastYear - carryConsumed : 0;
  const annualConsumed = Math.max(0, usedInWindow - carryConsumed) + usedAfterWindow;

  const carriedIn = carryWindowOpen ? leftoverLastYear : 0;
  const usedThisYear = usedInWindow + usedAfterWindow;
  const totalAvailable = ANNUAL_VACATION_DAYS + carriedIn;
  const remaining = Math.max(0, ANNUAL_VACATION_DAYS - annualConsumed) + carryRemaining;

  return {
    year,
    annual: ANNUAL_VACATION_DAYS,
    carriedIn,
    carryWindowOpen,
    carryExpired: !carryWindowOpen && leftoverLastYear > usedInWindow,
    totalAvailable,
    used: usedThisYear,
    remaining,
  };
}
