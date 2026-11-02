// Domwood (domwood.pl): sauny ogrodowe (dane w scripts/data/domwood-catalog.ts). Spec 0067: tłumaczenia en/de/nl
// powstają razem z importem; po nim `npm run check:translations` ma zgłosić zero braków. Zdjęcia są optymalizowane
// (WebP, dłuższy bok do 2000 px) przed wgraniem do R2. Zapis tylko do dev DB (assertDevDatabase); prod to osobny,
// jawny krok. `--dry-run` waliduje dane i pliki oraz pokazuje rozmiary po optymalizacji, niczego nie zapisuje.
import { readFile } from "node:fs/promises";
import path from "node:path";
import { and, eq, isNull, sql } from "drizzle-orm";
import sharp from "sharp";
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
  referenceTextTranslation,
  productTranslation,
  productVariant,
  users,
} from "../lib/db/schema";
import { getTechnicalSpecsSchema } from "../lib/product-technical-specs";
import { slugifyProductName } from "../lib/product-slug";
import { validateProductPhotoFile } from "../lib/storage/document-validation";
import { buildR2Key, deleteObject, uploadObject } from "../lib/storage/r2-client";
import {
  DOMWOOD_SAUNAS,
  ELIGIBILITY_REASON,
  FOUNDATION,
  IMPORT_USER_ID,
  PRODUCER_DESCRIPTION,
  PRODUCER_ID,
  detUuid,
  priceCentsOf,
  type DomwoodSauna,
  type L10n,
} from "./data/domwood-catalog";

const DRY_RUN = process.argv.includes("--dry-run");
const LOCALES = ["en", "de", "nl"] as const;
const excluded = (column: string) => sql.raw(`excluded."${column}"`);

const productId = (item: DomwoodSauna) => detUuid(`product:${item.key}`);
const variantId = (item: DomwoodSauna) => detUuid(`variant:${item.key}`);
const isComplete = (item: DomwoodSauna) => item.specs.seatingCapacity !== undefined && item.specs.hasChangingArea !== undefined;

const TEXT_SPECS = ["claddingMaterial", "interiorWoodType", "benchMaterial", "insulationType", "glazingType", "electricalRequirement", "changingAreaDescription"] as const;

