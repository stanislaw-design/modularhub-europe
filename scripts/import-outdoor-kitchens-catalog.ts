// Kuchnie ogrodowe (spec 0086): 4 kuchnie w obudowie Wooden Dream House i 6 zestawów modułowych pod marką
// ModularHub Europe (dane w scripts/data/outdoor-kitchens-catalog.ts). Tworzy konto techniczne i producenta marki
// własnej (is_platform_brand), grupy opcji, produkty z jednym wariantem katalogowym, tłumaczenia en/de/nl i do 6
// zdjęć na produkt w R2. Ponowne uruchomienie niczego nie dubluje (stałe id, zdjęcia po nazwie pliku).
// Zapis tylko do dev DB (assertDevDatabase); prod to osobny krok przez scripts/export-outdoor-kitchens-prod-sql.ts.
// `--dry-run` waliduje dane i zdjęcia, niczego nie zapisuje. `--only=<klucz>` importuje jeden produkt.
import { readFile } from "node:fs/promises";
import path from "node:path";
import { and, eq, inArray, isNull, notInArray, sql } from "drizzle-orm";
import sharp from "sharp";
import { db } from "../lib/db/client";
import { assertDevDatabase } from "../lib/db/dev-database-guard";
import {
  document,
  producer,
  producerDeliveryCountry,
  producerMember,
  product,
  productOption,
  productOptionGroup,
  productOptionGroupAssignment,
  productOptionGroupTranslation,
  productOptionTranslation,
  productTranslation,
  productVariant,
  users,
} from "../lib/db/schema";
import { MARKET_COUNTRY_CODES } from "../lib/countries";
import { getTechnicalSpecsSchema } from "../lib/product-technical-specs";
import { slugifyProductName } from "../lib/product-slug";
import { validateProductPhotoFile } from "../lib/storage/document-validation";
import { buildR2Key, deleteObject, uploadObject } from "../lib/storage/r2-client";
import {
  allTextsOf,
  BRAND_PRODUCER_ID,
  BRAND_PRODUCER_NAME,
  BRAND_PRODUCER_NIP,
  BRAND_USER_EMAIL,
  BRAND_USER_ID,
  groupIdOf,
  KITCHENS,
  LOCALES,
  optionIdOf,
  photoFilenameOf,
  productIdOf,
  technicalSpecsOf,
  translatedSpecsOf,
  variantIdOf,
  WDH_PRODUCER_ID,
  type OutdoorKitchen,
} from "./data/outdoor-kitchens-catalog";

const DRY_RUN = process.argv.includes("--dry-run");
const ONLY = process.argv.find((arg) => arg.startsWith("--only="))?.slice("--only=".length);
const PHOTO_DIR = path.join(process.cwd(), "_docs", "kuchnie-ogrodowe-dla-inwestora", "pdf-build", "img");
const SUPPLIER_NAMES = /eleexa|smartboxy|kitchenboxy/i;
const excluded = (column: string) => sql.raw(`excluded."${column}"`);

const producerIdOf = (item: OutdoorKitchen) => (item.producer === "wdh" ? WDH_PRODUCER_ID : BRAND_PRODUCER_ID);

// AC-1, AC-5: cała walidacja przed pierwszym zapisem do bazy.
function validate(items: OutdoorKitchen[]): void {
  const schema = getTechnicalSpecsSchema("outdoor-kitchen", "published");
  for (const item of items) {
    const parsed = schema.safeParse(technicalSpecsOf(item));
    if (!parsed.success) throw new Error(`${item.key}: niepoprawne technicalSpecs ${JSON.stringify(parsed.error.issues)}`);
    const texts = [...allTextsOf(item), slugifyProductName(item.name.pl), ...item.photos.map((_, i) => photoFilenameOf(item, i))];
    for (const text of texts) {
      if (!text.trim()) throw new Error(`${item.key}: pusty tekst`);
      if (SUPPLIER_NAMES.test(text)) throw new Error(`${item.key}: nazwa dostawcy w danych: ${text}`);
    }
    if (item.photos.length === 0 || item.photos.length > 6) throw new Error(`${item.key}: od 1 do 6 zdjęć`);
  }
}

