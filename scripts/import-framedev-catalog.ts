// FrameDEV: 43 domy na szkielecie stalowym LGS ze strony framedev.pl (dane w scripts/data/framedev-catalog.ts
// i framedev-projects.ts). Spec 0067: tłumaczenia en/de/nl powstają razem z importem; po nim
// `npm run check:translations` ma zgłosić zero braków. Zapis tylko do dev DB (assertDevDatabase); prod to
// osobny, jawny krok. `--dry-run` waliduje dane i pliki, niczego nie zapisuje.
import { readFile } from "node:fs/promises";
import path from "node:path";
import { and, eq, isNull, notInArray, sql } from "drizzle-orm";
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
  productTranslation,
  productVariant,
  productVariantTranslation,
  referenceTextTranslation,
  users,
} from "../lib/db/schema";
import { faqSchema } from "../lib/product-faq";
import { roomLayoutSchema } from "../lib/product-room-layout";
import { getTechnicalSpecsSchema, type DomTechnicalSpecs } from "../lib/product-technical-specs";
import { slugifyProductName } from "../lib/product-slug";
import { validateProductPhotoFile } from "../lib/storage/document-validation";
import { buildR2Key, uploadObject } from "../lib/storage/r2-client";
import {
  CONSTRUCTION_SYSTEM,
  CUSTOMIZATION_SCOPE,
  DEV_EXCLUDED,
  DEV_INTRO,
  DEV_ITEMS,
  ELIGIBILITY_REASON,
  FAQ_PAYMENTS,
  FAQ_TIMELINE,
  FRAMEDEV_PRODUCER,
  IMPORT_USER_ID,
  INSULATION,
  PRODUCER_ID,
  TURNKEY_EXCLUDED,
  TURNKEY_INTRO,
  TURNKEY_ITEMS,
  WALL_BUILD_UP,
  detUuid,
  faqAllInclusive,
  plnToEurCents,
  type FramedevProjectSource,
  type L10n,
} from "./data/framedev-catalog";
import { FRAMEDEV_PROJECTS } from "./data/framedev-projects";

const DRY_RUN = process.argv.includes("--dry-run");
const LOCALES = ["en", "de", "nl"] as const;
const excluded = (column: string) => sql.raw(`excluded."${column}"`);

const roomId = (item: FramedevProjectSource, index: number) => `${item.key}-room-${index}`;
const faqId = (item: FramedevProjectSource, index: number) => `${item.key}-faq-${index + 1}`;
const variantId = (item: FramedevProjectSource, standard: string) => detUuid(`variant:${item.key}:${standard}`);

function technicalSpecsOf(item: FramedevProjectSource): DomTechnicalSpecs {
  // Strona producenta nie podaje klasy energetycznej; źródło ciepła podaje tylko przy modelach Homekoncept.
  const heat =
    item.heatSource === null
      ? { heatSource: "inne" as const, heatSourceOther: "Brak danych na stronie producenta." }
      : { heatSource: item.heatSource };
  return {
    wallBuildUp: WALL_BUILD_UP,
    insulation: INSULATION,
    heatTransferCoefficients: "nieznana",
    ventilation: "rekuperacja",
    constructionTechnology: "modulowa-stal-lekka",
    ...heat,
  };
}

function faqOf(item: FramedevProjectSource): { question: L10n; answer: L10n }[] {
  return [faqAllInclusive(item.pricePln.allInclusive), FAQ_PAYMENTS, FAQ_TIMELINE];
}

function assertL10n(owner: string, text: L10n): void {
  for (const key of ["pl", "en", "de", "nl"] as const) {
    if (!text[key] || text[key].trim().length === 0) throw new Error(`${owner}: brak wersji ${key}`);
  }
}

function roomLayoutOf(item: FramedevProjectSource) {
  return item.rooms.map((entry, index) => ({
    id: roomId(item, index),
    name: entry.name.pl,
    areaM2: entry.areaM2,
    floorLevel: entry.floorLevel,
  }));
}

