"use server";

import { and, eq, isNull } from "drizzle-orm";
import { auth } from "@/auth";
import type { ProjectDraft } from "@/lib/data/types";
import { db } from "@/lib/db/client";
import { getProducerIdForUser } from "@/lib/db/queries";
import { document, product, productTranslation, productVariant } from "@/lib/db/schema";
import { captureError } from "@/lib/observability/errors";
import { trackEvent } from "@/lib/observability";
import { faqSchema, faqTranslationSchema } from "@/lib/product-faq";
import { roomLayoutSchema, roomLayoutTranslationSchema } from "@/lib/product-room-layout";
import { getTechnicalSpecsSchema } from "@/lib/product-technical-specs";

// Pola kreatora zapisywane do bazy; floorPlanFiles/photoFiles nie mają tu
// odpowiednika (rzuty zostają mockiem, zdjęcia idą przez lib/product-photo-actions.ts
// na tabelę document, spec 0032 Key invariants). variantsSummary też nie: to
// tylko migawka na potrzeby isStepComplete("warianty", ...) w kreatorze
// (spec 0045), prawdziwy zapis idzie przez lib/producer-product-variant-actions.ts.
export type ProducerProductFields = Omit<ProjectDraft, "floorPlanFiles" | "photoFiles" | "variantsSummary">;

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

// AC-17: housePriceMinCents/priceMinCents/completionStandard nie są już
// pisane wprost stąd — priceMinCents/priceMaxCents są od spec 0041 pochodną
// wyzwalacza product_variant_price_sync (patrz lib/db/AGENTS.md), sterowaną
// przez product_variant (lib/producer-product-variant-actions.ts), nie przez
// ten formularz. productionLeadTimeWeeksMin/Max i onSiteAssemblyDaysMin/Max
// są superseded przez product_timeline_stage per wariant (spec 0041) i
// przestały być zbierane w ogóle (usunięty krok "Cena", zadanie 12).
function buildProductValues(fields: ProducerProductFields) {
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
    // AC-5: id stabilny generowany po stronie klienta, zapisywany jak jest —
    // walidacja kształtu przez roomLayoutSchema w validateContentShape niżej.
    roomLayout: fields.roomLayout,
    // AC-6.
    faq: fields.faq,
    structuralWarrantyYears: fields.structuralWarrantyYears,
    // AC-8: logistyka i zgodność, czysto deklaratywne, bez reguły wyliczającej.
    installationWarrantyYears: fields.installationWarrantyYears,
    serviceScopeDescription: fields.serviceScopeDescription || null,
    transportDimensions: fields.transportDimensions || null,
    craneRequirements: fields.craneRequirements || null,
    minPlotWidthM: fields.minPlotWidthM,
    simplifiedPermitEligible: fields.simplifiedPermitEligible,
    updatedAt: new Date(),
  };
}

// Zawsze upsert obu wierszy (en/nl), nawet gdy oba pola puste (spada wtedy na
// fallback do polskiego tekstu źródłowego, patrz komentarz przy
// product_translation w schema.ts) — prostsze niż warunkowe wstawianie/usuwanie.
function translationRow(productId: string, locale: "en" | "nl", fields: ProducerProductFields) {
  return {
    productId,
    locale,
    name: (locale === "en" ? fields.nameEn : fields.nameNl) || null,
    description: (locale === "en" ? fields.descriptionEn : fields.descriptionNl) || null,
    // AC-10: tłumaczenie roomLayout/faq dopasowane po stabilnym id z listy
    // polskiej (fields.roomLayout/faq), może być krótsze (tłumaczenie częściowe).
    roomLayout: locale === "en" ? fields.roomLayoutEn : fields.roomLayoutNl,
    faq: locale === "en" ? fields.faqEn : fields.faqNl,
  };
}

