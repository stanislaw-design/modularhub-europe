// Przemysław Wencel: domki na stalowej ramie (dane w scripts/data/wencel-catalog.ts). Spec 0067: tłumaczenia
// en/de/nl powstają razem z importem; po nim `npm run check:translations` ma zgłosić zero braków. Zapis tylko do
// dev DB (assertDevDatabase); prod to osobny, jawny krok. `--dry-run` waliduje dane i pliki, niczego nie zapisuje.
import { readFile } from "node:fs/promises";
import path from "node:path";
import { and, eq, inArray, isNull, notInArray, sql } from "drizzle-orm";
import { db } from "../lib/db/client";
import { assertDevDatabase } from "../lib/db/dev-database-guard";
import {
  costLineItem,
  costLineItemLabelTranslation,
  country,
  document,
  producer,
  producerDeliveryCountry,
  producerMember,
  producerTranslation,
  product,
  productCountryEligibility,
  productOption,
  productOptionGroup,
  productOptionGroupAssignment,
  productOptionGroupTranslation,
  productOptionTranslation,
  productTranslation,
  productVariant,
  productVariantTranslation,
  referenceTextTranslation,
  users,
} from "../lib/db/schema";
import { roomLayoutSchema } from "../lib/product-room-layout";
import { getTechnicalSpecsSchema, type DomTechnicalSpecs } from "../lib/product-technical-specs";
import { slugifyProductName } from "../lib/product-slug";
import { validateProductPhotoFile } from "../lib/storage/document-validation";
import { buildPublicUrl, buildR2Key, uploadObject } from "../lib/storage/r2-client";
import {
  CONSTRUCTION_SYSTEM,
  CUSTOMIZATION_SCOPE,
  ELIGIBILITY_REASON,
  HEAT_SOURCE_NOTE,
  IMPORT_USER_ID,
  INSULATION,
  OPTION_GROUPS,
  PRODUCER_ID,
  WALL_BUILD_UP,
  WENCEL_PRODUCER,
  WENCEL_PROJECTS,
  detUuid,
  priceCentsOf,
  type L10n,
  type WencelProjectSource,
} from "./data/wencel-catalog";

const DRY_RUN = process.argv.includes("--dry-run");
const LOCALES = ["en", "de", "nl"] as const;
const excluded = (column: string) => sql.raw(`excluded."${column}"`);

const roomId = (item: WencelProjectSource, index: number) => `${item.key}-room-${index}`;
// Odpowiedź producenta (2026-10-27): realizacja ok. 1 miesiąc od zamówienia i zaliczki, gwarancja 24 miesiące.
const LEAD_TIME_WEEKS = { min: 4, max: 4 };
const WARRANTY_YEARS = 2;

const groupId = (key: string) => detUuid(`group:${key}`);
const optionId = (groupKey: string, optionKey: string) => detUuid(`option:${groupKey}:${optionKey}`);
const variantId = (item: WencelProjectSource) => detUuid(`variant:${item.key}:pod-klucz`);

// Oferta nie podaje klasy energetycznej ani wentylacji; źródło ciepła jest do wyboru klienta.
const DEFAULT_SPECS = {
  wallBuildUp: WALL_BUILD_UP,
  insulation: INSULATION,
  heatTransferCoefficients: "nieznana",
  ventilation: "inna",
  ventilationOther: "Brak danych w ofercie producenta.",
  heatSource: "inne",
  heatSourceOther: HEAT_SOURCE_NOTE,
  constructionTechnology: "modulowa-stal-lekka",
} satisfies DomTechnicalSpecs;

const technicalSpecsOf = (item: WencelProjectSource): DomTechnicalSpecs => ({ ...DEFAULT_SPECS, ...item.specs });
const customizationScopeOf = (item: WencelProjectSource): L10n => item.customizationScope ?? CUSTOMIZATION_SCOPE;
const constructionSystemOf = (item: WencelProjectSource): L10n => item.constructionSystem ?? CONSTRUCTION_SYSTEM;
const groupsOf = (item: WencelProjectSource) => OPTION_GROUPS.filter((group) => !item.optionGroupKeys || item.optionGroupKeys.includes(group.key));

function assertL10n(owner: string, text: L10n): void {
  for (const key of ["pl", "en", "de", "nl"] as const) {
    if (!text[key] || text[key].trim().length === 0) throw new Error(`${owner}: brak wersji ${key}`);
  }
}

const roomLayoutOf = (item: WencelProjectSource) =>
  item.rooms.map((entry, index) => ({ id: roomId(item, index), name: entry.name.pl, areaM2: entry.areaM2, floorLevel: entry.floorLevel }));

