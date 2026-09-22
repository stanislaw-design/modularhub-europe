import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { channel, inquiry } from "@/lib/db/schema";

// Jedyne źródło spraw nowego przepływu doradczego dla panelu producenta (spec
// 0048 Key invariants). Baza nie jest tu bramką (aplikacja łączy się jako
// właściciel, bez RLS), więc gwarancję daje ten moduł: każde zapytanie ma
// jawną listę kolumn bez imienia, e maila, telefonu, pełnego adresu działki
// i wolnego tekstu klienta. Test lib/case-producer-queries.test.ts pilnuje,
// żeby żadna z tych kolumn się tu nie pojawiła.
//
// Dane kontaktowe i pełny adres producent dostaje dopiero po wyborze
// finalisty i zgodzie klienta (krok 12), osobną ścieżką, nie przez ten moduł.

export interface ProducerCaseSummary {
  id: string;
  stage: (typeof inquiry.$inferSelect)["stage"];
  deliveryCountryCode: string;
  plotRegion: string | null;
  receivedAt: Date;
}

// Dopóki nie ma tabeli zaproszeń (krok 9), producent "należy do sprawy"
// wyłącznie przez własny kanał producent_doradca, który powstaje dopiero
// razem z zaproszeniem po zatwierdzeniu briefu (AC-4). Krok 9 zastępuje ten
// warunek złączeniem z producer_invitation. Zwraca null, gdy sprawy nie ma
// albo producent nie ma do niej dostępu, bez rozróżniania powodu.
export async function getCaseSummaryForProducer(
  inquiryId: string,
  producerId: string,
): Promise<ProducerCaseSummary | null> {
  const [row] = await db
    .select({
      id: inquiry.id,
      stage: inquiry.stage,
      deliveryCountryCode: inquiry.deliveryCountryCode,
      plotRegion: inquiry.plotRegion,
      receivedAt: inquiry.receivedAt,
    })
    .from(inquiry)
    .innerJoin(
      channel,
      and(eq(channel.inquiryId, inquiry.id), eq(channel.kind, "producent_doradca"), eq(channel.producerId, producerId)),
    )
    .where(eq(inquiry.id, inquiryId));

  if (!row || row.stage === "legacy_direct") return null;
  return row;
}
