// MirageVision: 3 serie telewizorów zewnętrznych (Silver, Gold, Platinum), dane w
// scripts/data/miragevision-tv-catalog.ts. Seria = produkt, przekątna = wariant `katalogowy`, bez cen
// (priceOnRequest). Producent MirageVision już istnieje (spec 0056), skrypt go nie tworzy.
// Spec 0067: tłumaczenia en/de/nl powstają razem z importem; po nim `npm run check:translations`
// ma zgłosić zero braków. Zapis tylko do dev DB (assertDevDatabase); prod to osobny, jawny krok.
// `--dry-run` waliduje dane, niczego nie zapisuje.
import { createHash } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { db } from "../lib/db/client";
import { assertDevDatabase } from "../lib/db/dev-database-guard";
import { producer, product, productTranslation, productVariant, productVariantTranslation } from "../lib/db/schema";
import { slugifyProductName } from "../lib/product-slug";
import {
  MIRAGEVISION_PRODUCER_ID,
  SIZE_LABELS,
  SIZE_SPEC_LABELS,
  TV_SERIES,
  sizeDimsLine,
  sizeVesaLine,
  sizesLine,
  type L10n,
  type Locale,
  type TvSeriesSource,
} from "./data/miragevision-tv-catalog";

const DRY_RUN = process.argv.includes("--dry-run");
const LOCALES = ["en", "de", "nl"] as const;
const ALL_LOCALES = ["pl", ...LOCALES] as const;
const excluded = (column: string) => sql.raw(`excluded."${column}"`);

function assertL10n(owner: string, text: L10n): void {
  for (const key of ALL_LOCALES) {
    if (!text[key] || text[key].trim().length === 0) throw new Error(`${owner}: brak wersji ${key}`);
  }
}

function validate(): void {
  const slugs = new Set<string>();
  const ids = new Set<string>();
  for (const series of TV_SERIES) {
    assertL10n(series.name.pl, series.name);
    assertL10n(series.name.pl, series.description);
    assertL10n(series.name.pl, series.usageNote);
    for (const feature of series.features) assertL10n(series.name.pl, feature);
    for (const [key, spec] of Object.entries(series.specs)) {
      assertL10n(`${series.name.pl}/${key}`, spec.label);
      assertL10n(`${series.name.pl}/${key}`, spec.value);
    }
    for (const faq of series.faq) {
      assertL10n(`${series.name.pl}/faq ${faq.id}`, faq.question);
      assertL10n(`${series.name.pl}/faq ${faq.id}`, faq.answer);
    }
    if (!series.sizes.some((size) => size.inch === series.defaultInch)) throw new Error(`${series.name.pl}: brak domyślnej przekątnej`);
    const slug = slugifyProductName(series.name.pl);
    if (slugs.has(slug)) throw new Error(`Powtórzony slug ${slug}`);
    slugs.add(slug);
    for (const size of series.sizes) {
      const id = variantId(size.sku);
      if (ids.has(id)) throw new Error(`Powtórzony wariant ${size.sku}`);
      ids.add(id);
    }
  }
}

