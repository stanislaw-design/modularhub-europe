import { resolveEnvironment } from "./environment";

// Spec 0079 AC-5: jedyne miejsce, które decyduje, czy pomiar ruchu w ogóle
// działa. Tylko produkcja; testy E2E włączają go jawnie przez
// NEXT_PUBLIC_ANALYTICS_FORCE=1 (dev, CI i preview nie wysyłają nic).
// Dostępne w przeglądarce (NEXT_PUBLIC_* jest wstawiane w czasie buildu).
export function isAnalyticsEnabled(): boolean {
  if (process.env.NEXT_PUBLIC_ANALYTICS_FORCE === "1") return true;
  return resolveEnvironment() === "production";
}