function validate(): void {
  const slugs = new Set<string>();
  for (const item of FRAMEDEV_PROJECTS) {
    if (!getTechnicalSpecsSchema("dom", "published").safeParse(technicalSpecsOf(item)).success) {
      throw new Error(`${item.name}: niepoprawne dane techniczne`);
    }
    const slug = slugifyProductName(item.name);
    if (slugs.has(slug)) throw new Error(`Powtórzony slug ${slug}`);
    slugs.add(slug);
    assertL10n(item.name, item.description);
    assertL10n(item.name, item.roofType);
    for (const entry of item.rooms) assertL10n(item.name, entry.name);
    if (!roomLayoutSchema.safeParse(roomLayoutOf(item)).success) throw new Error(`${item.name}: niepoprawny układ pomieszczeń`);
    const faq = faqOf(item);
    for (const entry of faq) {
      assertL10n(item.name, entry.question);
      assertL10n(item.name, entry.answer);
    }
    if (!faqSchema.safeParse(faq.map((entry, index) => ({ id: faqId(item, index), question: entry.question.pl, answer: entry.answer.pl }))).success) {
      throw new Error(`${item.name}: niepoprawne FAQ`);
    }
    if (item.photos.length === 0 || item.photos.length > 10) throw new Error(`${item.name}: liczba zdjęć ${item.photos.length}`);
  }
  for (const text of [FRAMEDEV_PRODUCER.description, ELIGIBILITY_REASON, CONSTRUCTION_SYSTEM, CUSTOMIZATION_SCOPE, DEV_INTRO, DEV_EXCLUDED, TURNKEY_INTRO, TURNKEY_EXCLUDED, ...DEV_ITEMS, ...TURNKEY_ITEMS]) {
    assertL10n("producent/wspólne", text);
  }
}

interface LocalAsset {
  buffer: Buffer;
  filename: string;
  mimeType: string;
  r2Key: string;
  purpose: "product_photo" | "product_floor_plan";
  isCover: boolean;
  sortOrder: number;
  floorLevel: "parter" | "pietro" | "poddasze" | null;
}

async function loadAsset(
  file: string,
  purpose: LocalAsset["purpose"],
  isCover: boolean,
  sortOrder: number,
  floorLevel: LocalAsset["floorLevel"] = null,
): Promise<LocalAsset> {
  const buffer = await readFile(path.join(process.cwd(), file));
  const validation = validateProductPhotoFile(buffer);
  if (!validation.ok || !validation.mimeType) {
    throw new Error(`Nieprawidłowy obraz ${file}: ${validation.error ?? "nieznany błąd"}`);
  }
  const filename = path.basename(file);
  return { buffer, filename, mimeType: validation.mimeType, r2Key: buildR2Key(filename), purpose, isCover, sortOrder, floorLevel };
}

async function loadProjectAssets(item: FramedevProjectSource): Promise<LocalAsset[]> {
  return [
    ...(await Promise.all(item.photos.map((file, index) => loadAsset(file, "product_photo", index === 0, index)))),
    ...(await Promise.all(
      item.floorPlans.map((entry, index) => loadAsset(entry.file, "product_floor_plan", false, item.photos.length + index, entry.floorLevel)),
    )),
  ];
}

