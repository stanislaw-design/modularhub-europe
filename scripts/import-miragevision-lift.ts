// MirageVision: szafy z podnośnikiem TV (Premium, Custom), dane w scripts/data/miragevision-lift-catalog.ts.
// Seria = produkt, rozmiar szafy = wariant `katalogowy`, bez cen (priceOnRequest). Dodatkowo uzupełnia
// istniejący Econo Lift o dane szafy z posteru (nie rusza jego cen ani wariantów). Producent MirageVision
// już istnieje (spec 0056). Spec 0067: tłumaczenia en/de/nl razem z importem, potem `npm run check:translations`.
// Zapis tylko do dev DB (assertDevDatabase). `--dry-run` tylko waliduje dane.
import { createHash } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { db } from "../lib/db/client";
import { assertDevDatabase } from "../lib/db/dev-database-guard";
import { producer, product, productTranslation, productVariant, productVariantTranslation } from "../lib/db/schema";
import { slugifyProductName } from "../lib/product-slug";
import {
  ECONO_EXTRA_SPECS,
  ECONO_PRODUCT_ID,
  LIFT_SERIES,
  MIRAGEVISION_PRODUCER_ID,
  SPEC_LABELS,
  cabinetLines,
  type L10n,
  type LiftSeriesSource,
  type Locale,
} from "./data/miragevision-lift-catalog";

const DRY_RUN = process.argv.includes("--dry-run");
const LOCALES = ["en", "de", "nl"] as const;
const ALL_LOCALES = ["pl", ...LOCALES] as const;
const excluded = (column: string) => sql.raw(`excluded."${column}"`);

function assertL10n(owner: string, text: L10n): void {
  for (const key of ALL_LOCALES) {
    if (!text[key] || text[key].trim().length === 0) throw new Error(`${owner}: brak wersji ${key}`);
  }
}