function textSpecsOf(item: DomwoodSauna, locale: "pl" | (typeof LOCALES)[number]): Record<string, string> {
  const specs: Record<string, string> = {};
  for (const key of TEXT_SPECS) {
    const text = item.specs[key];
    if (text) specs[key] = text[locale];
  }
  return specs;
}
const translatedSpecsOf = (item: DomwoodSauna, locale: (typeof LOCALES)[number]) => ({
  specs: Object.fromEntries(Object.entries(textSpecsOf(item, locale)).map(([key, value]) => [key, { value }])),
});
const technicalSpecsPl = (item: DomwoodSauna) => ({
  ...textSpecsOf(item, "pl"),
  ...(item.specs.seatingCapacity !== undefined ? { seatingCapacity: item.specs.seatingCapacity } : {}),
  ...(item.specs.hasChangingArea !== undefined ? { hasChangingArea: item.specs.hasChangingArea } : {}),
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
  for (const item of DOMWOOD_SAUNAS) {
    const slug = slugifyProductName(item.name);
    if (slugs.has(slug)) throw new Error(`Powtórzony slug ${slug}`);
    slugs.add(slug);
    const texts = [
      item.description,
      item.constructionSystem,
      item.roofType,
      item.scopeSummary,
      ...(item.customizationScope ? [item.customizationScope] : []),
      ...Object.values(item.specs).filter((v): v is L10n => typeof v === "object"),
    ];
    for (const text of texts) assertL10n(item.name, text);
    const schema = getTechnicalSpecsSchema("spa-modulowe", isComplete(item) ? "published" : "draft", undefined, "sauna");
    const parsed = schema.safeParse(technicalSpecsPl(item));
    if (!parsed.success) throw new Error(`${item.name}: niepoprawne dane techniczne ${JSON.stringify(parsed.error.issues)}`);
    if (item.photos.every((p) => p.kind !== "photo")) throw new Error(`${item.name}: brak zdjęć`);
  }
}

interface Asset {
  buffer: Buffer;
  filename: string;
  kind: "photo" | "plan";
  originalBytes: number;
}

// Zdjęcia: EXIF obrócony, dłuższy bok do 2000 px (plany do 2400 px, żeby opisy zostały czytelne), WebP.
async function optimize(item: DomwoodSauna): Promise<Asset[]> {
  const assets: Asset[] = [];
  let photoNo = 0;
  for (const source of item.photos) {
    const original = await readFile(path.join(process.cwd(), source.file));
    const isPlan = source.kind === "plan";
    const max = isPlan ? 2400 : 2000;
    const buffer = await sharp(original)
      .rotate()
      .resize({ width: max, height: max, fit: "inside", withoutEnlargement: true })
      .webp({ quality: isPlan ? 88 : 80 })
      .toBuffer();
    const validation = validateProductPhotoFile(buffer);
    if (!validation.ok) throw new Error(`Nieprawidłowy obraz ${source.file}: ${validation.error}`);
    if (!isPlan) photoNo += 1;
    const filename = isPlan ? `${item.key}-plan.webp` : `${item.key}-${String(photoNo).padStart(2, "0")}.webp`;
    assets.push({ buffer, filename, kind: source.kind, originalBytes: original.byteLength });
  }
  return assets;
}

async function upsertProducer(): Promise<void> {
  await db.batch([
    db.insert(country).values({ code: "PL", name: "Polska" }).onConflictDoNothing(),
    db
      .insert(users)
      .values({
        id: IMPORT_USER_ID,
        name: "Domwood",
        email: "biuro@domwood.pl",
        role: "producer",
        // users.phone jest NOT NULL; zaślepka techniczna, nigdzie nie pokazywana (kontakt tylko przez platformę).
        phone: "+48 000 000 000",
      })
      .onConflictDoUpdate({ target: users.id, set: { name: "Domwood", email: "biuro@domwood.pl", role: "producer", updatedAt: new Date() } }),
    db
      .insert(producer)
      .values({
        id: PRODUCER_ID,
        userId: IMPORT_USER_ID,
        nip: "IMPORT-DOMWOOD-TBD",
        name: "Domwood",
        countryCode: "PL",
        verificationStatus: "not_submitted",
        description: PRODUCER_DESCRIPTION.pl,
      })
      .onConflictDoUpdate({
        target: producer.id,
        set: { name: "Domwood", countryCode: "PL", description: PRODUCER_DESCRIPTION.pl, updatedAt: new Date(), deletedAt: null },
      }),
    db
      .insert(referenceTextTranslation)
      .values(LOCALES.map((locale) => ({ sourcePl: ELIGIBILITY_REASON.pl, locale, translated: ELIGIBILITY_REASON[locale] })))
      .onConflictDoNothing(),
    db.insert(producerDeliveryCountry).values({ producerId: PRODUCER_ID, countryCode: "PL" }).onConflictDoNothing(),
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

async function upsertProduct(item: DomwoodSauna): Promise<void> {
  const id = productId(item);
  const priceCents = priceCentsOf(item.pricePlnBrutto);
  const values = {
    producerId: PRODUCER_ID,
    status: isComplete(item) ? ("published" as const) : ("draft" as const),
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
    db
      .insert(productCountryEligibility)
      .values({ productId: id, countryCode: "PL", status: "approved", reason: ELIGIBILITY_REASON.pl })
      .onConflictDoNothing(),
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
    // Cena product.price_min_cents jest wyliczana wyzwalaczem z wariantu domyślnego.
    db
      .insert(productVariant)
      .values({
        id: variantId(item),
        productId: id,
        completionStandard: "katalogowy",
        variantLabel: item.name.replace(/^Domwood /, ""),
        priceMinCents: priceCents,
        priceOnRequest: false,
        scopeSummary: item.scopeSummary.pl,
        isDefault: true,
        sortOrder: 1,
      })
      .onConflictDoUpdate({
        target: productVariant.id,
        set: { priceMinCents: priceCents, scopeSummary: item.scopeSummary.pl, isDefault: true, deletedAt: null, updatedAt: new Date() },
      }),
  ]);
}

// Galeria jest dopełniana po nazwie pliku; pliki, których nie ma już w zestawie (np. nieoptymalizowane PNG z
// pierwszego importu), są usuwane razem z obiektem w R2.
async function syncDocuments(item: DomwoodSauna, assets: Asset[]): Promise<{ added: number; removed: number }> {
  const id = productId(item);
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
    const purpose = asset.kind === "plan" ? ("product_floor_plan" as const) : ("product_photo" as const);
    const floorLevel = asset.kind === "plan" ? "parter" : null;
    const known = byName.get(asset.filename);
    if (known) {
      await db.update(document).set({ sortOrder: index + 1, purpose, floorLevel }).where(eq(document.id, known));
      continue;
    }
    const r2Key = buildR2Key(asset.filename);
    await uploadObject(r2Key, asset.buffer, "image/webp");
    await db.insert(document).values({
      r2Key,
      filename: asset.filename,
      mimeType: "image/webp",
      sizeBytes: asset.buffer.byteLength,
      purpose,
      isCover: false,
      sortOrder: index + 1,
      floorLevel,
      ownerUserId: IMPORT_USER_ID,
      productId: id,
    });
    added += 1;
  }
  // Okładka: jedna na produkt (indeks częściowy), pierwsze zdjęcie, ustawiana po wstawieniu.
  const cover = assets.find((asset) => asset.kind === "photo");
  if (cover) {
    await db
      .update(document)
      .set({ isCover: sql`(${document.filename} = ${cover.filename})` })
      .where(and(eq(document.productId, id), eq(document.purpose, "product_photo"), isNull(document.deletedAt)));
  }
  return { added, removed: stale.length };
}

const mb = (bytes: number) => (bytes / 1024 / 1024).toFixed(1);

async function main(): Promise<void> {
  validate();
  const prepared = new Map<string, Asset[]>();
  for (const item of DOMWOOD_SAUNAS) {
    const assets = await optimize(item);
    prepared.set(item.key, assets);
    const before = assets.reduce((sum, a) => sum + a.originalBytes, 0);
    const after = assets.reduce((sum, a) => sum + a.buffer.byteLength, 0);
    console.log(
      `- ${item.name} [${isComplete(item) ? "published" : "draft"}]: ${assets.filter((a) => a.kind === "photo").length} zdjęć + ${assets.filter((a) => a.kind === "plan").length} plan, ${mb(before)} MB -> ${mb(after)} MB, ${priceCentsOf(item.pricePlnBrutto) / 100} EUR`,
    );
  }
  if (DRY_RUN) return console.log("Dry run OK, nic nie zapisano.");

  await assertDevDatabase();
  await upsertProducer();
  for (const item of DOMWOOD_SAUNAS) {
    await upsertProduct(item);
    const { added, removed } = await syncDocuments(item, prepared.get(item.key)!);
    console.log(`  ${item.name}: wgrano ${added}, usunięto starych ${removed}`);
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
