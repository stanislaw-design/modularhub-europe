// Life Polska (lifepolska.pl): sauny ogrodowe, 11 produktów z wariantami rozmiarów (dane w scripts/data/lifepolska-catalog.ts).
// Spec 0067: tłumaczenia en/de/nl powstają razem z importem; po nim `npm run check:translations` ma zgłosić zero braków.
// Zdjęcia (surowe pliki w tmp/lifepolska-raw/<model>/) są optymalizowane (WebP, dłuższy bok do 2000 px) przed wgraniem
// do R2. Zapis tylko do dev DB (assertDevDatabase); prod to osobny, jawny krok. `--dry-run` waliduje dane i pliki oraz
// pokazuje rozmiary po optymalizacji, niczego nie zapisuje.
import { readdir, readFile } from "node:fs/promises";
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
import { MARKET_COUNTRY_CODES } from "../lib/countries";
import { getTechnicalSpecsSchema } from "../lib/product-technical-specs";
import { slugifyProductName } from "../lib/product-slug";
import { validateProductPhotoFile } from "../lib/storage/document-validation";
import { buildR2Key, deleteObject, uploadObject } from "../lib/storage/r2-client";
import {
  BENCH,
  ELECTRICAL,
  ELIGIBILITY_REASON,
  FOUNDATION,
  IMPORT_USER_ID,
  INSULATION,
  INTERIOR,
  OPTION_GROUPS,
  PRODUCER_DESCRIPTION,
  PRODUCER_ID,
  SAUNAS,
  eurCentsOf,
  groupId,
  optionId,
  productIdOf,
  variantIdOf,
  variantScope,
  type L10n,
  type LifepolskaSauna,
} from "./data/lifepolska-catalog";

const DRY_RUN = process.argv.includes("--dry-run");
const LOCALES = ["en", "de", "nl"] as const;
const RAW_DIR = path.join(process.cwd(), "tmp", "lifepolska-raw");
const excluded = (column: string) => sql.raw(`excluded."${column}"`);

const TEXT_SPEC_KEYS = ["claddingMaterial", "interiorWoodType", "benchMaterial", "insulationType", "glazingType", "electricalRequirement", "changingAreaDescription"] as const;

function textSpecsOf(item: LifepolskaSauna, locale: "pl" | (typeof LOCALES)[number]): Record<string, string> {
  const all: Record<(typeof TEXT_SPEC_KEYS)[number], L10n | undefined> = {
    claddingMaterial: item.specs.claddingMaterial,
    interiorWoodType: INTERIOR,
    benchMaterial: item.specs.benchMaterial ?? BENCH,
    insulationType: INSULATION,
    glazingType: item.specs.glazingType,
    electricalRequirement: ELECTRICAL,
    changingAreaDescription: item.specs.changingAreaDescription,
  };
  const out: Record<string, string> = {};
  for (const key of TEXT_SPEC_KEYS) if (all[key]) out[key] = all[key]![locale];
  return out;
}
const technicalSpecsPl = (item: LifepolskaSauna) => ({
  ...textSpecsOf(item, "pl"),
  seatingCapacity: item.specs.seatingCapacity,
  hasChangingArea: item.specs.hasChangingArea,
});
const translatedSpecsOf = (item: LifepolskaSauna, locale: (typeof LOCALES)[number]) => ({
  specs: Object.fromEntries(Object.entries(textSpecsOf(item, locale)).map(([key, value]) => [key, { value }])),
});

function assertL10n(owner: string, text: L10n): void {
  for (const key of ["pl", "en", "de", "nl"] as const) if (!text[key]?.trim()) throw new Error(`${owner}: brak wersji ${key}`);
}

