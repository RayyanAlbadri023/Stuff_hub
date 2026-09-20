// End-of-service gratuity (مكافأة نهاية الخدمة) — Oman Labour Law, Article 60.
//
// Traditional structure: for each year of service, the employee is due
// 15 days' basic wage for each of the first three years, then 30 days'
// basic wage for each year after that (pro-rated for partial years),
// calculated on the LAST BASIC WAGE (allowances excluded).
//
// Omani nationals are enrolled in the Social Protection Fund pension
// scheme, so their end-of-service benefit normally comes through the
// pension instead of employer-paid gratuity — gratuity under Article 60
// is therefore mainly an EXPATRIATE entitlement. This is configurable
// below ("applicableTo") in case your establishment's policy or a specific
// employment contract differs. As with the other compliance modules here,
// confirm the current rule with the Ministry of Labour / a legal advisor
// before relying on this for an actual settlement.

import type { Nationality } from "./socialInsurance";

export type GratuityApplicability = "expat_only" | "all";

export interface GratuitySettings {
  firstPeriodYears: number; // e.g. 3
  firstPeriodDaysPerYear: number; // e.g. 15
  secondPeriodDaysPerYear: number; // e.g. 30
  applicableTo: GratuityApplicability;
}

export const DEFAULT_GRATUITY_SETTINGS: GratuitySettings = {
  firstPeriodYears: 3,
  firstPeriodDaysPerYear: 15,
  secondPeriodDaysPerYear: 30,
  applicableTo: "expat_only",
};

export interface GratuityBreakdown {
  yearsOfService: number; // decimal years
  applicable: boolean;
  firstPeriodAmount: number;
  secondPeriodAmount: number;
  totalAmount: number;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export function yearsOfServiceFrom(joinDate?: string | null, now: Date = new Date()): number {
  if (!joinDate) return 0;
  const start = new Date(joinDate);
  if (isNaN(start.getTime())) return 0;
  const ms = now.getTime() - start.getTime();
  if (ms <= 0) return 0;
  return ms / (1000 * 60 * 60 * 24 * 365.25);
}

export function computeGratuity(
  baseSalary: number,
  joinDate: string | undefined | null,
  nationality: Nationality | undefined,
  settings: GratuitySettings = DEFAULT_GRATUITY_SETTINGS,
  now: Date = new Date()
): GratuityBreakdown {
  const yearsOfService = yearsOfServiceFrom(joinDate, now);
  const applicable = settings.applicableTo === "all" || nationality === "expat";

  if (!applicable || !baseSalary || yearsOfService <= 0) {
    return { yearsOfService: round2(yearsOfService), applicable, firstPeriodAmount: 0, secondPeriodAmount: 0, totalAmount: 0 };
  }

  const dailyWage = baseSalary / 30;
  const firstYears = Math.min(yearsOfService, settings.firstPeriodYears);
  const secondYears = Math.max(0, yearsOfService - settings.firstPeriodYears);

  const firstPeriodAmount = firstYears * settings.firstPeriodDaysPerYear * dailyWage;
  const secondPeriodAmount = secondYears * settings.secondPeriodDaysPerYear * dailyWage;

  return {
    yearsOfService: round2(yearsOfService),
    applicable,
    firstPeriodAmount: round2(firstPeriodAmount),
    secondPeriodAmount: round2(secondPeriodAmount),
    totalAmount: round2(firstPeriodAmount + secondPeriodAmount),
  };
}
