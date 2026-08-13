import { eligibility } from "./fixtures/eligibility";
import type { CountryCode, EligibilityByCountry } from "./types";

export async function getEligibility(
  projectId: string,
  countryCode: CountryCode
): Promise<EligibilityByCountry | null> {
  const match = eligibility.find(
    (row) => row.projectId === projectId && row.countryCode === countryCode
  );
  return match ?? null;
}
