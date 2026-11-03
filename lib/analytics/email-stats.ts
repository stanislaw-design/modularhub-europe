import { and, count, countDistinct, desc, eq, gte, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { emailMessage } from "@/lib/db/schema";
import { captureError } from "@/lib/observability";

// Spec 0079 AC-10, AC-9, AC-11: agregaty dziennika maili do producentów (email_message) dla
// /internal/analytics. Źródło to sama baza Neon, więc widok Maile działa także wtedy, gdy PostHog
// nie odpowiada. Dostarczalność dotyczy wszystkich maili; otwarcia i kliknięcia (etap 3) tylko tych
// wysłanych w wariancie śledzonym (`tracked = true`), czyli do odbiorców z aktywną zgodą.

export type EmailStatsRange = 7 | 30 | 90;
export type EmailStatsResult<T> = { ok: true; data: T } | { ok: false };

export interface EmailStatsRow {
  // Typ maila albo id producenta, zależnie od grupowania.
  key: string;
  // Jeden wiersz dziennika to jeden odbiorca (AC-10).
  sent: number;
  // Unikalne zapytania (entity_id).
  uniqueRequests: number;
  delivered: number;
  bounced: number;
  complained: number;
  // Etap 3 (AC-10): tylko maile z `tracked = true`.
  trackedSent: number;
  // Maile śledzone z co najmniej jednym kliknięciem uznanym za ludzkie (unikalne, na wiersz dziennika).
  uniqueClicks: number;
  // Maile śledzone z co najmniej jednym otwarciem uznanym za ludzkie (bywa zawyżone).
  humanOpens: number;
}

export type EmailStatsTotals = Omit<EmailStatsRow, "key">;

const sinceDate = (days: EmailStatsRange) => new Date(Date.now() - days * 24 * 60 * 60 * 1000);

const aggregates = {
  sent: count(),
  uniqueRequests: countDistinct(emailMessage.entityId),
  delivered: count(emailMessage.deliveredAt),
  bounced: count(emailMessage.bouncedAt),
  complained: count(emailMessage.complainedAt),
  trackedSent: sql<number>`count(*) filter (where ${emailMessage.tracked})`.mapWith(Number),
  uniqueClicks: sql<number>`count(*) filter (where ${emailMessage.tracked} and ${emailMessage.clickCount} > 0)`.mapWith(Number),
  humanOpens: sql<number>`count(*) filter (where ${emailMessage.tracked} and ${emailMessage.openCount} > 0)`.mapWith(Number),
};

async function guarded<T>(path: string, read: () => Promise<T>): Promise<EmailStatsResult<T>> {
  try {
    return { ok: true, data: await read() };
  } catch (error) {
    captureError(error, { path });
    return { ok: false };
  }
}

// Dla każdego typu maila, opcjonalnie zawężone do jednego producenta (szczegół producenta, AC-9).
export function getEmailStatsByType(days: EmailStatsRange, producerId?: string): Promise<EmailStatsResult<EmailStatsRow[]>> {
  return guarded("getEmailStatsByType", async () => {
    const rows = await db
      .select({ key: emailMessage.emailType, ...aggregates })
      .from(emailMessage)
      .where(and(gte(emailMessage.sentAt, sinceDate(days)), producerId ? eq(emailMessage.producerId, producerId) : undefined))
      .groupBy(emailMessage.emailType)
      .orderBy(desc(count()));
    return rows;
  });
}

// Dla każdego producenta, opcjonalnie zawężone do jednego typu maila.
export function getEmailStatsByProducer(days: EmailStatsRange, emailType?: string): Promise<EmailStatsResult<EmailStatsRow[]>> {
  return guarded("getEmailStatsByProducer", async () => {
    const rows = await db
      .select({ key: emailMessage.producerId, ...aggregates })
      .from(emailMessage)
      .where(and(gte(emailMessage.sentAt, sinceDate(days)), emailType ? eq(emailMessage.emailType, emailType) : undefined))
      .groupBy(emailMessage.producerId)
      .orderBy(desc(count()))
      .limit(100);
    return rows;
  });
}

export function getEmailStatsTotals(days: EmailStatsRange, producerId?: string): Promise<EmailStatsResult<EmailStatsTotals>> {
  return guarded("getEmailStatsTotals", async () => {
    const [row] = await db
      .select(aggregates)
      .from(emailMessage)
      .where(and(gte(emailMessage.sentAt, sinceDate(days)), producerId ? eq(emailMessage.producerId, producerId) : undefined));
    return row ?? { sent: 0, uniqueRequests: 0, delivered: 0, bounced: 0, complained: 0, trackedSent: 0, uniqueClicks: 0, humanOpens: 0 };
  });
}
