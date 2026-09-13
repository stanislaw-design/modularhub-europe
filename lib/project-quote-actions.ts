"use server";

import { z } from "zod";
import { and, eq, isNull, sql } from "drizzle-orm";
import { AuthError } from "next-auth";
import { auth, signIn } from "@/auth";
import { db } from "@/lib/db/client";
import { getPgErrorCode } from "@/lib/db/pg-error";
import { getClientIdForUser, getProducerIdForUser } from "@/lib/db/queries";
import {
  bulkProductInquiry,
  client,
  pendingRegistration,
  product,
  producerCapacityProfile,
  projectQuote,
  projectRequest,
  projectRequestTargetProducer,
  users,
} from "@/lib/db/schema";
import {
  certificationsSchema,
  completionStandardsSupportedSchema,
  leadTimeTiersSchema,
  pastProjectReferencesSchema,
} from "@/lib/producer-capacity-profile-specs";
import { captureError, trackEvent } from "@/lib/observability";

interface ActionResult {
  ok: boolean;
  error?: string;
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
    totalPriceEur: z.number().positive(),
    unitPriceEur: z.number().positive().optional(),
    proposedLeadTimeWeeks: z.number().int().positive().optional(),
    notes: z.string().trim().min(1).optional(),
  })
  .refine((data) => Boolean(data.projectRequestId) !== Boolean(data.bulkProductInquiryId), {
    message: "Podaj dokładnie jedno z projectRequestId/bulkProductInquiryId.",
    path: ["projectRequestId"],
  });

export type SubmitProjectQuoteInput = z.input<typeof submitProjectQuoteSchema>;

function toPriceCents(value: number): number {
  return Math.round(value * 100);
}

// Login link na contactEmail zapisany na zapytaniu (AC-11): ten sam mechanizm
// linku magicznego co dzisiejsze logowanie (spec 0023). Kontakt bez konta nie
// ma jeszcze wiersza pending_registration (ten zawsze powstawał dotąd tylko
// przez formularz rejestracji), więc adapter Auth.js (auth.ts createUser)
// rzuciłby "brak oczekującej rejestracji" — insert tu, tylko gdy naprawdę nie
// ma ani users, ani pending_registration, żeby nie nadpisać cudzej,
// prawdziwej rejestracji w toku (onConflictDoNothing). Best-effort: błąd
// wysyłki nie cofa zapisanej wyceny (spec 0037 API surface: "dostarczenie e
// maila poza zakresem tego sprawdzenia").
async function notifyContactOfNewQuote(contactEmail: string, contactName: string, contactPhone: string | null): Promise<void> {
  try {
    const [existingUser] = await db.select({ id: users.id }).from(users).where(eq(users.email, contactEmail));
    if (!existingUser) {
      await db
        .insert(pendingRegistration)
        .values({ email: contactEmail, role: "client", payload: { name: contactName, phone: contactPhone ?? "" } })
        .onConflictDoNothing();
    }
    // "/pl": jedyny aktywny locale (AGENTS.md), ten sam fallback co
    // app/[locale]/(customer)/login/page.tsx. Panel jeszcze nie pokazuje tych
    // nowych zapytań (ekrany to przyszła decyzja, spec 0037 Follow-up) — to
    // tylko bezpieczny, istniejący cel, nie docelowy widok tej funkcji.
    await signIn("resend", { email: contactEmail, redirect: false, redirectTo: "/pl/panel" });
  } catch (error) {
    if (!(error instanceof AuthError)) throw error;
    captureError(error, { path: "submitProjectQuote:notifyContact" });
  }
}

