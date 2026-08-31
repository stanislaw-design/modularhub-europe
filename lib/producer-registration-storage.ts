import type { RegistrationDetails } from "./producer-registration";

// Dane rejestracji zapisane trwale w localStorage per NIP (spec 0016), zamiast
// żyć tylko w parametrach URL: pozwala wrócić na /producent/produkty i
// /producent/projekt później z samym ?nip=, bez pełnego kompletu parametrów za
// każdym razem. Ten sam wzorzec kluczowania i fail soft co szkic kreatora
// (lib/producer-project-draft.ts).
function registrationStorageKey(nip: string): string {
  return `producent:${nip}:rejestracja`;
}

export function saveRegistrationDetails(details: RegistrationDetails): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(registrationStorageKey(details.nip), JSON.stringify(details));
  } catch {
    // fail soft — pomiń tę aktualizację
  }
}

export function loadRegistrationDetails(nip: string): RegistrationDetails | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(registrationStorageKey(nip));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<RegistrationDetails>;
    if (
      typeof parsed.nip !== "string" ||
      !Array.isArray(parsed.countries) ||
      parsed.countries.length === 0 ||
      typeof parsed.technology !== "string"
    ) {
      return null;
    }
    return { nip: parsed.nip, countries: parsed.countries, technology: parsed.technology as RegistrationDetails["technology"] };
  } catch {
    return null;
  }
}
