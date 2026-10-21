// Modu-Home: 7 modeli saun fińskich i kompleksów (dane w scripts/data/moduhome-catalog.ts).
// Produkty są szkicami (draft): katalog nie podaje pojemności, izolacji, wymiarów ani fundamentu.
// Spec 0067: tłumaczenia en/de/nl powstają razem z importem. Zapis tylko do dev DB (assertDevDatabase);
// prod to osobny, jawny krok. `--dry-run` waliduje dane i pliki, niczego nie zapisuje.
import { readFile } from "node:fs/promises";
import path from "node:path";
import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "../lib/db/client";
import { assertDevDatabase } from "../lib/db/dev-database-guard";
import {
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
  referenceTextTranslation,
  users,
} from "../lib/db/schema";
import { getTechnicalSpecsSchema } from "../lib/product-technical-specs";
import { slugifyProductName } from "../lib/product-slug";
import { validateProductPhotoFile } from "../lib/storage/document-validation";
import { buildR2Key, uploadObject } from "../lib/storage/r2-client";
import {
  ELIGIBILITY_REASON,
  GRP,
  IMPORT_USER_ID,
  MODUHOME_PRODUCER,
  MODUHOME_PRODUCTS,
  OPT,
  PHOTO_DIR,
  PRODUCER_ID,
  SPECS_COMMON,
  detUuid,
  plnGrossToEurCents,
  type L10n,
  type ModuhomeProduct,
} from "./data/moduhome-catalog";

const DRY_RUN = process.argv.includes("--dry-run");
const LOCALES = ["en", "de", "nl"] as const;
const excluded = (column: string) => sql.raw(`excluded."${column}"`);

const productId = (item: ModuhomeProduct) => detUuid(`product:${item.key}`);
const groupId = (item: ModuhomeProduct, group: string) => detUuid(`group:${item.key}:${group}`);
const optionId = (item: ModuhomeProduct, group: string, option: string) => detUuid(`option:${item.key}:${group}:${option}`);

function specsOf(item: ModuhomeProduct, locale: "pl" | (typeof LOCALES)[number]) {
  return {
    ...(item.claddingMaterial ? { claddingMaterial: item.claddingMaterial[locale] } : {}),
    interiorWoodType: SPECS_COMMON.interiorWoodType[locale],
    glazingType: SPECS_COMMON.glazingType[locale],
    ...(item.electricalRequirement ? { electricalRequirement: item.electricalRequirement[locale] } : {}),
    ...(item.hasChangingArea === undefined ? {} : { hasChangingArea: item.hasChangingArea }),
    ...(item.changingAreaDescription ? { changingAreaDescription: item.changingAreaDescription[locale] } : {}),
  };
}

function assertL10n(owner: string, text: L10n): void {
  for (const key of ["pl", "en", "de", "nl"] as const) {
    if (!text[key] || text[key].trim().length === 0) throw new Error(`${owner}: brak wersji ${key}`);
  }
}

function validate(): void {
  const slugs = new Set<string>();
  for (const item of MODUHOME_PRODUCTS) {
    if (!getTechnicalSpecsSchema("spa-modulowe", "draft", undefined, "sauna").safeParse(specsOf(item, "pl")).success) {
      throw new Error(`${item.name}: niepoprawne dane techniczne`);
    }
    assertL10n(item.name, item.description);
    const slug = slugifyProductName(item.name);
    if (slugs.has(slug)) throw new Error(`Powtórzony slug ${slug}`);
    slugs.add(slug);
    for (const group of item.groups) {
      assertL10n(`${item.name}/${group.key}`, GRP[group.key]);
      const defaults = group.options.filter((option) => option.isDefault).length;
      if (group.selection === "single" && defaults !== 1) throw new Error(`${item.name}/${group.key}: grupa single wymaga dokładnie jednej opcji domyślnej`);
      if (group.selection === "multi" && defaults !== 0) throw new Error(`${item.name}/${group.key}: grupa multi nie ma opcji domyślnej`);
      for (const option of group.options) assertL10n(`${item.name}/${option.key}`, OPT[option.key]);
    }
  }
  for (const text of [MODUHOME_PRODUCER.description, ELIGIBILITY_REASON]) assertL10n("producent/wspólne", text);
}

interface LocalAsset {
  buffer: Buffer;
  filename: string;
  mimeType: string;
  r2Key: string;
  isCover: boolean;
  sortOrder: number;
}

async function loadAssets(item: ModuhomeProduct): Promise<LocalAsset[]> {
  return Promise.all(
    item.photos.map(async (file, index) => {
      const buffer = await readFile(path.join(process.cwd(), PHOTO_DIR, file));
      const validation = validateProductPhotoFile(buffer);
      if (!validation.ok || !validation.mimeType) throw new Error(`Nieprawidłowy obraz ${file}: ${validation.error ?? "nieznany błąd"}`);
      return { buffer, filename: file, mimeType: validation.mimeType, r2Key: buildR2Key(file), isCover: index === 0, sortOrder: index };
    }),
  );
}

