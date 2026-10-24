"use server";

import { z } from "zod";
import { intendedUseColumns, intendedUseRefinement, intendedUseShape } from "@/lib/intended-use";
import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { getMatchedProducersForRequest } from "@/lib/db/project-request-matching";
import { withAdminActor } from "@/lib/db/with-admin-actor";
import { bulkProductInquiry, product, projectQuote, projectRequest } from "@/lib/db/schema";
import {
  BULK_REQUEST_EMAIL_LIMIT_ERROR,
  computeTrustSignal,
  isBulkRequestEmailLimitError,
  normalizeContactEmail,
  projectRequestFamiliesSchema,
  PROJECT_TYPES,
} from "@/lib/project-request-specs";
import { COMPLETION_STANDARDS } from "@/lib/producer-capacity-profile-specs";
import { notifyClientOfRequestOnBehalf, notifyClientOfRequestReceived } from "@/lib/notifications/large-order-client";
import { closeLargeOrder } from "@/lib/large-order-close";
import { notifyProducersOfNewLargeOrder } from "@/lib/notifications/large-order-producer";
import { notifyTeamOfClientCancelledRequest, notifyTeamOfNewLargeOrder } from "@/lib/notifications/large-order-team";
import { stageClientRegistration } from "@/lib/stage-client-registration";
import { linkRequestsToClientOnLogin } from "@/lib/project-quote-actions";
import { auth } from "@/auth";
import { getClientIdForUser } from "@/lib/db/queries";
import { captureError, trackEvent } from "@/lib/observability";
import { createUploadToken } from "@/lib/inquiry-attachment-token";
import type { InquiryKind } from "@/lib/inquiry-attachment-specs";

// Spec 0070: zalogowany klient nie wpisuje danych drugi raz, formularz bierze je
// z konta. Zapytanie wiąże się z kontem od razu (clientId), ale tylko gdy
// podany e mail jest e mailem z sesji: zmieniony adres traktujemy jak zapytanie
// anonimowe, które dowiąże się przy logowaniu tym adresem (spec 0037, AC-7).
async function resolveSignedInClientId(contactEmail: string): Promise<string | null> {
  const session = await auth();
  if (!session || session.user.role !== "client" || !session.user.email) return null;
  if (normalizeContactEmail(session.user.email) !== contactEmail) return null;
  return getClientIdForUser(session.user.id);
}

// Liczba producentów, którzy widzą nowe zapytanie (spec 0070 AC-10), do alertu
// "brak dopasowanych". Best effort: błąd liczenia nie może zepsuć już zapisanego
// zapytania, więc zwraca undefined i trafia do Sentry.
async function countMatchedProducers(projectRequestId: string): Promise<number | undefined> {
  try {
    return (await getMatchedProducersForRequest(projectRequestId)).length;
  } catch (error) {
    captureError(error, { path: "submitProjectRequest:countMatchedProducers" });
    return undefined;
  }
}

interface ActionResult {
  ok: boolean;
  id?: string;
  error?: string;
  // Spec 0070 AC-39: kod błędu limitu, żeby formularz pokazał tłumaczony tekst z linkiem
  // do panelu, a nie polski komunikat z akcji (zostaje w `error` jako zapas).
  errorCode?: "email_limit";
  // Spec 0070 AC-29: token, którym gość bez konta wgrywa pliki do właśnie złożonego
  // zapytania (HMAC, 2 godziny). Brak tokenu nie psuje zapytania, tylko wgrywania.
  uploadToken?: string;
}

// Błąd wystawienia tokenu (np. brak AUTH_SECRET) nie może cofnąć już zapisanego zapytania.
function issueUploadToken(kind: InquiryKind, inquiryId: string): string | undefined {
  try {
    return createUploadToken(kind, inquiryId);
  } catch (error) {
    captureError(error, { path: "issueUploadToken" });
    return undefined;
  }
}

