import { countries } from "./fixtures/countries";
import type { Country } from "./types";

export async function getCountries(): Promise<Country[]> {
  return countries;
}