/** Stały UUID wariantu z SKU, żeby ponowny import aktualizował te same wiersze. */
function variantId(sku: string): string {
  const hex = createHash("sha1").update(`miragevision-tv:${sku}`).digest("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

/** Specyfikacja wspólna dla serii plus wiersze zależne od przekątnej (na końcu, za "pokaż więcej"). */
function specsFor(series: TvSeriesSource, locale: Locale) {
  const labels = SIZE_SPEC_LABELS;
  const entries: Record<string, { label: string; value: string }> = {};
  const common = Object.entries(series.specs);
  const early = ["zakresUżytkowania", "jasność", "rozdzielczość", "technologiaPanelu"];
  for (const key of early) {
    const spec = series.specs[key];
    if (spec) entries[key] = { label: spec.label[locale], value: spec.value[locale] };
  }
  entries.dostępnePrzekątne = { label: labels.sizes[locale], value: sizesLine(series) };
  for (const [key, spec] of common) {
    if (!early.includes(key)) entries[key] = { label: spec.label[locale], value: spec.value[locale] };
  }
  entries.wymiaryIWaga = { label: labels.dims[locale], value: sizeDimsLine(series, locale) };
  const vesa = sizeVesaLine(series);
  if (vesa) entries.vesa = { label: labels.vesa[locale], value: vesa };
  return entries;
}

function plSpecsJsonb(series: TvSeriesSource) {
  const specs = specsFor(series, "pl");
  return {
    ...Object.fromEntries(Object.entries(specs).map(([key, spec]) => [key, spec.value])),
    _features: series.features.map((feature) => feature.pl),
    _usageNote: series.usageNote.pl,
  };
}

function translationSpecs(series: TvSeriesSource, locale: Locale) {
  return {
    specs: specsFor(series, locale),
    features: series.features.map((feature) => feature[locale]),
    usageNote: series.usageNote[locale],
  };
}

const faqFor = (series: TvSeriesSource, locale: Locale) =>
  series.faq.map((entry) => ({ id: entry.id, question: entry.question[locale], answer: entry.answer[locale] }));

async function upsertCatalog(): Promise<void> {
  const [existingProducer] = await db.select({ id: producer.id }).from(producer).where(eq(producer.id, MIRAGEVISION_PRODUCER_ID));
  if (!existingProducer) throw new Error("Brak producenta MirageVision w bazie (spec 0056 krok 3); skrypt go nie tworzy.");

  for (const series of TV_SERIES) {
    const values = {
      producerId: MIRAGEVISION_PRODUCER_ID,
      status: "published" as const,
      family: "outdoor-tv" as const,
    outdoorTvMounting: "na-sciane",
    outdoorTvSunExposure: series.sunExposure,
      name: series.name.pl,
      slug: slugifyProductName(series.name.pl),
      description: series.description.pl,
      currency: "EUR",
      technicalSpecs: plSpecsJsonb(series),
      faq: faqFor(series, "pl"),
      featured: false,
      deletedAt: null,
      updatedAt: new Date(),
    };
    const sizes = [...series.sizes].sort((a, b) => a.inch - b.inch);
    const variantRows = sizes.map((size, index) => ({
      id: variantId(size.sku),
      productId: series.id,
      completionStandard: "katalogowy" as const,
      variantLabel: SIZE_LABELS.pl(size.inch),
      priceMinCents: null,
      priceOnRequest: true,
      isDefault: size.inch === series.defaultInch,
      sortOrder: index + 1,
      deletedAt: null,
      updatedAt: new Date(),
    }));

    await db.batch([
      db
        .insert(product)
        .values({ id: series.id, ...values })
        .onConflictDoUpdate({ target: product.id, set: values }),
      db
        .insert(productTranslation)
        .values(
          LOCALES.map((locale) => ({
            productId: series.id,
            locale,
            name: series.name[locale],
            description: series.description[locale],
            technicalSpecs: translationSpecs(series, locale),
            faq: faqFor(series, locale),
          })),
        )
        .onConflictDoUpdate({
          target: [productTranslation.productId, productTranslation.locale],
          set: {
            name: excluded("name"),
            description: excluded("description"),
            technicalSpecs: excluded("technical_specs"),
            faq: excluded("faq"),
            updatedAt: new Date(),
          },
        }),
      db
        .insert(productVariant)
        .values(variantRows)
        .onConflictDoUpdate({
          target: productVariant.id,
          set: {
            variantLabel: excluded("variant_label"),
            priceMinCents: excluded("price_min_cents"),
            priceOnRequest: excluded("price_on_request"),
            isDefault: excluded("is_default"),
            sortOrder: excluded("sort_order"),
            deletedAt: excluded("deleted_at"),
            updatedAt: new Date(),
          },
        }),
      db
        .insert(productVariantTranslation)
        .values(
          sizes.flatMap((size) =>
            LOCALES.map((locale) => ({ productVariantId: variantId(size.sku), locale, variantLabel: SIZE_LABELS[locale](size.inch) })),
          ),
        )
        .onConflictDoUpdate({
          target: [productVariantTranslation.productVariantId, productVariantTranslation.locale],
          set: { variantLabel: excluded("variant_label"), updatedAt: new Date() },
        }),
    ]);
    console.log(`- ${series.name.pl}: produkt, ${sizes.length} wariantów, tłumaczenia en/de/nl`);
  }
}

async function main(): Promise<void> {
  validate();
  if (DRY_RUN) {
    const variants = TV_SERIES.reduce((sum, series) => sum + series.sizes.length, 0);
    console.log(`Dry run OK: ${TV_SERIES.length} produkty, ${variants} wariantów, nic nie zapisano.`);
    return;
  }

  await assertDevDatabase();
  await upsertCatalog();
  console.log(`Zapisano ${TV_SERIES.length} produkty MirageVision TV.`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
