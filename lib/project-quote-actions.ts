"use server";

import { randomUUID } from "node:crypto";
import { z } from "zod";
import { and, eq, inArray, isNotNull, isNull, sql } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/lib/db/client";
import { getPgErrorCode, getPgErrorMessage } from "@/lib/db/pg-error";
import { withAdminActor } from "@/lib/db/with-admin-actor";
import { doesProducerMatchProjectRequest } from "@/lib/db/project-request-matching";
import { getClientIdForUser, getProducerIdForUser } from "@/lib/db/queries";
import {
  bulkProductInquiry,
  client,
  document,
  product,
  producer,
  producerCapacityProfile,
  producerDeliveryCountry,
  projectQuote,
  projectRequest,
} from "@/lib/db/schema";
import {
  completionStandardsSupportedSchema,
  leadTimeTiersSchema,
  pastProjectReferencesSchema,
} from "@/lib/producer-capacity-profile-specs";
import { connectPendingSelectionsForClient, connectSelection } from "@/lib/large-order-connection";
import { notifyTeamOfPendingSelection } from "@/lib/notifications/large-order-connection";
import { notifyTeamOfNewQuote } from "@/lib/notifications/large-order-team";
import { captureError, trackEvent } from "@/lib/observability";
import {
  DELIVERY_WINDOW_ORDER_MESSAGE,
  isDeliveryWindowOrdered,
  projectQuoteFieldsShape,
  toStoredLogistics,
} from "@/lib/project-quote-specs";
import { validateDocumentPdf } from "@/lib/storage/document-pdf-validation";
import { buildSignedDownloadUrl, uploadPrivateObject } from "@/lib/storage/private-r2-client";
import { buildR2Key } from "@/lib/storage/r2-client";

interface ActionResult {
  ok: boolean;
  error?: string;
}

// quoteId w wyniku (spec 0063 AC-1): pozwala QuoteForm wywołać
// uploadProjectQuotePdf zaraz po udanym złożeniu, bez osobnego odczytu.
interface SubmitProjectQuoteResult extends ActionResult {
  quoteId?: string;
}

const GENERIC_ERROR = "Nie udało się zapisać wyceny. Spróbuj ponownie.";
const RACE_ERROR = "Ta wycena nie jest już aktywna — mogła zostać właśnie zastąpiona lub jej stan się zmienił. Odśwież stronę.";

// getPgErrorCode (nie samo error.code) odpakowuje kod spod DrizzleQueryError.cause
// -- patrz lib/db/pg-error.ts; ta sama /debug naprawa co isBulkRequestEmailLimitError.
function isUniqueViolation(error: unknown): boolean {
  return getPgErrorCode(error) === "23505";
}

// ---------------------------------------------------------------------------
// Wycena producenta (AC-3, AC-5, AC-11): współdzielona dla obu ścieżek.
// ---------------------------------------------------------------------------

const submitProjectQuoteSchema = z
  .object({
    projectRequestId: z.uuid().optional(),
    bulkProductInquiryId: z.uuid().optional(),
    // Spec 0077 AC-11: nazwa wariantu, wymagana tylko przy projekcie własnym (sprawdza akcja).
    variantLabel: z.string().optional(),
    ...projectQuoteFieldsShape,
  })
  .refine((data) => Boolean(data.projectRequestId) !== Boolean(data.bulkProductInquiryId), {
    message: "Podaj dokładnie jedno z projectRequestId/bulkProductInquiryId.",
    path: ["projectRequestId"],
  })
  .refine(isDeliveryWindowOrdered, { message: DELIVERY_WINDOW_ORDER_MESSAGE, path: ["deliveryWindowTo"] });

export type SubmitProjectQuoteInput = z.input<typeof submitProjectQuoteSchema>;

function toPriceCents(value: number): number {
  return Math.round(value * 100);
}

const DEADLINE_PASSED_ERROR = "Termin składania ofert na to zapytanie minął.";
const SELECTION_MADE_ERROR = "Klient wybrał już ofertę na to zapytanie — nie można składać nowych.";
const NOT_OPEN_ERROR = "To zapytanie nie jest już otwarte na wyceny.";
const PUBLISHED_LOCK_ERROR =
  "Ta oferta jest już opublikowana klientowi. Nową wersję złożysz, gdy ModularHub cofnie jej publikację.";
const VARIANT_REQUIRED_ERROR = "Podaj nazwę wariantu (1 do 60 znaków).";
const VARIANT_NOT_ALLOWED_ERROR = "To zapytanie klienta nie przyjmuje wariantów oferty.";
const VARIANT_LIMIT_ERROR = "Masz już pięć aktywnych wariantów w tym projekcie. Wycofaj jeden, żeby dodać kolejny.";
const PLATFORM_SELECTION_DONE_ERROR = "Wybór w tym projekcie został już zakończony — nie można składać nowych ofert.";
const ALREADY_ACCEPTED_ERROR = "Klient już przyjął wcześniejszą wycenę na to zapytanie — nie można jej zastąpić.";

// Stan zapytania, od którego zależy przyjęcie oferty (spec 0070 AC-12): termin,
// wybór klienta i status. Czytany przed zapisem tylko po to, żeby producent
// dostał czytelny komunikat; prawdziwą granicą jest ten sam warunek w SQL obu
// kroków batcha (patrz openForQuotesSql).
function quoteBlockReason(
  state: { status: string; deadlineAt: Date; selectedQuoteId: string | null },
  now: Date,
): string | null {
  if (state.status !== "open" && state.status !== "quoted" && state.status !== "published") return NOT_OPEN_ERROR;
  if (state.selectedQuoteId) return SELECTION_MADE_ERROR;
  if (state.deadlineAt.getTime() < now.getTime()) return DEADLINE_PASSED_ERROR;
  return null;
}

// Warunek AC-12 w SQL: zapytanie przed terminem, bez wyboru klienta i w statusie
// open, quoted albo published. Wstawiany do kroku zastąpienia poprzedniej oferty
// i do kroku INSERT, bo samo sprawdzenie w odczycie przed batchem nie zatrzyma
// wyścigu z wyborem klienta (wybrana oferta mogłaby zostać zastąpiona).
type QuoteTarget = { projectRequestId: string } | { bulkProductInquiryId: string };

function openForQuotesSql(target: QuoteTarget) {
  const [table, id] =
    "projectRequestId" in target
      ? (["project_request", target.projectRequestId] as const)
      : (["bulk_product_inquiry", target.bulkProductInquiryId] as const);
  return sql`EXISTS (
    SELECT 1 FROM ${sql.identifier(table)} r
    WHERE r."id" = ${id} AND r."deadline_at" >= now() AND r."selected_quote_id" IS NULL
      AND r."status" IN ('open', 'quoted', 'published')
  )`;
}