function validate(): void {
  const slugs = new Set<string>();
  for (const item of WENCEL_PROJECTS) {
    if (!getTechnicalSpecsSchema("dom", "published").safeParse(technicalSpecsOf(item)).success) {
      throw new Error(`${item.name}: niepoprawne dane techniczne`);
    }
    assertL10n(item.name, customizationScopeOf(item));
    const slug = slugifyProductName(item.name);
    if (slugs.has(slug)) throw new Error(`Powtórzony slug ${slug}`);
    slugs.add(slug);
    for (const text of [item.description, item.roofType, item.scope, item.excluded, ...item.includedItems, ...item.rooms.map((r) => r.name)]) {
      assertL10n(item.name, text);
    }
    if (!roomLayoutSchema.safeParse(roomLayoutOf(item)).success) throw new Error(`${item.name}: niepoprawny układ pomieszczeń`);
    assertL10n(item.name, constructionSystemOf(item));
    if (item.photos.length === 0 || item.photos.length > 10) throw new Error(`${item.name}: liczba zdjęć ${item.photos.length}`);
  }
  for (const group of OPTION_GROUPS) {
    assertL10n("grupa opcji", group.name);
    for (const option of group.options) assertL10n(group.key, option.label);
  }
  for (const text of [WENCEL_PRODUCER.description, ELIGIBILITY_REASON, CONSTRUCTION_SYSTEM, CUSTOMIZATION_SCOPE]) {
    assertL10n("producent/wspólne", text);
  }
}

interface LocalAsset {
  buffer: Buffer;
  filename: string;
  mimeType: string;
  r2Key: string;
  purpose: "product_photo" | "product_floor_plan" | "product_realization_photo";
  isCover: boolean;
  sortOrder: number;
  floorLevel: "parter" | "pietro" | null;
}

async function loadProjectAssets(item: WencelProjectSource): Promise<LocalAsset[]> {
  const entries = [
    ...item.photos.map((file, index) => ({ file, purpose: "product_photo" as const, floorLevel: null, isCover: index === 0 })),
    ...item.floorPlans.map((plan) => ({ file: plan.file, purpose: "product_floor_plan" as const, floorLevel: plan.floorLevel, isCover: false })),
    ...item.realizations.map((file) => ({ file, purpose: "product_realization_photo" as const, floorLevel: null, isCover: false })),
  ];
  return Promise.all(
    entries.map(async ({ file, purpose, floorLevel, isCover }, index) => {
      const buffer = await readFile(path.join(process.cwd(), file));
      const validation = validateProductPhotoFile(buffer);
      if (!validation.ok || !validation.mimeType) {
        throw new Error(`Nieprawidłowy obraz ${file}: ${validation.error ?? "nieznany błąd"}`);
      }
      const filename = path.basename(file);
      return { buffer, filename, mimeType: validation.mimeType, r2Key: buildR2Key(filename), purpose, isCover, sortOrder: index, floorLevel };
    }),
  );
}

function productValues(item: WencelProjectSource) {
  return {
    producerId: PRODUCER_ID,
    status: "published" as const,
    family: "dom" as const,
    name: item.name,
    slug: slugifyProductName(item.name),
    countryOfProduction: "PL",
    floorAreaM2: item.floorAreaM2,
    builtUpAreaM2: item.builtUpAreaM2 ?? null,
    description: item.description.pl,
    completionStandard: "pod-klucz" as const,
    productionLeadTimeWeeksMin: item.leadTimeWeeks?.min ?? LEAD_TIME_WEEKS.min,
    productionLeadTimeWeeksMax: item.leadTimeWeeks?.max ?? LEAD_TIME_WEEKS.max,
    structuralWarrantyYears: WARRANTY_YEARS,
    category: item.category ?? ("rekreacyjny-caloroczny" as const),
    // Dom na stalowej ramie, który można wielokrotnie przenosić, stoi na podporach, nie na stałym fundamencie.
    foundationStatus: item.foundationStatus === undefined ? ("temporary" as const) : item.foundationStatus,
    technicalSpecs: technicalSpecsOf(item),
    roomLayout: roomLayoutOf(item),
    rooms: null,
    bedrooms: item.bedrooms,
    bathrooms: item.bathrooms,
    storeys: item.storeys,
    roofType: item.roofType.pl,
    constructionSystem: constructionSystemOf(item).pl,
    customizationScope: customizationScopeOf(item).pl,
    currency: "EUR",
    featured: false,
    deletedAt: null,
    updatedAt: new Date(),
  };
}

