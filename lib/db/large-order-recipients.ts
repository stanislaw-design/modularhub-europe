import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { db } from "./client";
import { bulkProductInquiry, producer, producerMember, product, projectRequest, users } from "./schema";
import { producerMatchesProjectRequestSql } from "./project-request-matching";
import { normalizeCommunicationLocale, type CommunicationLocale } from "@/lib/producer-communication-locale";

export type LargeOrderKind = "request" | "product";

export interface LargeOrderProducerRecipient {
  producerId: string;
  email: string;
  // Język maili z konta producenta (spec 0077 AC-30), pobierany razem z adresem.
  locale: CommunicationLocale;
}

// Każdy użytkownik producenta (spec 0057: właściciel `producer.userId` i wszyscy z
// `producer_member`) dostaje maile o dużych zamówieniach, nie tylko właściciel. Adresy są
// deduplikowane w obrębie producenta; użytkownik bez adresu jest pomijany.
export async function getProducerUserEmails(producerIds: string[]): Promise<LargeOrderProducerRecipient[]> {
  if (producerIds.length === 0) return [];
  const [owners, members] = await Promise.all([
    db
      .select({ producerId: producer.id, email: users.email, locale: producer.communicationLocale })
      .from(producer)
      .innerJoin(users, eq(users.id, producer.userId))
      .where(inArray(producer.id, producerIds)),
    db
      .select({ producerId: producerMember.producerId, email: users.email, locale: producer.communicationLocale })
      .from(producerMember)
      .innerJoin(users, eq(users.id, producerMember.userId))
      .innerJoin(producer, eq(producer.id, producerMember.producerId))
      .where(inArray(producerMember.producerId, producerIds)),
  ]);
  const seen = new Set<string>();
  const result: LargeOrderProducerRecipient[] = [];
  for (const row of [...owners, ...members]) {
    if (!row.email) continue;
    const key = `${row.producerId}:${row.email.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push({ producerId: row.producerId, email: row.email, locale: normalizeCommunicationLocale(row.locale) });
  }
  return result;
}

// Spec 0070 część C: producenci, którzy dostają maile o dużym zamówieniu. Dla zapytania
// wolnego to ta sama reguła dopasowania co tablica (AC-10), dla zapytania o produkt
// producent tego produktu. `withoutQuote` zostawia tylko tych, którzy nie mają jeszcze
// aktywnej ani przyjętej oferty (adresaci przypomnień o terminie). Producent bez adresu
// e mail właściciela jest pomijany.
export async function getProducerRecipientsForLargeOrder(
  kind: LargeOrderKind,
  id: string,
  options: { withoutQuote?: boolean } = {},
): Promise<LargeOrderProducerRecipient[]> {
  const quoteColumn = kind === "request" ? sql.raw("q.project_request_id") : sql.raw("q.bulk_product_inquiry_id");
  const noQuote = options.withoutQuote
    ? sql`not exists (
        select 1 from project_quote q
        where ${quoteColumn} = ${id} and q.producer_id = ${producer.id} and q.status in ('active', 'accepted')
      )`
    : undefined;

  const rows =
    kind === "request"
      ? await db
          .select({ producerId: producer.id })
          .from(producer)
          .innerJoin(projectRequest, eq(projectRequest.id, id))
          .where(and(producerMatchesProjectRequestSql(sql`${producer.id}`), noQuote))
      : await db
          .select({ producerId: producer.id })
          .from(bulkProductInquiry)
          .innerJoin(product, eq(product.id, bulkProductInquiry.productId))
          .innerJoin(producer, eq(producer.id, product.producerId))
          .where(and(eq(bulkProductInquiry.id, id), isNull(producer.deletedAt), noQuote));

  return getProducerUserEmails(rows.map((row) => row.producerId));
}
