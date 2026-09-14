"use server";

import { and, eq, isNull } from "drizzle-orm";
import { auth } from "@/auth";
import type { ProjectDraft } from "@/lib/data/types";
import { db } from "@/lib/db/client";
import { getProducerIdForUser } from "@/lib/db/queries";
import { document, product, productTranslation } from "@/lib/db/schema";
import { captureError } from "@/lib/observability/errors";
import { trackEvent } from "@/lib/observability";
import { getTechnicalSpecsSchema } from "@/lib/product-technical-specs";

// Pola kreatora zapisywane do bazy; floorPlanFiles/photoFiles nie mają tu
// odpowiednika (rzuty zostają mockiem, zdjęcia idą przez lib/product-photo-actions.ts
// na tabelę document, spec 0032 Key invariants).
export type ProducerProductFields = Omit<ProjectDraft, "floorPlanFiles" | "photoFiles">;

interface ActionResult {
  ok: boolean;
  error?: string;
}

export interface SaveProducerProductResult extends ActionResult {
  productId?: string;
  published?: boolean;
}

const GENERIC_ERROR = "Nie udało się zapisać produktu. Spróbuj ponownie.";
const DENIED_ERROR = "Musisz być zalogowany jako producent.";

async function requireProducerActor(): Promise<{ userId: string; producerId: string } | null> {
  const session = await auth();
  if (!session || session.user.role !== "producer") return null;
  const producerId = await getProducerIdForUser(session.user.id);
  if (!producerId) return null;
  return { userId: session.user.id, producerId };
}

function toPriceCents(value: number | null): number | null {
  return value === null ? null : Math.round(value * 100);
}

// housePriceMinCents/priceMinCents to dwie osobne kolumny historyczne (spec
// 0018 bridge); getProjects filtruje po priceMinCents wprost w SQL, a
// mapRowToProject (lib/data/projects.ts) czyta priceMinCents z fallbackiem na
// housePriceMinCents. Zapis do obu naraz trzyma je zawsze zgodne, żeby ani
// filtr ceny na /wyniki, ani widok karty/szczegółów nigdy się nie rozjechały.
function buildProductValues(fields: ProducerProductFields) {
  const priceMinCents = toPriceCents(fields.housePriceMinEur);
  const priceMaxCents = toPriceCents(fields.housePriceMaxEur);
  return {
    name: fields.name || null,
    floorAreaM2: fields.floorAreaM2,
    bedrooms: fields.bedrooms,
    countryOfProduction: fields.countryOfProduction,
    description: fields.description || null,
    category: fields.category,
    spaSubcategory: fields.spaSubcategory,
    containerSubcategory: fields.containerSubcategory,
    technicalSpecs: fields.technicalSpecs,
    housePriceMinCents: priceMinCents,
    housePriceMaxCents: priceMaxCents,
    priceMinCents,
    priceMaxCents,
    completionStandard: fields.completionStandard,
    productionLeadTimeWeeksMin: fields.productionLeadTimeWeeksMin,
    productionLeadTimeWeeksMax: fields.productionLeadTimeWeeksMax,
    onSiteAssemblyDaysMin: fields.onSiteAssemblyDaysMin,
    onSiteAssemblyDaysMax: fields.onSiteAssemblyDaysMax,
    structuralWarrantyYears: fields.structuralWarrantyYears,
    updatedAt: new Date(),
  };
}

// Zawsze upsert obu wierszy (en/nl), nawet gdy oba pola puste (spada wtedy na
// fallback do polskiego tekstu źródłowego, patrz komentarz przy
// product_translation w schema.ts) — prostsze niż warunkowe wstawianie/usuwanie.
function translationRow(productId: string, locale: "en" | "nl", name: string, description: string) {
  return { productId, locale, name: name || null, description: description || null };
}

async function upsertTranslations(productId: string, fields: ProducerProductFields) {
  await db.batch([
    db
      .insert(productTranslation)
      .values(translationRow(productId, "en", fields.nameEn, fields.descriptionEn))
      .onConflictDoUpdate({
        target: [productTranslation.productId, productTranslation.locale],
        set: { name: fields.nameEn || null, description: fields.descriptionEn || null, updatedAt: new Date() },
      }),
    db
      .insert(productTranslation)
      .values(translationRow(productId, "nl", fields.nameNl, fields.descriptionNl))
      .onConflictDoUpdate({
        target: [productTranslation.productId, productTranslation.locale],
        set: { name: fields.nameNl || null, description: fields.descriptionNl || null, updatedAt: new Date() },
      }),
  ]);
}

// AC-4: publikacja wymaga kompletu pól podstawowych, danych technicznych
// zgodnych ze schematem Zod tej rodziny (lib/product-technical-specs.ts,
// wariant "published", strict) i co najmniej jednego realnego zdjęcia w
// document. Krok szczegółowej walidacji per-pole żyje już po stronie kreatora
// (isStepComplete, lib/producer-project-draft.ts) — to jest druga linia
// obrony po stronie serwera, nie duplikat całej logiki formularza.
async function validatePublishReadiness(productId: string, fields: ProducerProductFields): Promise<string | null> {
  if (
    !fields.name.trim() ||
    fields.floorAreaM2 === null ||
    fields.bedrooms === null ||
    fields.countryOfProduction === null ||
    !fields.description.trim() ||
    fields.housePriceMinEur === null ||
    fields.housePriceMaxEur === null ||
    fields.completionStandard === null ||
    fields.productionLeadTimeWeeksMin === null ||
    fields.productionLeadTimeWeeksMax === null ||
    fields.onSiteAssemblyDaysMin === null ||
    fields.onSiteAssemblyDaysMax === null ||
    fields.structuralWarrantyYears === null
  ) {
    return "Uzupełnij wszystkie wymagane pola przed publikacją.";
  }

  const [productRow] = await db.select({ family: product.family }).from(product).where(eq(product.id, productId));
  if (!productRow) return "Nie znaleziono produktu.";

  const specsResult = getTechnicalSpecsSchema(
    productRow.family,
    "published",
    fields.containerSubcategory ?? undefined,
  ).safeParse(fields.technicalSpecs);
  if (!specsResult.success) {
    return "Uzupełnij wszystkie dane techniczne przed publikacją.";
  }

  const [photoRow] = await db
    .select({ id: document.id })
    .from(document)
    .where(and(eq(document.productId, productId), eq(document.purpose, "product_photo"), isNull(document.deletedAt)));
  if (!photoRow) {
    return "Dodaj co najmniej jedno zdjęcie przed publikacją.";
  }

  return null;
}

