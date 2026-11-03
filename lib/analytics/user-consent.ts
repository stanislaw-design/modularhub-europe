import { and, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { userConsent } from "@/lib/db/schema";

// Spec 0079 etap 3 (AC-18, AC-19, AC-20): zgoda użytkownika producenta na pomiar otwarć i kliknięć
// w mailach od ModularHub. Jedna aktywna zgoda na użytkownika (częściowy indeks unikalny),
// wycofanie ustawia `withdrawn_at`, ponowna zgoda to nowy wiersz. Bez adresu e mail (AC-15).

const KIND = "producer_email_tracking" as const;

// Wersja tekstu zgody zapisywana w `user_consent.text_version`. To stała w kodzie, nie zmienna
// środowiskowa. "draft-1" to roboczy szkic tekstu (messages/*.json, ProducerEmailTrackingConsent),
// do zatwierdzenia przez prawnika przed produkcją. Po zmianie treści podnieś wersję.
export const EMAIL_TRACKING_CONSENT_VERSION = "draft-1";

export interface EmailTrackingConsentState {
  active: boolean;
  grantedAt: Date | null;
  textVersion: string | null;
}

// Udziela zgody. Gdy aktywna już istnieje, nic się nie zmienia (idempotentne), więc podwójne
// kliknięcie ani wyścig nie tworzą drugiego wiersza.
export async function grantEmailTrackingConsent(userId: string, textVersion: string = EMAIL_TRACKING_CONSENT_VERSION): Promise<void> {
  await db.insert(userConsent).values({ userId, kind: KIND, textVersion }).onConflictDoNothing();
}

// Wycofuje aktywną zgodę (AC-19). Wiersz zostaje, ustawiamy tylko `withdrawn_at`.
export async function withdrawEmailTrackingConsent(userId: string): Promise<void> {
  await db
    .update(userConsent)
    .set({ withdrawnAt: new Date() })
    .where(and(eq(userConsent.userId, userId), eq(userConsent.kind, KIND), isNull(userConsent.withdrawnAt)));
}

export async function getEmailTrackingConsentState(userId: string): Promise<EmailTrackingConsentState> {
  const [row] = await db
    .select({ grantedAt: userConsent.grantedAt, textVersion: userConsent.textVersion })
    .from(userConsent)
    .where(and(eq(userConsent.userId, userId), eq(userConsent.kind, KIND), isNull(userConsent.withdrawnAt)))
    .orderBy(desc(userConsent.grantedAt))
    .limit(1);
  return row ? { active: true, ...row } : { active: false, grantedAt: null, textVersion: null };
}

// AC-20: sprawdzenie per użytkownik (nie per firma), w chwili wysyłki i przy zapisie zdarzenia.
export async function hasActiveEmailTrackingConsent(userId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: userConsent.id })
    .from(userConsent)
    .where(and(eq(userConsent.userId, userId), eq(userConsent.kind, KIND), isNull(userConsent.withdrawnAt)))
    .limit(1);
  return Boolean(row);
}
