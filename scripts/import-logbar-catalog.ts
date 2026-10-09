// Import katalogu Logbar Domy (8 ofert PDF -> 18 produktów) do bazy dev. Dane: scripts/data/logbar-catalog.ts.
// Spec 0067: tłumaczenia (en, de, nl) powstają razem z importem; po imporcie uruchom
// `npm run check:translations` (ma zgłosić zero braków dla Logbar).
//
// Użycie:
//   npx tsx --env-file=.env.local scripts/import-logbar-catalog.ts --dry-run   (tylko walidacja, bez zapisu)
//   npm run import:logbar                                                      (zapis do dev + zdjęcia do R2)
//
// Skrypt jest idempotentny (stałe UUID, upserty), odmawia pracy poza projektem dev (assertDevDatabase),
// a zdjęcia dogrywa tylko produktom, które nie mają jeszcze żadnych dokumentów.
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
  productOptionLayout,
  productOptionLayoutTranslation,
  productOptionTranslation,
  productTranslation,
  productVariant,
  productVariantTranslation,
  referenceTextTranslation,
  users,
} from "../lib/db/schema";
import { clientRequirementsSchema } from "../lib/product-client-requirements";
import { faqSchema } from "../lib/product-faq";
import { assertLayoutGroupRule, type LayoutGroupShape } from "../lib/data/project-layout";
import { roomLayoutSchema } from "../lib/product-room-layout";
import { slugifyProductName } from "../lib/product-slug";
import { getTechnicalSpecsSchema } from "../lib/product-technical-specs";
import { validateProductPhotoFile } from "../lib/storage/document-validation";
import { buildR2Key, uploadObject } from "../lib/storage/r2-client";
import {
  ELIGIBILITY_REASON,
  EUR_PLN_RATE,
  EUR_PLN_RATE_DATE,
  IMPORT_USER_ID,
  LOGBAR_PRODUCER,
  LOGBAR_PROJECTS,
  PRODUCER_ID,
  plnToEurCents,
  stableUuid,
  type L10n,
  type LogbarProjectSource,
  type OptionGroupSource,
  type OptionLayoutSource,
} from "./data/logbar-catalog";

const DRY_RUN = process.argv.includes("--dry-run");
const LOCALES = ["en", "de", "nl"] as const;
type Locale = (typeof LOCALES)[number];

// Kanoniczne polskie etykiety katalogu "co musi zapewnić klient" (messages/pl.json, ProjectOptions.clientRequirementCatalog).
const CLIENT_REQUIREMENT_LABELS = {
  fundament: "Fundament",
  "przygotowanie-dzialki": "Przygotowanie działki",
  "dojazd-dla-transportu": "Dojazd dla transportu",
  "miejsce-dla-dzwigu": "Miejsce dla dźwigu",
  przylacza: "Przyłącza",
  formalnosci: "Formalności",
  "prace-poza-zakresem-producenta": "Prace niewchodzące w zakres producenta",
} as const;

// Kolejność grup w konfiguratorze: ta sama dla każdego produktu, niezależnie od tego, który
// produkt jako pierwszy utworzył współdzieloną grupę.
const GROUP_ORDER: Record<string, number> = {
  "Wersja układu wnętrz": 0,
  Patio: 5,
  Elewacja: 10,
  "Wykonanie i modyfikacje": 11,
  "Okna i drzwi": 12,
  "Okna połaciowe": 14,
  "Wejście i schody": 20,
  Taras: 30,
  Fundament: 40,
  "Fundament i zabezpieczenie": 41,
  "Pokrycie dachu": 50,
  "Wygłuszenie stropu": 55,
  Rekuperacja: 60,
  "Wyposażenie zewnętrzne": 70,
};

function localeText(text: L10n, locale: Locale): string {
  return text[locale];
}

// ---------------------------------------------------------------------------
// Walidacja danych (przed jakimkolwiek zapisem)
// ---------------------------------------------------------------------------