// Tworzy wiersz roboczy przy pierwszym wejściu do kreatora, zaraz po
// wypełnieniu kroku podstawowego (spec 0032 Key invariants): family jest
// notNull w schemacie, więc wiersz nie może powstać wcześniej niż family jest
// znane. Od tego momentu zdjęcia (AC-7) mają do czego się podpiąć.
export async function createProducerProduct(fields: ProducerProductFields): Promise<SaveProducerProductResult> {
  const actor = await requireProducerActor();
  if (!actor) return { ok: false, error: DENIED_ERROR };
  if (fields.family === null) return { ok: false, error: GENERIC_ERROR };

  try {
    const [inserted] = await db
      .insert(product)
      .values({
        producerId: actor.producerId,
        family: fields.family,
        status: "draft",
        ...buildProductValues(fields),
      })
      .returning({ id: product.id });

    await upsertTranslations(inserted.id, fields);
    return { ok: true, productId: inserted.id, published: false };
  } catch (error) {
    captureError(error, { path: "createProducerProduct", userId: actor.userId });
    return { ok: false, error: GENERIC_ERROR };
  }
}

// Zapis kolejnych kroków (publish: false, spec 0032 Key invariants) i finalny
// zapis z Podsumowania (publish: true, AC-4/AC-5). Własność sprawdzana za
// każdym razem przez producerId z sesji, nigdy z URL/formularza (AC-13).
export async function updateProducerProduct(
  productId: string,
  fields: ProducerProductFields,
  options: { publish: boolean },
): Promise<SaveProducerProductResult> {
  const actor = await requireProducerActor();
  if (!actor) return { ok: false, error: DENIED_ERROR };

  const [existing] = await db
    .select({ id: product.id, status: product.status })
    .from(product)
    .where(and(eq(product.id, productId), eq(product.producerId, actor.producerId), isNull(product.deletedAt)));
  if (!existing) return { ok: false, error: "Nie znaleziono produktu." };

  let publishError: string | null = null;
  if (options.publish) {
    publishError = await validatePublishReadiness(productId, fields);
  }

  try {
    await db.batch([
      db
        .update(product)
        .set({
          ...buildProductValues(fields),
          ...(options.publish && !publishError ? { status: "published" as const } : {}),
        })
        .where(eq(product.id, productId)),
      db
        .insert(productTranslation)
        .values(translationRow(productId, "en", fields.nameEn, fields.descriptionEn))
        .onConflictDoUpdate({
          target: [productTranslation.productId, productTranslation.locale],
          set: { name: fields.nameEn || null, description: fields.descriptionEn || null, updatedAt: new Date() },
        }),
      db
        .insert(productTranslation)
        .values(translationRow(productId, "nl", fields.nameNl, fields.descriptionNl))
        .onConflictDoUpdate({
          target: [productTranslation.productId, productTranslation.locale],
          set: { name: fields.nameNl || null, description: fields.descriptionNl || null, updatedAt: new Date() },
        }),
    ]);
  } catch (error) {
    captureError(error, { path: "updateProducerProduct", userId: actor.userId });
    return { ok: false, error: GENERIC_ERROR };
  }

  if (options.publish && publishError) {
    return { ok: false, error: publishError, productId, published: false };
  }

  // Zdarzenie biznesowe tylko przy faktycznej (re)publikacji, nie przy każdym
  // pośrednim autosave kroku kreatora (spec 0032 Neutral): pierwsze przejście
  // draft -> published liczy się jako "dodanie", każda kolejna publikacja
  // już opublikowanego produktu jako "aktualizacja".
  if (options.publish) {
    trackEvent(existing.status === "published" ? "product_updated" : "product_added", { productId }, actor.userId);
  }
  return { ok: true, productId, published: options.publish };
}

// AC-6: miękkie usunięcie, ten sam wzorzec co deleteProductPhoto (spec 0031).
export async function deleteProducerProduct(productId: string): Promise<ActionResult> {
  const actor = await requireProducerActor();
  if (!actor) return { ok: false, error: DENIED_ERROR };

  const [existing] = await db
    .select({ id: product.id })
    .from(product)
    .where(and(eq(product.id, productId), eq(product.producerId, actor.producerId), isNull(product.deletedAt)));
  if (!existing) return { ok: false, error: "Nie znaleziono produktu." };

  try {
    await db.update(product).set({ deletedAt: new Date() }).where(eq(product.id, productId));
  } catch (error) {
    captureError(error, { path: "deleteProducerProduct", userId: actor.userId });
    return { ok: false, error: "Nie udało się usunąć produktu. Spróbuj ponownie." };
  }

  trackEvent("product_deleted", { productId }, actor.userId);
  return { ok: true };
}
