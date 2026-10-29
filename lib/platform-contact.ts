import { z } from "zod";

// Spec 0077 AC-3, AC-4: wspólny kontakt ModularHub widoczny dla producenta przy projekcie
// własnym. To osobne zmienne od OPERATIONS_NOTIFY_EMAIL (alerty zespołu).
export interface PlatformContact {
  name: string;
  email: string;
  phone: string;
}

export type PlatformContactResult = { ok: true; contact: PlatformContact } | { ok: false; error: string };

const emailSchema = z.string().email();

// Czyta zmienne przy każdym wywołaniu (nie przy imporcie), żeby brak konfiguracji
// blokował tylko zakładanie projektu własnego, a nie start aplikacji.
export function getPlatformContact(): PlatformContactResult {
  const name = process.env.PLATFORM_CONTACT_NAME?.trim() ?? "";
  const rawEmail = process.env.PLATFORM_CONTACT_EMAIL?.trim() ?? "";
  const phone = process.env.PLATFORM_CONTACT_PHONE?.trim() ?? "";

  const missing = [
    !name && "PLATFORM_CONTACT_NAME",
    !rawEmail && "PLATFORM_CONTACT_EMAIL",
    !phone && "PLATFORM_CONTACT_PHONE",
  ].filter(Boolean);
  if (missing.length > 0) {
    return { ok: false, error: `Brak konfiguracji kontaktu ModularHub: ustaw ${missing.join(", ")}.` };
  }

  const email = rawEmail.toLowerCase();
  if (!emailSchema.safeParse(email).success) {
    return { ok: false, error: "PLATFORM_CONTACT_EMAIL nie jest poprawnym adresem e mail." };
  }

  return { ok: true, contact: { name, email, phone } };
}
