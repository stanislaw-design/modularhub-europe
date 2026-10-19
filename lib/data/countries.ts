import type { Locale } from "@/lib/i18n/routing";
import { countries } from "./fixtures/countries";
import type { Country } from "./types";

// Bez argumentu zwraca polskie nazwy z fixture'a, więc dotychczasowi wywołujący działają
// bez zmian. Z językiem nazwy pochodzą z Intl.DisplayNames (spec 0073 AC-1); gdy Intl nie
// zna kodu, zostaje polska nazwa z fixture'a.
export async function getCountries(locale: Locale = "pl"): Promise<Country[]> {
  if (locale === "pl") return countries;
  const displayNames = new Intl.DisplayNames([locale], { type: "region" });
  return countries.map((country) => ({
    ...country,
    name: displayNames.of(country.code) ?? country.name,
  }));
}