// Producent odpowiada wyceną na project_request (musi mieć wiersz w
// project_request_target_producer) lub na bulk_product_inquiry dla własnego
// produktu (AC-3, AC-5). Rewizja tego samego producenta na to samo zapytanie
// zastępuje poprzednią aktywną wycenę atomowo (ten sam wzorzec co submitOffer,
// spec 0033), nie sprawdzeniem przed zapisem.
export async function submitProjectQuote(input: SubmitProjectQuoteInput): Promise<ActionResult> {
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

  let contact: { name: string; email: string; phone: string | null } | null = null;

  if (data.projectRequestId) {
    const [targetRow] = await db
      .select({ id: projectRequestTargetProducer.producerId })
      .from(projectRequestTargetProducer)
      .where(
        and(
          eq(projectRequestTargetProducer.projectRequestId, data.projectRequestId),
          eq(projectRequestTargetProducer.producerId, producerId),
        ),
      );
    if (!targetRow) {
      return { ok: false, error: "Nie jesteś przypisany do tego zapytania." };
    }
    const [requestRow] = await db
      .select({ name: projectRequest.contactName, email: projectRequest.contactEmail, phone: projectRequest.contactPhone })
      .from(projectRequest)
      .where(eq(projectRequest.id, data.projectRequestId));
    if (!requestRow) return { ok: false, error: "Nie znaleziono zapytania." };
    contact = { name: requestRow.name, email: requestRow.email, phone: requestRow.phone };
  } else if (data.bulkProductInquiryId) {
    const [inquiryRow] = await db
      .select({
        name: bulkProductInquiry.contactName,
        email: bulkProductInquiry.contactEmail,
        phone: bulkProductInquiry.contactPhone,
      })
      .from(bulkProductInquiry)
      .innerJoin(product, and(eq(product.id, bulkProductInquiry.productId), eq(product.producerId, producerId)))
      .where(eq(bulkProductInquiry.id, data.bulkProductInquiryId));
    if (!inquiryRow) {
      return { ok: false, error: "Nie znaleziono zapytania dla Twojego produktu." };
    }
    contact = { name: inquiryRow.name, email: inquiryRow.email, phone: inquiryRow.phone };
  }
  if (!contact) return { ok: false, error: GENERIC_ERROR };

  const newQuoteId = crypto.randomUUID();
  const totalPriceCents = toPriceCents(data.totalPriceEur);
  const unitPriceCents = data.unitPriceEur !== undefined ? toPriceCents(data.unitPriceEur) : null;

  try {
    const supersedeCondition = data.projectRequestId
      ? and(eq(projectQuote.projectRequestId, data.projectRequestId), eq(projectQuote.producerId, producerId), eq(projectQuote.status, "active"))
      : and(
          eq(projectQuote.bulkProductInquiryId, data.bulkProductInquiryId!),
          eq(projectQuote.producerId, producerId),
          eq(projectQuote.status, "active"),
        );

    const batchResults = await db.batch([
      db.update(projectQuote).set({ status: "superseded" }).where(supersedeCondition),
      data.projectRequestId
        ? db.execute(sql`
            INSERT INTO "project_quote" ("id", "project_request_id", "producer_id", "currency", "unit_price_cents", "total_price_cents", "proposed_lead_time_weeks", "notes", "status", "submitted_at", "created_at")
            SELECT ${newQuoteId}, ${data.projectRequestId}, ${producerId}, 'EUR', ${unitPriceCents}, ${totalPriceCents}, ${data.proposedLeadTimeWeeks ?? null}, ${data.notes ?? null}, 'active', now(), now()
            WHERE NOT EXISTS (SELECT 1 FROM "project_quote" WHERE "project_request_id" = ${data.projectRequestId} AND "producer_id" = ${producerId} AND "status" = 'accepted')
          `)
        : db.execute(sql`
            INSERT INTO "project_quote" ("id", "bulk_product_inquiry_id", "producer_id", "currency", "unit_price_cents", "total_price_cents", "proposed_lead_time_weeks", "notes", "status", "submitted_at", "created_at")
            SELECT ${newQuoteId}, ${data.bulkProductInquiryId}, ${producerId}, 'EUR', ${unitPriceCents}, ${totalPriceCents}, ${data.proposedLeadTimeWeeks ?? null}, ${data.notes ?? null}, 'active', now(), now()
            WHERE NOT EXISTS (SELECT 1 FROM "project_quote" WHERE "bulk_product_inquiry_id" = ${data.bulkProductInquiryId} AND "producer_id" = ${producerId} AND "status" = 'accepted')
          `),
    ]);

    const insertResult = batchResults[1] as { rowCount: number | null };
    if ((insertResult.rowCount ?? 0) === 0) {
      return { ok: false, error: "Klient już przyjął wcześniejszą wycenę na to zapytanie — nie można jej zastąpić." };
    }

    if (data.projectRequestId) {
      await db.batch([
        db.update(projectRequest).set({ status: "quoted" }).where(and(eq(projectRequest.id, data.projectRequestId), eq(projectRequest.status, "open"))),
        db
          .update(projectRequestTargetProducer)
          .set({ status: "quoted" })
          .where(and(eq(projectRequestTargetProducer.projectRequestId, data.projectRequestId), eq(projectRequestTargetProducer.producerId, producerId))),
      ]);
    } else {
      await db
        .update(bulkProductInquiry)
        .set({ status: "quoted" })
        .where(and(eq(bulkProductInquiry.id, data.bulkProductInquiryId!), eq(bulkProductInquiry.status, "open")));
    }
  } catch (error) {
    captureError(error, { path: "submitProjectQuote", userId: session.user.id });
    return { ok: false, error: isUniqueViolation(error) ? "Ktoś właśnie zapisał wycenę na to zapytanie. Odśwież i spróbuj ponownie." : GENERIC_ERROR };
  }

  await notifyContactOfNewQuote(contact.email, contact.name, contact.phone);
  trackEvent("project_quote_submitted", { quoteId: newQuoteId }, session.user.id);
  return { ok: true };
}

