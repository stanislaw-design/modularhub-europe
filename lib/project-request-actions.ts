"use server";

import { z } from "zod";
import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { getMatchedProducersForRequest } from "@/lib/db/project-request-matching";
import { bulkProductInquiry, product, projectRequest } from "@/lib/db/schema";
import {
  BULK_REQUEST_EMAIL_LIMIT_ERROR,
  computeTrustSignal,
  isBulkRequestEmailLimitError,
  normalizeContactEmail,
  projectRequestFamiliesSchema,
  PROJECT_TYPES,
} from "@/lib/project-request-specs";
import { COMPLETION_STANDARDS } from "@/lib/producer-capacity-profile-specs";
import { notifyProducersOfClosedRequest } from "@/lib/notifications/large-order-producer";
import { notifyTeamOfClientCancelledRequest, notifyTeamOfNewLargeOrder } from "@/lib/notifications/large-order-team";
import { linkRequestsToClientOnLogin } from "@/lib/project-quote-actions";
import { auth } from "@/auth";
import { getClientIdForUser } from "@/lib/db/queries";
import { captureError, trackEvent } from "@/lib/observability";

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
  })
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
  const trustSignal = computeTrustSignal(contactEmail, data.contactPhone);

  try {
    const clientId = await resolveSignedInClientId(contactEmail);
    const [inserted] = await db
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
        // Do migracji 5 stare kolumny zakresu są jeszcze w tabeli; stary kod czyta min.
        unitCountMin: data.unitCount,
        floorAreaM2Min: data.floorAreaM2Min ?? null,
        floorAreaM2Max: data.floorAreaM2Max ?? null,
        completionStandard: data.completionStandard ?? null,
        startWindowFrom: data.startWindowFrom ?? null,
        startWindowTo: data.startWindowTo ?? null,
        deliveryWindowFrom: data.deliveryWindowFrom ?? null,
        deliveryWindowTo: data.deliveryWindowTo ?? null,
        extrasNote: data.extrasNote ?? null,
        trustSignal,
        contactLocale: data.locale,
      })
      .returning({ id: projectRequest.id, deadlineAt: projectRequest.deadlineAt });

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
    return { ok: true, id: inserted.id };
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
  })
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
    const [inserted] = await db
      .insert(bulkProductInquiry)
      .values({
        clientId,
        productId: data.productId,
        contactName: data.contactName,
        contactEmail,
        contactPhone: data.contactPhone ?? null,
        unitCount: data.unitCount,
        // Do migracji 5 stare kolumny zakresu są jeszcze w tabeli; stary kod czyta min.
        unitCountMin: data.unitCount,
        deliveryCountryCode: data.deliveryCountryCode,
        startWindowFrom: data.startWindowFrom ?? null,
        startWindowTo: data.startWindowTo ?? null,
        deliveryWindowFrom: data.deliveryWindowFrom ?? null,
        deliveryWindowTo: data.deliveryWindowTo ?? null,
        note: data.note ?? null,
        contactLocale: data.locale,
      })
      .returning({ id: bulkProductInquiry.id, deadlineAt: bulkProductInquiry.deadlineAt });

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
    return { ok: true, id: inserted.id };
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

    const [updated] = await db
      .update(table)
      .set({ status: "closed", closedAt: sql`now()`, closedReason: "client_cancelled" })
      .where(and(eq(table.id, id), eq(table.clientId, clientId), inArray(table.status, ["open", "quoted", "published"])))
      .returning({ id: table.id });

    if (!updated) {
      // Już zamknięte przez klienta: powtórne kliknięcie kończy się sukcesem bez zmiany.
      if (before.status === "closed" && before.closedReason === "client_cancelled") return { ok: true };
      return { ok: false, errorCode: "not_cancellable" };
    }

    trackEvent("request_cancelled_by_client", { kind }, id);
    await notifyProducersOfClosedRequest({ kind, id });
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
