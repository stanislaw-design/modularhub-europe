import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { channel, inquiry, offer } from "@/lib/db/schema";

// Jedyne miejsce, które wylicza dostęp do sprawy doradczej i jej kanałów
// (spec 0048 AC-8, AC-31). Żadna trasa, akcja ani zapytanie nie sprawdza
// dostępu po swojemu i nigdy nie ufa identyfikatorowi podanemu przez klienta:
// aktor pochodzi z sesji (lib/cases/actor.ts), sprawa i kanał z bazy.

export type CaseActor =
  | { kind: "client"; userId: string; clientId: string }
  | { kind: "producer"; userId: string; producerId: string }
  | { kind: "advisor"; userId: string };

type ChannelKind = (typeof channel.$inferSelect)["kind"];

export interface CaseAccessContext {
  inquiry: {
    id: string;
    clientId: string;
    stage: (typeof inquiry.$inferSelect)["stage"];
    // Producent oferty wskazanej w finalist_offer_id, null przed wyborem.
    finalistProducerId: string | null;
  };
  channel?: {
    id: string;
    inquiryId: string;
    kind: ChannelKind;
    producerId: string | null;
  };
}

export interface CaseAccess {
  role: CaseActor["kind"];
  inquiryId: string;
  channelId: string | null;
}

// Czysta decyzja, bez dostępu do bazy, żeby całą macierz uprawnień dało się
// przetestować bez połączenia. null znaczy "brak dostępu" i jest identyczne
// dla "nie ma takiej sprawy" i "to nie twoja sprawa" (bez wycieku istnienia).
export function evaluateCaseAccess(actor: CaseActor, context: CaseAccessContext): CaseAccess | null {
  const { inquiry: caseRow, channel: channelRow } = context;

  // Stare zapytania bezpośrednie nie mają sprawy doradczej ani kanałów.
  if (caseRow.stage === "legacy_direct") return null;
  if (channelRow && channelRow.inquiryId !== caseRow.id) return null;

  const grant: CaseAccess = { role: actor.kind, inquiryId: caseRow.id, channelId: channelRow?.id ?? null };

  if (actor.kind === "advisor") return grant;

  if (actor.kind === "client") {
    if (caseRow.clientId !== actor.clientId) return null;
    if (!channelRow) return grant;
    // Klient nigdy nie czyta kanałów producent_doradca (AC-8).
    return channelRow.kind === "klient_doradca" || channelRow.kind === "wspolny" ? grant : null;
  }

  // Producent: bez kanału nie ma dostępu do sprawy. Dostęp do samej sprawy
  // (brief, zaproszenie) dochodzi z tabelą producer_invitation (spec 0048
  // krok 9). Do tego czasu producent widzi wyłącznie kanał, który należy do
  // niego, i nic więcej.
  if (!channelRow || channelRow.producerId !== actor.producerId) return null;
  if (channelRow.kind === "producent_doradca") return grant;
  if (channelRow.kind === "wspolny") {
    return caseRow.finalistProducerId === actor.producerId ? grant : null;
  }
  return null;
}

async function loadCaseAccessContext(inquiryId: string, channelId?: string): Promise<CaseAccessContext | null> {
  const [caseRow] = await db
    .select({
      id: inquiry.id,
      clientId: inquiry.clientId,
      stage: inquiry.stage,
      finalistProducerId: offer.producerId,
    })
    .from(inquiry)
    .leftJoin(offer, eq(offer.id, inquiry.finalistOfferId))
    .where(eq(inquiry.id, inquiryId));
  if (!caseRow) return null;

  if (channelId === undefined) return { inquiry: caseRow };

  const [channelRow] = await db
    .select({ id: channel.id, inquiryId: channel.inquiryId, kind: channel.kind, producerId: channel.producerId })
    .from(channel)
    .where(and(eq(channel.id, channelId), eq(channel.inquiryId, inquiryId)));
  if (!channelRow) return null;

  return { inquiry: caseRow, channel: channelRow };
}

// Wspólna funkcja dostępu (spec 0048 Key invariants). Zwraca null zamiast
// rzucać, żeby wywołujący (akcja, Route Handler) odpowiedział tym samym
// generycznym 403 lub 404 niezależnie od powodu odmowy.
export async function requireCaseAccess(
  actor: CaseActor,
  inquiryId: string,
  channelId?: string,
): Promise<CaseAccess | null> {
  const context = await loadCaseAccessContext(inquiryId, channelId);
  if (!context) return null;
  return evaluateCaseAccess(actor, context);
}