const GENERIC_ERROR = "Nie udało się wysłać zapytania. Spróbuj ponownie.";
// Spec 0070 AC-9: język strony, na której złożono zapytanie, zapisywany jako
// contact_locale i używany do maili do klienta.
const CONTACT_LOCALES = ["pl", "en", "de", "nl"];
const contactLocaleSchema = z
  .string()
  .optional()
  .transform((value) => (value && CONTACT_LOCALES.includes(value) ? value : "pl"));
const dateStringSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Nieprawidłowa data.");

const submitProjectRequestSchema = z
  .object({
    contactName: z.string().trim().min(1, "Podaj imię i nazwisko."),
    contactEmail: z.email("Podaj prawidłowy adres e mail."),
    contactPhone: z.string().trim().min(1).optional(),
    locale: contactLocaleSchema,
    countryCode: z.string().min(1, "Wybierz kraj."),
    locationDetail: z.string().trim().min(1).optional(),
    projectType: z.enum(PROJECT_TYPES),
    families: projectRequestFamiliesSchema,
    unitCount: z.number().int().min(3, "Minimalna liczba domów to 3."),
    floorAreaM2Min: z.number().positive().optional(),
    floorAreaM2Max: z.number().positive().optional(),
    completionStandard: z.enum(COMPLETION_STANDARDS).optional(),
    startWindowFrom: dateStringSchema.optional(),
    startWindowTo: dateStringSchema.optional(),
    deliveryWindowFrom: dateStringSchema.optional(),
    deliveryWindowTo: dateStringSchema.optional(),
    extrasNote: z.string().trim().min(1).optional(),
    ...intendedUseShape,
  })
  .refine(intendedUseRefinement.check, intendedUseRefinement.params)
  .refine((data) => !data.startWindowFrom || !data.startWindowTo || data.startWindowTo >= data.startWindowFrom, {
    message: "Data 'do' okna startu musi być równa lub późniejsza niż 'od'.",
    path: ["startWindowTo"],
  })
  .refine(
    (data) => !data.deliveryWindowFrom || !data.deliveryWindowTo || data.deliveryWindowTo >= data.deliveryWindowFrom,
    {
      message: "Data 'do' okna dostawy musi być równa lub późniejsza niż 'od'.",
      path: ["deliveryWindowTo"],
    },
  );

export type SubmitProjectRequestInput = z.input<typeof submitProjectRequestSchema>;

// Zapis zapytania jest zbudowany w jednym miejscu dla klienta (submitProjectRequest) i dla
// doradcy (createRequestOnBehalf, spec 0070 AC-20): zapytanie doradcy idzie przez
// withAdminActor, więc dostaje te same pola co zapytanie klienta, plus znacznik doradcy
// i zapis zgody. Funkcja nie wykonuje zapisu, zwraca polecenie do await albo do batcha.
interface StaffMeta {
  userId: string;
  consentNote: string;
}

function buildProjectRequestInsert(
  data: z.output<typeof submitProjectRequestSchema>,
  contactEmail: string,
  clientId: string | null,
  staff: StaffMeta | null,
) {
  return db
    .insert(projectRequest)
    .values({
      clientId,
      contactName: data.contactName,
      contactEmail,
      contactPhone: data.contactPhone ?? null,
      countryCode: data.countryCode,
      locationDetail: data.locationDetail ?? null,
      projectType: data.projectType,
      families: data.families,
      unitCount: data.unitCount,
      floorAreaM2Min: data.floorAreaM2Min ?? null,
      floorAreaM2Max: data.floorAreaM2Max ?? null,
      completionStandard: data.completionStandard ?? null,
      startWindowFrom: data.startWindowFrom ?? null,
      startWindowTo: data.startWindowTo ?? null,
      deliveryWindowFrom: data.deliveryWindowFrom ?? null,
      deliveryWindowTo: data.deliveryWindowTo ?? null,
      extrasNote: data.extrasNote ?? null,
      ...intendedUseColumns(data),
      trustSignal: computeTrustSignal(contactEmail, data.contactPhone),
      contactLocale: data.locale,
      createdByStaffUserId: staff?.userId ?? null,
      staffConsentNote: staff?.consentNote ?? null,
    })
    .returning({ id: projectRequest.id, deadlineAt: projectRequest.deadlineAt });
}