function* allTexts(project: LogbarProjectSource): Generator<{ where: string; text: L10n }> {
  const p = project.key;
  yield { where: `${p}.description`, text: project.description };
  yield { where: `${p}.roofType`, text: project.roofType };
  yield { where: `${p}.constructionSystem`, text: project.constructionSystem };
  yield { where: `${p}.foundationOptions`, text: project.foundationOptions };
  yield { where: `${p}.customizationScope`, text: project.customizationScope };
  yield { where: `${p}.serviceScopeDescription`, text: project.serviceScopeDescription };
  for (const roomRow of project.roomLayout) yield { where: `${p}.room`, text: roomRow.name };
  for (const faq of project.faq) {
    yield { where: `${p}.faq.question`, text: faq.question };
    yield { where: `${p}.faq.answer`, text: faq.answer };
  }
  for (const req of project.clientRequirements) if (req.custom) yield { where: `${p}.clientRequirement`, text: req.custom };
  for (const variant of project.variants) {
    yield { where: `${p}.variant.scope`, text: variant.scopeSummary };
    yield { where: `${p}.variant.excluded`, text: variant.excludedScope };
    for (const costItem of variant.costItems) yield { where: `${p}.cost`, text: costItem.label };
  }
  for (const group of project.optionGroups) {
    yield { where: `${p}.group`, text: group.name };
    for (const option of group.options) {
      yield { where: `${p}.option`, text: option.label };
      if (option.layout?.description) yield { where: `${p}.layout.description`, text: option.layout.description };
      for (const layoutRoom of option.layout?.rooms ?? []) yield { where: `${p}.layout.room`, text: layoutRoom.name };
    }
  }
}

function validateProjects(): void {
  const slugs = new Set<string>();
  const ids = new Set<string>();
  for (const project of LOGBAR_PROJECTS) {
    const slug = slugifyProductName(project.name);
    if (slugs.has(slug)) throw new Error(`Powtórzony slug ${slug}`);
    slugs.add(slug);
    if (ids.has(project.id)) throw new Error(`Powtórzone id ${project.key}`);
    ids.add(project.id);

    for (const { where, text } of allTexts(project)) {
      if (!text.pl.trim()) throw new Error(`Pusty tekst polski: ${where}`);
      for (const locale of LOCALES) {
        if (!text[locale]?.trim()) throw new Error(`Brak tłumaczenia ${locale}: ${where} ("${text.pl.slice(0, 60)}")`);
      }
      // Polskie teksty bez polskich znaków w typowych słowach wskazują na ASCII-fikację.
      if (/\b(Welna|plyta|podloga|Szklo|lazienka)\b/.test(text.pl)) {
        throw new Error(`Podejrzenie tekstu bez diakrytyków: ${where} ("${text.pl.slice(0, 60)}")`);
      }
    }

    const specs = getTechnicalSpecsSchema("dom", "published").safeParse({
      ...project.technicalSpecs,
      heatTransferCoefficients: "nieznana",
      constructionTechnology: "szkielet-drewniany",
    });
    if (!specs.success) throw new Error(`${project.key}: niepoprawne dane techniczne: ${specs.error.message}`);

    const layout = roomLayoutSchema.safeParse(buildRoomLayout(project));
    if (!layout.success) throw new Error(`${project.key}: niepoprawny układ pomieszczeń: ${layout.error.message}`);
    const faq = faqSchema.safeParse(buildFaq(project));
    if (!faq.success) throw new Error(`${project.key}: niepoprawne FAQ: ${faq.error.message}`);
    const requirements = clientRequirementsSchema.safeParse(buildClientRequirements(project));
    if (!requirements.success) throw new Error(`${project.key}: niepoprawne wymagania: ${requirements.error.message}`);

    const defaults = project.variants.filter((variant) => variant.isDefault);
    if (defaults.length !== 1) throw new Error(`${project.key}: dokładnie jeden wariant domyślny wymagany`);
    for (const group of project.optionGroups) {
      const defaultOptions = group.options.filter((option) => option.isDefault);
      if (group.selectionType === "single" && defaultOptions.length !== 1) {
        throw new Error(`${project.key}: grupa single "${group.name.pl}" wymaga dokładnie jednej opcji domyślnej`);
      }
      if (group.selectionType === "multi" && defaultOptions.length > 0) {
        throw new Error(`${project.key}: grupa multi "${group.name.pl}" nie może mieć opcji domyślnej`);
      }
    }
    if (project.photos.length === 0) throw new Error(`${project.key}: brak zdjęć`);

    // Spec 0069 AC-8: dane układu tylko na opcjach jednej grupy single tego produktu.
    const shapes = layoutGroupShapes(project);
    const layoutOptionIds = layoutOptionsOf(project).map((entry) => entry.optionId);
    assertLayoutGroupRule(shapes, layoutOptionIds, layoutOptionIds);
    for (const { layout } of layoutOptionsOf(project)) {
      if (!(layout.floorAreaM2 > 0)) throw new Error(`${project.key}/${layout.key}: metraż musi być dodatni`);
      const layoutRooms = roomLayoutSchema.safeParse(buildLayoutRooms(layout));
      if (!layoutRooms.success) throw new Error(`${project.key}/${layout.key}: niepoprawny układ pomieszczeń: ${layoutRooms.error.message}`);
      if (layout.plans.length === 0) throw new Error(`${project.key}/${layout.key}: brak rzutów wersji`);
    }
  }
}

