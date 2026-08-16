import type { CountryCode } from "./data/types";
import { PRODUCER_TECHNOLOGIES, type ProducerTechnology } from "./producer-technologies";

export const NIP_PATTERN = /^\d{10}$/;

export function normalizeNip(value: string): string {
  return value.replace(/[\s-]/g, "");
}

export interface RegistrationDetails {
  nip: string;
  countries: CountryCode[];
  technology: ProducerTechnology;
}

const TECHNOLOGY_VALUES = new Set<string>(PRODUCER_TECHNOLOGIES.map((t) => t.value));

// Soft validation for the confirmation screen's query params, the same
// pattern as parseInquiryProjectIds: a missing or tampered value redirects
// back to the registration form instead of rendering an error state.
export function parseRegistrationDetails(
  searchParams: { [key: string]: string | string[] | undefined },
  knownCountryCodes: Set<CountryCode>
): RegistrationDetails | null {
  const nip = searchParams.nip;
  const countriesRaw = searchParams.countries;
  const technology = searchParams.technology;

  if (typeof nip !== "string" || !NIP_PATTERN.test(nip)) return null;
  if (typeof countriesRaw !== "string" || countriesRaw.length === 0) return null;
  if (typeof technology !== "string" || !TECHNOLOGY_VALUES.has(technology)) return null;

  const seen = new Set<CountryCode>();
  const countries: CountryCode[] = [];
  for (const code of countriesRaw.split(",")) {
    const countryCode = code as CountryCode;
    if (!knownCountryCodes.has(countryCode) || seen.has(countryCode)) continue;
    seen.add(countryCode);
    countries.push(countryCode);
  }
  if (countries.length === 0) return null;

  return { nip, countries, technology: technology as ProducerTechnology };
}