function validate(): void {
  const slugs = new Set<string>();
  assertL10n("producent", PRODUCER_DESCRIPTION);
  assertL10n("fundament", FOUNDATION);
  assertL10n("powód zgodności", ELIGIBILITY_REASON);
  if (/@|https?:|www\.|\+?\d{3}[ -]?\d{3}[ -]?\d{3}/.test(PRODUCER_DESCRIPTION.pl)) throw new Error("Opis producenta zawiera dane kontaktowe");

  const groupKeys = new Set(OPTION_GROUPS.map((group) => group.key));
  for (const group of OPTION_GROUPS) {
    assertL10n(`grupa ${group.key}`, group.name);
    if (group.options.length === 0) throw new Error(`Grupa ${group.key} bez opcji`);
    if (group.selectionType === "single" && group.options[0].nettoPln !== 0) throw new Error(`Grupa ${group.key}: pierwsza opcja (domyślna) musi mieć cenę 0`);
    const keys = new Set<string>();
    for (const option of group.options) {
      assertL10n(`opcja ${group.key}/${option.key}`, option.label);
      if (option.note) assertL10n(`notka ${group.key}/${option.key}`, option.note);
      if (keys.has(option.key)) throw new Error(`Powtórzona opcja ${group.key}/${option.key}`);
      keys.add(option.key);
    }
  }

  for (const item of SAUNAS) {
    const slug = slugifyProductName(item.name);
    if (slugs.has(slug)) throw new Error(`Powtórzony slug ${slug}`);
    slugs.add(slug);
    const texts = [item.description, item.constructionSystem, item.roofType, item.equipment, ...(item.customizationScope ? [item.customizationScope] : [])];
    for (const text of texts) assertL10n(item.name, text);
    for (const key of TEXT_SPEC_KEYS) {
      const text = textSpecsOf(item, "pl")[key];
      if (text !== undefined) for (const locale of LOCALES) if (!textSpecsOf(item, locale)[key]?.trim()) throw new Error(`${item.name}: brak ${key}/${locale}`);
    }
    const parsed = getTechnicalSpecsSchema("spa-modulowe", "published", undefined, "sauna").safeParse(technicalSpecsPl(item));
    if (!parsed.success) throw new Error(`${item.name}: niepoprawne dane techniczne ${JSON.stringify(parsed.error.issues)}`);
    if (item.variants.length === 0) throw new Error(`${item.name}: brak wariantów`);
    const codes = new Set<string>();
    for (const variant of item.variants) {
      if (codes.has(variant.code)) throw new Error(`${item.name}: powtórzony wariant ${variant.code}`);
      codes.add(variant.code);
      if (!(variant.nettoPln > 0)) throw new Error(`${item.name}/${variant.code}: brak ceny`);
    }
    for (const key of item.optionGroups) if (!groupKeys.has(key)) throw new Error(`${item.name}: nieznana grupa opcji ${key}`);
  }
}

interface Asset {
  buffer: Buffer;
  filename: string;
  originalBytes: number;
  width: number;
  height: number;
}

