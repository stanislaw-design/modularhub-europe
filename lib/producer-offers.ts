export interface StoredProducerOffer {
  housePriceEur: number;
  installationPriceEur: number;
  submittedAt: string;
}

const STORAGE_KEY = "producent:zapytania:oferty";

// Świadomie globalny (bez NIP producenta) — ten sam precedens co lib/gap-closure.ts.
function loadOffers(): Record<string, StoredProducerOffer> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return {};
    return parsed as Record<string, StoredProducerOffer>;
  } catch {
    return {};
  }
}

export function getStoredOffer(inquiryId: string): StoredProducerOffer | null {
  return loadOffers()[inquiryId] ?? null;
}

export function saveOffer(inquiryId: string, offer: StoredProducerOffer): void {
  if (typeof window === "undefined") return;
  try {
    const offers = loadOffers();
    offers[inquiryId] = offer;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(offers));
  } catch {
    // fail soft — pomiń tę jedną aktualizację
  }
}