async function upsertProducer(): Promise<void> {
  await db.batch([
    db.insert(country).values({ code: "PL", name: "Polska" }).onConflictDoNothing(),
    db
      .insert(users)
      .values({
        id: IMPORT_USER_ID,
        name: MODUHOME_PRODUCER.name,
        email: "catalog-import+moduhome@modularhub.invalid",
        role: "producer",
        // users.phone jest NOT NULL; zaślepka techniczna, nigdzie nie pokazywana (kontakt tylko przez platformę).
        phone: "+48 000 000 000",
      })
      .onConflictDoUpdate({ target: users.id, set: { name: MODUHOME_PRODUCER.name, role: "producer", updatedAt: new Date() } }),
    db
      .insert(producer)
      .values({
        id: PRODUCER_ID,
        userId: IMPORT_USER_ID,
        nip: MODUHOME_PRODUCER.nip,
        name: MODUHOME_PRODUCER.name,
        countryCode: "PL",
        verificationStatus: "not_submitted",
        description: MODUHOME_PRODUCER.description.pl,
      })
      .onConflictDoUpdate({
        target: producer.id,
        set: { name: MODUHOME_PRODUCER.name, countryCode: "PL", description: MODUHOME_PRODUCER.description.pl, updatedAt: new Date(), deletedAt: null },
      }),
    db.insert(producerDeliveryCountry).values({ producerId: PRODUCER_ID, countryCode: "PL" }).onConflictDoNothing(),
    db.insert(producerMember).values({ producerId: PRODUCER_ID, userId: IMPORT_USER_ID }).onConflictDoNothing(),
    db
      .insert(producerTranslation)
      .values(LOCALES.map((locale) => ({ producerId: PRODUCER_ID, locale, description: MODUHOME_PRODUCER.description[locale] })))
      .onConflictDoUpdate({
        target: [producerTranslation.producerId, producerTranslation.locale],
        set: { description: excluded("description"), updatedAt: new Date() },
      }),
    db
      .insert(referenceTextTranslation)
      .values(LOCALES.map((locale) => ({ sourcePl: ELIGIBILITY_REASON.pl, locale, translated: ELIGIBILITY_REASON[locale] })))
      .onConflictDoNothing(),
  ]);
}

async function upsertProduct(item: ModuhomeProduct): Promise<void> {
  const id = productId(item);
  const values = {
    producerId: PRODUCER_ID,
    status: "draft" as const,
    family: "spa-modulowe" as const,
    spaSubcategory: "sauna" as const,
    name: item.name,
    slug: slugifyProductName(item.name),
    countryOfProduction: "PL",
    description: item.description.pl,
    technicalSpecs: specsOf(item, "pl"),
    priceMinCents: plnGrossToEurCents(item.basePricePln),
    currency: "EUR",
    featured: false,
    deletedAt: null,
    updatedAt: new Date(),
  };

  const groupRows = item.groups.map((group, groupIndex) => ({
    id: groupId(item, group.key),
    producerId: PRODUCER_ID,
    name: GRP[group.key].pl,
    selectionType: group.selection,
    sortOrder: groupIndex + 1,
    deletedAt: null,
    updatedAt: new Date(),
  }));
  const optionRows = item.groups.flatMap((group) =>
    group.options.map((option, optionIndex) => ({
      id: optionId(item, group.key, option.key),
      groupId: groupId(item, group.key),
      label: OPT[option.key].pl,
      priceCents: option.pln === "request" ? null : plnGrossToEurCents(option.pln),
      priceOnRequest: option.pln === "request",
      isDefault: option.isDefault ?? false,
      sortOrder: optionIndex + 1,
      deletedAt: null,
      updatedAt: new Date(),
    })),
  );

  await db.batch([
    db
      .insert(product)
      .values({ id, ...values })
      .onConflictDoUpdate({ target: product.id, set: values }),
    db
      .insert(productCountryEligibility)
      .values({ productId: id, countryCode: "PL", status: "conditional", reason: ELIGIBILITY_REASON.pl })
      .onConflictDoUpdate({
        target: [productCountryEligibility.productId, productCountryEligibility.countryCode],
        set: { status: "conditional", reason: ELIGIBILITY_REASON.pl, updatedAt: new Date() },
      }),
    db
      .insert(productTranslation)
      .values(
        LOCALES.map((locale) => ({
          productId: id,
          locale,
          name: item.name,
          description: item.description[locale],
          technicalSpecs: {
            specs: Object.fromEntries(
              Object.entries(specsOf(item, locale))
                .filter(([, value]) => typeof value === "string")
                .map(([key, value]) => [key, { value }]),
            ),
          },
        })),
      )
      .onConflictDoUpdate({
        target: [productTranslation.productId, productTranslation.locale],
        set: {
          name: excluded("name"),
          description: excluded("description"),
          technicalSpecs: excluded("technical_specs"),
          updatedAt: new Date(),
        },
      }),
    db
      .insert(productOptionGroup)
      .values(groupRows)
      .onConflictDoUpdate({
        target: productOptionGroup.id,
        set: { name: excluded("name"), selectionType: excluded("selection_type"), sortOrder: excluded("sort_order"), deletedAt: null, updatedAt: new Date() },
      }),
    db
      .insert(productOption)
      .values(optionRows)
      .onConflictDoUpdate({
        target: productOption.id,
        set: {
          label: excluded("label"),
          priceCents: excluded("price_cents"),
          priceOnRequest: excluded("price_on_request"),
          isDefault: excluded("is_default"),
          sortOrder: excluded("sort_order"),
          deletedAt: null,
          updatedAt: new Date(),
        },
      }),
    db
      .insert(productOptionGroupAssignment)
      .values(item.groups.map((group) => ({ productId: id, groupId: groupId(item, group.key) })))
      .onConflictDoNothing(),
    db
      .insert(productOptionGroupTranslation)
      .values(
        item.groups.flatMap((group) =>
          LOCALES.map((locale) => ({ groupId: groupId(item, group.key), locale, name: GRP[group.key][locale] })),
        ),
      )
      .onConflictDoUpdate({
        target: [productOptionGroupTranslation.groupId, productOptionGroupTranslation.locale],
        set: { name: excluded("name"), updatedAt: new Date() },
      }),
    db
      .insert(productOptionTranslation)
      .values(
        item.groups.flatMap((group) =>
          group.options.flatMap((option) =>
            LOCALES.map((locale) => ({ optionId: optionId(item, group.key, option.key), locale, label: OPT[option.key][locale] })),
          ),
        ),
      )
      .onConflictDoUpdate({
        target: [productOptionTranslation.optionId, productOptionTranslation.locale],
        set: { label: excluded("label"), updatedAt: new Date() },
      }),
  ]);
}