async function upsertProducer(): Promise<void> {
  await db.batch([
    db.insert(country).values({ code: "PL", name: "Polska" }).onConflictDoNothing(),
    db
      .insert(users)
      .values({
        id: IMPORT_USER_ID,
        name: WENCEL_PRODUCER.name,
        email: "catalog-import+wencel@modularhub.invalid",
        role: "producer",
        // users.phone jest NOT NULL; zaślepka techniczna, nigdzie nie pokazywana (kontakt tylko przez platformę).
        phone: "+48 000 000 000",
      })
      .onConflictDoUpdate({ target: users.id, set: { name: WENCEL_PRODUCER.name, role: "producer", updatedAt: new Date() } }),
    db
      .insert(producer)
      .values({
        id: PRODUCER_ID,
        userId: IMPORT_USER_ID,
        nip: WENCEL_PRODUCER.nip,
        name: WENCEL_PRODUCER.name,
        countryCode: "PL",
        technology: "modulowa-stal-lekka",
        verificationStatus: "not_submitted",
        description: WENCEL_PRODUCER.description.pl,
      })
      .onConflictDoUpdate({
        target: producer.id,
        set: {
          name: WENCEL_PRODUCER.name,
          countryCode: "PL",
          technology: "modulowa-stal-lekka",
          description: WENCEL_PRODUCER.description.pl,
          updatedAt: new Date(),
          deletedAt: null,
        },
      }),
    db.insert(producerDeliveryCountry).values({ producerId: PRODUCER_ID, countryCode: "PL" }).onConflictDoNothing(),
    db.insert(producerMember).values({ producerId: PRODUCER_ID, userId: IMPORT_USER_ID }).onConflictDoNothing(),
    db
      .insert(producerTranslation)
      .values(LOCALES.map((locale) => ({ producerId: PRODUCER_ID, locale, description: WENCEL_PRODUCER.description[locale] })))
      .onConflictDoUpdate({
        target: [producerTranslation.producerId, producerTranslation.locale],
        set: { description: excluded("description"), updatedAt: new Date() },
      }),
    db
      .insert(referenceTextTranslation)
      .values(LOCALES.map((locale) => ({ sourcePl: ELIGIBILITY_REASON.pl, locale, translated: ELIGIBILITY_REASON[locale] })))
      .onConflictDoNothing(),
    db
      .insert(costLineItemLabelTranslation)
      .values(
        WENCEL_PROJECTS.flatMap((item) =>
          item.includedItems.flatMap((label) => LOCALES.map((locale) => ({ labelPl: label.pl, locale, translatedLabel: label[locale] }))),
        ),
      )
      .onConflictDoNothing(),
  ]);
}

// Zdjęcia opcji (product_option.image_url): stały klucz w R2, więc ponowny import nadpisuje ten sam plik.
async function uploadOptionImages(): Promise<Map<string, string>> {
  const urls = new Map<string, string>();
  for (const group of OPTION_GROUPS) {
    for (const option of group.options) {
      if (!option.imageFile) continue;
      const buffer = await readFile(path.join(process.cwd(), option.imageFile));
      const validation = validateProductPhotoFile(buffer);
      if (!validation.ok || !validation.mimeType) throw new Error(`Nieprawidłowy obraz ${option.imageFile}`);
      const key = `option-images/wencel-${group.key}-${option.key}.jpg`;
      if (!DRY_RUN) await uploadObject(key, buffer, validation.mimeType);
      urls.set(optionId(group.key, option.key), buildPublicUrl(key));
    }
  }
  return urls;
}

