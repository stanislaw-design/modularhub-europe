// Cocomodule (cocomodule.com): pełna oferta (domy COCOHOUSE/LOFT, COCOBOAT, sauny COCOSPA, kawiarnie COCOCAFE, POP-UP),
// dane w scripts/data/cocomodule-catalog.ts. Pięć pilotażowych domów z 2026-09-03 jest aktualizowanych w miejscu
// (te same id i slugi, ceny i warianty bez zmian). Spec 0067: tłumaczenia en/de/nl powstają razem z importem;
// po nim `npm run check:translations` ma zgłosić zero braków.
// Zdjęcia: tmp/cocomodule-raw/_cand/ (biblioteka mediów producenta, tylko pliki bez watermarku), WebP, dłuższy bok
// do 2000 px. Zapis tylko do dev DB (assertDevDatabase); prod to osobny, jawny krok. Dev i prod dzielą kubełek R2,
// więc skrypt nigdy nie usuwa obiektów z R2 (prod może nadal wskazywać na stare pliki); stare dokumenty dostają
// tylko deleted_at w dev. `--dry-run` waliduje dane i pliki, zapisuje arkusz podglądu
// tmp/cocomodule-raw/_review/<produkt>.jpg i niczego nie zapisuje w bazie.
import { mkdir, readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { and, eq, inArray, isNull, notInArray, sql } from "drizzle-orm";
import sharp from "sharp";
import { db } from "../lib/db/client";
import { assertDevDatabase } from "../lib/db/dev-database-guard";
import {
  document,
  producer,
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
} from "../lib/db/schema";
import { getTechnicalSpecsSchema } from "../lib/product-technical-specs";
import { slugifyProductName } from "../lib/product-slug";
import { validateProductPhotoFile } from "../lib/storage/document-validation";
import { buildR2Key, uploadObject } from "../lib/storage/r2-client";
import {
  CONTAINERS,
  ELIGIBILITY_REASON,
  HOUSES,
  OPTION_GROUPS,
  OWNER_USER_ID,
  PRODUCER_DESCRIPTION,
  PRODUCER_ID,
  SAUNAS,
  SAUNA_CONSTRUCTION,
  SAUNA_CUSTOM,
  SAUNA_EXCLUDED,
  SAUNA_FOUNDATION,
  SAUNA_ROOF,
  containerTexts,
  eurCentsFromBruttoPln,
  groupId,
  houseTexts,
  optionId,
  platformCents,
  productIdOf,
  saunaScope,
  saunaSpecsText,
  variantIdOf,
  type CocoContainer,
  type CocoHouse,
  type CocoSauna,
  type L10n,
  type PhotoSpec,
} from "./data/cocomodule-catalog";

const DRY_RUN = process.argv.includes("--dry-run");
const ONLY = process.argv.find((arg) => arg.startsWith("--only="))?.slice("--only=".length);
const LOCALES = ["en", "de", "nl"] as const;
const CAND_DIR = path.join(process.cwd(), "tmp", "cocomodule-raw", "_cand");
const REVIEW_DIR = path.join(process.cwd(), "tmp", "cocomodule-raw", "_review");
const excluded = (column: string) => sql.raw(`excluded."${column}"`);

// Te same pozycje co w pięciu pilotażowych wierszach (zakres ceny katalogowej producenta).
const HOUSE_PRICE_INCLUDES = ["moduły CLT w standardzie deweloperskim", "panoramiczne przeszklenia", "łazienka i jednostki klimatyzacji", "scalenie modułów na miejscu"];
const HOUSE_PRICE_EXCLUDES = ["transport", "montaż na miejscu", "prace fundamentowe", "przyłącza mediów (energia elektryczna, woda, kanalizacja, internet)", "pergole i tarasy"];

type Kind = "photo" | "plan";
interface Asset {
  buffer: Buffer;
  filename: string;
  purpose: "product_photo" | "product_floor_plan";
  width: number;
  height: number;
}
interface Item {
  key: string;
  id: string;
  name: string;
  photos: PhotoSpec[];
  floorPlans: PhotoSpec[];
}

function assertL10n(owner: string, text: L10n | undefined): void {
  if (!text) return;
  for (const key of ["pl", "en", "de", "nl"] as const) if (!text[key]?.trim()) throw new Error(`${owner}: brak wersji ${key}`);
}

const houseSpecs = (house: CocoHouse) => ({ ...houseTexts(house).specs });
const saunaSpecsPl = (sauna: CocoSauna) => {
  const text = saunaSpecsText(sauna);
  return {
    claddingMaterial: text.claddingMaterial.pl,
    interiorWoodType: text.interiorWoodType.pl,
    benchMaterial: text.benchMaterial.pl,
    insulationType: text.insulationType.pl,
    glazingType: text.glazingType.pl,
    seatingCapacity: sauna.seatingCapacity,
    hasChangingArea: Boolean(text.changingAreaDescription),
    ...(text.changingAreaDescription ? { changingAreaDescription: text.changingAreaDescription.pl } : {}),
    electricalRequirement: text.electricalRequirement.pl,
  };
};
const saunaSpecsTranslated = (sauna: CocoSauna, locale: (typeof LOCALES)[number]) => {
  const text = saunaSpecsText(sauna);
  const entries = Object.entries(text).filter((entry): entry is [string, L10n] => Boolean(entry[1]));
  return { specs: Object.fromEntries(entries.map(([key, value]) => [key, { value: value[locale] }])) };
};

function validate(): void {
  assertL10n("producent", PRODUCER_DESCRIPTION);
  if (/@|https?:|www\.|\+?\d{3}[ -]?\d{3}[ -]?\d{3}/.test(PRODUCER_DESCRIPTION.pl)) throw new Error("Opis producenta zawiera dane kontaktowe");
  const ids = new Set<string>();
  const slugs = new Set<string>();
  const track = (key: string, id: string, name: string) => {
    if (ids.has(id)) throw new Error(`Powtórzone id ${key}`);
    ids.add(id);
    const slug = slugifyProductName(name);
    if (slugs.has(slug)) throw new Error(`Powtórzony slug ${slug}`);
    slugs.add(slug);
  };
  for (const house of HOUSES) {
    track(house.key, productIdOf(house.key, house.existingId), house.name);
    assertL10n(house.key, house.description);
    const texts = houseTexts(house);
    for (const text of [texts.construction, texts.roof, texts.foundation, texts.custom]) assertL10n(house.key, text);
    const parsed = getTechnicalSpecsSchema("dom", "published").safeParse(houseSpecs(house));
    if (!parsed.success) throw new Error(`${house.name}: dane techniczne ${JSON.stringify(parsed.error.issues)}`);
    if (house.status === "published" && house.photos.length === 0) throw new Error(`${house.name}: opublikowany bez zdjęć`);
  }
  for (const sauna of SAUNAS) {
    track(sauna.key, productIdOf(sauna.key), sauna.name);
    assertL10n(sauna.key, sauna.description);
    assertL10n(sauna.key, saunaScope(sauna));
    for (const text of Object.values(saunaSpecsText(sauna))) assertL10n(sauna.key, text);
    const parsed = getTechnicalSpecsSchema("spa-modulowe", "published", undefined, "sauna").safeParse(saunaSpecsPl(sauna));
    if (!parsed.success) throw new Error(`${sauna.name}: dane techniczne ${JSON.stringify(parsed.error.issues)}`);
    if (sauna.status === "published" && sauna.photos.length === 0) throw new Error(`${sauna.name}: opublikowana bez zdjęć`);
  }
  for (const container of CONTAINERS) {
    track(container.key, productIdOf(container.key), container.name);
    assertL10n(container.key, container.description);
    for (const variant of container.variants) assertL10n(`${container.key}/${variant.code}`, variant.scope);
    if (container.photos.length === 0) throw new Error(`${container.name}: brak zdjęć`);
  }
  for (const group of OPTION_GROUPS) {
    assertL10n(`grupa ${group.key}`, group.name);
    if (group.options[0].bruttoPln !== 0) throw new Error(`Grupa ${group.key}: pierwsza opcja (domyślna) musi mieć cenę 0`);
    const keys = new Set<string>();
    for (const option of group.options) {
      assertL10n(`opcja ${group.key}/${option.key}`, option.label);
      assertL10n(`notka ${group.key}/${option.key}`, option.note);
      if (keys.has(option.key)) throw new Error(`Powtórzona opcja ${group.key}/${option.key}`);
      keys.add(option.key);
    }
  }
}

async function resolveRef(ref: string): Promise<string> {
  const [group, id] = ref.split(":");
  const dir = path.join(CAND_DIR, group);
  const names = await readdir(dir);
  const name = group === "thumbs" ? names.find((n) => n.includes(id)) : names.find((n) => n.startsWith(`${id}__`));
  if (!name) throw new Error(`Brak pliku ${ref}`);
  return path.join(dir, name);
}

// Slajd prezentacji LOFT: odcięcie nagłówka (kod modelu) i stopki, potem białych marginesów.
async function cropSlide(input: Buffer): Promise<Buffer> {
  const { width = 0, height = 0 } = await sharp(input).metadata();
  const top = Math.round(height * 0.105);
  const cut = await sharp(input).extract({ left: 0, top, width, height: height - 2 * top }).toBuffer();
  return sharp(cut).trim({ background: "#ffffff", threshold: 30 }).toBuffer();
}

async function prepare(item: Item): Promise<Asset[]> {
  const out: Asset[] = [];
  const add = async (specs: PhotoSpec[], kind: Kind) => {
    for (const spec of specs) {
      let input: Buffer = await readFile(await resolveRef(spec.ref));
      if (spec.crop === "slide") input = await cropSlide(input);
      const buffer = await sharp(input)
        .rotate()
        .flatten({ background: "#ffffff" })
        .resize({ width: 2000, height: 2000, fit: "inside", withoutEnlargement: true })
        .webp({ quality: 82 })
        .toBuffer();
      const validation = validateProductPhotoFile(buffer);
      if (!validation.ok) throw new Error(`Nieprawidłowy obraz ${spec.ref}: ${validation.error}`);
      const meta = await sharp(buffer).metadata();
      const index = out.filter((asset) => asset.purpose === (kind === "photo" ? "product_photo" : "product_floor_plan")).length + 1;
      out.push({
        buffer,
        filename: `cocomodule-${item.key}-${kind === "photo" ? "foto" : "rzut"}-${String(index).padStart(2, "0")}.webp`,
        purpose: kind === "photo" ? "product_photo" : "product_floor_plan",
        width: meta.width ?? 0,
        height: meta.height ?? 0,
      });
    }
  };
  await add(item.photos, "photo");
  await add(item.floorPlans, "plan");
  return out;
}

async function writeReview(item: Item, assets: Asset[]): Promise<void> {
  if (assets.length === 0) return;
  await mkdir(REVIEW_DIR, { recursive: true });
  const tiles = await Promise.all(
    assets.map(async (asset) => {
      const thumb = await sharp(asset.buffer).resize(480, 300, { fit: "contain", background: "#222" }).toBuffer();
      const label = Buffer.from(
        `<svg width="480" height="300"><rect width="480" height="22" fill="#000" opacity="0.8"/><text x="6" y="16" font-size="14" fill="#ff0" font-family="Arial">${asset.filename.replace(`cocomodule-${item.key}-`, "")} ${asset.width}x${asset.height}</text></svg>`,
      );
      return sharp(thumb).composite([{ input: label, top: 0, left: 0 }]).png().toBuffer();
    }),
  );
  const cols = 4;
  const rows = Math.ceil(tiles.length / cols);
  await sharp({ create: { width: 480 * cols, height: 300 * rows, channels: 3, background: "#111" } })
    .composite(tiles.map((tile, k) => ({ input: tile, left: (k % cols) * 480, top: Math.floor(k / cols) * 300 })))
    .jpeg({ quality: 75 })
    .toFile(path.join(REVIEW_DIR, `${item.key}.jpg`));
}

async function upsertProducer(): Promise<void> {
  await db.batch([
    db.update(producer).set({ countryCode: "PL", description: PRODUCER_DESCRIPTION.pl, updatedAt: new Date() }).where(eq(producer.id, PRODUCER_ID)),
    db
      .insert(producerTranslation)
      .values(LOCALES.map((locale) => ({ producerId: PRODUCER_ID, locale, description: PRODUCER_DESCRIPTION[locale] })))
      .onConflictDoUpdate({ target: [producerTranslation.producerId, producerTranslation.locale], set: { description: excluded("description"), updatedAt: new Date() } }),
    db
      .insert(referenceTextTranslation)
      .values(LOCALES.map((locale) => ({ sourcePl: ELIGIBILITY_REASON.pl, locale, translated: ELIGIBILITY_REASON[locale] })))
      .onConflictDoNothing(),
  ]);
}

interface Texts {
  description: L10n;
  construction: L10n;
  roof: L10n;
  foundation: L10n;
  custom: L10n;
  technicalSpecs?: (locale: (typeof LOCALES)[number]) => unknown;
}

// Wspólny zapis wiersza produktu i jego tłumaczeń. Slug liczony tylko dla nowych wierszy (spec 0058: slug nigdy
// nie jest przeliczany po zmianie nazwy, stare adresy zostają ważne).
async function upsertProductRow(id: string, isNew: boolean, values: Record<string, unknown>, texts: Texts): Promise<void> {
  const base = {
    ...values,
    producerId: PRODUCER_ID,
    countryOfProduction: "PL",
    description: texts.description.pl,
    constructionSystem: texts.construction.pl,
    roofType: texts.roof.pl,
    foundationOptions: texts.foundation.pl,
    customizationScope: texts.custom.pl,
    currency: "EUR",
    coverImageUrl: null,
    deletedAt: null,
    updatedAt: new Date(),
  };
  const insertValues = { id, ...base, ...(isNew ? { slug: slugifyProductName(String(values.name)) } : {}) } as typeof product.$inferInsert;
  await db.batch([
    db.insert(product).values(insertValues).onConflictDoUpdate({ target: product.id, set: base as Partial<typeof product.$inferInsert> }),
    db
      .insert(productTranslation)
      .values(
        LOCALES.map((locale) => ({
          productId: id,
          locale,
          description: texts.description[locale],
          constructionSystem: texts.construction[locale],
          roofType: texts.roof[locale],
          foundationOptions: texts.foundation[locale],
          customizationScope: texts.custom[locale],
          technicalSpecs: texts.technicalSpecs ? texts.technicalSpecs(locale) : null,
        })),
      )
      .onConflictDoUpdate({
        target: [productTranslation.productId, productTranslation.locale],
        set: {
          description: excluded("description"),
          constructionSystem: excluded("construction_system"),
          roofType: excluded("roof_type"),
          foundationOptions: excluded("foundation_options"),
          customizationScope: excluded("customization_scope"),
          technicalSpecs: excluded("technical_specs"),
          updatedAt: new Date(),
        },
      }),
    db
      .insert(productCountryEligibility)
      .values({ productId: id, countryCode: "PL", status: "approved", reason: ELIGIBILITY_REASON.pl })
      .onConflictDoNothing(),
  ]);
}

interface VariantRow {
  id: string;
  completionStandard: "deweloperski" | "katalogowy";
  label: string | null;
  priceMinCents: number | null;
  priceMaxCents: number | null;
  scope: L10n | null;
  excludedScope?: L10n;
}

async function syncVariants(productId: string, rows: VariantRow[]): Promise<void> {
  const wanted = rows.map((row) => row.id);
  await db.update(productVariant).set({ isDefault: false }).where(eq(productVariant.productId, productId));
  await db
    .update(productVariant)
    .set({ deletedAt: new Date() })
    .where(and(eq(productVariant.productId, productId), notInArray(productVariant.id, wanted), isNull(productVariant.deletedAt)));
  for (const [index, row] of rows.entries()) {
    const onRequest = row.priceMinCents === null;
    const values = {
      completionStandard: row.completionStandard,
      variantLabel: row.label,
      priceMinCents: row.priceMinCents,
      priceMaxCents: row.priceMaxCents,
      priceOnRequest: onRequest,
      scopeSummary: row.scope?.pl ?? null,
      excludedScope: row.excludedScope?.pl ?? null,
      isDefault: index === 0,
      sortOrder: index,
      deletedAt: null,
      updatedAt: new Date(),
    };
    await db.insert(productVariant).values({ id: row.id, productId, ...values }).onConflictDoUpdate({ target: productVariant.id, set: values });
    if (row.scope || row.label) {
      await db
        .insert(productVariantTranslation)
        .values(LOCALES.map((locale) => ({ productVariantId: row.id, locale, variantLabel: row.label, scopeSummary: row.scope?.[locale] ?? null })))
        .onConflictDoUpdate({
          target: [productVariantTranslation.productVariantId, productVariantTranslation.locale],
          set: { variantLabel: excluded("variant_label"), scopeSummary: excluded("scope_summary"), updatedAt: new Date() },
        });
    }
  }
}

async function upsertHouse(house: CocoHouse): Promise<void> {
  const id = productIdOf(house.key, house.existingId);
  const texts = houseTexts(house);
  const values: Record<string, unknown> = {
    name: house.name,
    status: house.status,
    family: "dom",
    category: house.category,
    floorAreaM2: house.floorAreaM2,
    builtUpAreaM2: house.builtUpAreaM2,
    externalDimensions: house.externalDimensions,
    storeys: house.storeys,
    rooms: house.rooms,
    bedrooms: house.bedrooms,
    bathrooms: house.bathrooms,
    completionStandard: "deweloperski",
    technicalSpecs: houseSpecs(house),
  };
  if (house.price) {
    values.housePriceMinCents = Math.round(house.price.developerEur * 100);
    values.housePriceMaxCents = Math.round(house.price.netEur * 100);
    values.priceIncludes = HOUSE_PRICE_INCLUDES;
    values.priceExcludes = HOUSE_PRICE_EXCLUDES;
    values.structuralWarrantyYears = 20;
  }
  if (house.leadTimeWeeks) [values.productionLeadTimeWeeksMin, values.productionLeadTimeWeeksMax] = house.leadTimeWeeks;
  if (house.assemblyDays) [values.onSiteAssemblyDaysMin, values.onSiteAssemblyDaysMax] = house.assemblyDays;
  await upsertProductRow(id, !house.existingId, values, {
    description: house.description,
    construction: texts.construction,
    roof: texts.roof,
    foundation: texts.foundation,
    custom: texts.custom,
  });
  if (house.price) {
    await syncVariants(id, [
      {
        id: variantIdOf(house.key, "deweloperski"),
        completionStandard: "deweloperski",
        label: null,
        priceMinCents: platformCents(house.price.developerEur),
        priceMaxCents: platformCents(house.price.netEur),
        scope: null,
      },
    ]);
  }
}

async function upsertOptionGroups(): Promise<void> {
  const ids = OPTION_GROUPS.map((group) => groupId(group.key));
  await db.update(productOption).set({ isDefault: false }).where(inArray(productOption.groupId, ids));
  await db.batch([
    db
      .insert(productOptionGroup)
      .values(OPTION_GROUPS.map((group, index) => ({ id: groupId(group.key), producerId: PRODUCER_ID, name: group.name.pl, selectionType: "single" as const, sortOrder: index })))
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
            priceCents: option.bruttoPln === null ? null : eurCentsFromBruttoPln(option.bruttoPln),
            priceOnRequest: option.bruttoPln === null,
            priceNote: option.note?.pl ?? null,
            isDefault: index === 0,
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
      .onConflictDoUpdate({ target: [productOptionGroupTranslation.groupId, productOptionGroupTranslation.locale], set: { name: excluded("name"), updatedAt: new Date() } }),
    db
      .insert(productOptionTranslation)
      .values(
        OPTION_GROUPS.flatMap((group) =>
          group.options.flatMap((option) => LOCALES.map((locale) => ({ optionId: optionId(group.key, option.key), locale, label: option.label[locale], priceNote: option.note?.[locale] ?? null }))),
        ),
      )
      .onConflictDoUpdate({
        target: [productOptionTranslation.optionId, productOptionTranslation.locale],
        set: { label: excluded("label"), priceNote: excluded("price_note"), updatedAt: new Date() },
      }),
  ]);
}

async function upsertSauna(sauna: CocoSauna): Promise<void> {
  const id = productIdOf(sauna.key);
  const line = sauna.line;
  await upsertProductRow(
    id,
    true,
    {
      name: sauna.name,
      status: sauna.status,
      family: "spa-modulowe",
      spaSubcategory: "sauna",
      externalDimensions: sauna.externalDimensions,
      technicalSpecs: saunaSpecsPl(sauna),
      productionLeadTimeWeeksMin: sauna.bruttoPln ? 6 : null,
      productionLeadTimeWeeksMax: sauna.bruttoPln ? 10 : null,
    },
    {
      description: sauna.description,
      construction: SAUNA_CONSTRUCTION[line === "coco" ? "coco" : "cube"],
      roof: SAUNA_ROOF[line === "coco" ? "coco" : "cube"],
      foundation: SAUNA_FOUNDATION,
      custom: SAUNA_CUSTOM,
      technicalSpecs: (locale) => saunaSpecsTranslated(sauna, locale),
    },
  );
  const price = sauna.bruttoPln ? eurCentsFromBruttoPln(sauna.bruttoPln) : null;
  await syncVariants(id, [
    {
      id: variantIdOf(sauna.key, "katalogowy"),
      completionStandard: "katalogowy",
      label: `${sauna.name.replace("COCOSPA ", "")} · ${sauna.externalDimensions}`,
      priceMinCents: price,
      priceMaxCents: null,
      scope: saunaScope(sauna),
      excludedScope: sauna.bruttoPln ? SAUNA_EXCLUDED : undefined,
    },
  ]);
  // Konfigurator tylko dla saun z ceną (linia COCO z konfiguratorem na stronie producenta).
  const allGroups = OPTION_GROUPS.map((group) => groupId(group.key));
  const wanted = sauna.bruttoPln ? allGroups : [];
  await db
    .delete(productOptionGroupAssignment)
    .where(
      wanted.length > 0
        ? and(eq(productOptionGroupAssignment.productId, id), inArray(productOptionGroupAssignment.groupId, allGroups), notInArray(productOptionGroupAssignment.groupId, wanted))
        : and(eq(productOptionGroupAssignment.productId, id), inArray(productOptionGroupAssignment.groupId, allGroups)),
    );
  if (wanted.length > 0) await db.insert(productOptionGroupAssignment).values(wanted.map((groupIdValue) => ({ productId: id, groupId: groupIdValue }))).onConflictDoNothing();
}

async function upsertContainer(container: CocoContainer): Promise<void> {
  const id = productIdOf(container.key);
  await upsertProductRow(
    id,
    true,
    {
      name: container.name,
      status: "published",
      family: "kontenery-modulowe",
      containerSubcategory: container.subcategory,
      floorAreaM2: container.floorAreaM2,
      builtUpAreaM2: container.builtUpAreaM2,
      completionStandard: "katalogowy",
      technicalSpecs: null,
    },
    { description: container.description, ...containerTexts, roof: SAUNA_ROOF.cube },
  );
  await syncVariants(
    id,
    container.variants.map((variant) => ({
      id: variantIdOf(container.key, variant.code),
      completionStandard: "katalogowy" as const,
      label: variant.label,
      priceMinCents: null,
      priceMaxCents: null,
      scope: variant.scope,
    })),
  );
}

// Galeria dopełniana po nazwie pliku. Dokumenty spoza zestawu (np. stare zdjęcia z watermarkiem) dostają deleted_at;
// obiekty w R2 zostają, bo prod może na nie nadal wskazywać.
async function syncDocuments(productId: string, assets: Asset[]): Promise<{ added: number; removed: number }> {
  const existing = await db
    .select({ id: document.id, filename: document.filename })
    .from(document)
    .where(and(eq(document.productId, productId), isNull(document.deletedAt)));
  const wanted = new Set(assets.map((asset) => asset.filename));
  const byName = new Map(existing.map((row) => [row.filename, row.id]));
  const stale = existing.filter((row) => !wanted.has(row.filename));
  if (stale.length > 0) {
    await db.update(document).set({ deletedAt: new Date(), isCover: false }).where(inArray(document.id, stale.map((row) => row.id)));
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
      purpose: asset.purpose,
      isCover: false,
      sortOrder: index + 1,
      ownerUserId: OWNER_USER_ID,
      productId,
    });
    added += 1;
  }
  const cover = assets.find((asset) => asset.purpose === "product_photo");
  if (cover) {
    await db
      .update(document)
      .set({ isCover: sql`(${document.filename} = ${cover.filename})` })
      .where(and(eq(document.productId, productId), eq(document.purpose, "product_photo"), isNull(document.deletedAt)));
  }
  return { added, removed: stale.length };
}