// Ten sam polski tekst nie może mieć dwóch różnych tłumaczeń (słowniki działają po dokładnym tekście).
function buildDictionary(select: (project: LogbarProjectSource) => Iterable<L10n>): Map<string, L10n> {
  const dictionary = new Map<string, L10n>();
  for (const project of LOGBAR_PROJECTS) {
    for (const text of select(project)) {
      const existing = dictionary.get(text.pl);
      if (existing && LOCALES.some((locale) => existing[locale] !== text[locale])) {
        throw new Error(`Sprzeczne tłumaczenia dla: "${text.pl.slice(0, 80)}"`);
      }
      dictionary.set(text.pl, text);
    }
  }
  return dictionary;
}

// ---------------------------------------------------------------------------
// Budowanie wartości
// ---------------------------------------------------------------------------

const roomId = (project: LogbarProjectSource, index: number) => `${project.key}-room-${index + 1}`;
const faqId = (project: LogbarProjectSource, index: number) => `${project.key}-faq-${index + 1}`;
const requirementId = (project: LogbarProjectSource, index: number) => `${project.key}-req-${index + 1}`;

function buildRoomLayout(project: LogbarProjectSource) {
  return project.roomLayout.map((entry, index) => ({
    id: roomId(project, index),
    name: entry.name.pl,
    areaM2: entry.areaM2,
    floorLevel: entry.floorLevel,
  }));
}

function buildFaq(project: LogbarProjectSource) {
  return project.faq.map((entry, index) => ({
    id: faqId(project, index),
    question: entry.question.pl,
    answer: entry.answer.pl,
  }));
}

function buildClientRequirements(project: LogbarProjectSource) {
  return project.clientRequirements.map((entry, index) => ({
    id: requirementId(project, index),
    key: entry.custom ? null : entry.key,
    label: entry.custom ? entry.custom.pl : CLIENT_REQUIREMENT_LABELS[entry.key],
    custom: Boolean(entry.custom),
  }));
}

function productValues(project: LogbarProjectSource) {
  return {
    producerId: PRODUCER_ID,
    status: "published" as const,
    family: "dom" as const,
    name: project.name,
    slug: slugifyProductName(project.name),
    countryOfProduction: "PL",
    floorAreaM2: project.floorAreaM2,
    builtUpAreaM2: project.builtUpAreaM2,
    description: project.description.pl,
    completionStandard: "deweloperski" as const,
    structuralWarrantyYears: 10,
    installationWarrantyYears: 2,
    category: "caloroczny" as const,
    technicalSpecs: {
      ...project.technicalSpecs,
      heatTransferCoefficients: "nieznana",
      constructionTechnology: "szkielet-drewniany",
    },
    roomLayout: buildRoomLayout(project),
    faq: buildFaq(project),
    clientRequirements: buildClientRequirements(project),
    rooms: project.rooms,
    bedrooms: project.bedrooms,
    bathrooms: project.bathrooms,
    storeys: project.storeys,
    externalDimensions: project.externalDimensions,
    roofType: project.roofType.pl,
    constructionSystem: project.constructionSystem.pl,
    foundationOptions: project.foundationOptions.pl,
    customizationScope: project.customizationScope.pl,
    serviceScopeDescription: project.serviceScopeDescription.pl,
    currency: "EUR",
    featured: false,
    deletedAt: null,
    updatedAt: new Date(),
  };
}

function optionGroupKey(group: OptionGroupSource): string {
  return JSON.stringify({
    name: group.name.pl,
    type: group.selectionType,
    options: group.options.map((option) => [option.label.pl, option.pricePln, Boolean(option.priceOnRequest), Boolean(option.isDefault)]),
  });
}

const groupIdOf = (group: OptionGroupSource) => stableUuid(`group:${optionGroupKey(group)}`);
const optionIdOf = (groupId: string, index: number) => stableUuid(`option:${groupId}:${index}`);