// AC-1: wolne zapytanie o duży projekt, bez logowania. clientId zostaje NULL
// aż do pierwszego logowania z pasującym e mailem (AC-7, spec 0037 Key
// invariants) — ta funkcja nigdy go nie ustawia.
export async function submitProjectRequest(input: SubmitProjectRequestInput): Promise<ActionResult> {
  const parsed = submitProjectRequestSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Sprawdź dane formularza." };
  }
  const data = parsed.data;
  const contactEmail = normalizeContactEmail(data.contactEmail);

  try {
    const clientId = await resolveSignedInClientId(contactEmail);
    const [inserted] = await buildProjectRequestInsert(data, contactEmail, clientId, null);

    trackEvent("project_request_submitted", { countryCode: data.countryCode, unitCount: data.unitCount }, inserted.id);
    await notifyTeamOfNewLargeOrder({
      kind: "request",
      id: inserted.id,
      countryCode: data.countryCode,
      unitCount: data.unitCount,
      deadlineAt: inserted.deadlineAt,
      contactLocale: data.locale,
      matchedProducerCount: await countMatchedProducers(inserted.id),
    });
    await notifyProducersOfNewLargeOrder({ kind: "request", id: inserted.id });
    await notifyClientOfRequestReceived({
      kind: "request",
      id: inserted.id,
      email: contactEmail,
      name: data.contactName,
      locale: data.locale,
      countryCode: data.countryCode,
      unitCount: data.unitCount,
      deadlineAt: inserted.deadlineAt,
    });
    return { ok: true, id: inserted.id, uploadToken: issueUploadToken("request", inserted.id) };
  } catch (error) {
    if (isBulkRequestEmailLimitError(error)) {
      return { ok: false, error: BULK_REQUEST_EMAIL_LIMIT_ERROR, errorCode: "email_limit" };
    }
    captureError(error, { path: "submitProjectRequest" });
    return { ok: false, error: GENERIC_ERROR };
  }
}

const submitBulkProductInquirySchema = z
  .object({
    productId: z.uuid(),
    contactName: z.string().trim().min(1, "Podaj imię i nazwisko."),
    contactEmail: z.email("Podaj prawidłowy adres e mail."),
    contactPhone: z.string().trim().min(1).optional(),
    locale: contactLocaleSchema,
    unitCount: z.number().int().min(3, "Minimalna liczba domów to 3."),
    deliveryCountryCode: z.string().min(1, "Wybierz kraj dostawy."),
    startWindowFrom: dateStringSchema.optional(),
    startWindowTo: dateStringSchema.optional(),
    deliveryWindowFrom: dateStringSchema.optional(),
    deliveryWindowTo: dateStringSchema.optional(),
    note: z.string().trim().min(1).optional(),
    ...intendedUseShape,
  })
  .refine(intendedUseRefinement.check, intendedUseRefinement.params)
  .refine((data) => !data.startWindowFrom || !data.startWindowTo || data.startWindowTo >= data.startWindowFrom, {
    message: "Data 'do' okna startu musi być równa lub późniejsza niż 'od'.",
    path: ["startWindowTo"],
  })
  .refine(
    (data) => !data.deliveryWindowFrom || !data.deliveryWindowTo || data.deliveryWindowTo >= data.deliveryWindowFrom,
    {
      message: "Data 'do' okna dostawy musi być równa lub późniejsza niż 'od'.",
      path: ["deliveryWindowTo"],
    },
  );