async function upsertTranslations(productId: string, fields: ProducerProductFields) {
  await db.batch([
    db
      .insert(productTranslation)
      .values(translationRow(productId, "en", fields))
      .onConflictDoUpdate({
        target: [productTranslation.productId, productTranslation.locale],
        set: { ...translationRow(productId, "en", fields), updatedAt: new Date() },
      }),
    db
      .insert(productTranslation)
      .values(translationRow(productId, "nl", fields))
      .onConflictDoUpdate({
        target: [productTranslation.productId, productTranslation.locale],
        set: { ...translationRow(productId, "nl", fields), updatedAt: new Date() },
      }),
  ]);
}

// AC-5, AC-6: forma jest walidowana Zod na granicy zapisu (nie tylko przy
// odczycie, domykając dawny otwarty Follow-up spec 0042), zanim cokolwiek
// trafi do buildProductValues/upsertTranslations. Zwraca komunikat błędu albo
// null, ten sam kształt co reszta walidacji w tym pliku.
function validateContentShape(fields: ProducerProductFields): string | null {
  if (!roomLayoutSchema.safeParse(fields.roomLayout).success) {
    return "Nieprawidłowy układ pomieszczeń.";
  }
  if (!roomLayoutTranslationSchema.safeParse(fields.roomLayoutEn).success) {
    return "Nieprawidłowe tłumaczenie układu pomieszczeń (angielski).";
  }
  if (!roomLayoutTranslationSchema.safeParse(fields.roomLayoutNl).success) {
    return "Nieprawidłowe tłumaczenie układu pomieszczeń (niderlandzki).";
  }
  if (!faqSchema.safeParse(fields.faq).success) {
    return "Nieprawidłowe FAQ.";
  }
  if (!faqTranslationSchema.safeParse(fields.faqEn).success) {
    return "Nieprawidłowe tłumaczenie FAQ (angielski).";
  }
  if (!faqTranslationSchema.safeParse(fields.faqNl).success) {
    return "Nieprawidłowe tłumaczenie FAQ (niderlandzki).";
  }
  return null;
}

// AC-4: publikacja wymaga kompletu pól podstawowych, danych technicznych
// zgodnych ze schematem Zod tej rodziny (lib/product-technical-specs.ts,
// wariant "published", strict), co najmniej jednego realnego zdjęcia w
// document i co najmniej jednego domyślnego wariantu z wypełnioną ceną
// minimalną (spec 0045 AC-4/AC-17, zastępuje dawny wymóg housePriceMinEur/Max/
// completionStandard). Krok szczegółowej walidacji per-pole żyje już po
// stronie kreatora (isStepComplete, lib/producer-project-draft.ts) — to jest
// druga linia obrony po stronie serwera, nie duplikat całej logiki formularza.
async function validatePublishReadiness(productId: string, fields: ProducerProductFields): Promise<string | null> {
  if (
    !fields.name.trim() ||
    fields.floorAreaM2 === null ||
    fields.bedrooms === null ||
    fields.countryOfProduction === null ||
    !fields.description.trim() ||
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

  const [defaultVariant] = await db
    .select({ priceMinCents: productVariant.priceMinCents })
    .from(productVariant)
    .where(
      and(
        eq(productVariant.productId, productId),
        eq(productVariant.isDefault, true),
        isNull(productVariant.deletedAt),
      ),
    );
  if (!defaultVariant || defaultVariant.priceMinCents === null) {
    return "Dodaj domyślny wariant z ceną minimalną przed publikacją.";
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
  const contentError = validateContentShape(fields);
  if (contentError) return { ok: false, error: contentError };

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
  const contentError = validateContentShape(fields);
  if (contentError) return { ok: false, error: contentError };

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
        .values(translationRow(productId, "en", fields))
        .onConflictDoUpdate({
          target: [productTranslation.productId, productTranslation.locale],
          set: { ...translationRow(productId, "en", fields), updatedAt: new Date() },
        }),
      db
        .insert(productTranslation)
        .values(translationRow(productId, "nl", fields))
        .onConflictDoUpdate({
          target: [productTranslation.productId, productTranslation.locale],
          set: { ...translationRow(productId, "nl", fields), updatedAt: new Date() },
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
