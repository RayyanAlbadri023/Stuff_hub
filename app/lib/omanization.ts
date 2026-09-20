// Omanization (التعمين) tracking.
//
// The Ministry of Labour sets a minimum required percentage of Omani
// nationals in the workforce, and the required percentage differs by
// economic sector/activity (and is revised periodically by ministerial
// decision). There is no single fixed number that applies to every
// company, so the target percentage here is configurable from the admin
// panel rather than hard-coded — set it to whatever quota applies to your
// establishment's registered activity, and verify it with the Ministry of
// Labour (Omanization percentages are published per sector/occupation).

export interface OmanizationSettings {
  targetPercentage: number; // required Omanization % for this establishment's sector
  sectorLabel: string; // free-text label, e.g. "Information Technology"
}

export const DEFAULT_OMANIZATION_SETTINGS: OmanizationSettings = {
  targetPercentage: 30,
  sectorLabel: "",
};

export interface OmanizationStats {
  totalEmployees: number;
  omaniCount: number;
  expatCount: number;
  currentPercentage: number; // rounded to 1 decimal
  targetPercentage: number;
  compliant: boolean;
  gapCount: number; // how many more Omani hires (or fewer expats) are needed to reach the target, 0 if compliant
}

export function computeOmanizationStats(
  nationalities: ("omani" | "expat" | undefined)[],
  settings: OmanizationSettings = DEFAULT_OMANIZATION_SETTINGS
): OmanizationStats {
  const totalEmployees = nationalities.length;
  const omaniCount = nationalities.filter((n) => n === "omani" || n === undefined).length;
  const expatCount = totalEmployees - omaniCount;
  const currentPercentage = totalEmployees === 0 ? 0 : Math.round((omaniCount / totalEmployees) * 1000) / 10;
  const compliant = currentPercentage >= settings.targetPercentage;

  // Minimum additional Omani headcount needed (holding total headcount fixed)
  // to reach the target percentage: omani + g >= target/100 * (total + g)
  let gapCount = 0;
  if (!compliant && totalEmployees > 0) {
    const target = settings.targetPercentage / 100;
    gapCount = Math.ceil((target * totalEmployees - omaniCount) / (1 - target));
    if (!isFinite(gapCount) || gapCount < 0) gapCount = 0;
  }

  return {
    totalEmployees,
    omaniCount,
    expatCount,
    currentPercentage,
    targetPercentage: settings.targetPercentage,
    compliant,
    gapCount,
  };
}