// Grupy produktu w kształcie, którego wymaga assertLayoutGroupRule (spec 0069 AC-8).
function layoutGroupShapes(project: LogbarProjectSource): LayoutGroupShape[] {
  return project.optionGroups.map((group) => {
    const groupId = groupIdOf(group);
    return {
      id: groupId,
      selectionType: group.selectionType,
      options: group.options.map((option, index) => ({ id: optionIdOf(groupId, index), label: option.label.pl })),
    };
  });
}

// Opcje produktu niosące dane układu, z ich id w bazie.
function layoutOptionsOf(project: LogbarProjectSource): { optionId: string; layout: OptionLayoutSource }[] {
  return project.optionGroups.flatMap((group) => {
    const groupId = groupIdOf(group);
    return group.options.flatMap((option, index) =>
      option.layout ? [{ optionId: optionIdOf(groupId, index), layout: option.layout }] : [],
    );
  });
}

const layoutRoomId = (layout: OptionLayoutSource, index: number) => `${layout.key}-room-${index + 1}`;

function buildLayoutRooms(layout: OptionLayoutSource) {
  return layout.rooms.map((entry, index) => ({
    id: layoutRoomId(layout, index),
    name: entry.name.pl,
    areaM2: entry.areaM2,
    floorLevel: entry.floorLevel,
  }));
}
const variantIdOf = (project: LogbarProjectSource, standard: string) => stableUuid(`variant:${project.key}:${standard}`);

// ---------------------------------------------------------------------------
// Zapis
// ---------------------------------------------------------------------------

type BatchQuery = Parameters<typeof db.batch>[0][number];

async function runBatch(queries: BatchQuery[], chunk = 60): Promise<void> {
  for (let start = 0; start < queries.length; start += chunk) {
    const slice = queries.slice(start, start + chunk);
    if (slice.length === 0) continue;
    await db.batch(slice as unknown as Parameters<typeof db.batch>[0]);
  }
}

const excluded = (column: string) => sql.raw(`excluded."${column}"`);

async function upsertProducer(): Promise<void> {
  const queries: BatchQuery[] = [
    db.insert(country).values({ code: "PL", name: "Polska" }).onConflictDoNothing(),
    db
      .insert(users)
      .values({
        id: IMPORT_USER_ID,
        name: LOGBAR_PRODUCER.name,
        email: "catalog-import+logbar@modularhub.invalid",
        role: "producer",
        // users.phone jest NOT NULL, a oferty Logbar nie podają telefonu: zaślepka techniczna, nigdzie nie pokazywana.
        phone: "+48 000 000 000",
      })
      .onConflictDoUpdate({ target: users.id, set: { name: LOGBAR_PRODUCER.name, role: "producer", updatedAt: new Date() } }),
    db
      .insert(producer)
      .values({
        id: PRODUCER_ID,
        userId: IMPORT_USER_ID,
        nip: LOGBAR_PRODUCER.nip,
        name: LOGBAR_PRODUCER.name,
        countryCode: "PL",
        technology: "szkielet-drewniany",
        verificationStatus: "not_submitted",
        description: LOGBAR_PRODUCER.description.pl,
      })
      .onConflictDoUpdate({
        target: producer.id,
        set: {
          name: LOGBAR_PRODUCER.name,
          countryCode: "PL",
          technology: "szkielet-drewniany",
          description: LOGBAR_PRODUCER.description.pl,
          updatedAt: new Date(),
          deletedAt: null,
        },
      }),
    db.insert(producerDeliveryCountry).values({ producerId: PRODUCER_ID, countryCode: "PL" }).onConflictDoNothing(),
    db.insert(producerMember).values({ producerId: PRODUCER_ID, userId: IMPORT_USER_ID }).onConflictDoNothing(),
    db
      .insert(producerTranslation)
      .values(
        LOCALES.map((locale) => ({
          producerId: PRODUCER_ID,
          locale,
          description: localeText(LOGBAR_PRODUCER.description, locale),
        })),
      )
      .onConflictDoUpdate({
        target: [producerTranslation.producerId, producerTranslation.locale],
        set: { description: excluded("description"), updatedAt: new Date() },
      }),
  ];
  await runBatch(queries);
}

