"use server";

import { z } from "zod";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  bulkProductInquiry,
  producer,
  producerCapacityProfile,
  producerDeliveryCountry,
  product,
  projectRequest,
  projectRequestTargetProducer,
} from "@/lib/db/schema";
import {
  BULK_REQUEST_EMAIL_LIMIT_ERROR,
  isBulkRequestEmailLimitError,
  normalizeContactEmail,
  projectRequestFamiliesSchema,
  PROJECT_TYPES,
} from "@/lib/project-request-specs";
import { COMPLETION_STANDARDS } from "@/lib/producer-capacity-profile-specs";
import { captureError, trackEvent } from "@/lib/observability";

interface ActionResult {
  ok: boolean;
  id?: string;
  error?: string;
}

const GENERIC_ERROR = "Nie udało się wysłać zapytania. Spróbuj ponownie.";
const dateStringSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Nieprawidłowa data.");

// AC-2: powiadamia tylko producentów zweryfikowanych wolumenowo, dostarczających
// do kraju zapytania. Brak dopasowanych producentów NIE jest błędem (spec 0037
// Key invariants) — zapytanie zostaje 'open' z zero wierszy.
async function autoTargetProducers(projectRequestId: string, countryCode: string): Promise<void> {
  const matches = await db
    .select({ producerId: producer.id })
    .from(producer)
    .innerJoin(producerCapacityProfile, eq(producerCapacityProfile.producerId, producer.id))
    .innerJoin(
      producerDeliveryCountry,
      and(eq(producerDeliveryCountry.producerId, producer.id), eq(producerDeliveryCountry.countryCode, countryCode)),
    )
    .where(and(eq(producerCapacityProfile.volumeVerificationStatus, "approved"), isNull(producer.deletedAt)));

  if (matches.length === 0) return;

  await db
    .insert(projectRequestTargetProducer)
    .values(matches.map((match) => ({ projectRequestId, producerId: match.producerId })))
    .onConflictDoNothing();
}

const submitProjectRequestSchema = z
  .object({
    contactName: z.string().trim().min(1, "Podaj imię i nazwisko."),
    contactEmail: z.email("Podaj prawidłowy adres e mail."),
    contactPhone: z.string().trim().min(1).optional(),
    countryCode: z.string().min(1, "Wybierz kraj."),
    locationDetail: z.string().trim().min(1).optional(),
    projectType: z.enum(PROJECT_TYPES),
    families: projectRequestFamiliesSchema,
    unitCountMin: z.number().int().min(10, "Minimalna liczba sztuk to 10."),
    unitCountMax: z.number().int().optional(),
    floorAreaM2Min: z.number().positive().optional(),
    floorAreaM2Max: z.number().positive().optional(),
    completionStandard: z.enum(COMPLETION_STANDARDS).optional(),
    startWindowFrom: dateStringSchema.optional(),
    startWindowTo: dateStringSchema.optional(),
    deliveryWindowFrom: dateStringSchema.optional(),
    deliveryWindowTo: dateStringSchema.optional(),
    extrasNote: z.string().trim().min(1).optional(),
  })
  .refine((data) => data.unitCountMax === undefined || data.unitCountMax >= data.unitCountMin, {
    message: "Maksymalna liczba sztuk musi być większa lub równa minimalnej.",
    path: ["unitCountMax"],
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

  try {
    const [inserted] = await db
      .insert(projectRequest)
      .values({
        contactName: data.contactName,
        contactEmail,
        contactPhone: data.contactPhone ?? null,
        countryCode: data.countryCode,
        locationDetail: data.locationDetail ?? null,
        projectType: data.projectType,
        families: data.families,
        unitCountMin: data.unitCountMin,
        unitCountMax: data.unitCountMax ?? null,
        floorAreaM2Min: data.floorAreaM2Min ?? null,
        floorAreaM2Max: data.floorAreaM2Max ?? null,
        completionStandard: data.completionStandard ?? null,
        startWindowFrom: data.startWindowFrom ?? null,
        startWindowTo: data.startWindowTo ?? null,
        deliveryWindowFrom: data.deliveryWindowFrom ?? null,
        deliveryWindowTo: data.deliveryWindowTo ?? null,
        extrasNote: data.extrasNote ?? null,
      })
      .returning({ id: projectRequest.id });

    await autoTargetProducers(inserted.id, data.countryCode);

    trackEvent("project_request_submitted", { countryCode: data.countryCode, unitCountMin: data.unitCountMin }, inserted.id);
    return { ok: true, id: inserted.id };
  } catch (error) {
    if (isBulkRequestEmailLimitError(error)) {
      return { ok: false, error: BULK_REQUEST_EMAIL_LIMIT_ERROR };
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
    unitCountMin: z.number().int().min(10, "Minimalna liczba sztuk to 10."),
    unitCountMax: z.number().int().optional(),
    deliveryCountryCode: z.string().min(1, "Wybierz kraj dostawy."),
    startWindowFrom: dateStringSchema.optional(),
    startWindowTo: dateStringSchema.optional(),
    deliveryWindowFrom: dateStringSchema.optional(),
    deliveryWindowTo: dateStringSchema.optional(),
    note: z.string().trim().min(1).optional(),
  })
  .refine((data) => data.unitCountMax === undefined || data.unitCountMax >= data.unitCountMin, {
    message: "Maksymalna liczba sztuk musi być większa lub równa minimalnej.",
    path: ["unitCountMax"],
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

    const [inserted] = await db
      .insert(bulkProductInquiry)
      .values({
        productId: data.productId,
        contactName: data.contactName,
        contactEmail,
        contactPhone: data.contactPhone ?? null,
        unitCountMin: data.unitCountMin,
        unitCountMax: data.unitCountMax ?? null,
        deliveryCountryCode: data.deliveryCountryCode,
        startWindowFrom: data.startWindowFrom ?? null,
        startWindowTo: data.startWindowTo ?? null,
        deliveryWindowFrom: data.deliveryWindowFrom ?? null,
        deliveryWindowTo: data.deliveryWindowTo ?? null,
        note: data.note ?? null,
      })
      .returning({ id: bulkProductInquiry.id });

    trackEvent(
      "bulk_product_inquiry_submitted",
      { productId: data.productId, unitCountMin: data.unitCountMin },
      inserted.id,
    );
    return { ok: true, id: inserted.id };
  } catch (error) {
    if (isBulkRequestEmailLimitError(error)) {
      return { ok: false, error: BULK_REQUEST_EMAIL_LIMIT_ERROR };
    }
    captureError(error, { path: "submitBulkProductInquiry" });
    return { ok: false, error: GENERIC_ERROR };
  }
}
