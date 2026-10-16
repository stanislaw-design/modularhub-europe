import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "./client";
import { bulkProductInquiry, producer, product, projectRequest, users } from "./schema";
import { producerMatchesProjectRequestSql } from "./project-request-matching";

export type LargeOrderKind = "request" | "product";

export interface LargeOrderProducerRecipient {
  producerId: string;
  email: string;
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
          .select({ producerId: producer.id, email: users.email })
          .from(producer)
          .innerJoin(projectRequest, eq(projectRequest.id, id))
          .innerJoin(users, eq(users.id, producer.userId))
          .where(and(producerMatchesProjectRequestSql(sql`${producer.id}`), noQuote))
      : await db
          .select({ producerId: producer.id, email: users.email })
          .from(bulkProductInquiry)
          .innerJoin(product, eq(product.id, bulkProductInquiry.productId))
          .innerJoin(producer, eq(producer.id, product.producerId))
          .innerJoin(users, eq(users.id, producer.userId))
          .where(and(eq(bulkProductInquiry.id, id), isNull(producer.deletedAt), noQuote));

  return rows.flatMap((row) => (row.email ? [{ producerId: row.producerId, email: row.email }] : []));
}