async function upsertDictionaries(): Promise<void> {
  const costLabels = buildDictionary((project) => project.variants.flatMap((variant) => variant.costItems.map((entry) => entry.label)));
  const queries: BatchQuery[] = [];
  const rows = [...costLabels.values()].flatMap((text) =>
    LOCALES.map((locale) => ({ labelPl: text.pl, locale, translatedLabel: localeText(text, locale) })),
  );
  for (let start = 0; start < rows.length; start += 100) {
    queries.push(
      db
        .insert(costLineItemLabelTranslation)
        .values(rows.slice(start, start + 100))
        .onConflictDoNothing(),
    );
  }
  queries.push(
    db
      .insert(referenceTextTranslation)
      .values(LOCALES.map((locale) => ({ sourcePl: ELIGIBILITY_REASON.pl, locale, translated: localeText(ELIGIBILITY_REASON, locale) })))
      .onConflictDoNothing(),
  );
  await runBatch(queries);
}

async function upsertOptionGroups(): Promise<Map<string, OptionGroupSource>> {
  const unique = new Map<string, OptionGroupSource>();
  for (const project of LOGBAR_PROJECTS) {
    for (const group of project.optionGroups) unique.set(groupIdOf(group), group);
  }
  const queries: BatchQuery[] = [];
  for (const [groupId, group] of unique) {
    queries.push(
      db
        .insert(productOptionGroup)
        .values({
          id: groupId,
          producerId: PRODUCER_ID,
          name: group.name.pl,
          selectionType: group.selectionType,
          sortOrder: GROUP_ORDER[group.name.pl] ?? 100,
        })
        .onConflictDoUpdate({
          target: productOptionGroup.id,
          set: {
            name: group.name.pl,
            selectionType: group.selectionType,
            sortOrder: GROUP_ORDER[group.name.pl] ?? 100,
            deletedAt: null,
            updatedAt: new Date(),
          },
        }),
      db
        .insert(productOptionGroupTranslation)
        .values(LOCALES.map((locale) => ({ groupId, locale, name: localeText(group.name, locale) })))
        .onConflictDoUpdate({
          target: [productOptionGroupTranslation.groupId, productOptionGroupTranslation.locale],
          set: { name: excluded("name"), updatedAt: new Date() },
        }),
    );
    // Opcje: grupa nigdy nie zmienia się w miejscu (id zależy od zawartości), więc wstawiamy/aktualizujemy po id.
    group.options.forEach((option, index) => {
      const optionId = optionIdOf(groupId, index);
      const priceOnRequest = Boolean(option.priceOnRequest);
      queries.push(
        db
          .insert(productOption)
          .values({
            id: optionId,
            groupId,
            label: option.label.pl,
            priceCents: priceOnRequest ? null : plnToEurCents(option.pricePln),
            priceOnRequest,
            isDefault: Boolean(option.isDefault),
            sortOrder: index,
          })
          .onConflictDoUpdate({
            target: productOption.id,
            set: {
              label: option.label.pl,
              priceCents: priceOnRequest ? null : plnToEurCents(option.pricePln),
              priceOnRequest,
              isDefault: Boolean(option.isDefault),
              sortOrder: index,
              deletedAt: null,
              updatedAt: new Date(),
            },
          }),
        db
          .insert(productOptionTranslation)
          .values(LOCALES.map((locale) => ({ optionId, locale, label: localeText(option.label, locale) })))
          .onConflictDoUpdate({
            target: [productOptionTranslation.optionId, productOptionTranslation.locale],
            set: { label: excluded("label"), updatedAt: new Date() },
          }),
      );
    });
  }
  await runBatch(queries);
  return unique;
}

// Wersje układu wnętrz (spec 0069): jeden wiersz na opcję niosącą układ plus tłumaczenia opisu i
// nazw pomieszczeń po `id`. Grupa opcji jest wspólna dla produktów o tej samej zawartości (Bingo A do D
// mają identyczną geometrię), więc wiersz zapisuje się raz na opcję, nie na produkt.
async function upsertOptionLayouts(): Promise<number> {
  const unique = new Map<string, OptionLayoutSource>();
  for (const project of LOGBAR_PROJECTS) {
    for (const { optionId, layout } of layoutOptionsOf(project)) unique.set(optionId, layout);
  }
  const queries: BatchQuery[] = [];
  for (const [optionId, layout] of unique) {
    const roomRows = buildLayoutRooms(layout);
    const values = {
      floorAreaM2: layout.floorAreaM2,
      roomLayout: roomRows.length > 0 ? roomRows : null,
      description: layout.description?.pl ?? null,
    };
    queries.push(
      db
        .insert(productOptionLayout)
        .values({ optionId, ...values })
        .onConflictDoUpdate({ target: productOptionLayout.optionId, set: { ...values, updatedAt: new Date() } }),
      db
        .insert(productOptionLayoutTranslation)
        .values(
          LOCALES.map((locale) => ({
            optionId,
            locale,
            description: layout.description ? localeText(layout.description, locale) : null,
            roomLayout:
              layout.rooms.length > 0
                ? layout.rooms.map((entry, index) => ({ id: layoutRoomId(layout, index), name: localeText(entry.name, locale) }))
                : null,
          })),
        )
        .onConflictDoUpdate({
          target: [productOptionLayoutTranslation.optionId, productOptionLayoutTranslation.locale],
          set: { description: excluded("description"), roomLayout: excluded("room_layout"), updatedAt: new Date() },
        }),
    );
  }
  await runBatch(queries);
  return unique.size;
}

