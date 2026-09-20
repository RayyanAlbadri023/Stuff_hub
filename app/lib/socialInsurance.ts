// Oman Social Protection Fund (formerly PASI/GOSI) contribution model.
//
// Under the Social Protection Law (Royal Decree 52/2023):
//  - Old-age, disability & death (pension) insurance applies to OMANI
//    NATIONALS only, split between employee and employer.
//  - Job Security insurance and Occupational Injury insurance apply to
//    EVERY worker regardless of nationality (this was new in the 2023 law —
//    expatriates were brought into Job Security & Occupational Injury cover,
//    but are NOT enrolled in the pension scheme; their end-of-service
//    benefit instead comes from the employer directly under Article 60 of
//    the Labour Law).
//
// The percentages below are commonly published defaults. They are fully
// editable from the admin panel (Settings > Social Insurance) — always
// verify the current official rates with the Social Protection Fund before
// relying on this for real payroll, since rates are being phased in over a
// multi-year transition and can change.

export type Nationality = "omani" | "expat";

export interface SocialInsuranceRates {
  pensionEmployeeRate: number; // % — Omani nationals only
  pensionEmployerRate: number; // % — Omani nationals only
  jobSecurityEmployeeRate: number; // % — all nationalities
  jobSecurityEmployerRate: number; // % — all nationalities
  occupationalInjuryEmployerRate: number; // % — employer-only, all nationalities
}

export const DEFAULT_SOCIAL_INSURANCE_RATES: SocialInsuranceRates = {
  pensionEmployeeRate: 7,
  pensionEmployerRate: 11.5,
  jobSecurityEmployeeRate: 1,
  jobSecurityEmployerRate: 1,
  occupationalInjuryEmployerRate: 1,
};

export const SOCIAL_INSURANCE_RATE_KEYS = [
  "pensionEmployeeRate",
  "pensionEmployerRate",
  "jobSecurityEmployeeRate",
  "jobSecurityEmployerRate",
  "occupationalInjuryEmployerRate",
] as const;

export interface ContributionBreakdown {
  contributableSalary: number;
  employeeShare: number;
  employerShare: number;
  total: number;
  appliesPension: boolean;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Computes one employee's monthly social-insurance contribution.
 * `contributableSalary` = base salary + general allowance (matches the
 * "basic wage" base used elsewhere in the payroll — adjust here if your
 * scheme includes different components).
 */
export function computeSocialInsurance(
  nationality: Nationality | undefined,
  baseSalary: number,
  allowance: number,
  rates: SocialInsuranceRates = DEFAULT_SOCIAL_INSURANCE_RATES
): ContributionBreakdown {
  const contributableSalary = (baseSalary || 0) + (allowance || 0);
  const isOmani = nationality === "omani";

  const employeeShare =
    (isOmani ? contributableSalary * (rates.pensionEmployeeRate / 100) : 0) +
    contributableSalary * (rates.jobSecurityEmployeeRate / 100);

  const employerShare =
    (isOmani ? contributableSalary * (rates.pensionEmployerRate / 100) : 0) +
    contributableSalary * (rates.jobSecurityEmployerRate / 100) +
    contributableSalary * (rates.occupationalInjuryEmployerRate / 100);

  return {
    contributableSalary: round2(contributableSalary),
    employeeShare: round2(employeeShare),
    employerShare: round2(employerShare),
    total: round2(employeeShare + employerShare),
    appliesPension: isOmani,
  };
}