// Zdjęcia: EXIF obrócony, dłuższy bok do 2000 px, WebP. Pliki poniżej 600 px (miniatury) odpadają. Okładka: pierwsze
// zdjęcie poziome z dłuższym bokiem co najmniej 1200 px (w kolejności ze strony producenta), a gdy żadnego nie ma, największe.
async function optimize(item: LifepolskaSauna): Promise<Asset[]> {
  const dir = path.join(RAW_DIR, item.photoDir);
  const names = (await readdir(dir)).filter((name) => /\.(jpe?g|png|webp)$/i.test(name)).sort();
  const loaded: Asset[] = [];
  for (const name of names) {
    const original = await readFile(path.join(dir, name));
    const meta = await sharp(original).rotate().metadata();
    const longEdge = Math.max(meta.width ?? 0, meta.height ?? 0);
    if (longEdge < 600) continue;
    const buffer = await sharp(original)
      .rotate()
      .resize({ width: 2000, height: 2000, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();
    const validation = validateProductPhotoFile(buffer);
    if (!validation.ok) throw new Error(`Nieprawidłowy obraz ${item.photoDir}/${name}: ${validation.error}`);
    const out = await sharp(buffer).metadata();
    loaded.push({ buffer, filename: "", originalBytes: original.byteLength, width: out.width ?? 0, height: out.height ?? 0 });
  }
  if (loaded.length === 0) throw new Error(`${item.name}: brak zdjęć`);
  const edge = (asset: Asset) => Math.max(asset.width, asset.height);
  const landscapeIndex = loaded.findIndex((asset) => edge(asset) >= 1200 && asset.width >= asset.height);
  const coverIndex = landscapeIndex >= 0 ? landscapeIndex : loaded.findIndex((asset) => edge(asset) >= 1200);
  const best = coverIndex >= 0 ? coverIndex : loaded.reduce((bestIdx, asset, idx) => (edge(asset) > edge(loaded[bestIdx]) ? idx : bestIdx), 0);
  const ordered = [loaded[best], ...loaded.filter((_, idx) => idx !== best)];
  return ordered.map((asset, idx) => ({ ...asset, filename: `${item.key}-${String(idx + 1).padStart(2, "0")}.webp` }));
}

async function upsertProducer(): Promise<void> {
  await db.batch([
    db
      .insert(users)
      .values({
        id: IMPORT_USER_ID,
        name: "Life Polska",
        email: "biuro@lifepolska.pl",
        role: "producer",
        // users.phone jest NOT NULL; zaślepka techniczna, nigdzie nie pokazywana (kontakt tylko przez platformę).
        phone: "+48 000 000 000",
      })
      .onConflictDoUpdate({ target: users.id, set: { name: "Life Polska", email: "biuro@lifepolska.pl", role: "producer", updatedAt: new Date() } }),
    db
      .insert(producer)
      .values({
        id: PRODUCER_ID,
        userId: IMPORT_USER_ID,
        nip: "6462323947",
        name: "Life Polska",
        countryCode: "PL",
        verificationStatus: "not_submitted",
        description: PRODUCER_DESCRIPTION.pl,
      })
      .onConflictDoUpdate({
        target: producer.id,
        set: { name: "Life Polska", countryCode: "PL", description: PRODUCER_DESCRIPTION.pl, updatedAt: new Date(), deletedAt: null },
      }),
    db
      .insert(referenceTextTranslation)
      .values(LOCALES.map((locale) => ({ sourcePl: ELIGIBILITY_REASON.pl, locale, translated: ELIGIBILITY_REASON[locale] })))
      .onConflictDoNothing(),
    // Producent deklaruje dostawę w całej Europie; rynki serwisu to sześć krajów z lib/countries.ts.
    db
      .insert(producerDeliveryCountry)
      .values(MARKET_COUNTRY_CODES.map((countryCode) => ({ producerId: PRODUCER_ID, countryCode })))
      .onConflictDoNothing(),
    db.insert(producerMember).values({ producerId: PRODUCER_ID, userId: IMPORT_USER_ID }).onConflictDoNothing(),
    db
      .insert(producerTranslation)
      .values(LOCALES.map((locale) => ({ producerId: PRODUCER_ID, locale, description: PRODUCER_DESCRIPTION[locale] })))
      .onConflictDoUpdate({
        target: [producerTranslation.producerId, producerTranslation.locale],
        set: { description: excluded("description"), updatedAt: new Date() },
      }),
  ]);
}

async function upsertOptionGroups(): Promise<void> {
  const ids = OPTION_GROUPS.map((group) => groupId(group.key));
  // Zmiana opcji domyślnej w grupie (indeks: najwyżej jedna domyślna na grupę) wymaga najpierw wyczyszczenia starej.
  await db.update(productOption).set({ isDefault: false }).where(inArray(productOption.groupId, ids));
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
            priceCents: eurCentsOf(option.nettoPln),
            priceOnRequest: false,
            priceNote: option.note?.pl ?? null,
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
      .values(OPTION_GROUPS.flatMap((group) => LOCALES.map((locale) => ({ groupId: groupId(group.key), locale, name: group.name[locale] }))))
      .onConflictDoUpdate({
        target: [productOptionGroupTranslation.groupId, productOptionGroupTranslation.locale],
        set: { name: excluded("name"), updatedAt: new Date() },
      }),
    db
      .insert(productOptionTranslation)
      .values(
        OPTION_GROUPS.flatMap((group) =>
          group.options.flatMap((option) =>
            LOCALES.map((locale) => ({ optionId: optionId(group.key, option.key), locale, label: option.label[locale], priceNote: option.note?.[locale] ?? null })),
          ),
        ),
      )
      .onConflictDoUpdate({
        target: [productOptionTranslation.optionId, productOptionTranslation.locale],
        set: { label: excluded("label"), priceNote: excluded("price_note"), updatedAt: new Date() },
      }),
  ]);
}