async function upsertOptionGroups(): Promise<void> {
  const imageUrls = await uploadOptionImages();
  // Zmiana opcji domyślnej w grupie (indeks: najwyżej jedna domyślna na grupę) wymaga najpierw wyczyszczenia starej.
  await db
    .update(productOption)
    .set({ isDefault: false })
    .where(inArray(productOption.groupId, OPTION_GROUPS.map((group) => groupId(group.key))));
  await db.batch([
    db
      .insert(productOptionGroup)
      .values(OPTION_GROUPS.map((group, index) => ({ id: groupId(group.key), producerId: PRODUCER_ID, name: group.name.pl, selectionType: group.selectionType, sortOrder: index })))
      .onConflictDoUpdate({
        target: productOptionGroup.id,
        set: { name: excluded("name"), selectionType: excluded("selection_type"), sortOrder: excluded("sort_order"), deletedAt: null, updatedAt: new Date() },
      }),
    db
      .insert(productOption)
      .values(
        OPTION_GROUPS.flatMap((group) =>
          group.options.map((option, index) => ({
            id: optionId(group.key, option.key),
            groupId: groupId(group.key),
            label: option.label.pl,
            priceCents: 0,
            priceOnRequest: false,
            imageUrl: imageUrls.get(optionId(group.key, option.key)) ?? null,
            priceNote: option.priceNote.pl,
            // Grupy single zawsze mają zaznaczoną opcję, pierwsza jest domyślną (podstawowy wariant z ceny bazowej); multi nie ma domyślnej.
            isDefault: group.selectionType === "single" && index === 0,
            sortOrder: index,
          })),
        ),
      )
      .onConflictDoUpdate({
        target: productOption.id,
        set: {
          label: excluded("label"),
          priceCents: excluded("price_cents"),
          priceOnRequest: excluded("price_on_request"),
          imageUrl: excluded("image_url"),
          priceNote: excluded("price_note"),
          isDefault: excluded("is_default"),
          sortOrder: excluded("sort_order"),
          deletedAt: null,
          updatedAt: new Date(),
        },
      }),
    db
      .insert(productOptionGroupTranslation)
      .values(OPTION_GROUPS.flatMap((group) => LOCALES.map((locale) => ({ groupId: groupId(group.key), locale, name: group.name[locale] }))))
      .onConflictDoUpdate({
        target: [productOptionGroupTranslation.groupId, productOptionGroupTranslation.locale],
        set: { name: excluded("name"), updatedAt: new Date() },
      }),
    db
      .insert(productOptionTranslation)
      .values(
        OPTION_GROUPS.flatMap((group) =>
          group.options.flatMap((option) => LOCALES.map((locale) => ({ optionId: optionId(group.key, option.key), locale, label: option.label[locale], priceNote: option.priceNote[locale] }))),
        ),
      )
      .onConflictDoUpdate({
        target: [productOptionTranslation.optionId, productOptionTranslation.locale],
        set: { label: excluded("label"), priceNote: excluded("price_note"), updatedAt: new Date() },
      }),
  ]);
}

async function upsertProject(item: WencelProjectSource): Promise<void> {
  const values = productValues(item);
  await db.batch([
    db
      .insert(product)
      .values({ id: item.id, ...values })
      .onConflictDoUpdate({ target: product.id, set: values }),
    db
      .insert(productCountryEligibility)
      .values({ productId: item.id, countryCode: "PL", status: "conditional", reason: ELIGIBILITY_REASON.pl })
      .onConflictDoUpdate({
        target: [productCountryEligibility.productId, productCountryEligibility.countryCode],
        set: { status: "conditional", reason: ELIGIBILITY_REASON.pl, updatedAt: new Date() },
      }),
    db
      .insert(productTranslation)
      .values(
        LOCALES.map((locale) => ({
          productId: item.id,
          locale,
          name: item.name,
          description: item.description[locale],
          roomLayout: item.rooms.map((entry, index) => ({ id: roomId(item, index), name: entry.name[locale] })),
          constructionSystem: constructionSystemOf(item)[locale],
          roofType: item.roofType[locale],
          customizationScope: customizationScopeOf(item)[locale],
        })),
      )
      .onConflictDoUpdate({
        target: [productTranslation.productId, productTranslation.locale],
        set: {
          name: excluded("name"),
          description: excluded("description"),
          roomLayout: excluded("room_layout"),
          constructionSystem: excluded("construction_system"),
          roofType: excluded("roof_type"),
          customizationScope: excluded("customization_scope"),
          updatedAt: new Date(),
        },
      }),
  ]);

  // Grupy opcji po produkcie (FK); produkt bez wyboru po stronie klienta nie dostaje żadnej.
  const groups = groupsOf(item);
  if (groups.length > 0) {
    await db
      .insert(productOptionGroupAssignment)
      .values(groups.map((group) => ({ productId: item.id, groupId: groupId(group.key) })))
      .onConflictDoNothing();
  }

  // Cena product.price_min_cents jest wyliczana wyzwalaczem z wariantu domyślnego.
  const id = variantId(item);
  const priceCents = priceCentsOf(item);
  await db.batch([
    db
      .insert(productVariant)
      .values({
        id,
        productId: item.id,
        completionStandard: "pod-klucz",
        priceMinCents: priceCents,
        priceOnRequest: false,
        scopeSummary: item.scope.pl,
        excludedScope: item.excluded.pl,
        isDefault: true,
        sortOrder: 0,
      })
      .onConflictDoUpdate({
        target: productVariant.id,
        set: {
          priceMinCents: priceCents,
          priceOnRequest: false,
          scopeSummary: item.scope.pl,
          excludedScope: item.excluded.pl,
          isDefault: true,
          sortOrder: 0,
          deletedAt: null,
          updatedAt: new Date(),
        },
      }),
    db
      .insert(productVariantTranslation)
      .values(LOCALES.map((locale) => ({ productVariantId: id, locale, scopeSummary: item.scope[locale], excludedScope: item.excluded[locale] })))
      .onConflictDoUpdate({
        target: [productVariantTranslation.productVariantId, productVariantTranslation.locale],
        set: { scopeSummary: excluded("scope_summary"), excludedScope: excluded("excluded_scope"), updatedAt: new Date() },
      }),
  ]);

  const costIds = item.includedItems.map((_, index) => detUuid(`cost:${id}:${index}`));
  for (const [index, label] of item.includedItems.entries()) {
    await db
      .insert(costLineItem)
      .values({ id: costIds[index], productVariantId: id, label: label.pl, status: "w-cenie", sortOrder: index })
      .onConflictDoUpdate({ target: costLineItem.id, set: { label: label.pl, status: "w-cenie", sortOrder: index, updatedAt: new Date() } });
  }
  await db.delete(costLineItem).where(and(eq(costLineItem.productVariantId, id), notInArray(costLineItem.id, costIds)));
}