function productValues(item: FramedevProjectSource) {
  return {
    producerId: PRODUCER_ID,
    status: "published" as const,
    family: "dom" as const,
    name: item.name,
    slug: slugifyProductName(item.name),
    countryOfProduction: "PL",
    floorAreaM2: item.floorAreaM2,
    builtUpAreaM2: item.builtUpAreaM2,
    description: item.description.pl,
    completionStandard: "deweloperski" as const,
    category: "caloroczny" as const,
    technicalSpecs: technicalSpecsOf(item),
    roomLayout: roomLayoutOf(item),
    faq: faqOf(item).map((entry, index) => ({ id: faqId(item, index), question: entry.question.pl, answer: entry.answer.pl })),
    rooms: null,
    bedrooms: item.bedrooms,
    bathrooms: item.bathrooms,
    storeys: item.storeys,
    roofType: item.roofType.pl,
    constructionSystem: CONSTRUCTION_SYSTEM.pl,
    customizationScope: CUSTOMIZATION_SCOPE.pl,
    minPlotWidthM: item.minPlotWidthM,
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
        name: FRAMEDEV_PRODUCER.name,
        email: "catalog-import+framedev@modularhub.invalid",
        role: "producer",
        // users.phone jest NOT NULL; zaślepka techniczna, nigdzie nie pokazywana (kontakt tylko przez platformę).
        phone: "+48 000 000 000",
      })
      .onConflictDoUpdate({ target: users.id, set: { name: FRAMEDEV_PRODUCER.name, role: "producer", updatedAt: new Date() } }),
    db
      .insert(producer)
      .values({
        id: PRODUCER_ID,
        userId: IMPORT_USER_ID,
        nip: FRAMEDEV_PRODUCER.nip,
        name: FRAMEDEV_PRODUCER.name,
        countryCode: "PL",
        technology: "modulowa-stal-lekka",
        verificationStatus: "not_submitted",
        description: FRAMEDEV_PRODUCER.description.pl,
      })
      .onConflictDoUpdate({
        target: producer.id,
        set: {
          name: FRAMEDEV_PRODUCER.name,
          countryCode: "PL",
          technology: "modulowa-stal-lekka",
          description: FRAMEDEV_PRODUCER.description.pl,
          updatedAt: new Date(),
          deletedAt: null,
        },
      }),
    db.insert(producerDeliveryCountry).values({ producerId: PRODUCER_ID, countryCode: "PL" }).onConflictDoNothing(),
    db.insert(producerMember).values({ producerId: PRODUCER_ID, userId: IMPORT_USER_ID }).onConflictDoNothing(),
    db
      .insert(producerTranslation)
      .values(LOCALES.map((locale) => ({ producerId: PRODUCER_ID, locale, description: FRAMEDEV_PRODUCER.description[locale] })))
      .onConflictDoUpdate({
        target: [producerTranslation.producerId, producerTranslation.locale],
        set: { description: excluded("description"), updatedAt: new Date() },
      }),
    db
      .insert(referenceTextTranslation)
      .values(LOCALES.map((locale) => ({ sourcePl: ELIGIBILITY_REASON.pl, locale, translated: ELIGIBILITY_REASON[locale] })))
      .onConflictDoNothing(),
    // Słownik tłumaczeń etykiet pozycji kosztowych (po dokładnym polskim tekście), wspólny dla wszystkich modeli.
    db
      .insert(costLineItemLabelTranslation)
      .values(
        [...DEV_ITEMS, ...TURNKEY_ITEMS].flatMap((label) =>
          LOCALES.map((locale) => ({ labelPl: label.pl, locale, translatedLabel: label[locale] })),
        ),
      )
      .onConflictDoNothing(),
  ]);
}

async function upsertProject(item: FramedevProjectSource): Promise<void> {
  const values = productValues(item);
  const faq = faqOf(item);
  const variants = [
    { standard: "deweloperski" as const, pricePln: item.pricePln.developer, scope: DEV_INTRO, items: DEV_ITEMS, excluded: DEV_EXCLUDED, isDefault: true },
    { standard: "pod-klucz" as const, pricePln: item.pricePln.turnkey, scope: TURNKEY_INTRO, items: TURNKEY_ITEMS, excluded: TURNKEY_EXCLUDED, isDefault: false },
  ];

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
          faq: faq.map((entry, index) => ({ id: faqId(item, index), question: entry.question[locale], answer: entry.answer[locale] })),
          constructionSystem: CONSTRUCTION_SYSTEM[locale],
          roofType: item.roofType[locale],
          customizationScope: CUSTOMIZATION_SCOPE[locale],
        })),
      )
      .onConflictDoUpdate({
        target: [productTranslation.productId, productTranslation.locale],
        set: {
          name: excluded("name"),
          description: excluded("description"),
          roomLayout: excluded("room_layout"),
          faq: excluded("faq"),
          constructionSystem: excluded("construction_system"),
          roofType: excluded("roof_type"),
          customizationScope: excluded("customization_scope"),
          updatedAt: new Date(),
        },
      }),
  ]);

  // Warianty po produkcie: cena product.price_min_cents wylicza wyzwalacz z wariantu domyślnego.
  for (const [index, variant] of variants.entries()) {
    const id = variantId(item, variant.standard);
    const priceCents = plnToEurCents(variant.pricePln);
    await db.batch([
      db
        .insert(productVariant)
        .values({
          id,
          productId: item.id,
          completionStandard: variant.standard,
          priceMinCents: priceCents,
          priceOnRequest: false,
          scopeSummary: variant.scope.pl,
          excludedScope: variant.excluded.pl,
          isDefault: variant.isDefault,
          sortOrder: index,
        })
        .onConflictDoUpdate({
          target: productVariant.id,
          set: {
            priceMinCents: priceCents,
            priceOnRequest: false,
            scopeSummary: variant.scope.pl,
            excludedScope: variant.excluded.pl,
            isDefault: variant.isDefault,
            sortOrder: index,
            deletedAt: null,
            updatedAt: new Date(),
          },
        }),
      db
        .insert(productVariantTranslation)
        .values(
          LOCALES.map((locale) => ({
            productVariantId: id,
            locale,
            scopeSummary: variant.scope[locale],
            excludedScope: variant.excluded[locale],
          })),
        )
        .onConflictDoUpdate({
          target: [productVariantTranslation.productVariantId, productVariantTranslation.locale],
          set: { scopeSummary: excluded("scope_summary"), excludedScope: excluded("excluded_scope"), updatedAt: new Date() },
        }),
    ]);

    // Pozycje kosztowe = punkty "Zakres pakietu" ze strony; po ponownym imporcie nie zostają pozycje usunięte ze źródła.
    const costIds = variant.items.map((_, itemIndex) => detUuid(`cost:${id}:${itemIndex}`));
    for (const [itemIndex, label] of variant.items.entries()) {
      await db
        .insert(costLineItem)
        .values({ id: costIds[itemIndex], productVariantId: id, label: label.pl, status: "w-cenie", sortOrder: itemIndex })
        .onConflictDoUpdate({
          target: costLineItem.id,
          set: { label: label.pl, status: "w-cenie", sortOrder: itemIndex, updatedAt: new Date() },
        });
    }
    await db.delete(costLineItem).where(and(eq(costLineItem.productVariantId, id), notInArray(costLineItem.id, costIds)));
  }
}