// Oferta opublikowana klientowi (published_to_client_at ustawione) nie jest
// zastępowana nową wersją, dopóki administrator nie cofnie jej publikacji
// (unpublishQuote), żeby klient widział zawsze jedną wersję oferty producenta
// (AC-14). Warunek dla kroku zastąpienia (UPDATE) i dla kroku INSERT.
function ownPublishedQuoteSql(target: QuoteTarget, producerId: string) {
  const [column, id] =
    "projectRequestId" in target
      ? (["project_request_id", target.projectRequestId] as const)
      : (["bulk_product_inquiry_id", target.bulkProductInquiryId] as const);
  return sql`EXISTS (
    SELECT 1 FROM "project_quote" pq
    WHERE pq.${sql.identifier(column)} = ${id} AND pq."producer_id" = ${producerId}
      AND pq."status" = 'active' AND pq."published_to_client_at" IS NOT NULL
  )`;
}

async function isOwnQuotePublished(ownPublishedQuote: ReturnType<typeof ownPublishedQuoteSql>): Promise<boolean> {
  const result = await db.execute<{ locked: boolean }>(sql`SELECT ${ownPublishedQuote} AS locked`);
  return result.rows[0]?.locked === true;
}

// Producent odpowiada wyceną na project_request (musi mieć
// volumeVerificationStatus = 'approved', pasować do zapytania regułą
// dopasowania spec 0070 AC-10 i zapytanie musi być wciąż open/quoted/published,
// AC-13 spec 0062) lub na bulk_product_inquiry dla własnego produktu (AC-3, AC-5 spec
// 0037, niezmienione). Rewizja tego samego producenta na to samo zapytanie
// zastępuje poprzednią aktywną wycenę atomowo (ten sam wzorzec co submitOffer,
// spec 0033), nie sprawdzeniem przed zapisem.
export async function submitProjectQuote(input: SubmitProjectQuoteInput): Promise<SubmitProjectQuoteResult> {
  const parsed = submitProjectQuoteSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Sprawdź dane formularza." };
  }
  const data = parsed.data;

  const session = await auth();
  if (!session || session.user.role !== "producer") {
    return { ok: false, error: "Musisz być zalogowany jako producent." };
  }
  const producerId = await getProducerIdForUser(session.user.id);
  if (!producerId) {
    return { ok: false, error: "Nie znaleziono konta producenta." };
  }

  let isPlatformOwned = false;
  if (data.projectRequestId) {
    // AC-13: realna granica bezpieczeństwa żyje tutaj, w samej akcji
    // serwerowej, nie tylko w bramce ekranu /producer/panel/board — ta
    // akcja jest wołalna niezależnie od UI, które ją woła.
    const [requestRow] = await db
      .select({
        status: projectRequest.status,
        deadlineAt: projectRequest.deadlineAt,
        selectedQuoteId: projectRequest.selectedQuoteId,
        isPlatformOwned: projectRequest.isPlatformOwned,
      })
      .from(projectRequest)
      .where(eq(projectRequest.id, data.projectRequestId));
    if (!requestRow) return { ok: false, error: "Nie znaleziono zapytania." };
    isPlatformOwned = requestRow.isPlatformOwned;
    // Spec 0077 AC-9: projekt własny omija bramkę weryfikacji wolumenowej, dopasowanie
    // (wiersz include) sprawdza ta sama funkcja niżej.
    if (!isPlatformOwned) {
      const [capacityRow] = await db
        .select({ status: producerCapacityProfile.volumeVerificationStatus })
        .from(producerCapacityProfile)
        .where(eq(producerCapacityProfile.producerId, producerId));
      if (capacityRow?.status !== "approved") {
        return { ok: false, error: "Twój profil zdolności produkcyjnej nie jest jeszcze zweryfikowany wolumenowo." };
      }
    }
    // Spec 0070 AC-10: ta sama reguła dopasowania co lista i szczegół tablicy.
    // Ten sam komunikat co brak zapytania, żeby niedopasowany producent nie
    // dowiadywał się, że zapytanie istnieje.
    if (!(await doesProducerMatchProjectRequest(producerId, data.projectRequestId))) {
      return { ok: false, error: "Nie znaleziono zapytania." };
    }
    const blockReason = quoteBlockReason(requestRow, new Date());
    if (blockReason) return { ok: false, error: blockReason };
  } else if (data.bulkProductInquiryId) {
    const [inquiryRow] = await db
      .select({
        status: bulkProductInquiry.status,
        deadlineAt: bulkProductInquiry.deadlineAt,
        selectedQuoteId: bulkProductInquiry.selectedQuoteId,
      })
      .from(bulkProductInquiry)
      .innerJoin(product, and(eq(product.id, bulkProductInquiry.productId), eq(product.producerId, producerId)))
      .where(eq(bulkProductInquiry.id, data.bulkProductInquiryId));
    if (!inquiryRow) {
      return { ok: false, error: "Nie znaleziono zapytania dla Twojego produktu." };
    }
    const blockReason = quoteBlockReason(inquiryRow, new Date());
    if (blockReason) return { ok: false, error: blockReason };
  }

  // Spec 0077 AC-11: etykieta wariantu wymagana wtedy i tylko wtedy, gdy projekt jest własny.
  const variantLabel = data.variantLabel?.trim() ?? "";
  if (isPlatformOwned) {
    if (variantLabel.length < 1 || variantLabel.length > 60) return { ok: false, error: VARIANT_REQUIRED_ERROR };
  } else if (variantLabel.length > 0) {
    return { ok: false, error: VARIANT_NOT_ALLOWED_ERROR };
  }
  const storedVariantLabel = isPlatformOwned ? variantLabel : null;

  const newQuoteId = crypto.randomUUID();
  const totalPriceCents = toPriceCents(data.totalPriceEur);
  const unitPriceCents = data.unitPriceEur !== undefined ? toPriceCents(data.unitPriceEur) : null;
  const logisticsJson = JSON.stringify(toStoredLogistics(data.logistics ?? {}));
  const target: QuoteTarget = data.projectRequestId
    ? { projectRequestId: data.projectRequestId }
    : { bulkProductInquiryId: data.bulkProductInquiryId! };
  const openForQuotes = openForQuotesSql(target);
  const ownPublishedQuote = ownPublishedQuoteSql(target, producerId);
  if (await isOwnQuotePublished(ownPublishedQuote)) return { ok: false, error: PUBLISHED_LOCK_ERROR };

  try {
    // Oba kroki niosą warunek openForQuotes: batch jest atomowy, ale jego kroki
    // nie zależą od siebie, więc bez tego samego warunku w kroku zastąpienia
    // przegrany wyścig z wyborem klienta zastąpiłby wybraną ofertę bez wstawienia nowej.
    // Spec 0077 AC-45: blokada doradcza na projekcie, ta sama co w finishPlatformSelection,
    // więc zakończenie wyboru i składanie oferty wykluczają się wzajemnie (dla zapytań
    // klientów blokada jest niegroźna, tylko serializuje oferty jednego zapytania).
    const lockStep = db.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${(data.projectRequestId ?? data.bulkProductInquiryId)!}))`);
    const batchResults = await db.batch([
      lockStep,
      data.projectRequestId
        ? db.execute(sql`
            UPDATE "project_quote" SET "status" = 'superseded'
            WHERE "project_request_id" = ${data.projectRequestId} AND "producer_id" = ${producerId} AND "status" = 'active'
              AND coalesce(lower(btrim("variant_label")), '') = coalesce(lower(btrim(${storedVariantLabel}::text)), '')
              AND ${openForQuotes} AND NOT ${ownPublishedQuote}
          `)
        : db.execute(sql`
            UPDATE "project_quote" SET "status" = 'superseded'
            WHERE "bulk_product_inquiry_id" = ${data.bulkProductInquiryId} AND "producer_id" = ${producerId} AND "status" = 'active'
              AND ${openForQuotes} AND NOT ${ownPublishedQuote}
          `),
      data.projectRequestId
        ? db.execute(sql`
            INSERT INTO "project_quote" ("id", "project_request_id", "producer_id", "variant_label", "currency", "unit_price_cents", "total_price_cents", "proposed_lead_time_weeks", "notes", "price_tax_mode", "vat_rate_percent", "scope_included", "scope_excluded", "logistics", "payment_plan", "valid_until", "warranty_note", "delivery_window_from", "delivery_window_to", "published_to_client_at", "status", "submitted_at", "created_at")
            SELECT ${newQuoteId}, ${data.projectRequestId}, ${producerId}, ${storedVariantLabel}, 'EUR', ${unitPriceCents}, ${totalPriceCents}, ${data.proposedLeadTimeWeeks ?? null}, ${data.notes ?? null}, ${data.priceTaxMode}, ${data.vatRatePercent ?? null}, ${data.scopeIncluded}, ${data.scopeExcluded ?? null}, ${logisticsJson}::jsonb, ${data.paymentPlan ?? null}, ${data.validUntil}::date, ${data.warrantyNote ?? null}, ${data.deliveryWindowFrom ?? null}::date, ${data.deliveryWindowTo ?? null}::date, NULL, 'active', now(), now()
            WHERE NOT EXISTS (SELECT 1 FROM "project_quote" WHERE "project_request_id" = ${data.projectRequestId} AND "status" = 'accepted')
              AND ${openForQuotes} AND NOT ${ownPublishedQuote}
          `)
        : db.execute(sql`
            INSERT INTO "project_quote" ("id", "bulk_product_inquiry_id", "producer_id", "currency", "unit_price_cents", "total_price_cents", "proposed_lead_time_weeks", "notes", "price_tax_mode", "vat_rate_percent", "scope_included", "scope_excluded", "logistics", "payment_plan", "valid_until", "warranty_note", "delivery_window_from", "delivery_window_to", "published_to_client_at", "status", "submitted_at", "created_at")
            SELECT ${newQuoteId}, ${data.bulkProductInquiryId}, ${producerId}, 'EUR', ${unitPriceCents}, ${totalPriceCents}, ${data.proposedLeadTimeWeeks ?? null}, ${data.notes ?? null}, ${data.priceTaxMode}, ${data.vatRatePercent ?? null}, ${data.scopeIncluded}, ${data.scopeExcluded ?? null}, ${logisticsJson}::jsonb, ${data.paymentPlan ?? null}, ${data.validUntil}::date, ${data.warrantyNote ?? null}, ${data.deliveryWindowFrom ?? null}::date, ${data.deliveryWindowTo ?? null}::date, NULL, 'active', now(), now()
            WHERE NOT EXISTS (SELECT 1 FROM "project_quote" WHERE "bulk_product_inquiry_id" = ${data.bulkProductInquiryId} AND "producer_id" = ${producerId} AND "status" = 'accepted')
              AND ${openForQuotes} AND NOT ${ownPublishedQuote}
          `),
    ]);

    const insertResult = batchResults[2] as { rowCount: number | null };
    if ((insertResult.rowCount ?? 0) === 0) {
      return { ok: false, error: await explainRejectedQuote(target, producerId) };
    }

    if (data.projectRequestId) {
      await db
        .update(projectRequest)
        .set({ status: "quoted" })
        .where(and(eq(projectRequest.id, data.projectRequestId), eq(projectRequest.status, "open")));
    } else {
      await db
        .update(bulkProductInquiry)
        .set({ status: "quoted" })
        .where(and(eq(bulkProductInquiry.id, data.bulkProductInquiryId!), eq(bulkProductInquiry.status, "open")));
    }
  } catch (error) {
    if (getPgErrorCode(error) === "P0001" && getPgErrorMessage(error)?.includes("platform_quote_variant_limit_exceeded")) {
      return { ok: false, error: VARIANT_LIMIT_ERROR };
    }
    captureError(error, { path: "submitProjectQuote", userId: session.user.id });
    return { ok: false, error: isUniqueViolation(error) ? "Ktoś właśnie zapisał wycenę na to zapytanie. Odśwież i spróbuj ponownie." : GENERIC_ERROR };
  }

  trackEvent("project_quote_submitted", { quoteId: newQuoteId }, session.user.id);
  await alertTeamOfNewQuote(target, producerId, totalPriceCents, storedVariantLabel);
  return { ok: true, quoteId: newQuoteId };
}

// Spec 0070 AC-24: zespół dostaje mail o nowej ofercie (klient jej jeszcze nie widzi).
// Best effort: błąd odczytu albo wysyłki trafia do Sentry i nie cofa zapisanej oferty.
async function alertTeamOfNewQuote(
  target: QuoteTarget,
  producerId: string,
  totalPriceCents: number,
  variantLabel: string | null,
): Promise<void> {
  try {
    const [producerRow] = await db.select({ name: producer.name }).from(producer).where(eq(producer.id, producerId));
    if ("projectRequestId" in target) {
      const [row] = await db
        .select({ countryCode: projectRequest.countryCode, unitCount: projectRequest.unitCount })
        .from(projectRequest)
        .where(eq(projectRequest.id, target.projectRequestId));
      if (!row) return;
      await notifyTeamOfNewQuote({
        kind: "request",
        id: target.projectRequestId,
        countryCode: row.countryCode,
        unitCount: row.unitCount,
        producerName: producerRow?.name ?? "",
        totalPriceCents,
        variantLabel,
      });
      return;
    }
    const [row] = await db
      .select({ countryCode: bulkProductInquiry.deliveryCountryCode, unitCount: bulkProductInquiry.unitCount })
      .from(bulkProductInquiry)
      .where(eq(bulkProductInquiry.id, target.bulkProductInquiryId));
    if (!row) return;
    await notifyTeamOfNewQuote({
      kind: "product",
      id: target.bulkProductInquiryId,
      countryCode: row.countryCode,
      unitCount: row.unitCount,
      producerName: producerRow?.name ?? "",
      totalPriceCents,
    });
  } catch (error) {
    captureError(error, { path: "submitProjectQuote:alertTeamOfNewQuote" });
  }
}

// Gdy INSERT nie wstawił wiersza (wyścig z terminem, wyborem albo zamknięciem
// między odczytem a zapisem), czytamy stan jeszcze raz i podajemy producentowi
// konkretny powód zamiast ogólnego błędu.
async function explainRejectedQuote(target: QuoteTarget, producerId: string): Promise<string> {
  if (await isOwnQuotePublished(ownPublishedQuoteSql(target, producerId))) return PUBLISHED_LOCK_ERROR;
  if ("projectRequestId" in target) {
    const [accepted] = await db
      .select({ id: projectQuote.id })
      .from(projectQuote)
      .where(and(eq(projectQuote.projectRequestId, target.projectRequestId), eq(projectQuote.status, "accepted")))
      .limit(1);
    if (accepted) {
      const [owner] = await db
        .select({ isPlatformOwned: projectRequest.isPlatformOwned })
        .from(projectRequest)
        .where(eq(projectRequest.id, target.projectRequestId));
      return owner?.isPlatformOwned ? PLATFORM_SELECTION_DONE_ERROR : ALREADY_ACCEPTED_ERROR;
    }
  }

  const [state] =
    "projectRequestId" in target
      ? await db
          .select({ status: projectRequest.status, deadlineAt: projectRequest.deadlineAt, selectedQuoteId: projectRequest.selectedQuoteId })
          .from(projectRequest)
          .where(eq(projectRequest.id, target.projectRequestId))
      : await db
          .select({ status: bulkProductInquiry.status, deadlineAt: bulkProductInquiry.deadlineAt, selectedQuoteId: bulkProductInquiry.selectedQuoteId })
          .from(bulkProductInquiry)
          .where(eq(bulkProductInquiry.id, target.bulkProductInquiryId));
  return (state && quoteBlockReason(state, new Date())) ?? NOT_OPEN_ERROR;
}

// Spec 0070 AC-16: klient wybiera jedną opublikowaną, aktywną ofertę na własne zapytanie i może
// zmienić wybór aż do połączenia stron. Wybór to jeden zapis jednego wiersza zapytania (bez
// indeksu unikalnego na ofertach), z warunkami w samym SQL: zapytanie jest własne, jeszcze
// nie połączone (żadna jego oferta nie ma contact_revealed_at) i wciąż aktywne, a oferta
// jest aktywna i opublikowana. Wybór nie ujawnia kontaktu: robi to dopiero connectSelection,
// które wymaga zatwierdzonego B2B (AC-17), więc ta akcja nie sprawdza B2B.
export type SelectProjectQuoteErrorCode = "not_found" | "already_connected" | "closed" | "stale" | "generic";

export interface SelectProjectQuoteResult extends ActionResult {
  // Kod dla interfejsu, który tłumaczy komunikat na język strony; error zostaje polskim zapasem.
  errorCode?: SelectProjectQuoteErrorCode;
  // connected: strony połączone od razu; pending_b2b: wybór zapisany, czeka na zatwierdzenie B2B.
  outcome?: "connected" | "pending_b2b";
}

const ALREADY_CONNECTED_ERROR = "Strony są już połączone. Skontaktuj się z ModularHub, jeśli chcesz coś zmienić.";
const REQUEST_CLOSED_ERROR = "To zapytanie jest już zamknięte.";

export async function selectProjectQuote(quoteId: string): Promise<SelectProjectQuoteResult> {
  if (!z.uuid().safeParse(quoteId).success) return { ok: false, error: QUOTE_NOT_FOUND_ERROR, errorCode: "not_found" };

  const session = await auth();
  if (!session || session.user.role !== "client") {
    return { ok: false, error: "Musisz być zalogowany jako klient." };
  }
  const clientId = await getClientIdForUser(session.user.id);
  if (!clientId) {
    return { ok: false, error: "Nie znaleziono konta klienta." };
  }

  const [quoteRow] = await db
    .select({
      projectRequestId: projectQuote.projectRequestId,
      bulkProductInquiryId: projectQuote.bulkProductInquiryId,
      publishedToClientAt: projectQuote.publishedToClientAt,
    })
    .from(projectQuote)
    .where(eq(projectQuote.id, quoteId));
  // Spec 0070 AC-13: klient nie zna oferty, której administrator mu nie opublikował.
  if (!quoteRow || !quoteRow.publishedToClientAt) return { ok: false, error: QUOTE_NOT_FOUND_ERROR, errorCode: "not_found" };

  const kind = quoteRow.projectRequestId ? "request" : "product";
  const parentId = (quoteRow.projectRequestId ?? quoteRow.bulkProductInquiryId) as string;
  const parent = kind === "request" ? projectRequest : bulkProductInquiry;
  const [before] = await db
    .select({ clientId: parent.clientId, selectedQuoteId: parent.selectedQuoteId })
    .from(parent)
    .where(eq(parent.id, parentId));
  // Ten sam komunikat dla cudzego i nieistniejącego zapytania, bez ujawniania istnienia.
  if (!before || before.clientId !== clientId) return { ok: false, error: QUOTE_NOT_FOUND_ERROR, errorCode: "not_found" };

  const parentTable = sql.identifier(kind === "request" ? "project_request" : "bulk_product_inquiry");
  const quoteLink = sql.identifier(kind === "request" ? "project_request_id" : "bulk_product_inquiry_id");
  try {
    const selected = await db.execute(sql`
      UPDATE ${parentTable} r SET "selected_quote_id" = q."id", "selected_at" = now(), "updated_at" = now()
      FROM "project_quote" q
      WHERE q."id" = ${quoteId} AND q.${quoteLink} = r."id"
        AND q."status" = 'active' AND q."published_to_client_at" IS NOT NULL
        AND r."client_id" = ${clientId} AND r."status" IN ('open', 'quoted', 'published')
        AND NOT EXISTS (
          SELECT 1 FROM "project_quote" c WHERE c.${quoteLink} = r."id" AND c."contact_revealed_at" IS NOT NULL
        )
    `);
    if ((selected.rowCount ?? 0) === 0) return { ok: false, ...(await explainRejectedSelection(kind, parentId, quoteId)) };
  } catch (error) {
    captureError(error, { path: "selectProjectQuote", userId: session.user.id });
    return { ok: false, error: "Nie udało się zapisać wyboru. Odśwież i spróbuj ponownie.", errorCode: "generic" };
  }

  trackEvent("project_quote_selected", { quoteId, kind }, session.user.id);

  // Najpierw zapis faktu (wybór), potem połączenie: przy równoczesnym zatwierdzeniu B2B drugie
  // zdarzenie zawsze widzi oba fakty, więc wybór nie zostanie oczekujący na zawsze (AC-17).
  try {
    const outcome = await connectSelection(kind, parentId);
    if (outcome === "pending_b2b") {
      // Zespół dostaje mail tylko przy pierwszym wyborze, nie przy każdej zmianie zdania klienta.
      if (before.selectedQuoteId === null) await notifyTeamOfPendingSelection({ kind, id: parentId });
      return { ok: true, outcome: "pending_b2b" };
    }
    // already_connected nie powinno wystąpić zaraz po zapisie, który wymaga braku połączenia.
    return { ok: true, outcome: outcome === "connected" ? "connected" : undefined };
  } catch (error) {
    // Wybór jest zapisany. Połączenie dokończy godzinne zadanie czyszczące albo administrator.
    captureError(error, { path: "selectProjectQuote:connectSelection", userId: session.user.id });
    return { ok: true };
  }
}

// Gdy UPDATE nie zmienił wiersza (wyścig albo oferta, która przestała być wybieralna),
// czytamy stan jeszcze raz i podajemy klientowi konkretny powód.
async function explainRejectedSelection(
  kind: "request" | "product",
  parentId: string,
  quoteId: string,
): Promise<{ error: string; errorCode: SelectProjectQuoteErrorCode }> {
  const parent = kind === "request" ? projectRequest : bulkProductInquiry;
  const link = kind === "request" ? projectQuote.projectRequestId : projectQuote.bulkProductInquiryId;
  const [connected] = await db
    .select({ id: projectQuote.id })
    .from(projectQuote)
    .where(and(eq(link, parentId), isNotNull(projectQuote.contactRevealedAt)))
    .limit(1);
  if (connected) return { error: ALREADY_CONNECTED_ERROR, errorCode: "already_connected" };
  const [row] = await db.select({ status: parent.status }).from(parent).where(eq(parent.id, parentId));
  if (!row || (row.status !== "open" && row.status !== "quoted" && row.status !== "published")) {
    return { error: REQUEST_CLOSED_ERROR, errorCode: "closed" };
  }
  const [quote] = await db
    .select({ status: projectQuote.status, publishedToClientAt: projectQuote.publishedToClientAt })
    .from(projectQuote)
    .where(eq(projectQuote.id, quoteId));
  if (!quote || quote.status !== "active" || !quote.publishedToClientAt) return { error: RACE_ERROR, errorCode: "stale" };
  return { error: "Nie udało się zapisać wyboru. Odśwież i spróbuj ponownie.", errorCode: "generic" };
}

export type QuoteProducerOutcome = "signed" | "no_agreement" | "withdrew";
export type ReportQuoteOutcomeErrorCode = "not_found" | "not_winner" | "already_reported";

export interface ReportQuoteOutcomeResult extends ActionResult {
  errorCode?: ReportQuoteOutcomeErrorCode;
}

const quoteOutcomeSchema = z.object({
  quoteId: z.uuid(),
  outcome: z.enum(["signed", "no_agreement", "withdrew"]),
});

// Spec 0070 AC-18: zwycięski producent (oferta accepted, kontakt ujawniony) potwierdza wynik:
// podpisano umowę, brak porozumienia albo wycofanie. Zapis tylko raz, warunek (własna oferta,
// status accepted, brak wcześniejszego wyniku) jest w samym SQL, więc dwa kliknięcia nie
// nadpiszą wyniku. Zmiana zapisanego wyniku wymaga administratora (poza tą akcją).
export async function reportQuoteOutcome(quoteId: string, outcome: QuoteProducerOutcome): Promise<ReportQuoteOutcomeResult> {
  const parsed = quoteOutcomeSchema.safeParse({ quoteId, outcome });
  if (!parsed.success) return { ok: false, error: QUOTE_NOT_FOUND_ERROR, errorCode: "not_found" };

  const session = await auth();
  if (!session || session.user.role !== "producer") {
    return { ok: false, error: "Musisz być zalogowany jako producent.", errorCode: "not_found" };
  }
  const producerId = await getProducerIdForUser(session.user.id);
  if (!producerId) return { ok: false, error: QUOTE_NOT_FOUND_ERROR, errorCode: "not_found" };

  try {
    const [updated] = await db
      .update(projectQuote)
      .set({ producerOutcome: parsed.data.outcome, producerOutcomeAt: sql`now()` })
      .where(
        and(
          eq(projectQuote.id, parsed.data.quoteId),
          eq(projectQuote.producerId, producerId),
          eq(projectQuote.status, "accepted"),
          isNotNull(projectQuote.contactRevealedAt),
          isNull(projectQuote.producerOutcome),
        ),
      )
      .returning({ id: projectQuote.id });
    if (updated) {
      trackEvent("project_quote_outcome_reported", { outcome: parsed.data.outcome }, parsed.data.quoteId);
      return { ok: true };
    }

    const [existing] = await db
      .select({ status: projectQuote.status, producerOutcome: projectQuote.producerOutcome })
      .from(projectQuote)
      .where(and(eq(projectQuote.id, parsed.data.quoteId), eq(projectQuote.producerId, producerId)));
    if (!existing) return { ok: false, error: QUOTE_NOT_FOUND_ERROR, errorCode: "not_found" };
    if (existing.producerOutcome) {
      return { ok: false, error: "Wynik został już zapisany. Aby go zmienić, skontaktuj się z ModularHub.", errorCode: "already_reported" };
    }
    return { ok: false, error: "Wynik można potwierdzić tylko dla wybranej oferty.", errorCode: "not_winner" };
  } catch (error) {
    captureError(error, { path: "reportQuoteOutcome", userId: session.user.id });
    return { ok: false, error: "Nie udało się zapisać wyniku. Spróbuj ponownie." };
  }
}

// ---------------------------------------------------------------------------
// Opcjonalny PDF wyceny (spec 0063): prywatny magazyn, nigdy publiczny R2.
// ---------------------------------------------------------------------------

const MAX_QUOTE_PDF_BYTES = 20 * 1024 * 1024;
const QUOTE_PDF_SIGNED_URL_TTL_SECONDS = 10 * 60;
const QUOTE_NOT_FOUND_ERROR = "Nie znaleziono wyceny.";

export interface UploadProjectQuotePdfResult extends ActionResult {
  documentId?: string;
}

// AC-13: sprawdzenie status = 'active' jest częścią tego samego db.batch co
// zapis (WHERE EXISTS, ten sam wzorzec co EXISTS w connectSelection
// wyżej), nie tylko wcześniejszym odczytem -- równoległa akceptacja tej samej
// wyceny nie może zostawić okna na podmianę pliku na już zaakceptowanej
// ofercie. Usunięcie starego wiersza jest warunkowane tym samym EXISTS, żeby
// przegrany wyścig nie skasował istniejącego, już trwałego pliku zaakceptowanej
// wyceny bez wstawienia nowego w jego miejsce.
export async function uploadProjectQuotePdf(quoteId: string, file: File): Promise<UploadProjectQuotePdfResult> {
  const session = await auth();
  if (!session || session.user.role !== "producer") {
    return { ok: false, error: "Musisz być zalogowany jako producent." };
  }
  const producerId = await getProducerIdForUser(session.user.id);
  if (!producerId) {
    return { ok: false, error: "Nie znaleziono konta producenta." };
  }

  const [quoteRow] = await db
    .select({ producerId: projectQuote.producerId, status: projectQuote.status })
    .from(projectQuote)
    .where(eq(projectQuote.id, quoteId));
  if (!quoteRow) return { ok: false, error: QUOTE_NOT_FOUND_ERROR };
  if (quoteRow.producerId !== producerId) return { ok: false, error: "Nie masz dostępu do tej wyceny." };
  if (quoteRow.status !== "active") return { ok: false, error: RACE_ERROR };

  const buffer = Buffer.from(await file.arrayBuffer());
  const validation = validateDocumentPdf(buffer, MAX_QUOTE_PDF_BYTES);
  if (!validation.ok) {
    return { ok: false, error: validation.error ?? "Nieprawidłowy plik PDF." };
  }

  const r2Key = buildR2Key(file.name);
  try {
    await uploadPrivateObject(r2Key, buffer, "application/pdf");
  } catch (error) {
    captureError(error, { path: "uploadProjectQuotePdf", userId: session.user.id });
    return { ok: false, error: "Nie udało się wgrać pliku do magazynu. Spróbuj ponownie." };
  }

  const newDocumentId = randomUUID();
  const activeQuoteCondition = sql`EXISTS (SELECT 1 FROM "project_quote" WHERE "id" = ${quoteId} AND "producer_id" = ${producerId} AND "status" = 'active')`;
  try {
    const batchResults = await db.batch([
      db.execute(sql`
        UPDATE "document" SET "deleted_at" = now()
        WHERE "project_quote_id" = ${quoteId} AND "purpose" = 'project_quote_pdf' AND "deleted_at" IS NULL
          AND ${activeQuoteCondition}
      `),
      db.execute(sql`
        INSERT INTO "document" ("id", "r2_key", "filename", "mime_type", "size_bytes", "purpose", "owner_user_id", "project_quote_id", "created_at")
        SELECT ${newDocumentId}, ${r2Key}, ${file.name}, 'application/pdf', ${buffer.byteLength}, 'project_quote_pdf', ${session.user.id}, ${quoteId}, now()
        WHERE ${activeQuoteCondition}
      `),
    ]);

    const insertResult = batchResults[1] as { rowCount: number | null };
    if ((insertResult.rowCount ?? 0) === 0) {
      return { ok: false, error: RACE_ERROR };
    }
  } catch (error) {
    captureError(error, { path: "uploadProjectQuotePdf", userId: session.user.id });
    return { ok: false, error: "Plik trafił do magazynu, ale zapis w bazie się nie powiódł. Spróbuj ponownie." };
  }

  trackEvent("project_quote_pdf_uploaded", { quoteId }, session.user.id);
  return { ok: true, documentId: newDocumentId };
}

export interface GetProjectQuotePdfUrlResult extends ActionResult {
  url?: string;
}

// AC-7, AC-10: ten sam błąd „nie znaleziono" dla wyceny nieistniejącej i dla
// braku uprawnień -- nigdy przecieku istnienia innemu producentowi. URL jest
// generowany na nowo przy każdym wywołaniu (nigdy zapisywany/cache'owany) i
// nigdy nie trafia do captureError/trackEvent (tylko quoteId, ten sam wzorzec
// oczyszczania co lib/observability/scrub.ts).
export async function getProjectQuotePdfUrl(quoteId: string): Promise<GetProjectQuotePdfUrlResult> {
  const session = await auth();
  if (!session) return { ok: false, error: QUOTE_NOT_FOUND_ERROR };

  const [quoteRow] = await db
    .select({
      producerId: projectQuote.producerId,
      projectRequestId: projectQuote.projectRequestId,
      bulkProductInquiryId: projectQuote.bulkProductInquiryId,
      publishedToClientAt: projectQuote.publishedToClientAt,
    })
    .from(projectQuote)
    .where(eq(projectQuote.id, quoteId));
  if (!quoteRow) return { ok: false, error: QUOTE_NOT_FOUND_ERROR };

  let allowed = false;
  if (session.user.role === "admin") {
    // Spec 0070 AC-22: administrator ma własną ścieżkę do PDF każdej oferty,
    // także nieopublikowanej (klient jej nie widzi do publikacji podsumowania).
    allowed = true;
  } else if (session.user.role === "producer") {
    const producerId = await getProducerIdForUser(session.user.id);
    allowed = producerId !== null && producerId === quoteRow.producerId;
  } else if (session.user.role === "client") {
    const clientId = await getClientIdForUser(session.user.id);
    const parentClientId = quoteRow.projectRequestId
      ? (await db.select({ clientId: projectRequest.clientId }).from(projectRequest).where(eq(projectRequest.id, quoteRow.projectRequestId)))[0]?.clientId
      : (await db.select({ clientId: bulkProductInquiry.clientId }).from(bulkProductInquiry).where(eq(bulkProductInquiry.id, quoteRow.bulkProductInquiryId!)))[0]?.clientId;
    // Spec 0070 AC-13: PDF nieopublikowanej oferty jest dla klienta niewidoczny.
    allowed = clientId !== null && parentClientId !== null && parentClientId === clientId && quoteRow.publishedToClientAt !== null;
  }
  if (!allowed) return { ok: false, error: QUOTE_NOT_FOUND_ERROR };

  const [documentRow] = await db
    .select({ r2Key: document.r2Key, filename: document.filename })
    .from(document)
    .where(and(eq(document.projectQuoteId, quoteId), eq(document.purpose, "project_quote_pdf"), isNull(document.deletedAt)));
  if (!documentRow) return { ok: false, error: QUOTE_NOT_FOUND_ERROR };

  try {
    const url = await buildSignedDownloadUrl(documentRow.r2Key, QUOTE_PDF_SIGNED_URL_TTL_SECONDS, documentRow.filename);
    return { ok: true, url };
  } catch (error) {
    captureError(error, { path: "getProjectQuotePdfUrl", userId: session.user.id });
    return { ok: false, error: "Nie udało się przygotować linku do pliku. Spróbuj ponownie." };
  }
}

// ---------------------------------------------------------------------------
// Profil zdolności producenta (AC-6): rozszerzenie jeden do jednego, upsert.
// ---------------------------------------------------------------------------

const capacityProfileSchema = z.object({
  unitsPerMonth: z.number().int().positive().optional(),
  productionLines: z.number().int().positive().optional(),
  leadTimeTiers: leadTimeTiersSchema.default([]),
  maxModuleSizeM2: z.number().positive().optional(),
  completionStandardsSupported: completionStandardsSupportedSchema.default([]),
  canCustomizeClientDesign: z.boolean().default(false),
  customizationNote: z.string().trim().min(1).optional(),
  canHandleTransport: z.boolean().default(false),
  canHandleAssembly: z.boolean().default(false),
  capabilityNote: z.string().trim().min(1).optional(),
  pastProjectReferences: pastProjectReferencesSchema.default([]),
  // Spec 0070 AC-5: kraje dostawy (kody ISO), zapis do producer_delivery_country.
  deliveryCountryCodes: z
    .array(z.string().trim().length(2, "Kod kraju ma 2 litery."))
    .max(60)
    .default([]),
});

export type CapacityProfileInput = z.input<typeof capacityProfileSchema>;

// Zmiana pól nie resetuje volumeVerificationStatus na 'not_submitted' (spec
// 0037 nie tego nie wymaga): administrator zatwierdza/odrzuca osobną akcją
// (setProducerVolumeVerification), niezależnie od tego, ile razy producent
// jeszcze poprawi swój profil.
export async function updateProducerCapacityProfile(input: CapacityProfileInput): Promise<ActionResult> {
  const parsed = capacityProfileSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Sprawdź dane formularza." };
  }
  const data = parsed.data;

  const session = await auth();
  if (!session || session.user.role !== "producer") {
    return { ok: false, error: "Musisz być zalogowany jako producent." };
  }
  const producerId = await getProducerIdForUser(session.user.id);
  if (!producerId) {
    return { ok: false, error: "Nie znaleziono konta producenta." };
  }

  const values = {
    producerId,
    unitsPerMonth: data.unitsPerMonth ?? null,
    productionLines: data.productionLines ?? null,
    leadTimeTiers: data.leadTimeTiers,
    maxModuleSizeM2: data.maxModuleSizeM2 ?? null,
    completionStandardsSupported: data.completionStandardsSupported,
    canCustomizeClientDesign: data.canCustomizeClientDesign,
    customizationNote: data.customizationNote ?? null,
    canHandleTransport: data.canHandleTransport,
    canHandleAssembly: data.canHandleAssembly,
    capabilityNote: data.capabilityNote ?? null,
    pastProjectReferences: data.pastProjectReferences,
    updatedAt: new Date(),
  };

  const countryCodes = [...new Set(data.deliveryCountryCodes.map((code) => code.toUpperCase()))];

  try {
    await db.batch([
      db
        .insert(producerCapacityProfile)
        .values(values)
        .onConflictDoUpdate({ target: producerCapacityProfile.producerId, set: values }),
      ...deliveryCountryStatements(producerId, countryCodes),
    ]);
  } catch (error) {
    if (getPgErrorCode(error) === "23503") {
      return { ok: false, error: "Wybrano nieznany kraj dostawy." };
    }
    captureError(error, { path: "updateProducerCapacityProfile", userId: session.user.id });
    return { ok: false, error: "Nie udało się zapisać profilu zdolności produkcyjnej." };
  }
  return { ok: true };
}

// Zastępuje cały zestaw krajów dostawy producenta jedną atomową paczką: usunięcie
// starych wierszy i wstawienie nowych (lib/db/AGENTS.md: db.batch, nie transakcja).
function deliveryCountryStatements(producerId: string, countryCodes: string[]) {
  const deleteStatement = db.delete(producerDeliveryCountry).where(eq(producerDeliveryCountry.producerId, producerId));
  if (countryCodes.length === 0) return [deleteStatement] as const;
  return [
    deleteStatement,
    db.insert(producerDeliveryCountry).values(countryCodes.map((countryCode) => ({ producerId, countryCode }))),
  ] as const;
}

// Spec 0070 AC-5: "Wyślij do weryfikacji" zmienia not_submitted i rejected na
// pending. Zatwierdzony i oczekujący zostają bez zmian (edycja po zatwierdzeniu
// nie cofa statusu, spec 0037). Warunek w SQL, bez odczytu przed zapisem.
export async function submitCapacityProfileForReview(): Promise<ActionResult> {
  const session = await auth();
  if (!session || session.user.role !== "producer") {
    return { ok: false, error: "Musisz być zalogowany jako producent." };
  }
  const producerId = await getProducerIdForUser(session.user.id);
  if (!producerId) {
    return { ok: false, error: "Nie znaleziono konta producenta." };
  }
  try {
    const result = await db
      .update(producerCapacityProfile)
      .set({ volumeVerificationStatus: "pending", updatedAt: new Date() })
      .where(
        and(
          eq(producerCapacityProfile.producerId, producerId),
          // Moc przerobowa (domów na miesiąc) jest warunkiem wysyłki do weryfikacji:
          // na niej opiera się dopasowanie do dużych zamówień (spec 0070, Dopasowanie).
          isNotNull(producerCapacityProfile.unitsPerMonth),
          inArray(producerCapacityProfile.volumeVerificationStatus, ["not_submitted", "rejected"]),
        ),
      );
    if ((result.rowCount ?? 0) === 0) {
      return { ok: false, error: "Najpierw zapisz profil z mocą przerobową (liczba domów na miesiąc) albo został już wysłany do weryfikacji." };
    }
  } catch (error) {
    captureError(error, { path: "submitCapacityProfileForReview", userId: session.user.id });
    return { ok: false, error: "Nie udało się wysłać profilu do weryfikacji." };
  }
  return { ok: true };
}

// Spec 0070 AC-5: administrator poprawia kraje dostawy na ekranie producenta.
export async function setProducerDeliveryCountriesAsAdmin(
  producerId: string,
  countryCodes: string[],
): Promise<ActionResult> {
  const session = await auth();
  if (!session || session.user.role !== "admin") {
    return { ok: false, error: "Musisz być zalogowany jako administrator." };
  }
  const parsed = z.array(z.string().trim().length(2)).max(60).safeParse(countryCodes);
  if (!parsed.success) return { ok: false, error: "Sprawdź kody krajów." };
  const codes = [...new Set(parsed.data.map((code) => code.toUpperCase()))];
  try {
    await withAdminActor(session.user.id, deliveryCountryStatements(producerId, codes));
  } catch (error) {
    if (getPgErrorCode(error) === "23503") return { ok: false, error: "Wybrano nieznany kraj dostawy." };
    captureError(error, { path: "setProducerDeliveryCountriesAsAdmin", userId: session.user.id });
    return { ok: false, error: "Nie udało się zapisać krajów dostawy." };
  }
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Powiązanie po e mailu przy logowaniu (AC-7).
// ---------------------------------------------------------------------------

// Wołane z auth.ts (events.signIn) przy każdym udanym logowaniu klienta, nie
// tylko przy pierwszym: idempotentne dzięki filtrowi "clientId IS NULL", więc
// zapytanie wysłane anonimowo PO założeniu konta wciąż się dowiąże przy
// kolejnym logowaniu (spec 0037 AC-7 mówi o "pierwszym logowaniu" z
// perspektywy inwestora bez konta, nie ogranicza się do jednorazowego triggera
// po stronie aplikacji).
export async function linkRequestsToClientOnLogin(email: string, clientId: string): Promise<void> {
  await db.batch([
    // Spec 0077 AC-21: projekt własny ModularHub nigdy nie dostaje klienta z dopasowania e maila.
    db
      .update(projectRequest)
      .set({ clientId })
      .where(and(eq(projectRequest.contactEmail, email), isNull(projectRequest.clientId), eq(projectRequest.isPlatformOwned, false))),
    db.update(bulkProductInquiry).set({ clientId }).where(and(eq(bulkProductInquiry.contactEmail, email), isNull(bulkProductInquiry.clientId))),
  ]);
}

// ---------------------------------------------------------------------------
// Weryfikacja B2B klienta (AC-8): brakująca połowa AC-8 znaleziona przez
// /check verify (spec 0037) -- tabela/enum istniały od zadania 1, ale nie było
// żadnej funkcji, którą klient mógłby faktycznie uzupełnić NIP/nazwę firmy.
// ---------------------------------------------------------------------------

// Spec 0070 AC-6: NIP (10 cyfr) albo numer VAT UE (dwuliterowy prefiks kraju i
// 2 do 12 znaków alfanumerycznych), bo rynki DE i NL nie mają polskiego NIP.
// Spacje i myślniki są usuwane przed sprawdzeniem i przed zapisem.
const b2bTaxIdSchema = z
  .string()
  .trim()
  .min(1, "Podaj NIP.")
  .transform((value) => value.replace(/[\s-]/g, "").toUpperCase())
  .refine((value) => /^\d{10}$/.test(value) || /^[A-Z]{2}(?=[A-Z0-9]*\d)[A-Z0-9]{2,12}$/.test(value), {
    message: "Podaj NIP (10 cyfr) albo numer VAT UE z prefiksem kraju.",
  });

const submitClientB2bDetailsSchema = z.object({
  nip: b2bTaxIdSchema,
  companyName: z.string().trim().min(1, "Podaj nazwę firmy."),
});

export type SubmitClientB2bDetailsInput = z.input<typeof submitClientB2bDetailsSchema>;

// Uzupełnienie obu pól zawsze przenosi status na 'pending', również przy
// poprawianiu danych po 'rejected' (AC-8 nie wyklucza ponownego zgłoszenia;
// ten sam precedens co producerCapacityProfile, gdzie edycja profilu nie
// zeruje volumeVerificationStatus samoistnie, ale tu spec wprost mówi, że
// samo uzupełnienie "przenosi status na oczekujący", więc dotyczy to też
// poprawek po odrzuceniu).
export async function submitClientB2bDetails(input: SubmitClientB2bDetailsInput): Promise<ActionResult> {
  const parsed = submitClientB2bDetailsSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Sprawdź dane formularza." };
  }
  const data = parsed.data;

  const session = await auth();
  if (!session || session.user.role !== "client") {
    return { ok: false, error: "Musisz być zalogowany jako klient." };
  }
  const clientId = await getClientIdForUser(session.user.id);
  if (!clientId) {
    return { ok: false, error: "Nie znaleziono konta klienta." };
  }

  try {
    await db
      .update(client)
      .set({ nip: data.nip, companyName: data.companyName, b2bVerificationStatus: "pending" })
      .where(eq(client.id, clientId));
  } catch (error) {
    captureError(error, { path: "submitClientB2bDetails", userId: session.user.id });
    return { ok: false, error: "Nie udało się zapisać danych firmy. Spróbuj ponownie." };
  }
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Decyzje administratora (AC-6, AC-8).
// ---------------------------------------------------------------------------

// reason: powód odrzucenia (spec 0070 AC-3). Dziennik audytu zapisuje zmianę
// wiersza, nie dodatkowy tekst, więc powód trafia do zdarzenia analitycznego
// obok. Opcjonalny w akcji (stare wywołania), formularz admina go wymaga.
export async function setProducerVolumeVerification(
  producerId: string,
  status: "approved" | "rejected",
  reason?: string,
): Promise<ActionResult> {
  const session = await auth();
  if (!session || session.user.role !== "admin") {
    return { ok: false, error: "Musisz być zalogowany jako administrator." };
  }
  const [updated] = await withAdminActor(session.user.id, [
    db
      .update(producerCapacityProfile)
      .set({ volumeVerificationStatus: status })
      .where(eq(producerCapacityProfile.producerId, producerId))
      .returning({ producerId: producerCapacityProfile.producerId }),
  ]);
  if (updated.length === 0) {
    return { ok: false, error: "Nie znaleziono profilu zdolności producenta." };
  }
  trackEvent("producer_volume_verification_decided", { producerId, status, reason: reason?.trim() || null }, session.user.id);
  return { ok: true };
}

export async function setClientB2bVerification(
  clientId: string,
  status: "approved" | "rejected",
  reason?: string,
): Promise<ActionResult> {
  const session = await auth();
  if (!session || session.user.role !== "admin") {
    return { ok: false, error: "Musisz być zalogowany jako administrator." };
  }
  const [updated] = await withAdminActor(session.user.id, [
    db.update(client).set({ b2bVerificationStatus: status }).where(eq(client.id, clientId)).returning({ id: client.id }),
  ]);
  if (updated.length === 0) {
    return { ok: false, error: "Nie znaleziono klienta." };
  }
  trackEvent("client_b2b_verification_decided", { clientId, status, reason: reason?.trim() || null }, session.user.id);
  // Spec 0070 AC-17: po zapisaniu faktu (zatwierdzenie) łączymy zapytania tego klienta, których
  // wybór czekał na B2B. Błąd połączenia nie cofa zatwierdzenia, zaległość zbierze zadanie czyszczące.
  if (status === "approved") await connectPendingSelectionsForClient(clientId);
  return { ok: true };
}
