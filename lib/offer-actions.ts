"use server";

import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/lib/db/client";
import { getPgErrorCode } from "@/lib/db/pg-error";
import { getClientIdForUser, getProducerIdForUser } from "@/lib/db/queries";
import { inquiry, inquiryItem, offer, offerItem, order, orderStageEvent, product } from "@/lib/db/schema";
import { captureError } from "@/lib/observability/errors";
import { trackEvent } from "@/lib/observability";

interface ActionResult {
  ok: boolean;
  error?: string;
}

const GENERIC_ERROR = "Nie udało się zapisać oferty. Spróbuj ponownie.";
const ALREADY_ACCEPTED_ERROR = "Klient już przyjął wcześniejszą ofertę na to zapytanie — nie można jej zastąpić.";
const RACE_ERROR = "Ta oferta nie jest już aktywna — mogła zostać właśnie zastąpiona lub jej stan się zmienił. Odśwież stronę.";

function toPriceCents(value: number): number {
  return Math.round(value * 100);
}

// getPgErrorCode (nie samo error.code) odpakowuje kod spod DrizzleQueryError.cause
// -- drizzle-orm/neon-http opakowuje każdy błąd sterownika, patrz lib/db/pg-error.ts
// (/debug, spec 0037 /check verify: ten sam bliźniaczy błąd co isBulkRequestEmailLimitError).
function isUniqueViolation(error: unknown): boolean {
  return getPgErrorCode(error) === "23505";
}

// Przelicza inquiry.status po każdym zapisie offer (spec 0033 AC-10, Key
// invariants): 'closed' tylko gdy KAŻDY producer_id obecny w inquiry_item ma
// ofertę 'accepted', albo jest w stanie 'rejected' bez żadnej aktywnej —
// producent, który nigdy nie złożył oferty, nigdy formalnie nie osiąga stanu
// końcowego (znana, zaakceptowana granica tej funkcji, patrz spec Key invariants).
async function recomputeInquiryStatus(inquiryId: string): Promise<void> {
  const [producerRows, offerRows] = await Promise.all([
    db
      .selectDistinct({ producerId: product.producerId })
      .from(inquiryItem)
      .innerJoin(product, eq(product.id, inquiryItem.productId))
      .where(eq(inquiryItem.inquiryId, inquiryId)),
    db.select({ producerId: offer.producerId, status: offer.status }).from(offer).where(eq(offer.inquiryId, inquiryId)),
  ]);

  const allProducersTerminal =
    producerRows.length > 0 &&
    producerRows.every((producerRow) => {
      const own = offerRows.filter((row) => row.producerId === producerRow.producerId);
      if (own.some((row) => row.status === "accepted")) return true;
      return own.length > 0 && own.some((row) => row.status === "rejected") && own.every((row) => row.status === "rejected" || row.status === "superseded");
    });

  const nextStatus = allProducersTerminal ? "closed" : offerRows.length > 0 ? "offered" : "open";
  await db.update(inquiry).set({ status: nextStatus }).where(eq(inquiry.id, inquiryId));
}

async function createOrderForOffer(offerId: string, actorUserId: string): Promise<void> {
  const newOrderId = crypto.randomUUID();
  await db.batch([
    db.insert(order).values({ id: newOrderId, offerId, currentStage: "produkcja" }),
    db.insert(orderStageEvent).values({ orderId: newOrderId, stage: "produkcja", changedByUserId: actorUserId }),
  ]);
}

export interface SubmitOfferItemInput {
  productId: string;
  housePriceEur: number;
}

export interface SubmitOfferInput {
  inquiryId: string;
  items: SubmitOfferItemInput[];
  transportPriceEur: number;
  installationPriceEur: number;
}

