// Shared vacation-balance logic.
//
// Policy: every employee accrues 30 days per calendar year. Any days left
// unused at year-end carry over into the FIRST THREE MONTHS ONLY of the
// following year (Jan 1 → Mar 31). After March 31 the carried-over days
// simply expire — they are not added back or banked further.

export const ANNUAL_VACATION_DAYS = 30;

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

function daysUsedInYear(records: VacationRecord[], year: number): number {
  return records
    .filter((r) => {
      if (r.status !== "approved" || !r.startDate) return false;
      const d = new Date(r.startDate);
      return !isNaN(d.getTime()) && d.getFullYear() === year;
    })
    .reduce((sum, r) => sum + (r.days || 0), 0);
}

/**
 * Computes the current vacation balance for one employee, given every
 * vacation record (any status) belonging to them.
 */
export function computeVacationBalance(
  records: VacationRecord[],
  now: Date = new Date()
): YearBalance {
  const year = now.getFullYear();

  const usedLastYear = daysUsedInYear(records, year - 1);
  const leftoverLastYear = Math.max(0, ANNUAL_VACATION_DAYS - usedLastYear);

  const carryWindowEnd = new Date(year, 2, 31, 23, 59, 59, 999); // March 31
  const carryWindowOpen = now.getTime() <= carryWindowEnd.getTime();
  const carriedIn = carryWindowOpen ? leftoverLastYear : 0;

  const usedThisYear = daysUsedInYear(records, year);
  const totalAvailable = ANNUAL_VACATION_DAYS + carriedIn;
  const remaining = totalAvailable - usedThisYear;

  return {
    year,
    annual: ANNUAL_VACATION_DAYS,
    carriedIn,
    carryWindowOpen,
    carryExpired: !carryWindowOpen && leftoverLastYear > 0,
    totalAvailable,
    used: usedThisYear,
    remaining,
  };
}
