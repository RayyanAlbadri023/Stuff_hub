// Health Insurance — employer-paid flat premium per employee.
//
// Unlike Oman's Social Protection Fund (formerly PASI/GOSI) contributions,
// private health insurance here is a fixed monthly premium the employer
// pays per employee to their insurance provider — not a percentage of
// salary, and not deducted from the employee's pay.
//
// (This file keeps its original name/path — `socialInsurance.ts` — because
// other modules such as `gratuity.ts` import the shared `Nationality` type
// from it. Feel free to rename the file if you'd like; just update those
// imports too.)

export type Nationality = "omani" | "expat";

export interface HealthInsuranceSettings {
  monthlyPremium: number; // OMR per employee per month, paid fully by the employer
}

export const DEFAULT_HEALTH_INSURANCE_SETTINGS: HealthInsuranceSettings = {
  monthlyPremium: 15,
};

export interface HealthInsuranceBreakdown {
  monthlyPremium: number;
  employerCost: number;
}

/**
 * Computes one employee's monthly health-insurance cost. It's currently a
 * flat rate applied equally to every employee, fully paid by the employer —
 * extend here if you later need per-grade or per-dependent variation.
 */
export function computeHealthInsurance(
  settings: HealthInsuranceSettings = DEFAULT_HEALTH_INSURANCE_SETTINGS
): HealthInsuranceBreakdown {
  const monthlyPremium = settings.monthlyPremium || 0;
  return {
    monthlyPremium,
    employerCost: monthlyPremium,
  };
}
