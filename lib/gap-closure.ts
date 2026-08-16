import type { CountryCode } from "./data/types";

const STORAGE_KEY = "producent:domykanie-luk:rozwiazane";

// Świadomie globalny (bez NIP producenta) — patrz spec 0010, Consequences.
function loadResolvedCountries(): CountryCode[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((value): value is CountryCode => typeof value === "string");
  } catch {
    return [];
  }
}

export function isCountryResolved(countryCode: CountryCode): boolean {
  return loadResolvedCountries().includes(countryCode);
}

export function markCountryResolved(countryCode: CountryCode): void {
  if (typeof window === "undefined") return;
  try {
    const resolved = loadResolvedCountries();
    if (resolved.includes(countryCode)) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...resolved, countryCode]));
  } catch {
    // fail soft — pomiń tę jedną aktualizację
  }
}
