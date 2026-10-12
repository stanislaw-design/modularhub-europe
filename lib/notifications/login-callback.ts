import { routing } from "@/lib/i18n/routing";

// Spec 0066 AC-7, AC-10, AC-16: mail logowania gościa różni się treścią od
// zwykłego. Wariant wybiera marker `welcome` w adresie powrotu, który Auth.js
// dokleja do linku jako `callbackUrl`. Marker zmienia wyłącznie tekst maila,
// nigdy dostępu (dostęp do sprawy liczy evaluateCaseAccess z sesji). Osobny
// plik bez importu next-auth, żeby dało się go testować pod Vitest.
export interface GuestLinkVariant {
  variant: "new" | "existing";
  inquiryId: string;
  locale: string;
}

const CASE_PATH = /^\/([a-z]{2})\/panel\/inquiries\/([0-9a-f-]{36})$/i;

export function parseGuestLinkVariant(url: string): GuestLinkVariant | null {
  try {
    const raw = new URL(url).searchParams.get("callbackUrl");
    if (!raw) return null;
    // Adres powrotu bywa względny albo bezwzględny, baza pomaga tylko przy względnym.
    const callback = new URL(raw, "http://localhost");
    const welcome = callback.searchParams.get("welcome");
    if (welcome !== "new" && welcome !== "existing") return null;
    const match = CASE_PATH.exec(callback.pathname);
    if (!match) return null;
    const locale = (routing.locales as readonly string[]).includes(match[1]) ? match[1] : routing.defaultLocale;
    return { variant: welcome, inquiryId: match[2], locale };
  } catch {
    return null;
  }
}
