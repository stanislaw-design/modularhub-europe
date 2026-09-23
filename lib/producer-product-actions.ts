"use server";

import { and, eq, isNull } from "drizzle-orm";
import { after } from "next/server";
import {
  generateProductTranslations,
  type ProductTranslationField,
  type ProductTranslationLocale,
} from "@/lib/ai/product-translation";
import type { ProjectDraft } from "@/lib/data/types";
import { db } from "@/lib/db/client";
import { document, product, productTranslation, productVariant } from "@/lib/db/schema";
import { captureError } from "@/lib/observability/errors";
import { trackEvent } from "@/lib/observability";
import {
  clientRequirementsSchema,
  clientRequirementTranslationSchema,
  type ClientRequirementTranslationRow,
} from "@/lib/product-client-requirements";
import { faqSchema, faqTranslationSchema, type FaqTranslationRow } from "@/lib/product-faq";
import { roomLayoutSchema, roomLayoutTranslationSchema, type RoomLayoutTranslationRow } from "@/lib/product-room-layout";
import { getTechnicalSpecsSchema } from "@/lib/product-technical-specs";
import { requireProducerActor } from "@/lib/producer-actor";

// Pola kreatora zapisywane do bazy; floorPlanFiles/photoFiles nie mają tu
// odpowiednika (rzuty zostają mockiem, zdjęcia idą przez lib/product-photo-actions.ts
// na tabelę document, spec 0032 Key invariants). variantsSummary też nie: to
// tylko migawka na potrzeby isStepComplete("warianty", ...) w kreatorze
// (spec 0045), prawdziwy zapis idzie przez lib/producer-product-variant-actions.ts.
//
// descriptionEn/descriptionNl/descriptionDe/roomLayoutEn/Nl/De/faqEn/Nl/De/
// clientRequirementsEn/Nl/De są tu opcjonalne (spec 0028 AC-15, spec 0050
// AC-28 do AC-34), inaczej niż na ProjectDraft (gdzie zawsze mają konkretną,
// choćby pustą, wartość — stan formularza w przeglądarce). Krok kreatora inny
// niż "tlumaczenia" (jedyne miejsce z tymi polami w obu kreatorach od spec
// 0050) po prostu ich nie wysyła (undefined, nie pusty string/pusta tablica):
// translationRow/upsertTranslations niżej dotykają kolumnę product_translation
// tylko wtedy, gdy jej klucz jest obecny w fields, więc resubmisja
// nieodświeżonego draftu z wcześniejszego kroku nigdy nie kasuje tłumaczenia
// description, które w międzyczasie mogło dopisać AI
// (generateMissingProductTranslations niżej) — jedyne pole z tym wyścigiem,
// bo jedyne z asynchronicznym backfillem. `name` nie jest już tłumaczone
// wcale (spec 0050 AC-2): jedna, wspólna wartość dla wszystkich języków.
export type ProducerProductFields = Omit<
  ProjectDraft,
  | "floorPlanFiles"
  | "photoFiles"
  | "variantsSummary"
  | "descriptionEn"
  | "descriptionNl"
  | "descriptionDe"
  | "roomLayoutEn"
  | "roomLayoutNl"
  | "roomLayoutDe"
  | "faqEn"
  | "faqNl"
  | "faqDe"
  | "clientRequirementsEn"
  | "clientRequirementsNl"
  | "clientRequirementsDe"
> & {
  descriptionEn?: string;
  descriptionNl?: string;
  descriptionDe?: string;
  roomLayoutEn?: RoomLayoutTranslationRow[];
  roomLayoutNl?: RoomLayoutTranslationRow[];
  roomLayoutDe?: RoomLayoutTranslationRow[];
  faqEn?: FaqTranslationRow[];
  faqNl?: FaqTranslationRow[];
  faqDe?: FaqTranslationRow[];
  clientRequirementsEn?: ClientRequirementTranslationRow[];
  clientRequirementsNl?: ClientRequirementTranslationRow[];
  clientRequirementsDe?: ClientRequirementTranslationRow[];
};

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
    // Co musi zapewnić klient, niezależnie od standardu (spec 0050 AC-23):
    // ten sam wzorzec co roomLayout/faq wyżej, walidacja kształtu przez
    // clientRequirementsSchema w validateContentShape niżej.
    clientRequirements: fields.clientRequirements,
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

