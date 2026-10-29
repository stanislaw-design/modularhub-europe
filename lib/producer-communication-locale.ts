import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { producer } from "@/lib/db/schema";
import { COMMUNICATION_LOCALES, type CommunicationLocale } from "@/lib/communication-locales";

// Spec 0077 część C (AC-29, AC-30): język maili o dużych zamówieniach do producenta. Plain
// moduł (bez "use server"), bo wołają go funkcje maili i zadanie cykliczne, nie przeglądarka.
export { COMMUNICATION_LOCALES, type CommunicationLocale };
export const DEFAULT_COMMUNICATION_LOCALE: CommunicationLocale = "pl";

export function isCommunicationLocale(value: unknown): value is CommunicationLocale {
  return typeof value === "string" && (COMMUNICATION_LOCALES as readonly string[]).includes(value);
}

// Wartość spoza czterech języków (albo brak) to polski, nigdy wyjątek (AC-30).
export function normalizeCommunicationLocale(value: unknown): CommunicationLocale {
  return isCommunicationLocale(value) ? value : DEFAULT_COMMUNICATION_LOCALE;
}

const INTL_LOCALE: Record<CommunicationLocale, string> = {
  pl: "pl-PL",
  en: "en-GB",
  de: "de-DE",
  nl: "nl-NL",
};

// Daty w mailu są formatowane według języka odbiorcy (dziś na sztywno pl-PL).
export function intlLocaleFor(locale: CommunicationLocale): string {
  return INTL_LOCALE[locale];
}

// Jedyne miejsce, które czyta język z konta, gdy lista odbiorców go jeszcze nie niesie
// (pojedynczy producent, np. przypomnienie wołane po samym identyfikatorze). Przy listach
// odbiorców język jest pobierany razem z adresami (getProducerUserEmails), nie osobno.
export async function getProducerCommunicationLocale(producerId: string): Promise<CommunicationLocale> {
  try {
    const [row] = await db
      .select({ locale: producer.communicationLocale })
      .from(producer)
      .where(eq(producer.id, producerId));
    return normalizeCommunicationLocale(row?.locale);
  } catch {
    return DEFAULT_COMMUNICATION_LOCALE;
  }
}

// Mail jest renderowany raz na język, więc odbiorców grupuje się według języka.
export function groupByCommunicationLocale<T extends { locale: CommunicationLocale }>(
  recipients: T[],
): Map<CommunicationLocale, T[]> {
  const groups = new Map<CommunicationLocale, T[]>();
  for (const recipient of recipients) {
    const group = groups.get(recipient.locale);
    if (group) group.push(recipient);
    else groups.set(recipient.locale, [recipient]);
  }
  return groups;
}