async function upsertProject(project: LogbarProjectSource): Promise<void> {
  const values = productValues(project);
  const queries: BatchQuery[] = [
    db
      .insert(product)
      .values({ id: project.id, ...values })
      .onConflictDoUpdate({ target: product.id, set: values }),
    db
      .insert(productCountryEligibility)
      .values({ productId: project.id, countryCode: "PL", status: "conditional", reason: ELIGIBILITY_REASON.pl })
      .onConflictDoUpdate({
        target: [productCountryEligibility.productId, productCountryEligibility.countryCode],
        set: { status: "conditional", reason: ELIGIBILITY_REASON.pl, updatedAt: new Date() },
      }),
    db
      .insert(productTranslation)
      .values(
        LOCALES.map((locale) => ({
          productId: project.id,
          locale,
          name: project.name,
          description: localeText(project.description, locale),
          roomLayout: project.roomLayout.map((entry, index) => ({ id: roomId(project, index), name: localeText(entry.name, locale) })),
          faq: project.faq.map((entry, index) => ({
            id: faqId(project, index),
            question: localeText(entry.question, locale),
            answer: localeText(entry.answer, locale),
          })),
          clientRequirements: project.clientRequirements.flatMap((entry, index) =>
            entry.custom ? [{ id: requirementId(project, index), label: localeText(entry.custom, locale) }] : [],
          ),
          foundationOptions: localeText(project.foundationOptions, locale),
          constructionSystem: localeText(project.constructionSystem, locale),
          roofType: localeText(project.roofType, locale),
          customizationScope: localeText(project.customizationScope, locale),
          serviceScopeDescription: localeText(project.serviceScopeDescription, locale),
        })),
      )
      .onConflictDoUpdate({
        target: [productTranslation.productId, productTranslation.locale],
        set: {
          name: excluded("name"),
          description: excluded("description"),
          roomLayout: excluded("room_layout"),
          faq: excluded("faq"),
          clientRequirements: excluded("client_requirements"),
          foundationOptions: excluded("foundation_options"),
          constructionSystem: excluded("construction_system"),
          roofType: excluded("roof_type"),
          customizationScope: excluded("customization_scope"),
          serviceScopeDescription: excluded("service_scope_description"),
          updatedAt: new Date(),
        },
      }),
  ];
  await runBatch(queries);

  // Warianty i pozycje kosztowe. product.price_min_cents wylicza wyzwalacz z wariantu domyślnego.
  const variantQueries: BatchQuery[] = [];
  const costIds: string[] = [];
  const variantIds: string[] = [];
  project.variants.forEach((variant, variantIndex) => {
    const variantId = variantIdOf(project, variant.standard);
    variantIds.push(variantId);
    const priceCents = plnToEurCents(variant.pricePln);
    variantQueries.push(
      db
        .insert(productVariant)
        .values({
          id: variantId,
          productId: project.id,
          completionStandard: variant.standard,
          priceMinCents: priceCents,
          priceOnRequest: false,
          scopeSummary: variant.scopeSummary.pl,
          excludedScope: variant.excludedScope.pl,
          isDefault: variant.isDefault,
          sortOrder: variantIndex,
        })
        .onConflictDoUpdate({
          target: productVariant.id,
          set: {
            priceMinCents: priceCents,
            priceOnRequest: false,
            scopeSummary: variant.scopeSummary.pl,
            excludedScope: variant.excludedScope.pl,
            isDefault: variant.isDefault,
            sortOrder: variantIndex,
            deletedAt: null,
            updatedAt: new Date(),
          },
        }),
      db
        .insert(productVariantTranslation)
        .values(
          LOCALES.map((locale) => ({
            productVariantId: variantId,
            locale,
            scopeSummary: localeText(variant.scopeSummary, locale),
            excludedScope: localeText(variant.excludedScope, locale),
          })),
        )
        .onConflictDoUpdate({
          target: [productVariantTranslation.productVariantId, productVariantTranslation.locale],
          set: { scopeSummary: excluded("scope_summary"), excludedScope: excluded("excluded_scope"), updatedAt: new Date() },
        }),
    );
    variant.costItems.forEach((entry, index) => {
      const costId = stableUuid(`cost:${variantId}:${index}`);
      costIds.push(costId);
      variantQueries.push(
        db
          .insert(costLineItem)
          .values({ id: costId, productVariantId: variantId, label: entry.label.pl, status: entry.status, sortOrder: index })
          .onConflictDoUpdate({
            target: costLineItem.id,
            set: { label: entry.label.pl, status: entry.status, sortOrder: index, updatedAt: new Date() },
          }),
      );
    });
  });
  await runBatch(variantQueries);
  // Pozycje kosztowe usunięte z danych źródłowych nie mogą zostać po ponownym imporcie.
  await db.delete(costLineItem).where(and(inArray(costLineItem.productVariantId, variantIds), notInArray(costLineItem.id, costIds)));

  // Przypisanie opcji do produktu.
  const assignments: BatchQuery[] = project.optionGroups.map((group) =>
    db
      .insert(productOptionGroupAssignment)
      .values({ productId: project.id, groupId: groupIdOf(group) })
      .onConflictDoNothing(),
  );
  await runBatch(assignments);
}