// Wiersz do upsertu, budowany WARUNKOWO (spec 0028 AC-15, spec 0050 AC-28 do
// AC-34): description/roomLayout/faq/clientRequirements trafiają do
// zwróconego obiektu tylko gdy odpowiadający klucz jest obecny w fields (nie
// tylko niepusty — pusty string/pusta tablica to jawne wyczyszczenie,
// undefined to "krok tego nie dotyczył"). upsertTranslations niżej robi z
// tego .set({...}) do onConflictDoUpdate, więc kolumna, której klucz nie
// przyszedł w tym zapisie, zostaje nietknięta — w szczególności nigdy nie
// kasuje tego, co generateMissingProductTranslations mogło w międzyczasie
// dopisać do description. `name` nie ma tu już odpowiednika (spec 0050 AC-2:
// jedna, wspólna wartość, nigdy tłumaczona). Od spec 0050 DE dostaje
// roomLayout/faq/clientRequirements na równi z EN/NL (dawne ograniczenie do
// EN/NL only, spec 0028 zakres AI, zniesione razem ze skonsolidowanym etapem
// tłumaczeń — jedyne miejsce, które je teraz pisze).
function translationRow(
  productId: string,
  locale: ProductTranslationLocale,
  fields: ProducerProductFields,
): { productId: string; locale: ProductTranslationLocale } & Record<string, unknown> {
  const row: Record<string, unknown> = { productId, locale };
  const descriptionValue =
    locale === "en" ? fields.descriptionEn : locale === "nl" ? fields.descriptionNl : fields.descriptionDe;
  if (descriptionValue !== undefined) row.description = descriptionValue || null;
  // AC-10, AC-28: tłumaczenie dopasowane po stabilnym id z listy polskiej
  // (fields.roomLayout/faq/clientRequirements), może być krótsze (tłumaczenie
  // częściowe).
  const roomLayoutValue = locale === "en" ? fields.roomLayoutEn : locale === "nl" ? fields.roomLayoutNl : fields.roomLayoutDe;
  if (roomLayoutValue !== undefined) row.roomLayout = roomLayoutValue;
  const faqValue = locale === "en" ? fields.faqEn : locale === "nl" ? fields.faqNl : fields.faqDe;
  if (faqValue !== undefined) row.faq = faqValue;
  const clientRequirementsValue =
    locale === "en" ? fields.clientRequirementsEn : locale === "nl" ? fields.clientRequirementsNl : fields.clientRequirementsDe;
  if (clientRequirementsValue !== undefined) row.clientRequirements = clientRequirementsValue;
  return row as { productId: string; locale: ProductTranslationLocale } & Record<string, unknown>;
}

const TRANSLATION_LOCALES: readonly ProductTranslationLocale[] = ["en", "nl", "de"];

async function upsertTranslations(productId: string, fields: ProducerProductFields) {
  const statements = TRANSLATION_LOCALES.map((locale) =>
    db
      .insert(productTranslation)
      .values(translationRow(productId, locale, fields))
      .onConflictDoUpdate({
        target: [productTranslation.productId, productTranslation.locale],
        set: { ...translationRow(productId, locale, fields), updatedAt: new Date() },
      }),
  );
  await db.batch(statements as [(typeof statements)[number], ...typeof statements]);
}

// Zeruje NULL/pusty/samobiały string do tej samej wartości porównania (spec
// 0028 Feature design: "trim() || null"), ten sam wzorzec co `|| null` już
// użyty w translationRow wyżej.
function normalizeForCompare(value: string | null | undefined): string | null {
  return value?.trim() || null;
}

const AI_TRANSLATION_FIELDS: readonly ProductTranslationField[] = ["description"];