// AC-2: producent oznacza zapytanie jako obejrzane albo odrzuca je, tylko dla
// własnego wiersza project_request_target_producer.
export async function markProjectRequestViewedOrDeclined(
  projectRequestId: string,
  decision: "viewed" | "declined",
): Promise<ActionResult> {
  const session = await auth();
  if (!session || session.user.role !== "producer") {
    return { ok: false, error: "Musisz być zalogowany jako producent." };
  }
  const producerId = await getProducerIdForUser(session.user.id);
  if (!producerId) {
    return { ok: false, error: "Nie znaleziono konta producenta." };
  }

  const updated = await db
    .update(projectRequestTargetProducer)
    .set({ status: decision, viewedAt: decision === "viewed" ? new Date() : undefined })
    .where(
      and(
        eq(projectRequestTargetProducer.projectRequestId, projectRequestId),
        eq(projectRequestTargetProducer.producerId, producerId),
      ),
    )
    .returning({ producerId: projectRequestTargetProducer.producerId });
  if (updated.length === 0) {
    return { ok: false, error: "Nie znaleziono zapytania." };
  }
  return { ok: true };
}

// AC-9: akceptacja wymaga b2bVerificationStatus = 'approved'; akceptuje
// dokładnie jedną wycenę na całe zapytanie, pozostałe aktywne dostają
// 'rejected' w tej samej operacji. Guard EXISTS na krokach 2/3 (ten sterownik
// nie wspiera db.transaction, patrz lib/db/AGENTS.md) trzyma je no-opem, gdy
// krok 1 przegrał wyścig z unikalnym indeksem project_quote_accepted_per_*.
export async function acceptProjectQuote(quoteId: string): Promise<ActionResult> {
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
      id: projectQuote.id,
      status: projectQuote.status,
      projectRequestId: projectQuote.projectRequestId,
      bulkProductInquiryId: projectQuote.bulkProductInquiryId,
    })
    .from(projectQuote)
    .where(eq(projectQuote.id, quoteId));
  if (!quoteRow) return { ok: false, error: "Nie znaleziono wyceny." };

  const parentClientId = quoteRow.projectRequestId
    ? (await db.select({ clientId: projectRequest.clientId }).from(projectRequest).where(eq(projectRequest.id, quoteRow.projectRequestId)))[0]?.clientId
    : (await db.select({ clientId: bulkProductInquiry.clientId }).from(bulkProductInquiry).where(eq(bulkProductInquiry.id, quoteRow.bulkProductInquiryId!)))[0]?.clientId;
  if (parentClientId !== clientId) return { ok: false, error: "Nie znaleziono wyceny." };

  const [clientRow] = await db.select({ b2bVerificationStatus: client.b2bVerificationStatus }).from(client).where(eq(client.id, clientId));
  if (clientRow?.b2bVerificationStatus !== "approved") {
    return { ok: false, error: "Twoja weryfikacja B2B nie jest jeszcze zatwierdzona przez administratora." };
  }

  if (quoteRow.status === "accepted") return { ok: true };
  if (quoteRow.status !== "active") return { ok: false, error: RACE_ERROR };

  try {
    await db.batch([
      db.update(projectQuote).set({ status: "accepted" }).where(and(eq(projectQuote.id, quoteId), eq(projectQuote.status, "active"))),
      quoteRow.projectRequestId
        ? db.execute(sql`
            UPDATE "project_quote" SET "status" = 'rejected'
            WHERE "project_request_id" = ${quoteRow.projectRequestId} AND "id" != ${quoteId} AND "status" = 'active'
              AND EXISTS (SELECT 1 FROM "project_quote" WHERE "id" = ${quoteId} AND "status" = 'accepted')
          `)
        : db.execute(sql`
            UPDATE "project_quote" SET "status" = 'rejected'
            WHERE "bulk_product_inquiry_id" = ${quoteRow.bulkProductInquiryId} AND "id" != ${quoteId} AND "status" = 'active'
              AND EXISTS (SELECT 1 FROM "project_quote" WHERE "id" = ${quoteId} AND "status" = 'accepted')
          `),
      quoteRow.projectRequestId
        ? db.execute(sql`
            UPDATE "project_request" SET "status" = 'accepted'
            WHERE "id" = ${quoteRow.projectRequestId}
              AND EXISTS (SELECT 1 FROM "project_quote" WHERE "id" = ${quoteId} AND "status" = 'accepted')
          `)
        : db.execute(sql`
            UPDATE "bulk_product_inquiry" SET "status" = 'accepted'
            WHERE "id" = ${quoteRow.bulkProductInquiryId}
              AND EXISTS (SELECT 1 FROM "project_quote" WHERE "id" = ${quoteId} AND "status" = 'accepted')
          `),
    ]);
  } catch (error) {
    captureError(error, { path: "acceptProjectQuote", userId: session.user.id });
    return { ok: false, error: "Nie udało się zaakceptować wyceny. Odśwież i spróbuj ponownie." };
  }

  const [after] = await db.select({ status: projectQuote.status }).from(projectQuote).where(eq(projectQuote.id, quoteId));
  if (after?.status !== "accepted") {
    return { ok: false, error: RACE_ERROR };
  }

  trackEvent("project_quote_accepted", { quoteId }, session.user.id);
  return { ok: true };
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
  certifications: certificationsSchema.default([]),
  canCustomizeClientDesign: z.boolean().default(false),
  customizationNote: z.string().trim().min(1).optional(),
  canHandleTransport: z.boolean().default(false),
  canHandleAssembly: z.boolean().default(false),
  capabilityNote: z.string().trim().min(1).optional(),
  pastProjectReferences: pastProjectReferencesSchema.default([]),
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
    certifications: data.certifications,
    canCustomizeClientDesign: data.canCustomizeClientDesign,
    customizationNote: data.customizationNote ?? null,
    canHandleTransport: data.canHandleTransport,
    canHandleAssembly: data.canHandleAssembly,
    capabilityNote: data.capabilityNote ?? null,
    pastProjectReferences: data.pastProjectReferences,
    updatedAt: new Date(),
  };

  try {
    await db
      .insert(producerCapacityProfile)
      .values(values)
      .onConflictDoUpdate({ target: producerCapacityProfile.producerId, set: values });
  } catch (error) {
    captureError(error, { path: "updateProducerCapacityProfile", userId: session.user.id });
    return { ok: false, error: "Nie udało się zapisać profilu zdolności produkcyjnej." };
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
    db.update(projectRequest).set({ clientId }).where(and(eq(projectRequest.contactEmail, email), isNull(projectRequest.clientId))),
    db.update(bulkProductInquiry).set({ clientId }).where(and(eq(bulkProductInquiry.contactEmail, email), isNull(bulkProductInquiry.clientId))),
  ]);
}