// Galeria jest dopełniana po nazwie pliku: nowe pliki trafiają do R2 i do bazy, istniejące dostają tylko
// aktualną kolejność, więc dodanie zdjęć do już zaimportowanego produktu nie wymaga czyszczenia galerii.
async function uploadProjectDocuments(item: WencelProjectSource): Promise<number> {
  const existing = await db
    .select({ id: document.id, filename: document.filename })
    .from(document)
    .where(and(eq(document.productId, item.id), isNull(document.deletedAt)));
  const existingByName = new Map(existing.map((row) => [row.filename, row.id]));

  const assets = await loadProjectAssets(item);
  const fresh = assets.filter((asset) => !existingByName.has(asset.filename));
  for (const asset of fresh) await uploadObject(asset.r2Key, asset.buffer, asset.mimeType);

  if (fresh.length > 0) {
    await db.insert(document).values(
      fresh.map((asset) => ({
        r2Key: asset.r2Key,
        filename: asset.filename,
        mimeType: asset.mimeType,
        sizeBytes: asset.buffer.byteLength,
        purpose: asset.purpose,
        isCover: false,
        sortOrder: asset.sortOrder,
        floorLevel: asset.floorLevel,
        ownerUserId: IMPORT_USER_ID,
        productId: item.id,
      })),
    );
  }
  for (const asset of assets) {
    const id = existingByName.get(asset.filename);
    if (id) await db.update(document).set({ sortOrder: asset.sortOrder, floorLevel: asset.floorLevel, purpose: asset.purpose }).where(eq(document.id, id));
  }
  // Okładka: jedna na produkt (indeks częściowy), ustawiana po wstawieniu, nie w trakcie.
  const cover = assets.find((asset) => asset.isCover && asset.purpose === "product_photo");
  if (cover) {
    await db
      .update(document)
      .set({ isCover: sql`(${document.filename} = ${cover.filename})` })
      .where(and(eq(document.productId, item.id), eq(document.purpose, "product_photo"), isNull(document.deletedAt)));
  }
  return fresh.length;
}

async function main(): Promise<void> {
  validate();
  if (DRY_RUN) {
    for (const item of WENCEL_PROJECTS) {
      const files = await loadProjectAssets(item);
      console.log(`- ${item.name}: ${files.length} plików, ${item.rooms.length} pomieszczeń, ${priceCentsOf(item) / 100} EUR`);
    }
    console.log(`Dry run OK: ${WENCEL_PROJECTS.length} projektów, nic nie zapisano.`);
    return;
  }

  await assertDevDatabase();
  await upsertProducer();
  await upsertOptionGroups();
  for (const item of WENCEL_PROJECTS) await upsertProject(item);
  console.log(`Zapisano ${WENCEL_PROJECTS.length} projektów Przemysława Wencela.`);

  for (const item of WENCEL_PROJECTS) {
    const count = await uploadProjectDocuments(item);
    console.log(`- ${item.name}: ${count === 0 ? "dokumenty już kompletne" : `${count} plików zapisanych w R2`}`);
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