// Automatyczne tłumaczenie AI (spec 0028 AC-11 do AC-14, AC-17, Build plan
// zadanie 22; zawężone do description spec 0050 AC-2 — `name` nie jest już
// tłumaczone wcale, jedna wspólna wartość dla wszystkich języków, więc nie ma
// czego tu regenerować): reguła regeneracji per (productId, locale), wywołana
// przez after() na końcu createProducerProduct/updateProducerProduct — nigdy
// nie blokuje ani nie cofa zapisu produktu, który już się powiódł (AC-14),
// więc każdy błąd tu jest złapany i zgłoszony, nigdy rzucony dalej.
//
// "Własność" jest wyliczona, nie przechowywana jako osobna flaga (patrz
// komentarz przy product_translation w schema.ts): pole jest "własnością AI"
// dokładnie wtedy, gdy jego zapisana wartość (znormalizowana) równa się
// aiGeneratedDescription (też znormalizowanej). Wymaga regeneracji, gdy do
// tego jeszcze nigdy nie było generowane (aiGeneratedDescription IS NULL, w
// tym pole dziś puste) albo polski tekst źródłowy zmienił się od ostatniej
// generacji (aiTranslatedFromDescription różni się od aktualnego
// product.description). Jedyny pisarz description poza etapem "Tłumaczenia"
// (lib/producer-project-translation-actions.ts, spec 0050 AC-33): ten sam
// wzorzec własności obowiązuje tam identycznie, żeby te dwa mechanizmy nigdy
// nie nadpisywały się nawzajem.
async function generateMissingProductTranslations(productId: string): Promise<void> {
  try {
    const [productRow] = await db.select({ description: product.description }).from(product).where(eq(product.id, productId));
    if (!productRow) return;

    const sourceDescription = normalizeForCompare(productRow.description);
    // Nic do tłumaczenia, gdy polski tekst źródłowy jest jeszcze pusty
    // (wczesny etap kreatora) — pole zostaje kandydatem do generacji przy
    // następnym zapisie, kiedy source faktycznie ma treść.
    if (sourceDescription === null) return;

    const existingRows = await db
      .select({
        locale: productTranslation.locale,
        description: productTranslation.description,
        aiGeneratedDescription: productTranslation.aiGeneratedDescription,
        aiTranslatedFromDescription: productTranslation.aiTranslatedFromDescription,
      })
      .from(productTranslation)
      .where(eq(productTranslation.productId, productId));

    const localesNeedingDescription: ProductTranslationLocale[] = [];

    for (const locale of TRANSLATION_LOCALES) {
      const existing = existingRows.find((row) => row.locale === locale);
      const isDescriptionAiOwned =
        normalizeForCompare(existing?.description) === normalizeForCompare(existing?.aiGeneratedDescription);
      const isStale =
        normalizeForCompare(existing?.aiGeneratedDescription) === null ||
        normalizeForCompare(existing?.aiTranslatedFromDescription) !== sourceDescription;
      if (isDescriptionAiOwned && isStale) localesNeedingDescription.push(locale);
    }

    if (localesNeedingDescription.length === 0) return;

    const result = await generateProductTranslations({
      name: null,
      description: sourceDescription,
      locales: localesNeedingDescription,
      fields: AI_TRANSLATION_FIELDS,
    });

    const statements = localesNeedingDescription
      .flatMap((locale) => {
        const generatedDescription = result.description?.[locale];
        if (!generatedDescription) return [];
        const patch = {
          description: generatedDescription,
          aiGeneratedDescription: generatedDescription,
          aiTranslatedFromDescription: sourceDescription,
        };
        return [{ locale, patch }];
      })
      .map(({ locale, patch }) =>
        db
          .insert(productTranslation)
          .values({ productId, locale, ...patch })
          .onConflictDoUpdate({
            target: [productTranslation.productId, productTranslation.locale],
            set: { ...patch, updatedAt: new Date() },
          }),
      );

    if (statements.length === 0) return;
    await db.batch(statements as [(typeof statements)[number], ...typeof statements]);
  } catch (error) {
    // AC-14: awaria Azure OpenAI (lub błąd konfiguracji) nigdy nie cofa ani
    // nie blokuje zapisu product/product_translation, który już się powiódł —
    // ten kod działa wyłącznie wewnątrz after(), już po zwróconej odpowiedzi.
    // Puste pole zostaje kandydatem do regeneracji przy następnym zapisie.
    captureError(error, { path: "generateMissingProductTranslations" });
  }
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
  if (!roomLayoutTranslationSchema.safeParse(fields.roomLayoutDe).success) {
    return "Nieprawidłowe tłumaczenie układu pomieszczeń (niemiecki).";
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
  if (!faqTranslationSchema.safeParse(fields.faqDe).success) {
    return "Nieprawidłowe tłumaczenie FAQ (niemiecki).";
  }
  if (!clientRequirementsSchema.safeParse(fields.clientRequirements).success) {
    return "Nieprawidłowa lista wymagań wobec klienta.";
  }
  if (!clientRequirementTranslationSchema.safeParse(fields.clientRequirementsEn).success) {
    return "Nieprawidłowe tłumaczenie wymagań wobec klienta (angielski).";
  }
  if (!clientRequirementTranslationSchema.safeParse(fields.clientRequirementsNl).success) {
    return "Nieprawidłowe tłumaczenie wymagań wobec klienta (niderlandzki).";
  }
  if (!clientRequirementTranslationSchema.safeParse(fields.clientRequirementsDe).success) {
    return "Nieprawidłowe tłumaczenie wymagań wobec klienta (niemiecki).";
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
    after(() => generateMissingProductTranslations(inserted.id));
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
    // Refaktoryzowane na upsertTranslations (spec 0028 Build plan zadanie 20):
    // dawniej wklejony tu db.batch duplikował translationRow/warunki obecności
    // klucza, dwa miejsca do utrzymania w zgodzie z regułą własności AI. Nie
    // jest to już jeden atomowy batch z aktualizacją product (ten sam
    // kompromis co createProducerProduct obok, gdzie insert product i
    // upsertTranslations też są dwoma osobnymi zapisami) — akceptowalne, bo
    // reguła jest wtedy dokładnie jedna, nie dwie do rozjechania.
    await db
      .update(product)
      .set({
        ...buildProductValues(fields),
        ...(options.publish && !publishError ? { status: "published" as const } : {}),
      })
      .where(eq(product.id, productId));
    await upsertTranslations(productId, fields);
    after(() => generateMissingProductTranslations(productId));
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