export type SubmitBulkProductInquiryInput = z.input<typeof submitBulkProductInquirySchema>;

function buildBulkProductInquiryInsert(
  data: z.output<typeof submitBulkProductInquirySchema>,
  contactEmail: string,
  clientId: string | null,
  staff: StaffMeta | null,
) {
  return db
    .insert(bulkProductInquiry)
    .values({
      clientId,
      productId: data.productId,
      contactName: data.contactName,
      contactEmail,
      contactPhone: data.contactPhone ?? null,
      unitCount: data.unitCount,
      deliveryCountryCode: data.deliveryCountryCode,
      startWindowFrom: data.startWindowFrom ?? null,
      startWindowTo: data.startWindowTo ?? null,
      deliveryWindowFrom: data.deliveryWindowFrom ?? null,
      deliveryWindowTo: data.deliveryWindowTo ?? null,
      note: data.note ?? null,
      ...intendedUseColumns(data),
      contactLocale: data.locale,
      createdByStaffUserId: staff?.userId ?? null,
      staffConsentNote: staff?.consentNote ?? null,
    })
    .returning({ id: bulkProductInquiry.id, deadlineAt: bulkProductInquiry.deadlineAt });
}

// AC-4: zapytanie o konkretny, opublikowany produkt w dużej ilości, bez
// logowania. Odbiorca to product.producerId wprost, bez tabeli łączącej.
export async function submitBulkProductInquiry(input: SubmitBulkProductInquiryInput): Promise<ActionResult> {
  const parsed = submitBulkProductInquirySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Sprawdź dane formularza." };
  }
  const data = parsed.data;
  const contactEmail = normalizeContactEmail(data.contactEmail);

  try {
    const [productRow] = await db
      .select({ id: product.id, status: product.status })
      .from(product)
      .where(and(eq(product.id, data.productId), isNull(product.deletedAt)));
    if (!productRow || productRow.status !== "published") {
      return { ok: false, error: "Nie znaleziono opublikowanego produktu." };
    }

    const clientId = await resolveSignedInClientId(contactEmail);
    const [inserted] = await buildBulkProductInquiryInsert(data, contactEmail, clientId, null);

    trackEvent(
      "bulk_product_inquiry_submitted",
      { productId: data.productId, unitCount: data.unitCount },
      inserted.id,
    );
    await notifyTeamOfNewLargeOrder({
      kind: "product",
      id: inserted.id,
      countryCode: data.deliveryCountryCode,
      unitCount: data.unitCount,
      deadlineAt: inserted.deadlineAt,
      contactLocale: data.locale,
    });
    await notifyProducersOfNewLargeOrder({ kind: "product", id: inserted.id });
    await notifyClientOfRequestReceived({
      kind: "product",
      id: inserted.id,
      email: contactEmail,
      name: data.contactName,
      locale: data.locale,
      countryCode: data.deliveryCountryCode,
      unitCount: data.unitCount,
      deadlineAt: inserted.deadlineAt,
    });
    return { ok: true, id: inserted.id, uploadToken: issueUploadToken("product", inserted.id) };
  } catch (error) {
    if (isBulkRequestEmailLimitError(error)) {
      return { ok: false, error: BULK_REQUEST_EMAIL_LIMIT_ERROR, errorCode: "email_limit" };
    }
    captureError(error, { path: "submitBulkProductInquiry" });
    return { ok: false, error: GENERIC_ERROR };
  }
}

export interface CancelRequestResult {
  ok: boolean;
  // not_found: brak zapytania lub nie jest własne (ten sam komunikat, bez ujawniania
  // istnienia); not_cancellable: zapytanie jest już po połączeniu stron albo zamknięte
  // z innego powodu.
  errorCode?: "not_found" | "not_cancellable";
}