// ---------------------------------------------------------------------------
// Dokumenty (zdjęcia i rzuty) -> R2
// ---------------------------------------------------------------------------

interface LocalAsset {
  buffer: Buffer;
  filename: string;
  mimeType: string;
  r2Key: string;
  purpose: "product_photo" | "product_floor_plan";
  isCover: boolean;
  sortOrder: number;
}

async function loadAsset(file: string, filename: string, purpose: LocalAsset["purpose"], isCover: boolean, sortOrder: number): Promise<LocalAsset> {
  const buffer = await readFile(path.join(process.cwd(), file));
  const validation = validateProductPhotoFile(buffer);
  if (!validation.ok || !validation.mimeType) {
    throw new Error(`Nieprawidłowy obraz ${file}: ${validation.error ?? "nieznany błąd"}`);
  }
  const extension = validation.mimeType === "image/png" ? "png" : validation.mimeType === "image/webp" ? "webp" : "jpg";
  return { buffer, filename: `${filename}.${extension}`, mimeType: validation.mimeType, r2Key: buildR2Key(`${filename}.${extension}`), purpose, isCover, sortOrder };
}

async function checkAssets(project: LogbarProjectSource): Promise<void> {
  const layoutPlanFiles = layoutOptionsOf(project).flatMap(({ layout }) => layout.plans.map((entry) => entry.file));
  for (const file of [...project.photos, ...project.floorPlans, ...layoutPlanFiles]) {
    await loadAsset(file, "check", "product_photo", false, 0);
  }
}

async function uploadProjectDocuments(project: LogbarProjectSource): Promise<number> {
  const expected = project.photos.length + project.floorPlans.length;
  const existing = await db
    .select({ id: document.id })
    .from(document)
    // Rzuty wersji układu (productOptionId) liczą się osobno, patrz uploadLayoutPlans.
    .where(and(eq(document.productId, project.id), isNull(document.deletedAt), isNull(document.productOptionId)));
  if (existing.length === expected) return 0;
  if (existing.length > 0) {
    throw new Error(`${project.name}: istnieje niepełna galeria ${existing.length}/${expected}; wymaga ręcznej kontroli.`);
  }

  const slug = slugifyProductName(project.name);
  const assets: LocalAsset[] = [];
  for (const [index, file] of project.photos.entries()) {
    assets.push(await loadAsset(file, `${slug}-${String(index + 1).padStart(2, "0")}`, "product_photo", index === 0, index));
  }
  for (const [index, file] of project.floorPlans.entries()) {
    assets.push(await loadAsset(file, `${slug}-rzut-${index + 1}`, "product_floor_plan", false, project.photos.length + index));
  }
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
      ownerUserId: IMPORT_USER_ID,
      productId: project.id,
    })),
  );
  return assets.length;
}

