// Kunert Mobile Homes: 13 domów mobilnych (dane w scripts/data/kunert-catalog.ts).
// Zdjęcia: tmp/kunert-raw/<model>/NN__<plik> (pobrane ze stron modeli producenta, zgoda na użycie potwierdzona),
// konwertowane do WebP, dłuższy bok do 2000 px. Spec 0067: tłumaczenia en/de/nl powstają razem z importem;
// po nim `npm run check:translations` ma zgłosić zero braków.
// Zapis tylko do dev DB (assertDevDatabase); prod to osobny, jawny krok. Dev i prod dzielą kubełek R2.
// `--dry-run` waliduje dane i pliki, zapisuje podgląd tmp/kunert-raw/_review/<model>.jpg, niczego nie zapisuje w bazie.
// Pierwszy argument bez flagi zawęża import do jednego modelu (np. `ikar`).
import { mkdir, readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { and, eq, isNull, sql } from "drizzle-orm";
import sharp from "sharp";
import { db } from "../lib/db/client";
import { assertDevDatabase } from "../lib/db/dev-database-guard";
import {
  costLineItem,
  costLineItemLabelTranslation,
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
import { roomLayoutSchema } from "../lib/product-room-layout";
import { getTechnicalSpecsSchema } from "../lib/product-technical-specs";
import { slugifyProductName } from "../lib/product-slug";
import { validateProductPhotoFile } from "../lib/storage/document-validation";
import { buildR2Key, uploadObject } from "../lib/storage/r2-client";
import {
  CONSTRUCTION_SYSTEM,
  CUSTOMIZATION_SCOPE,
  DELIVERY_COUNTRIES,
  ELIGIBILITY_REASON,
  EXCLUDED_SCOPE,
  FOUNDATION_OPTIONS,
  IMPORT_USER_ID,
  KUNERT_PRODUCER,
  MODELS,
  PRODUCER_ID,
  SCOPE_SUMMARY,
  TECHNICAL_ACCOUNT_EMAIL,
  TECHNICAL_SPECS,
  priceEurOf,
  ROOM_NAMES,
  costItemsOf,
  productId,
  roofOf,
  roomLayoutOf,
  roomLayoutTranslationOf,
  variantId,
  type L10n,
  type ModelSource,
} from "./data/kunert-catalog";

const DRY_RUN = process.argv.includes("--dry-run");
const LOCALES = ["en", "de", "nl"] as const;
const RAW_DIR = path.join(process.cwd(), "tmp", "kunert-raw");
const REVIEW_DIR = path.join(RAW_DIR, "_review");
const excluded = (column: string) => sql.raw(`excluded."${column}"`);

function assertL10n(owner: string, text: L10n): void {
  for (const key of ["pl", "en", "de", "nl"] as const) {
    if (!text[key] || text[key].trim().length === 0) throw new Error(`${owner}: brak wersji ${key}`);
  }
}

function validate(): void {
  const slugs = new Set<string>();
  const keys = new Set<string>();
  for (const model of MODELS) {
    if (keys.has(model.key)) throw new Error(`Powtórzony klucz ${model.key}`);
    keys.add(model.key);
    const slug = slugifyProductName(model.name);
    if (slugs.has(slug)) throw new Error(`Powtórzony slug ${slug}`);
    slugs.add(slug);
    assertL10n(model.name, model.description);
    assertL10n(model.name, roofOf(model));
    if (model.photos.length === 0) throw new Error(`${model.name}: brak zdjęć`);
    if (new Set(model.photos).size !== model.photos.length) throw new Error(`${model.name}: powtórzone zdjęcie`);
    if (!roomLayoutSchema.safeParse(roomLayoutOf(model)).success) throw new Error(`${model.name}: niepoprawny układ pomieszczeń`);
    const roomsTotal = model.rooms.reduce((sum, [, area]) => sum + area, 0);
    if (Math.abs(roomsTotal - model.areaM2) > 0.01) throw new Error(`${model.name}: suma pomieszczeń ${roomsTotal} ≠ ${model.areaM2} m²`);
    for (const [kind] of model.rooms) assertL10n(`${model.name}/${kind}`, ROOM_NAMES[kind]);
    const costLabels = costItemsOf(model).map((item) => item.label.pl);
    if (new Set(costLabels).size !== costLabels.length) throw new Error(`${model.name}: powtórzona pozycja kosztowa`);
    for (const item of costItemsOf(model)) assertL10n(`${model.name}/koszt`, item.label);
  }
  if (!getTechnicalSpecsSchema("dom", "published").safeParse(TECHNICAL_SPECS).success) throw new Error("Niepoprawne dane techniczne");
  for (const text of [KUNERT_PRODUCER.description, ELIGIBILITY_REASON, CONSTRUCTION_SYSTEM, CUSTOMIZATION_SCOPE, FOUNDATION_OPTIONS, SCOPE_SUMMARY, EXCLUDED_SCOPE]) {
    assertL10n("wspólne", text);
  }
  if (/@|https?:|www\.|\+?\d{3}[ -]?\d{3}[ -]?\d{3}/.test(KUNERT_PRODUCER.description.pl)) throw new Error("Opis producenta zawiera dane kontaktowe");
}

interface Asset {
  buffer: Buffer;
  filename: string;
  purpose: "product_photo" | "product_floor_plan";
  floorLevel: "parter" | "pietro" | null;
  sortOrder: number;
  width: number;
  height: number;
}

async function resolveFile(model: ModelSource, prefix: string): Promise<string> {
  const dir = path.join(RAW_DIR, model.key);
  const name = (await readdir(dir)).find((file) => file.startsWith(`${prefix}__`));
  if (!name) throw new Error(`${model.name}: brak pliku ${prefix}__* w ${dir}`);
  return path.join(dir, name);
}

async function toWebp(file: string, flatten: boolean): Promise<{ buffer: Buffer; width: number; height: number }> {
  let pipeline = sharp(await readFile(file)).rotate();
  if (flatten) pipeline = pipeline.flatten({ background: "#ffffff" });
  const buffer = await pipeline.resize({ width: 2000, height: 2000, fit: "inside", withoutEnlargement: true }).webp({ quality: 82 }).toBuffer();
  const validation = validateProductPhotoFile(buffer);
  if (!validation.ok) throw new Error(`Nieprawidłowy obraz ${file}: ${validation.error}`);
  const meta = await sharp(buffer).metadata();
  return { buffer, width: meta.width ?? 0, height: meta.height ?? 0 };
}

async function prepareAssets(model: ModelSource): Promise<Asset[]> {
  const assets: Asset[] = [];
  for (const [index, prefix] of model.photos.entries()) {
    const image = await toWebp(await resolveFile(model, prefix), false);
    assets.push({ ...image, filename: `kunert-${model.key}-foto-${String(index + 1).padStart(2, "0")}.webp`, purpose: "product_photo", floorLevel: null, sortOrder: assets.length });
  }
  for (const plan of model.plans) {
    // Rzuty z przezroczystym tłem (PNG) dostają białe tło.
    const image = await toWebp(await resolveFile(model, plan.file), true);
    const suffix = plan.level === "parter" ? "parter" : "antresola";
    assets.push({ ...image, filename: `kunert-${model.key}-rzut-${suffix}.webp`, purpose: "product_floor_plan", floorLevel: plan.level, sortOrder: assets.length });
  }
  return assets;
}

async function writeReview(model: ModelSource, assets: Asset[]): Promise<void> {
  await mkdir(REVIEW_DIR, { recursive: true });
  const tiles = await Promise.all(
    assets.map(async (asset) => {
      const thumb = await sharp(asset.buffer).resize(400, 266, { fit: "contain", background: "#222" }).toBuffer();
      const label = Buffer.from(
        `<svg width="400" height="266"><rect width="400" height="22" fill="#000" opacity="0.8"/><text x="6" y="16" font-size="14" fill="#ff0" font-family="Arial">${asset.filename.replace(`kunert-${model.key}-`, "")} ${asset.width}x${asset.height}</text></svg>`,
      );
      return sharp(thumb).composite([{ input: label, top: 0, left: 0 }]).png().toBuffer();
    }),
  );
  const cols = 4;
  const rows = Math.ceil(tiles.length / cols);
  await sharp({ create: { width: 400 * cols, height: 266 * rows, channels: 3, background: "#111" } })
    .composite(tiles.map((tile, k) => ({ input: tile, left: (k % cols) * 400, top: Math.floor(k / cols) * 266 })))
    .jpeg({ quality: 75 })
    .toFile(path.join(REVIEW_DIR, `${model.key}.jpg`));
}

async function upsertProducer(): Promise<void> {
  await db.batch([
    db
      .insert(users)
      .values({
        id: IMPORT_USER_ID,
        name: KUNERT_PRODUCER.name,
        email: TECHNICAL_ACCOUNT_EMAIL,
        role: "producer",
        // users.phone jest NOT NULL; zaślepka techniczna, nigdzie nie pokazywana (kontakt tylko przez platformę).
        phone: "+48 000 000 000",
      })
      .onConflictDoUpdate({ target: users.id, set: { name: KUNERT_PRODUCER.name, role: "producer", updatedAt: new Date() } }),
    db
      .insert(producer)
      .values({
        id: PRODUCER_ID,
        userId: IMPORT_USER_ID,
        nip: KUNERT_PRODUCER.nip,
        name: KUNERT_PRODUCER.name,
        countryCode: "PL",
        technology: "modulowa-stal-lekka",
        verificationStatus: "not_submitted",
        description: KUNERT_PRODUCER.description.pl,
      })
      .onConflictDoUpdate({
        target: producer.id,
        set: {
          name: KUNERT_PRODUCER.name,
          countryCode: "PL",
          technology: "modulowa-stal-lekka",
          description: KUNERT_PRODUCER.description.pl,
          updatedAt: new Date(),
          deletedAt: null,
        },
      }),
    db
      .insert(producerDeliveryCountry)
      .values(DELIVERY_COUNTRIES.map((countryCode) => ({ producerId: PRODUCER_ID, countryCode })))
      .onConflictDoNothing(),
    db.insert(producerMember).values({ producerId: PRODUCER_ID, userId: IMPORT_USER_ID }).onConflictDoNothing(),
    db
      .insert(producerTranslation)
      .values(LOCALES.map((locale) => ({ producerId: PRODUCER_ID, locale, description: KUNERT_PRODUCER.description[locale] })))
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

async function upsertModel(model: ModelSource): Promise<void> {
  const id = productId(model);
  const roof = roofOf(model);
  const values = {
    producerId: PRODUCER_ID,
    status: "published" as const,
    family: "dom" as const,
    category: "mobilny" as const,
    name: model.name,
    countryOfProduction: "PL",
    floorAreaM2: model.areaM2,
    builtUpAreaM2: model.builtUpAreaM2 ?? null,
    externalDimensions: model.externalDimensions ?? null,
    rooms: null,
    bedrooms: model.bedrooms,
    bathrooms: model.bathrooms,
    storeys: 1,
    completionStandard: "pod-klucz" as const,
    technicalSpecs: TECHNICAL_SPECS,
    roomLayout: roomLayoutOf(model),
    description: model.description.pl,
    roofType: roof.pl,
    constructionSystem: CONSTRUCTION_SYSTEM.pl,
    foundationOptions: FOUNDATION_OPTIONS.pl,
    customizationScope: CUSTOMIZATION_SCOPE.pl,
    currency: "EUR",
    featured: false,
    deletedAt: null,
    updatedAt: new Date(),
  };
  // Slug liczony tylko przy pierwszym zapisie (spec 0058: slug nigdy nie jest przeliczany po zmianie nazwy).
  await db.batch([
    db.insert(product).values({ id, slug: slugifyProductName(model.name), ...values }).onConflictDoUpdate({ target: product.id, set: values }),
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
          name: model.name,
          description: model.description[locale],
          roomLayout: roomLayoutTranslationOf(model, locale),
          constructionSystem: CONSTRUCTION_SYSTEM[locale],
          roofType: roof[locale],
          foundationOptions: FOUNDATION_OPTIONS[locale],
          customizationScope: CUSTOMIZATION_SCOPE[locale],
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
          foundationOptions: excluded("foundation_options"),
          customizationScope: excluded("customization_scope"),
          updatedAt: new Date(),
        },
      }),
  ]);

  // Cena product.price_min_cents jest wyliczana wyzwalaczem z wariantu domyślnego.
  const vId = variantId(model);
  const priceMinCents = priceEurOf(model) * 100;
  await db.batch([
    db
      .insert(productVariant)
      .values({
        id: vId,
        productId: id,
        completionStandard: "pod-klucz",
        priceMinCents,
        priceOnRequest: false,
        scopeSummary: SCOPE_SUMMARY.pl,
        excludedScope: EXCLUDED_SCOPE.pl,
        isDefault: true,
        sortOrder: 0,
      })
      .onConflictDoUpdate({
        target: productVariant.id,
        set: {
          priceMinCents,
          priceOnRequest: false,
          scopeSummary: SCOPE_SUMMARY.pl,
          excludedScope: EXCLUDED_SCOPE.pl,
          isDefault: true,
          sortOrder: 0,
          deletedAt: null,
          updatedAt: new Date(),
        },
      }),
    db
      .insert(productVariantTranslation)
      .values(LOCALES.map((locale) => ({ productVariantId: vId, locale, scopeSummary: SCOPE_SUMMARY[locale], excludedScope: EXCLUDED_SCOPE[locale] })))
      .onConflictDoUpdate({
        target: [productVariantTranslation.productVariantId, productVariantTranslation.locale],
        set: { scopeSummary: excluded("scope_summary"), excludedScope: excluded("excluded_scope"), updatedAt: new Date() },
      }),
  ]);

  // Pozycje kosztowe wariantu: zawsze dokładnie lista z danych (stare wiersze usuwane, nie mają innych odwołań).
  // Tłumaczenia etykiet idą do słownika cost_line_item_label_translation (dopasowanie po polskim tekście).
  const items = costItemsOf(model);
  await db.batch([
    db.delete(costLineItem).where(eq(costLineItem.productVariantId, vId)),
    db.insert(costLineItem).values(items.map((item, index) => ({ productVariantId: vId, label: item.label.pl, status: item.status, sortOrder: index }))),
    db
      .insert(costLineItemLabelTranslation)
      .values(items.flatMap((item) => LOCALES.map((locale) => ({ labelPl: item.label.pl, locale, translatedLabel: item.label[locale] }))))
      .onConflictDoUpdate({
        target: [costLineItemLabelTranslation.labelPl, costLineItemLabelTranslation.locale],
        set: { translatedLabel: excluded("translated_label") },
      }),
  ]);
}

// Galeria dopełniana po nazwie pliku: nowe pliki trafiają do R2 i do bazy, istniejące dostają aktualną kolejność.
async function uploadDocuments(model: ModelSource, assets: Asset[]): Promise<number> {
  const id = productId(model);
  const existing = await db
    .select({ id: document.id, filename: document.filename })
    .from(document)
    .where(and(eq(document.productId, id), isNull(document.deletedAt)));
  const existingByName = new Map(existing.map((row) => [row.filename, row.id]));
  const fresh = assets.filter((asset) => !existingByName.has(asset.filename));
  for (const asset of fresh) {
    const r2Key = buildR2Key(asset.filename);
    await uploadObject(r2Key, asset.buffer, "image/webp");
    await db.insert(document).values({
      r2Key,
      filename: asset.filename,
      mimeType: "image/webp",
      sizeBytes: asset.buffer.byteLength,
      purpose: asset.purpose,
      isCover: false,
      sortOrder: asset.sortOrder,
      floorLevel: asset.floorLevel,
      ownerUserId: IMPORT_USER_ID,
      productId: id,
    });
  }
  for (const asset of assets) {
    const existingId = existingByName.get(asset.filename);
    if (existingId) await db.update(document).set({ sortOrder: asset.sortOrder, floorLevel: asset.floorLevel, purpose: asset.purpose }).where(eq(document.id, existingId));
  }
  // Okładka: jedna na produkt (indeks częściowy), ustawiana po wstawieniu.
  const cover = assets.find((asset) => asset.purpose === "product_photo");
  if (cover) {
    await db
      .update(document)
      .set({ isCover: sql`(${document.filename} = ${cover.filename})` })
      .where(and(eq(document.productId, id), eq(document.purpose, "product_photo"), isNull(document.deletedAt)));
  }
  return fresh.length;
}

async function main(): Promise<void> {
  validate();
  const only = process.argv.slice(2).find((arg) => !arg.startsWith("--"));
  const models = only ? MODELS.filter((model) => model.key === only) : MODELS;
  if (models.length === 0) throw new Error(`Nieznany model: ${only}`);

  const prepared = new Map<string, Asset[]>();
  for (const model of models) {
    const assets = await prepareAssets(model);
    prepared.set(model.key, assets);
    if (DRY_RUN) await writeReview(model, assets);
    const plans = assets.filter((asset) => asset.purpose === "product_floor_plan").length;
    const mb = (assets.reduce((sum, asset) => sum + asset.buffer.byteLength, 0) / 1024 / 1024).toFixed(1);
    console.log(`- ${model.name}: ${model.areaM2} m², od ${priceEurOf(model)} EUR, ${assets.length - plans} zdjęć, ${plans} rzutów, ${mb} MB`);
  }
  if (DRY_RUN) return console.log(`Dry run OK: ${models.length} modeli, podgląd w ${REVIEW_DIR}, nic nie zapisano.`);

  await assertDevDatabase();
  await upsertProducer();
  for (const model of models) await upsertModel(model);
  console.log(`Zapisano ${models.length} modeli Kunert.`);
  for (const model of models) {
    const count = await uploadDocuments(model, prepared.get(model.key)!);
    console.log(`- ${model.name}: ${count === 0 ? "dokumenty już kompletne" : `${count} plików zapisanych w R2`}`);
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