// Spec 0070 AC-37: klient zamyka własne zapytanie (open, quoted, published). Jeden UPDATE
// z warunkiem statusu i właściciela w samym SQL, więc powtórne kliknięcie albo wyścig z
// publikacją nie zrobi nic drugi raz. Wybór klienta (selected_quote_id) zostaje jako ślad.
export async function cancelRequest(id: string, kind: "request" | "product"): Promise<CancelRequestResult> {
  if ((kind !== "request" && kind !== "product") || !z.uuid().safeParse(id).success) {
    return { ok: false, errorCode: "not_found" };
  }
  const session = await auth();
  if (!session || session.user.role !== "client") return { ok: false, errorCode: "not_found" };
  const clientId = await getClientIdForUser(session.user.id);
  if (!clientId) return { ok: false, errorCode: "not_found" };

  try {
    // Zapytania złożone anonimowo tym samym adresem dowiązują się do konta teraz,
    // jak przy logowaniu (spec 0037 AC-7), żeby klient mógł zamknąć także je.
    if (session.user.email) await linkRequestsToClientOnLogin(normalizeContactEmail(session.user.email), clientId);

    const table = kind === "request" ? projectRequest : bulkProductInquiry;
    const [before] = await db
      .select({
        status: table.status,
        selectedQuoteId: table.selectedQuoteId,
        closedReason: table.closedReason,
        unitCount: table.unitCount,
        countryCode: kind === "request" ? projectRequest.countryCode : bulkProductInquiry.deliveryCountryCode,
      })
      .from(table)
      .where(and(eq(table.id, id), eq(table.clientId, clientId)));
    if (!before) return { ok: false, errorCode: "not_found" };

    const closed = await closeLargeOrder({
      kind,
      id,
      reason: "client_cancelled",
      fromStatuses: ["open", "quoted", "published"],
      clientId,
    });

    if (!closed) {
      // Już zamknięte przez klienta: powtórne kliknięcie kończy się sukcesem bez zmiany.
      if (before.status === "closed" && before.closedReason === "client_cancelled") return { ok: true };
      return { ok: false, errorCode: "not_cancellable" };
    }

    trackEvent("request_cancelled_by_client", { kind }, id);
    await notifyTeamOfClientCancelledRequest({
      kind,
      id,
      countryCode: before.countryCode,
      unitCount: before.unitCount,
      wasPublished: before.status === "published",
      hadPendingSelection: before.selectedQuoteId !== null,
    });
    return { ok: true };
  } catch (error) {
    captureError(error, { path: "cancelRequest" });
    return { ok: false, errorCode: "not_found" };
  }
}

export interface ReopenRequestResult {
  ok: boolean;
  // not_found: brak zapytania lub nie jest własne; not_reopenable: nie jest zamknięte z powodu
  // klienta, braku ofert lub upływu terminu, albo minęło 30 dni; email_limit: klient ma już
  // trzy aktywne zapytania (AC-38, AC-39).
  errorCode?: "not_found" | "not_reopenable" | "email_limit";
}

const REOPEN_WINDOW_DAYS = 30;
const REOPENABLE_REASONS = ["client_cancelled", "no_offers", "expired"] as const;