// ---------------------------------------------------------------------------
// Weryfikacja B2B klienta (AC-8): brakująca połowa AC-8 znaleziona przez
// /check verify (spec 0037) -- tabela/enum istniały od zadania 1, ale nie było
// żadnej funkcji, którą klient mógłby faktycznie uzupełnić NIP/nazwę firmy.
// ---------------------------------------------------------------------------

const submitClientB2bDetailsSchema = z.object({
  nip: z.string().trim().min(1, "Podaj NIP."),
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

export async function setProducerVolumeVerification(producerId: string, status: "approved" | "rejected"): Promise<ActionResult> {
  const session = await auth();
  if (!session || session.user.role !== "admin") {
    return { ok: false, error: "Musisz być zalogowany jako administrator." };
  }
  const updated = await db
    .update(producerCapacityProfile)
    .set({ volumeVerificationStatus: status })
    .where(eq(producerCapacityProfile.producerId, producerId))
    .returning({ producerId: producerCapacityProfile.producerId });
  if (updated.length === 0) {
    return { ok: false, error: "Nie znaleziono profilu zdolności producenta." };
  }
  return { ok: true };
}

export async function setClientB2bVerification(clientId: string, status: "approved" | "rejected"): Promise<ActionResult> {
  const session = await auth();
  if (!session || session.user.role !== "admin") {
    return { ok: false, error: "Musisz być zalogowany jako administrator." };
  }
  const updated = await db
    .update(client)
    .set({ b2bVerificationStatus: status })
    .where(eq(client.id, clientId))
    .returning({ id: client.id });
  if (updated.length === 0) {
    return { ok: false, error: "Nie znaleziono klienta." };
  }
  return { ok: true };
}