async function uploadDocuments(item: ModuhomeProduct): Promise<number> {
  if (item.photos.length === 0) return 0;
  const id = productId(item);
  const existing = await db
    .select({ id: document.id })
    .from(document)
    .where(and(eq(document.productId, id), isNull(document.deletedAt)));
  if (existing.length === item.photos.length) return 0;
  if (existing.length > 0) throw new Error(`${item.name}: istnieje niepełna galeria ${existing.length}/${item.photos.length}; wymaga ręcznej kontroli.`);

  const assets = await loadAssets(item);
  for (const asset of assets) await uploadObject(asset.r2Key, asset.buffer, asset.mimeType);
  await db.insert(document).values(
    assets.map((asset) => ({
      r2Key: asset.r2Key,
      filename: asset.filename,
      mimeType: asset.mimeType,
      sizeBytes: asset.buffer.byteLength,
      purpose: "product_photo" as const,
      isCover: asset.isCover,
      sortOrder: asset.sortOrder,
      ownerUserId: IMPORT_USER_ID,
      productId: id,
    })),
  );
  return assets.length;
}

async function main(): Promise<void> {
  validate();
  if (DRY_RUN) {
    let files = 0;
    for (const item of MODUHOME_PRODUCTS) files += (await loadAssets(item)).length;
    const options = MODUHOME_PRODUCTS.reduce((sum, item) => sum + item.groups.reduce((s, g) => s + g.options.length, 0), 0);
    console.log(`Dry run OK: ${MODUHOME_PRODUCTS.length} produktów, ${options} opcji, ${files} poprawnych plików, nic nie zapisano.`);
    for (const item of MODUHOME_PRODUCTS) console.log(`- ${item.name}: od ${plnGrossToEurCents(item.basePricePln) / 100} EUR netto, ${item.photos.length} zdjęć`);
    return;
  }

  await assertDevDatabase();
  await upsertProducer();
  for (const item of MODUHOME_PRODUCTS) {
    await upsertProduct(item);
    console.log(`- ${item.name}: produkt, grupy opcji i tłumaczenia zapisane`);
  }

  let uploaded = 0;
  const failures: string[] = [];
  for (const item of MODUHOME_PRODUCTS) {
    try {
      const count = await uploadDocuments(item);
      uploaded += count;
      console.log(`- ${item.name}: ${count === 0 ? "zdjęcia już kompletne lub brak" : `${count} plików zapisanych w R2`}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      failures.push(message);
      console.error(`- ${item.name}: ${message}`);
    }
  }
  console.log(`Łącznie nowych plików w R2: ${uploaded}.`);
  if (failures.length > 0) throw new Error(`Nie udało się ukończyć ${failures.length} galerii.`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
