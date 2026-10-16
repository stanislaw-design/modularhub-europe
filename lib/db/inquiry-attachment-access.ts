import { eq, sql } from "drizzle-orm";
import { db } from "./client";
import { producerMatchesProjectRequestSql } from "./project-request-matching";
import { bulkProductInquiry, projectRequest } from "./schema";
import type { InquiryKind } from "@/lib/inquiry-attachment-specs";

// Spec 0070 AC-31: czy producent widzi pliki inwestora danego zapytania. Jedna funkcja
// dla listy i dla pobrania, liczona w SQL tą samą regułą dopasowania co AC-10 (dla
// zapytania wolnego) albo właścicielstwem produktu (dla zapytania o produkt).
//
// Producent widzi pliki, gdy nie jest zablokowany ani usunięty i spełnia któryś warunek:
//   a) jest dopasowany do zapytania, a zapytanie ma status open, quoted albo published,
//   b) ma na zapytaniu ofertę `active` (przy statusie open, quoted albo published),
//   c) ma na zapytaniu ofertę `accepted` (zawsze, także po zamknięciu).
// Wartość contact_revealed_at nie bramkuje plików: producent potrzebuje planów do oferty,
// a kontakt inwestora w polach systemu zostaje maskowany.
const ACTIVE_STATUSES_SQL = sql`('open', 'quoted', 'published')`;

function producerNotBlockedSql(producerId: string) {
  return sql`(
    exists (select 1 from producer a_p where a_p.id = ${producerId} and a_p.deleted_at is null)
    and not exists (
      select 1 from producer_member a_pm
      join users a_u on a_u.id = a_pm.user_id
      where a_pm.producer_id = ${producerId} and (a_u.blocked_at is not null or a_u.deleted_at is not null)
    )
  )`;
}

export async function canProducerSeeInquiryAttachments(
  producerId: string,
  kind: InquiryKind,
  inquiryId: string,
): Promise<boolean> {
  if (kind === "request") {
    const [row] = await db
      .select({
        allowed: sql<boolean>`(
          ${producerNotBlockedSql(producerId)}
          and (
            (${sql.raw('"project_request"."status"')} in ${ACTIVE_STATUSES_SQL} and ${producerMatchesProjectRequestSql(producerId)})
            or exists (
              select 1 from project_quote a_q
              where a_q.project_request_id = ${sql.raw('"project_request"."id"')} and a_q.producer_id = ${producerId}
                and (
                  (a_q.status = 'active' and ${sql.raw('"project_request"."status"')} in ${ACTIVE_STATUSES_SQL})
                  or a_q.status = 'accepted'
                )
            )
          )
        )`,
      })
      .from(projectRequest)
      .where(eq(projectRequest.id, inquiryId));
    return row?.allowed === true;
  }

  const [row] = await db
    .select({
      allowed: sql<boolean>`(
        ${producerNotBlockedSql(producerId)}
        and (
          (
            ${sql.raw('"bulk_product_inquiry"."status"')} in ${ACTIVE_STATUSES_SQL}
            and exists (
              select 1 from product a_pd
              where a_pd.id = ${sql.raw('"bulk_product_inquiry"."product_id"')} and a_pd.producer_id = ${producerId}
            )
          )
          or exists (
            select 1 from project_quote a_q
            where a_q.bulk_product_inquiry_id = ${sql.raw('"bulk_product_inquiry"."id"')} and a_q.producer_id = ${producerId}
              and (
                (a_q.status = 'active' and ${sql.raw('"bulk_product_inquiry"."status"')} in ${ACTIVE_STATUSES_SQL})
                or a_q.status = 'accepted'
              )
          )
        )
      )`,
    })
    .from(bulkProductInquiry)
    .where(eq(bulkProductInquiry.id, inquiryId));
  return row?.allowed === true;
}
