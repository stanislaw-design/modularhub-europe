// Spec 0079 AC-2/AC-3: stan zgody na pomiar ruchu. Jedyne, co zapisujemy przed
// zgodą i po odmowie, to sama decyzja (localStorage), czyli zapis na potrzeby
// obsługi zgody. Mały magazyn poza Reactem, żeby baner, tracker i link w
// stopce widziały ten sam stan bez wspólnego providera.

export type ConsentDecision = "granted" | "denied";

export const CONSENT_STORAGE_KEY = "mh-analytics-consent";

const listeners = new Set<() => void>();
let settingsOpen = false;
// Zapas na przeglądarki bez dostępu do localStorage (tryb prywatny).
let memoryDecision: ConsentDecision | null = null;

function notify() {
  listeners.forEach((listener) => listener());
}

export function readConsent(): ConsentDecision | null {
  try {
    const value = window.localStorage.getItem(CONSENT_STORAGE_KEY);
    return value === "granted" || value === "denied" ? value : null;
  } catch {
    return null;
  }
}

export function writeConsent(decision: ConsentDecision): void {
  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, decision);
  } catch {
    // Bez localStorage decyzja żyje do końca karty; pomiar i tak startuje tylko
    // po jawnym kliknięciu.
  }
  settingsOpen = false;
  memoryDecision = decision;
  notify();
}

export function getConsentSnapshot(): ConsentDecision | null {
  return readConsent() ?? memoryDecision;
}

export function getConsentServerSnapshot(): null {
  return null;
}

export function isConsentSettingsOpen(): boolean {
  return settingsOpen;
}

export function openConsentSettings(): void {
  settingsOpen = true;
  notify();
}

export function closeConsentSettings(): void {
  settingsOpen = false;
  notify();
}

export function subscribeConsent(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === CONSENT_STORAGE_KEY) listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}