async function uploadProjectDocuments(item: FramedevProjectSource): Promise<number> {
  const expected = item.photos.length + item.floorPlans.length;
  const existing = await db
    .select({ id: document.id })
    .from(document)
    .where(and(eq(document.productId, item.id), isNull(document.deletedAt)));

  if (existing.length === expected) return 0;
  if (existing.length > 0) {
    throw new Error(`${item.name}: istnieje niepełna galeria ${existing.length}/${expected}; wymaga ręcznej kontroli.`);
  }

  const assets = await loadProjectAssets(item);
  for (const asset of assets) await uploadObject(asset.r2Key, asset.buffer, asset.mimeType);

  await db.insert(document).values(
    assets.map((asset) => ({
      r2Key: asset.r2Key,
      filename: asset.filename,
      mimeType: asset.mimeType,
      sizeBytes: asset.buffer.byteLength,
      purpose: asset.purpose,
      isCover: asset.isCover,
      sortOrder: asset.sortOrder,
      floorLevel: asset.floorLevel,
      ownerUserId: IMPORT_USER_ID,
      productId: item.id,
    })),
  );
  return assets.length;
}

async function main(): Promise<void> {
  validate();
  if (DRY_RUN) {
    let files = 0;
    for (const item of FRAMEDEV_PROJECTS) {
      files += (await loadProjectAssets(item)).length;
      console.log(
        `- ${item.name}: ${item.photos.length} zdjęć, ${item.floorPlans.length} rzutów, ${item.rooms.length} pomieszczeń, ` +
          `deweloperski ${plnToEurCents(item.pricePln.developer) / 100} EUR, pod klucz ${plnToEurCents(item.pricePln.turnkey) / 100} EUR`,
      );
    }
    console.log(`Dry run OK: ${FRAMEDEV_PROJECTS.length} projektów, ${files} poprawnych plików, nic nie zapisano.`);
    return;
  }

  await assertDevDatabase();
  await upsertProducer();
  for (const item of FRAMEDEV_PROJECTS) await upsertProject(item);
  console.log(`Zapisano ${FRAMEDEV_PROJECTS.length} projektów FrameDEV.`);

  let uploadedFiles = 0;
  const failures: string[] = [];
  for (const item of FRAMEDEV_PROJECTS) {
    try {
      const count = await uploadProjectDocuments(item);
      uploadedFiles += count;
      console.log(`- ${item.name}: ${count === 0 ? "dokumenty już kompletne" : `${count} plików zapisanych w R2`}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      failures.push(message);
      console.error(`- ${item.name}: ${message}`);
    }
  }

  console.log(`Łącznie nowych plików w R2: ${uploadedFiles}.`);
  if (failures.length > 0) throw new Error(`Nie udało się ukończyć ${failures.length} galerii.`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