// Producent odpowiada na realne zapytanie realną ofertą (spec 0033 AC-1,
// AC-2, AC-13, AC-15). Rewizja tego samego producenta na to samo zapytanie
// zastępuje poprzednią aktywną ofertę atomowo (AC-3): insert jest
// zagwarantowany warunkowo w tym samym db.batch co supersede starej
// aktywnej, nie sprawdzeniem przed zapisem — patrz Key invariants w spec
// 0033 (wyścig z akceptacją klienta, częściowy unikalny indeks obejmuje
// tylko status='active', nie 'accepted').
export async function submitOffer(input: SubmitOfferInput): Promise<ActionResult> {
  const session = await auth();
  if (!session || session.user.role !== "producer") {
    return { ok: false, error: "Musisz być zalogowany jako producent." };
  }
  const producerId = await getProducerIdForUser(session.user.id);
  if (!producerId) {
    return { ok: false, error: "Nie znaleziono konta producenta." };
  }
  if (input.items.length === 0) {
    return { ok: false, error: "Wyceń przynajmniej jeden produkt." };
  }
  if (
    input.items.some((item) => !Number.isFinite(item.housePriceEur) || item.housePriceEur < 0) ||
    !Number.isFinite(input.transportPriceEur) ||
    input.transportPriceEur < 0 ||
    !Number.isFinite(input.installationPriceEur) ||
    input.installationPriceEur < 0
  ) {
    return { ok: false, error: "Ceny nie mogą być ujemne." };
  }

  // AC-13: offer_item przyjmuje wyłącznie productId należące jednocześnie do
  // tego producenta i do tego zapytania; serwer nie ufa liście z formularza.
  const ownItemRows = await db
    .select({ productId: product.id })
    .from(inquiryItem)
    .innerJoin(product, and(eq(product.id, inquiryItem.productId), eq(product.producerId, producerId)))
    .where(eq(inquiryItem.inquiryId, input.inquiryId));
  const ownProductIds = new Set(ownItemRows.map((row) => row.productId));
  if (ownProductIds.size === 0) {
    return { ok: false, error: "Nie znaleziono zapytania z Twoimi produktami." };
  }
  const validItems = input.items.filter((item) => ownProductIds.has(item.productId));
  if (validItems.length === 0) {
    return { ok: false, error: "Żaden z wycenionych produktów nie należy do Twojego katalogu w tym zapytaniu." };
  }

  const newOfferId = crypto.randomUUID();
  const transportPriceCents = toPriceCents(input.transportPriceEur);
  const installationPriceCents = toPriceCents(input.installationPriceEur);

  try {
    const batchResults = await db.batch([
      db
        .update(offer)
        .set({ status: "superseded" })
        .where(and(eq(offer.inquiryId, input.inquiryId), eq(offer.producerId, producerId), eq(offer.status, "active"))),
      db.execute(sql`
        INSERT INTO "offer" ("id", "inquiry_id", "producer_id", "currency", "installation_price_cents", "transport_price_cents", "status", "submitted_at", "created_at")
        SELECT ${newOfferId}, ${input.inquiryId}, ${producerId}, 'EUR', ${installationPriceCents}, ${transportPriceCents}, 'active', now(), now()
        WHERE NOT EXISTS (
          SELECT 1 FROM "offer" WHERE "inquiry_id" = ${input.inquiryId} AND "producer_id" = ${producerId} AND "status" = 'accepted'
        )
      `),
    ]);

    const insertResult = batchResults[1] as { rowCount: number | null };
    if ((insertResult.rowCount ?? 0) === 0) {
      return { ok: false, error: ALREADY_ACCEPTED_ERROR };
    }

    await db.insert(offerItem).values(
      validItems.map((item) => ({
        offerId: newOfferId,
        productId: item.productId,
        housePriceCents: toPriceCents(item.housePriceEur),
      })),
    );

    await recomputeInquiryStatus(input.inquiryId);
  } catch (error) {
    // 23505 = unikalny indeks offer_active_per_inquiry_producer: dwie
    // karty/zakładki tego samego producenta wysyłające ofertę naraz (spec
    // 0033 Key invariants) — czytelny komunikat "spróbuj ponownie", nigdy
    // surowy błąd 500.
    captureError(error, { path: "submitOffer", userId: session.user.id });
    return { ok: false, error: isUniqueViolation(error) ? "Ktoś właśnie zapisał ofertę na to zapytanie. Odśwież i spróbuj ponownie." : GENERIC_ERROR };
  }

  trackEvent("offer_submitted", { inquiryId: input.inquiryId, offerId: newOfferId }, session.user.id);
  return { ok: true };
}