// Spec 0070 AC-19: klient wznawia własne zamknięte zapytanie przez 30 dni od zamknięcia.
// Jeden UPDATE z warunkami własności, statusu, powodu i okna czasu w SQL. Nowy termin to
// teraz plus 14 dni, a wybór klienta jest czyszczony. Limit trzech zapytań pilnuje
// wyzwalacz w bazie (migracja 6): przy trzech aktywnych zapytaniach UPDATE kończy się
// błędem P0001, który mapujemy na errorCode "email_limit", a zapytanie zostaje zamknięte.
export async function reopenRequest(id: string, kind: "request" | "product"): Promise<ReopenRequestResult> {
  if ((kind !== "request" && kind !== "product") || !z.uuid().safeParse(id).success) {
    return { ok: false, errorCode: "not_found" };
  }
  const session = await auth();
  if (!session || session.user.role !== "client") return { ok: false, errorCode: "not_found" };
  const clientId = await getClientIdForUser(session.user.id);
  if (!clientId) return { ok: false, errorCode: "not_found" };

  try {
    if (session.user.email) await linkRequestsToClientOnLogin(normalizeContactEmail(session.user.email), clientId);

    const table = kind === "request" ? projectRequest : bulkProductInquiry;
    const quoteLink = kind === "request" ? projectQuote.projectRequestId : projectQuote.bulkProductInquiryId;
    const [before] = await db
      .select({ status: table.status, closedReason: table.closedReason })
      .from(table)
      .where(and(eq(table.id, id), eq(table.clientId, clientId)));
    if (!before) return { ok: false, errorCode: "not_found" };
    // Powtórne kliknięcie po udanym wznowieniu: sukces bez zmiany.
    if (before.status !== "closed" && before.status !== "accepted") return { ok: true };

    // Zapytanie, które ma jeszcze aktywne oferty, wraca jako quoted, bez nich jako open.
    const [activeQuote] = await db
      .select({ id: projectQuote.id })
      .from(projectQuote)
      .where(and(eq(quoteLink, id), eq(projectQuote.status, "active")))
      .limit(1);

    const [updated] = await db
      .update(table)
      .set({
        status: activeQuote ? "quoted" : "open",
        deadlineAt: sql`now() + interval '14 days'`,
        closedAt: null,
        closedReason: null,
        selectedQuoteId: null,
        selectedAt: null,
        updatedAt: sql`now()`,
      })
      .where(
        and(
          eq(table.id, id),
          eq(table.clientId, clientId),
          eq(table.status, "closed"),
          inArray(table.closedReason, [...REOPENABLE_REASONS]),
          sql`${table.closedAt} >= now() - make_interval(days => ${REOPEN_WINDOW_DAYS})`,
        ),
      )
      .returning({ id: table.id });
    if (!updated) return { ok: false, errorCode: "not_reopenable" };

    trackEvent("request_reopened", { kind }, id);
    return { ok: true };
  } catch (error) {
    if (isBulkRequestEmailLimitError(error)) return { ok: false, errorCode: "email_limit" };
    captureError(error, { path: "reopenRequest" });
    return { ok: false, errorCode: "not_found" };
  }
}

const LOCALE_VALUES = ["pl", "en", "de", "nl"] as const;
const staffMetaSchema = z.object({
  locale: z.enum(LOCALE_VALUES, { message: "Wybierz język klienta." }),
  staffConsentNote: z.string().trim().min(1, "Zapisz, jak klient wyraził zgodę."),
});

export type CreateRequestOnBehalfInput =
  | ({ kind: "request" } & Omit<SubmitProjectRequestInput, "locale"> & { locale: string; staffConsentNote: string })
  | ({ kind: "product" } & Omit<SubmitBulkProductInquiryInput, "locale"> & { locale: string; staffConsentNote: string });

export interface CreateRequestOnBehalfResult extends ActionResult {
  kind?: "request" | "product";
}