function variantId(series: LiftSeriesSource, key: string): string {
  const hex = createHash("sha1").update(`miragevision-lift:${series.id}:${key}`).digest("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

function validate(): void {
  const slugs = new Set<string>();
  for (const series of LIFT_SERIES) {
    for (const text of [series.name, series.description, series.usageNote, ...series.features]) assertL10n(series.name.pl, text);
    for (const [key, spec] of Object.entries(series.specs)) {
      assertL10n(`${series.name.pl}/${key}`, spec.label);
      assertL10n(`${series.name.pl}/${key}`, spec.value);
    }
    for (const faq of series.faq) {
      assertL10n(`${series.name.pl}/faq ${faq.id}`, faq.question);
      assertL10n(`${series.name.pl}/faq ${faq.id}`, faq.answer);
    }
    for (const size of series.sizes) assertL10n(`${series.name.pl}/${size.key}`, size.label);
    if (!series.sizes.some((size) => size.key === series.defaultSize)) throw new Error(`${series.name.pl}: brak domyślnego rozmiaru`);
    const slug = slugifyProductName(series.name.pl);
    if (slugs.has(slug)) throw new Error(`Powtórzony slug ${slug}`);
    slugs.add(slug);
  }
  for (const [key, spec] of Object.entries(ECONO_EXTRA_SPECS)) {
    assertL10n(`Econo/${key}`, spec.label);
    assertL10n(`Econo/${key}`, spec.value);
  }
}

function specsFor(series: LiftSeriesSource, locale: Locale) {
  const lines = cabinetLines(series, locale);
  const entries: Record<string, { label: string; value: string }> = {};
  for (const [key, spec] of Object.entries(series.specs)) entries[key] = { label: spec.label[locale], value: spec.value[locale] };
  entries.szafyDlaPrzekątnych = { label: SPEC_LABELS.sizes[locale], value: lines.sizes };
  entries.wymiarySzafy = { label: SPEC_LABELS.cabinetDims[locale], value: lines.dims };
  entries.wysokośćPoUniesieniu = { label: SPEC_LABELS.raised[locale], value: lines.raised };
  entries.udźwigWindy = { label: SPEC_LABELS.lift[locale], value: lines.lift };
  return entries;
}

function plSpecsJsonb(series: LiftSeriesSource) {
  return {
    ...Object.fromEntries(Object.entries(specsFor(series, "pl")).map(([key, spec]) => [key, spec.value])),
    _features: series.features.map((feature) => feature.pl),
    _usageNote: series.usageNote.pl,
  };
}

const faqFor = (series: LiftSeriesSource, locale: Locale) =>
  series.faq.map((entry) => ({ id: entry.id, question: entry.question[locale], answer: entry.answer[locale] }));

async function upsertSeries(series: LiftSeriesSource): Promise<void> {
  const values = {
    producerId: MIRAGEVISION_PRODUCER_ID,
    status: "published" as const,
    family: "outdoor-tv" as const,
    outdoorTvMounting: "w-szafie-z-winda",
    outdoorTvSunExposure: null,
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
  const variantRows = series.sizes.map((size, index) => ({
    id: variantId(series, size.key),
    productId: series.id,
    completionStandard: "katalogowy" as const,
    variantLabel: size.label.pl,
    priceMinCents: null,
    priceOnRequest: true,
    isDefault: size.key === series.defaultSize,
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
          technicalSpecs: {
            specs: specsFor(series, locale),
            features: series.features.map((feature) => feature[locale]),
            usageNote: series.usageNote[locale],
          },
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
        series.sizes.flatMap((size) =>
          LOCALES.map((locale) => ({ productVariantId: variantId(series, size.key), locale, variantLabel: size.label[locale] })),
        ),
      )
      .onConflictDoUpdate({
        target: [productVariantTranslation.productVariantId, productVariantTranslation.locale],
        set: { variantLabel: excluded("variant_label"), updatedAt: new Date() },
      }),
  ]);
  console.log(`- ${series.name.pl}: produkt, ${series.sizes.length} wariantów, tłumaczenia en/de/nl`);
}

/** Dokłada do Econo Lift pola szafy (nadpisuje tylko te klucze), bez ruszania pozostałych ani cen. */
async function patchEcono(): Promise<void> {
  const [existing] = await db.select({ technicalSpecs: product.technicalSpecs }).from(product).where(eq(product.id, ECONO_PRODUCT_ID));
  if (!existing) throw new Error("Brak produktu Econo Lift w bazie.");
  const pl = { ...(existing.technicalSpecs as Record<string, unknown>) };
  for (const [key, spec] of Object.entries(ECONO_EXTRA_SPECS)) pl[key] = spec.value.pl;
  await db.update(product).set({ technicalSpecs: pl, outdoorTvMounting: "w-szafie-z-winda", updatedAt: new Date() }).where(eq(product.id, ECONO_PRODUCT_ID));

  for (const locale of LOCALES) {
    const [row] = await db
      .select({ technicalSpecs: productTranslation.technicalSpecs })
      .from(productTranslation)
      .where(and(eq(productTranslation.productId, ECONO_PRODUCT_ID), eq(productTranslation.locale, locale)));
    if (!row) {
      console.warn(`- Econo: brak tłumaczenia ${locale}, pomijam`);
      continue;
    }
    const current = (row.technicalSpecs ?? {}) as { specs?: Record<string, { label: string; value: string }> };
    const specs = { ...(current.specs ?? {}) };
    for (const [key, spec] of Object.entries(ECONO_EXTRA_SPECS)) specs[key] = { label: spec.label[locale], value: spec.value[locale] };
    await db
      .update(productTranslation)
      .set({ technicalSpecs: { ...current, specs }, updatedAt: new Date() })
      .where(and(eq(productTranslation.productId, ECONO_PRODUCT_ID), eq(productTranslation.locale, locale)));
  }
  console.log(`- Econo Lift: dodano ${Object.keys(ECONO_EXTRA_SPECS).length} pól szafy (pl, en, de, nl)`);
}

async function main(): Promise<void> {
  validate();
  if (DRY_RUN) {
    const variants = LIFT_SERIES.reduce((sum, series) => sum + series.sizes.length, 0);
    console.log(`Dry run OK: ${LIFT_SERIES.length} produkty, ${variants} wariantów, +${Object.keys(ECONO_EXTRA_SPECS).length} pól Econo, nic nie zapisano.`);
    return;
  }

  await assertDevDatabase();
  const [existingProducer] = await db.select({ id: producer.id }).from(producer).where(eq(producer.id, MIRAGEVISION_PRODUCER_ID));
  if (!existingProducer) throw new Error("Brak producenta MirageVision w bazie (spec 0056 krok 3); skrypt go nie tworzy.");
  for (const series of LIFT_SERIES) await upsertSeries(series);
  await patchEcono();
  console.log("Zapisano szafy MirageVision.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