// Klient przyjmuje albo odrzuca jedną konkretną ofertę (spec 0033 AC-7,
// AC-8, AC-14, AC-19). Przyjęcie to dwustopniowy zapis (Key invariants, ten
// sterownik nie wspiera db.transaction, patrz lib/db/AGENTS.md): krok 1,
// warunkowy UPDATE osobno (0 wierszy -> AC-19, żaden order nie powstaje);
// krok 2, db.batch order + pierwszy order_stage_event, order.id wygenerowany
// w aplikacji. Idempotentne na powtórne wywołanie po częściowej awarii kroku
// 2 (offer już 'accepted', order jeszcze nie istnieje -> dokańcza wyłącznie
// krok 2).
export async function respondToOffer(offerId: string, decision: "accepted" | "rejected"): Promise<ActionResult> {
  const session = await auth();
  if (!session || session.user.role !== "client") {
    return { ok: false, error: "Musisz być zalogowany jako klient." };
  }
  const clientId = await getClientIdForUser(session.user.id);
  if (!clientId) {
    return { ok: false, error: "Nie znaleziono konta klienta." };
  }

  // AC-14: oferta musi należeć do własnego zapytania klienta.
  const [offerRow] = await db
    .select({ id: offer.id, inquiryId: offer.inquiryId, status: offer.status })
    .from(offer)
    .innerJoin(inquiry, eq(inquiry.id, offer.inquiryId))
    .where(and(eq(offer.id, offerId), eq(inquiry.clientId, clientId)));
  if (!offerRow) {
    return { ok: false, error: "Nie znaleziono oferty." };
  }

  try {
    if (decision === "rejected") {
      const updated = await db
        .update(offer)
        .set({ status: "rejected" })
        .where(and(eq(offer.id, offerId), eq(offer.status, "active")))
        .returning({ id: offer.id });
      if (updated.length === 0) {
        return { ok: false, error: RACE_ERROR };
      }
      await recomputeInquiryStatus(offerRow.inquiryId);
      trackEvent("offer_rejected", { offerId, inquiryId: offerRow.inquiryId }, session.user.id);
      return { ok: true };
    }

    const alreadyAccepted = offerRow.status === "accepted";
    if (!alreadyAccepted) {
      const accepted = await db
        .update(offer)
        .set({ status: "accepted" })
        .where(and(eq(offer.id, offerId), eq(offer.status, "active")))
        .returning({ id: offer.id });
      if (accepted.length === 0) {
        return { ok: false, error: RACE_ERROR };
      }
    }

    const [existingOrder] = await db.select({ id: order.id }).from(order).where(eq(order.offerId, offerId));
    if (!existingOrder) {
      await createOrderForOffer(offerId, session.user.id);
    }

    await recomputeInquiryStatus(offerRow.inquiryId);
    if (!alreadyAccepted) {
      trackEvent("offer_accepted", { offerId, inquiryId: offerRow.inquiryId }, session.user.id);
    }
    return { ok: true };
  } catch (error) {
    captureError(error, { path: "respondToOffer", userId: session.user.id });
    return { ok: false, error: "Nie udało się zapisać decyzji. Spróbuj ponownie." };
  }
}

// AC-11: sygnał nieprzeczytane znika po otwarciu szczegółów zapytania.
// Wywoływane wyłącznie z klienckiego handlera po faktycznym wejściu na
// stronę (patrz components/klient/MarkOfferViewed.tsx), nigdy z czegoś, co
// Next.js mógłby prefetchować. Idempotentne: no-op gdy już przeczytane.
export async function markOfferViewedByClient(inquiryId: string): Promise<void> {
  const session = await auth();
  if (!session || session.user.role !== "client") return;
  const clientId = await getClientIdForUser(session.user.id);
  if (!clientId) return;

  const [inquiryRow] = await db
    .select({ id: inquiry.id })
    .from(inquiry)
    .where(and(eq(inquiry.id, inquiryId), eq(inquiry.clientId, clientId)));
  if (!inquiryRow) return;

  await db
    .update(offer)
    .set({ clientViewedAt: new Date() })
    .where(and(eq(offer.inquiryId, inquiryId), eq(offer.status, "active"), isNull(offer.clientViewedAt)));
}

// AC-12: symetryczny sygnał po stronie producenta, znika po wejściu na
// /producer/panel/inquiries/[id] po decyzji klienta.
export async function markOfferDecisionViewedByProducer(inquiryId: string): Promise<void> {
  const session = await auth();
  if (!session || session.user.role !== "producer") return;
  const producerId = await getProducerIdForUser(session.user.id);
  if (!producerId) return;

  await db
    .update(offer)
    .set({ producerDecisionViewedAt: new Date() })
    .where(
      and(
        eq(offer.inquiryId, inquiryId),
        eq(offer.producerId, producerId),
        inArray(offer.status, ["accepted", "rejected"]),
        isNull(offer.producerDecisionViewedAt),
      ),
    );
}