async function upsertProduct(item: LifepolskaSauna): Promise<void> {
  const id = productIdOf(item.key);
  const values = {
    producerId: PRODUCER_ID,
    status: "published" as const,
    name: item.name,
    slug: slugifyProductName(item.name),
    family: "spa-modulowe" as const,
    spaSubcategory: "sauna" as const,
    countryOfProduction: "PL",
    description: item.description.pl,
    externalDimensions: item.externalDimensions,
    constructionSystem: item.constructionSystem.pl,
    roofType: item.roofType.pl,
    foundationOptions: FOUNDATION.pl,
    customizationScope: item.customizationScope?.pl ?? null,
    technicalSpecs: technicalSpecsPl(item),
    currency: "EUR",
    featured: false,
    deletedAt: null,
    updatedAt: new Date(),
  };
  await db.batch([
    db.insert(product).values({ id, ...values }).onConflictDoUpdate({ target: product.id, set: values }),
    db.insert(productCountryEligibility).values({ productId: id, countryCode: "PL", status: "approved", reason: ELIGIBILITY_REASON.pl }).onConflictDoNothing(),
    db
      .insert(productTranslation)
      .values(
        LOCALES.map((locale) => ({
          productId: id,
          locale,
          description: item.description[locale],
          constructionSystem: item.constructionSystem[locale],
          roofType: item.roofType[locale],
          customizationScope: item.customizationScope?.[locale] ?? null,
          foundationOptions: FOUNDATION[locale],
          technicalSpecs: translatedSpecsOf(item, locale),
        })),
      )
      .onConflictDoUpdate({
        target: [productTranslation.productId, productTranslation.locale],
        set: {
          description: excluded("description"),
          constructionSystem: excluded("construction_system"),
          roofType: excluded("roof_type"),
          customizationScope: excluded("customization_scope"),
          foundationOptions: excluded("foundation_options"),
          technicalSpecs: excluded("technical_specs"),
          updatedAt: new Date(),
        },
      }),
  ]);

  // Przypisania grup: dokładnie te z listy modelu; reszta naszych grup odpada.
  const allIds = OPTION_GROUPS.map((group) => groupId(group.key));
  const wanted = item.optionGroups.map((key) => groupId(key));
  await db
    .delete(productOptionGroupAssignment)
    .where(and(eq(productOptionGroupAssignment.productId, id), inArray(productOptionGroupAssignment.groupId, allIds), notInArray(productOptionGroupAssignment.groupId, wanted)));
  await db.insert(productOptionGroupAssignment).values(wanted.map((groupIdValue) => ({ productId: id, groupId: groupIdValue }))).onConflictDoNothing();

  // Rozmiary to warianty `katalogowy`; domyślny jest najmniejszy, a product.price_min_cents liczy wyzwalacz z domyślnego.
  // Wcześniej zapisane warianty spoza listy są wyłączane (miękkie usunięcie).
  const variantIds = item.variants.map((variant) => variantIdOf(item.key, variant.code));
  await db
    .update(productVariant)
    .set({ isDefault: false })
    .where(eq(productVariant.productId, id));
  await db
    .update(productVariant)
    .set({ deletedAt: new Date() })
    .where(and(eq(productVariant.productId, id), notInArray(productVariant.id, variantIds), isNull(productVariant.deletedAt)));
  for (const [index, variant] of item.variants.entries()) {
    const vId = variantIdOf(item.key, variant.code);
    const priceCents = eurCentsOf(variant.nettoPln);
    const scope = variantScope(variant, item.equipment);
    await db.batch([
      db
        .insert(productVariant)
        .values({
          id: vId,
          productId: id,
          completionStandard: "katalogowy",
          variantLabel: variant.label,
          priceMinCents: priceCents,
          priceOnRequest: false,
          scopeSummary: scope.pl,
          isDefault: index === 0,
          sortOrder: index,
        })
        .onConflictDoUpdate({
          target: productVariant.id,
          set: { variantLabel: variant.label, priceMinCents: priceCents, priceOnRequest: false, scopeSummary: scope.pl, isDefault: index === 0, sortOrder: index, deletedAt: null, updatedAt: new Date() },
        }),
      db
        .insert(productVariantTranslation)
        .values(LOCALES.map((locale) => ({ productVariantId: vId, locale, variantLabel: variant.label, scopeSummary: scope[locale] })))
        .onConflictDoUpdate({
          target: [productVariantTranslation.productVariantId, productVariantTranslation.locale],
          set: { variantLabel: excluded("variant_label"), scopeSummary: excluded("scope_summary"), updatedAt: new Date() },
        }),
    ]);
  }
}

// Galeria jest dopełniana po nazwie pliku; pliki spoza zestawu są usuwane razem z obiektem w R2.
async function syncDocuments(item: LifepolskaSauna, assets: Asset[]): Promise<{ added: number; removed: number }> {
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
      ownerUserId: IMPORT_USER_ID,
      productId: id,
    });
    added += 1;
  }
  // Okładka: jedna na produkt (indeks częściowy), pierwsze zdjęcie, ustawiana po wstawieniu.
  await db
    .update(document)
    .set({ isCover: sql`(${document.filename} = ${assets[0].filename})` })
    .where(and(eq(document.productId, id), eq(document.purpose, "product_photo"), isNull(document.deletedAt)));
  return { added, removed: stale.length };
}

const mb = (bytes: number) => (bytes / 1024 / 1024).toFixed(1);

async function main(): Promise<void> {
  validate();
  const prepared = new Map<string, Asset[]>();
  for (const item of SAUNAS) {
    const assets = await optimize(item);
    prepared.set(item.key, assets);
    const before = assets.reduce((sum, a) => sum + a.originalBytes, 0);
    const after = assets.reduce((sum, a) => sum + a.buffer.byteLength, 0);
    const from = eurCentsOf(item.variants[0].nettoPln) / 100;
    console.log(
      `- ${item.name}: ${item.variants.length} wariantów od ${from} EUR, ${assets.length} zdjęć (okładka ${assets[0].width}x${assets[0].height}), ${mb(before)} MB -> ${mb(after)} MB, grupy opcji: ${item.optionGroups.length}`,
    );
  }
  if (DRY_RUN) return console.log("Dry run OK, nic nie zapisano.");

  await assertDevDatabase();
  await upsertProducer();
  await upsertOptionGroups();
  for (const item of SAUNAS) {
    await upsertProduct(item);
    const { added, removed } = await syncDocuments(item, prepared.get(item.key)!);
    console.log(`  ${item.name}: wgrano ${added}, usunięto starych ${removed}`);
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