// Spec 0070 AC-20: administrator składa zapytanie w imieniu klienta, który zadzwonił lub
// napisał. Ta sama walidacja co submitProjectRequest i submitBulkProductInquiry, do tego
// wymagane: jawny język klienta (bez wartości domyślnej, bo admin pracuje po polsku) i
// zapis zgody. Zapytanie ma created_by_staff_user_id, nie ma clientId (dowiąże się przy
// pierwszym logowaniu tym adresem, spec 0037 AC-7) i idzie przez withAdminActor (audyt,
// AC-22). Klient dostaje mail w swoim języku, zespół alert o nowym zapytaniu. Limit trzech
// zapytań na e mail obowiązuje także tutaj (wyzwalacz w bazie, AC-38, AC-39).
export async function createRequestOnBehalf(input: CreateRequestOnBehalfInput): Promise<CreateRequestOnBehalfResult> {
  const session = await auth();
  if (!session || session.user.role !== "admin") {
    return { ok: false, error: "Musisz być zalogowany jako administrator." };
  }
  const adminId = session.user.id;

  const meta = staffMetaSchema.safeParse({ locale: input.locale, staffConsentNote: input.staffConsentNote });
  if (!meta.success) return { ok: false, error: meta.error.issues[0]?.message ?? "Sprawdź dane formularza." };
  const staff: StaffMeta = { userId: adminId, consentNote: meta.data.staffConsentNote };
  const { locale } = meta.data;

  try {
    if (input.kind === "request") {
      const parsed = submitProjectRequestSchema.safeParse({ ...input, locale });
      if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Sprawdź dane formularza." };
      const data = parsed.data;
      const contactEmail = normalizeContactEmail(data.contactEmail);

      const [[inserted]] = await withAdminActor(adminId, [buildProjectRequestInsert(data, contactEmail, null, staff)]);
      trackEvent("project_request_submitted", { countryCode: data.countryCode, unitCount: data.unitCount, byStaff: true }, inserted.id);
      await stageClientRegistration(contactEmail, data.contactName, data.contactPhone);
      await notifyClientOfRequestOnBehalf({
        kind: "request",
        id: inserted.id,
        email: contactEmail,
        name: data.contactName,
        locale,
        countryCode: data.countryCode,
        unitCount: data.unitCount,
        deadlineAt: inserted.deadlineAt,
      });
      await notifyTeamOfNewLargeOrder({
        kind: "request",
        id: inserted.id,
        countryCode: data.countryCode,
        unitCount: data.unitCount,
        deadlineAt: inserted.deadlineAt,
        contactLocale: locale,
        matchedProducerCount: await countMatchedProducers(inserted.id),
      });
      await notifyProducersOfNewLargeOrder({ kind: "request", id: inserted.id });
      return { ok: true, id: inserted.id, kind: "request" };
    }

    const parsed = submitBulkProductInquirySchema.safeParse({ ...input, locale });
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Sprawdź dane formularza." };
    const data = parsed.data;
    const contactEmail = normalizeContactEmail(data.contactEmail);

    const [productRow] = await db
      .select({ id: product.id, status: product.status })
      .from(product)
      .where(and(eq(product.id, data.productId), isNull(product.deletedAt)));
    if (!productRow || productRow.status !== "published") {
      return { ok: false, error: "Nie znaleziono opublikowanego produktu." };
    }

    const [[inserted]] = await withAdminActor(adminId, [buildBulkProductInquiryInsert(data, contactEmail, null, staff)]);
    trackEvent("bulk_product_inquiry_submitted", { productId: data.productId, unitCount: data.unitCount, byStaff: true }, inserted.id);
    await stageClientRegistration(contactEmail, data.contactName, data.contactPhone);
    await notifyClientOfRequestOnBehalf({
      kind: "product",
      id: inserted.id,
      email: contactEmail,
      name: data.contactName,
      locale,
      countryCode: data.deliveryCountryCode,
      unitCount: data.unitCount,
      deadlineAt: inserted.deadlineAt,
    });
    await notifyTeamOfNewLargeOrder({
      kind: "product",
      id: inserted.id,
      countryCode: data.deliveryCountryCode,
      unitCount: data.unitCount,
      deadlineAt: inserted.deadlineAt,
      contactLocale: locale,
    });
    await notifyProducersOfNewLargeOrder({ kind: "product", id: inserted.id });
    return { ok: true, id: inserted.id, kind: "product" };
  } catch (error) {
    if (isBulkRequestEmailLimitError(error)) {
      return { ok: false, error: BULK_REQUEST_EMAIL_LIMIT_ERROR, errorCode: "email_limit" };
    }
    captureError(error, { path: "createRequestOnBehalf" });
    return { ok: false, error: GENERIC_ERROR };
  }
}