async function main(): Promise<void> {
  validate();
  const items: Item[] = [
    ...HOUSES.map((h) => ({ key: h.key, id: productIdOf(h.key, h.existingId), name: h.name, photos: h.photos, floorPlans: h.floorPlans })),
    ...SAUNAS.map((s) => ({ key: s.key, id: productIdOf(s.key), name: s.name, photos: s.photos, floorPlans: [] })),
    ...CONTAINERS.map((c) => ({ key: c.key, id: productIdOf(c.key), name: c.name, photos: c.photos, floorPlans: [] })),
  ].filter((item) => !ONLY || ONLY.split(",").includes(item.key));

  const prepared = new Map<string, Asset[]>();
  for (const item of items) {
    const assets = await prepare(item);
    prepared.set(item.key, assets);
    if (DRY_RUN) await writeReview(item, assets);
    const photos = assets.filter((a) => a.purpose === "product_photo").length;
    const mb = (assets.reduce((sum, a) => sum + a.buffer.byteLength, 0) / 1024 / 1024).toFixed(1);
    console.log(`- ${item.name}: ${photos} zdjęć, ${assets.length - photos} rzutów, ${mb} MB`);
  }
  if (DRY_RUN) return console.log(`Dry run OK, podgląd w ${REVIEW_DIR}, nic nie zapisano.`);

  await assertDevDatabase();
  await upsertProducer();
  await upsertOptionGroups();
  const keys = new Set(items.map((item) => item.key));
  for (const house of HOUSES) if (keys.has(house.key)) await upsertHouse(house);
  for (const sauna of SAUNAS) if (keys.has(sauna.key)) await upsertSauna(sauna);
  for (const container of CONTAINERS) if (keys.has(container.key)) await upsertContainer(container);
  for (const item of items) {
    const { added, removed } = await syncDocuments(item.id, prepared.get(item.key)!);
    console.log(`  ${item.name}: wgrano ${added}, wycofano ${removed}`);
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