// Rzuty wersji układu (spec 0069 AC-10): po jednym dokumencie na piętro wersji, z productOptionId
// i floorLevel. Idempotentne: dokument (produkt, opcja, piętro) wgrywa się tylko raz. Pliki
// bazowych rzutów produktu (bez opcji) zostają nietknięte.
async function uploadLayoutPlans(project: LogbarProjectSource): Promise<number> {
  const options = layoutOptionsOf(project);
  if (options.length === 0) return 0;
  const slug = slugifyProductName(project.name);
  const existing = await db
    .select({ productOptionId: document.productOptionId, floorLevel: document.floorLevel })
    .from(document)
    .where(
      and(
        eq(document.productId, project.id),
        eq(document.purpose, "product_floor_plan"),
        isNull(document.deletedAt),
        inArray(
          document.productOptionId,
          options.map((entry) => entry.optionId),
        ),
      ),
    );
  const have = new Set(existing.map((row) => `${row.productOptionId}:${row.floorLevel}`));

  let added = 0;
  for (const { optionId, layout } of options) {
    for (const [index, planSource] of layout.plans.entries()) {
      if (have.has(`${optionId}:${planSource.floorLevel}`)) continue;
      const asset = await loadAsset(
        planSource.file,
        `${slug}-rzut-${layout.key}-${planSource.floorLevel}`,
        "product_floor_plan",
        false,
        100 + index,
      );
      await uploadObject(asset.r2Key, asset.buffer, asset.mimeType);
      await db.insert(document).values({
        r2Key: asset.r2Key,
        filename: asset.filename,
        mimeType: asset.mimeType,
        sizeBytes: asset.buffer.byteLength,
        purpose: "product_floor_plan",
        isCover: false,
        sortOrder: index,
        ownerUserId: IMPORT_USER_ID,
        productId: project.id,
        productOptionId: optionId,
        floorLevel: planSource.floorLevel,
      });
      added += 1;
    }
  }
  return added;
}

// ---------------------------------------------------------------------------

function summary(): void {
  console.log(`Kurs NBP ${EUR_PLN_RATE} (${EUR_PLN_RATE_DATE}).`);
  let options = 0;
  const groups = new Set<string>();
  for (const project of LOGBAR_PROJECTS) {
    for (const group of project.optionGroups) {
      groups.add(groupIdOf(group));
      options += group.options.length;
    }
    const prices = project.variants.map((variant) => `${variant.standard}: ${variant.pricePln} PLN → ${plnToEurCents(variant.pricePln) / 100} EUR`);
    console.log(
      `- ${project.name} | ${project.floorAreaM2} m² uż. | ${project.roomLayout.length} pom. | ${project.photos.length} zdjęć + ${project.floorPlans.length} rzutów | ${project.optionGroups.length} grup opcji | ${prices.join("; ")}`,
    );
  }
  console.log(`Produktów: ${LOGBAR_PROJECTS.length}, unikalnych grup opcji: ${groups.size}, pozycji opcji (z powtórzeniami): ${options}.`);
}

async function main(): Promise<void> {
  validateProjects();
  for (const project of LOGBAR_PROJECTS) await checkAssets(project);
  buildDictionary((project) => project.variants.flatMap((variant) => variant.costItems.map((entry) => entry.label)));
  summary();
  if (DRY_RUN) {
    console.log("Tryb --dry-run: walidacja przeszła, nic nie zapisano.");
    return;
  }

  await assertDevDatabase();
  await upsertProducer();
  await upsertDictionaries();
  await upsertOptionGroups();
  console.log(`Wersje układu wnętrz: ${await upsertOptionLayouts()} opcji.`);
  for (const project of LOGBAR_PROJECTS) {
    await upsertProject(project);
    console.log(`Zapisano ${project.name}.`);
  }

  let uploaded = 0;
  const failures: string[] = [];
  for (const project of LOGBAR_PROJECTS) {
    try {
      const count = await uploadProjectDocuments(project);
      uploaded += count;
      console.log(`- ${project.name}: ${count === 0 ? "dokumenty już kompletne" : `${count} plików w R2`}`);
      const layoutPlans = await uploadLayoutPlans(project);
      uploaded += layoutPlans;
      if (layoutOptionsOf(project).length > 0) {
        console.log(`  rzuty wersji układu: ${layoutPlans === 0 ? "już komplet" : `${layoutPlans} nowych`}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      failures.push(message);
      console.error(`- ${project.name}: ${message}`);
    }
  }
  console.log(`Łącznie nowych plików w R2: ${uploaded}.`);
  if (failures.length > 0) throw new Error(`Nie udało się ukończyć ${failures.length} galerii.`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