interface Asset {
  buffer: Buffer;
  filename: string;
  width: number;
  height: number;
}

// Zdjęcia: EXIF obrócony, dłuższy bok do 2000 px, WebP. Kolejność z danych, pierwsze to okładka.
async function optimize(item: OutdoorKitchen): Promise<Asset[]> {
  const assets: Asset[] = [];
  for (const [index, name] of item.photos.entries()) {
    const original = await readFile(path.join(PHOTO_DIR, name));
    const buffer = await sharp(original)
      .rotate()
      .resize({ width: 2000, height: 2000, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();
    const validation = validateProductPhotoFile(buffer);
    if (!validation.ok) throw new Error(`Nieprawidłowy obraz ${name}: ${validation.error}`);
    const meta = await sharp(buffer).metadata();
    assets.push({ buffer, filename: photoFilenameOf(item, index), width: meta.width ?? 0, height: meta.height ?? 0 });
  }
  return assets;
}

// AC-4: konto techniczne z rolą producer i adresem .invalid (nikt nie odbierze linku logowania), producent
// "ModularHub Europe" z is_platform_brand = true i NIP MHE-OWN.
async function upsertBrandProducer(): Promise<void> {
  await db.batch([
    db
      .insert(users)
      .values({
        id: BRAND_USER_ID,
        name: BRAND_PRODUCER_NAME,
        email: BRAND_USER_EMAIL,
        role: "producer",
        // users.phone jest NOT NULL; zaślepka techniczna, nigdzie nie pokazywana.
        phone: "+00 000 000 000",
      })
      .onConflictDoUpdate({
        target: users.id,
        set: { name: BRAND_PRODUCER_NAME, email: BRAND_USER_EMAIL, role: "producer", updatedAt: new Date() },
      }),
    db
      .insert(producer)
      .values({
        id: BRAND_PRODUCER_ID,
        userId: BRAND_USER_ID,
        nip: BRAND_PRODUCER_NIP,
        name: BRAND_PRODUCER_NAME,
        countryCode: "PL",
        verificationStatus: "approved",
        description: null,
        isPlatformBrand: true,
      })
      .onConflictDoUpdate({
        target: producer.id,
        set: { name: BRAND_PRODUCER_NAME, isPlatformBrand: true, description: null, updatedAt: new Date(), deletedAt: null },
      }),
    db.insert(producerMember).values({ producerId: BRAND_PRODUCER_ID, userId: BRAND_USER_ID }).onConflictDoNothing(),
    db
      .insert(producerDeliveryCountry)
      .values(MARKET_COUNTRY_CODES.map((countryCode) => ({ producerId: BRAND_PRODUCER_ID, countryCode })))
      .onConflictDoNothing(),
  ]);
}

async function upsertOptionGroups(item: OutdoorKitchen): Promise<string[]> {
  if (item.optionGroups.length === 0) return [];
  const producerId = producerIdOf(item);
  const groupIds = item.optionGroups.map((group) => groupIdOf(item.key, group.key));
  // Najwyżej jedna opcja domyślna na grupę (indeks), więc najpierw czyścimy starą.
  await db.update(productOption).set({ isDefault: false }).where(inArray(productOption.groupId, groupIds));
  await db.batch([
    db
      .insert(productOptionGroup)
      .values(
        item.optionGroups.map((group, index) => ({
          id: groupIdOf(item.key, group.key),
          producerId,
          name: group.name.pl,
          selectionType: group.selectionType,
          sortOrder: index,
        })),
      )
      .onConflictDoUpdate({
        target: productOptionGroup.id,
        set: {
          name: excluded("name"),
          selectionType: excluded("selection_type"),
          sortOrder: excluded("sort_order"),
          deletedAt: null,
          updatedAt: new Date(),
        },
      }),
    db
      .insert(productOption)
      .values(
        item.optionGroups.flatMap((group) =>
          group.options.map((option, index) => ({
            id: optionIdOf(item.key, group.key, option.key),
            groupId: groupIdOf(item.key, group.key),
            label: option.label.pl,
            priceCents: option.priceEur === null ? null : Math.round(option.priceEur * 100),
            priceOnRequest: option.priceEur === null,
            priceNote: null,
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
          priceNote: excluded("price_note"),
          isDefault: excluded("is_default"),
          sortOrder: excluded("sort_order"),
          deletedAt: null,
          updatedAt: new Date(),
        },
      }),
    db
      .insert(productOptionGroupTranslation)
      .values(
        item.optionGroups.flatMap((group) =>
          LOCALES.map((locale) => ({ groupId: groupIdOf(item.key, group.key), locale, name: group.name[locale] })),
        ),
      )
      .onConflictDoUpdate({
        target: [productOptionGroupTranslation.groupId, productOptionGroupTranslation.locale],
        set: { name: excluded("name"), updatedAt: new Date() },
      }),
    db
      .insert(productOptionTranslation)
      .values(
        item.optionGroups.flatMap((group) =>
          group.options.flatMap((option) =>
            LOCALES.map((locale) => ({
              optionId: optionIdOf(item.key, group.key, option.key),
              locale,
              label: option.label[locale],
              priceNote: null,
            })),
          ),
        ),
      )
      .onConflictDoUpdate({
        target: [productOptionTranslation.optionId, productOptionTranslation.locale],
        set: { label: excluded("label"), priceNote: excluded("price_note"), updatedAt: new Date() },
      }),
  ]);
  // Opcje usunięte z danych odpadają (miękko), żeby ponowny import odzwierciedlał dane.
  const optionIds = item.optionGroups.flatMap((group) =>
    group.options.map((option) => optionIdOf(item.key, group.key, option.key)),
  );
  await db
    .update(productOption)
    .set({ deletedAt: new Date() })
    .where(and(inArray(productOption.groupId, groupIds), notInArray(productOption.id, optionIds), isNull(productOption.deletedAt)));
  return groupIds;
}

async function upsertProduct(item: OutdoorKitchen): Promise<void> {
  const id = productIdOf(item.key);
  const values = {
    producerId: producerIdOf(item),
    status: "published" as const,
    name: item.name.pl,
    slug: slugifyProductName(item.name.pl),
    family: "outdoor-kitchen" as const,
    category: null,
    spaSubcategory: null,
    containerSubcategory: null,
    // Kraj produkcji znany tylko dla WDH; zestawy modułowe zostawiają pole puste.
    countryOfProduction: item.producer === "wdh" ? "PL" : null,
    description: item.description.pl,
    externalDimensions: null,
    technicalSpecs: technicalSpecsOf(item),
    currency: "EUR",
    featured: false,
    deletedAt: null,
    updatedAt: new Date(),
  };
  await db.batch([
    db.insert(product).values({ id, ...values }).onConflictDoUpdate({ target: product.id, set: values }),
    db
      .insert(productTranslation)
      .values(
        LOCALES.map((locale) => ({
          productId: id,
          locale,
          name: item.name[locale],
          description: item.description[locale],
          technicalSpecs: translatedSpecsOf(item, locale),
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
  ]);

  // Jeden wariant katalogowy z ceną "od"; product.price_min_cents liczy wyzwalacz z wariantu domyślnego.
  const variantId = variantIdOf(item.key);
  const priceCents = Math.round(item.priceEur * 100);
  await db
    .insert(productVariant)
    .values({
      id: variantId,
      productId: id,
      completionStandard: "katalogowy",
      priceMinCents: priceCents,
      priceOnRequest: false,
      isDefault: true,
      sortOrder: 0,
    })
    .onConflictDoUpdate({
      target: productVariant.id,
      set: { priceMinCents: priceCents, priceOnRequest: false, isDefault: true, deletedAt: null, updatedAt: new Date() },
    });

  // Przypisania grup: dokładnie te z danych.
  const groupIds = await upsertOptionGroups(item);
  await db
    .delete(productOptionGroupAssignment)
    .where(
      groupIds.length > 0
        ? and(eq(productOptionGroupAssignment.productId, id), notInArray(productOptionGroupAssignment.groupId, groupIds))
        : eq(productOptionGroupAssignment.productId, id),
    );
  if (groupIds.length > 0) {
    await db
      .insert(productOptionGroupAssignment)
      .values(groupIds.map((groupId) => ({ productId: id, groupId })))
      .onConflictDoNothing();
  }
}

// Zdjęcia dopasowane po nazwie pliku; pliki spoza zestawu znikają razem z obiektem w R2.
async function syncDocuments(item: OutdoorKitchen, assets: Asset[], ownerUserId: string) {
  const id = productIdOf(item.key);
  const existing = await db
    .select({ id: document.id, filename: document.filename, r2Key: document.r2Key })
    .from(document)
    .where(and(eq(document.productId, id), isNull(document.deletedAt)));
  const wanted = new Set(assets.map((asset) => asset.filename));
  const byName = new Map(existing.map((row) => [row.filename, row.id]));
  const stale = existing.filter((row) => !wanted.has(row.filename));
  for (const row of stale) {
    await db.delete(document).where(eq(document.id, row.id));
    await deleteObject(row.r2Key);
  }
  let added = 0;
  for (const [index, asset] of assets.entries()) {
    const known = byName.get(asset.filename);
    if (known) {
      await db.update(document).set({ sortOrder: index + 1 }).where(eq(document.id, known));
      continue;
    }
    const r2Key = buildR2Key(asset.filename);
    await uploadObject(r2Key, asset.buffer, "image/webp");
    await db.insert(document).values({
      r2Key,
      filename: asset.filename,
      mimeType: "image/webp",
      sizeBytes: asset.buffer.byteLength,
      purpose: "product_photo",
      isCover: false,
      sortOrder: index + 1,
      ownerUserId,
      productId: id,
    });
    added += 1;
  }
  await db
    .update(document)
    .set({ isCover: sql`(${document.filename} = ${assets[0].filename})` })
    .where(and(eq(document.productId, id), eq(document.purpose, "product_photo"), isNull(document.deletedAt)));
  return { added, removed: stale.length };
}

async function main(): Promise<void> {
  const items = ONLY ? KITCHENS.filter((item) => item.key === ONLY) : KITCHENS;
  if (items.length === 0) throw new Error(`Nieznany produkt: ${ONLY}`);
  validate(items);
  const prepared = new Map<string, Asset[]>();
  for (const item of items) {
    const assets = await optimize(item);
    prepared.set(item.key, assets);
    console.log(
      `- ${item.name.pl} (${item.kitchenType}): ${item.priceEur} EUR, ${assets.length} zdjęć, grupy opcji: ${item.optionGroups.length}`,
    );
  }
  if (DRY_RUN) return console.log("Dry run OK, nic nie zapisano.");

  await assertDevDatabase();
  const [wdh] = await db
    .select({ userId: producer.userId })
    .from(producer)
    .where(and(eq(producer.id, WDH_PRODUCER_ID), isNull(producer.deletedAt)));
  if (!wdh) throw new Error(`Brak producenta Wooden Dream House (${WDH_PRODUCER_ID}) w bazie`);
  if (items.some((item) => item.producer === "brand")) await upsertBrandProducer();

  for (const item of items) {
    await upsertProduct(item);
    const owner = item.producer === "wdh" ? wdh.userId : BRAND_USER_ID;
    const { added, removed } = await syncDocuments(item, prepared.get(item.key)!, owner);
    console.log(`  ${item.name.pl}: wgrano ${added} zdjęć, usunięto ${removed}`);
  }
  console.log(`Gotowe: ${items.length} produktów. Następnie: npm run check:translations`);
}

main().then(
  () => process.exit(0),
  (error) => {
    console.error(error);
    process.exit(1);
  },
);
