import { normalizeCommunicationLocale, type CommunicationLocale } from "@/lib/producer-communication-locale";
import { and, asc, desc, eq, ilike, inArray, isNotNull, isNull, notInArray, or, sql } from "drizzle-orm";
import { db } from "./client";
import { producerDeliversToRequestCountrySql, producerMatchesProjectRequestSql } from "./project-request-matching";
import { buildPublicUrl } from "@/lib/storage/r2-client";
import type { Locale } from "@/lib/i18n/routing";
import { resolveTranslatedText } from "@/lib/i18n/resolve-translated-text";
import { COMPLIANCE_ONLY_COUNTRY_CODES } from "@/lib/product-envelope-parameters";
import { storedLogisticsSchema, type StoredLogistics } from "@/lib/project-quote-specs";
import { toPlatformQuoteVariant, type PlatformQuoteVariant } from "@/lib/platform-quote-variants";
import {
  bulkProductInquiry,
  client,
  costLineItem,
  country,
  document,
  favorite,
  inquiry,
  inquiryItem,
  offer,
  offerItem,
  producer,
  producerCapacityProfile,
  producerCertification,
  producerCertificationTranslation,
  projectNotificationLog,
  producerDeliveryCountry,
  producerMember,
  product,
  productComplianceAssessment,
  productEnvelopeParameter,
  productCountryEligibility,
  productFamilyEnum,
  productOption,
  productOptionGroup,
  productOptionGroupAssignment,
  productOptionGroupTranslation,
  productOptionTranslation,
  productTimelineStage,
  productTranslation,
  productVariant,
  projectQuote,
  projectRequest,
  users,
} from "./schema";

// Zarządzany przepływ doradczy (spec 0048 AC-34): stare zapytania i akcje
// bezpośredniego przepływu producent-klient działają wyłącznie na sprawach
// z tym etapem. Sprawy nowego przepływu producent czyta tylko przez
// lib/case-producer-queries.ts.
const LEGACY_STAGE = "legacy_direct" as const;

// Wzorzec autoryzacji na poziomie aplikacji (spec 0018, AC-5): każde
// zapytanie filtruje po producer_id/client_id/user_id uwierzytelnionego
// konta, nie przez Row Level Security. isNull(deletedAt) (spec 0032 Build
// plan zadanie 3): bez tego filtru miękko usunięty własny produkt (panel
// producenta AC-6) nadal wyglądałby jak żywy wpis katalogu.
export async function getProductsForProducer(producerId: string) {
  return db
    .select()
    .from(product)
    .where(and(eq(product.producerId, producerId), isNull(product.deletedAt)));
}

// producer.id wyprowadzone z sesji (session.user.id -> producer_member.userId),
// nigdy z identyfikatora podanego przez przeglądarkę (spec 0032 AC-13), mirror
// getClientIdForUser (spec 0024 AC-10). Czyta przynależność wyłącznie przez
// producer_member (spec 0057 AC-8): jeden użytkownik należy najwyżej do
// jednego producenta (unique na producer_member.userId), więc najwyżej jeden
// wiersz wraca.
export async function getProducerIdForUser(userId: string): Promise<string | null> {
  const [row] = await db
    .select({ id: producerMember.producerId })
    .from(producerMember)
    .where(eq(producerMember.userId, userId));
  return row?.id ?? null;
}

export interface ProducerProfile {
  id: string;
  name: string;
  nip: string;
  countryCode: string;
  technology: (typeof producer.$inferSelect)["technology"];
  verificationStatus: (typeof producer.$inferSelect)["verificationStatus"];
  communicationLocale: CommunicationLocale;
  deliveryCountries: { code: string; name: string }[];
}

// Zasila stronę główną panelu producenta (spec 0032 AC-2), wyłącznie do
// odczytu w tej funkcji: dane firmy plus kraje dostawy (producerDeliveryCountry,
// spec 0018), z nazwą kraju rozwiązaną tak samo jak getCountries (lib/data/countries.ts).
export async function getProducerProfile(producerId: string): Promise<ProducerProfile | null> {
  const [row] = await db.select().from(producer).where(eq(producer.id, producerId));
  if (!row) return null;

  const deliveryCountries = await db
    .select({ code: country.code, name: country.name })
    .from(producerDeliveryCountry)
    .innerJoin(country, eq(country.code, producerDeliveryCountry.countryCode))
    .where(eq(producerDeliveryCountry.producerId, producerId));

  return {
    id: row.id,
    name: row.name,
    nip: row.nip,
    countryCode: row.countryCode,
    technology: row.technology,
    verificationStatus: row.verificationStatus,
    communicationLocale: normalizeCommunicationLocale(row.communicationLocale),
    deliveryCountries,
  };
}

export interface ProducerCertificationRow {
  id: string;
  name: string;
  issuer: string | null;
  confirmed: boolean;
  confirmedAt: Date | null;
}

// Odczyt do panelu producenta (spec 0065 AC-9): wszystkie wpisy firmy, także
// niepotwierdzone, z jawnym stanem. confirmedBy celowo nie jest wybierane.
export async function getProducerCertifications(producerId: string): Promise<ProducerCertificationRow[]> {
  const rows = await db
    .select({
      id: producerCertification.id,
      name: producerCertification.name,
      issuer: producerCertification.issuer,
      confirmationStatus: producerCertification.confirmationStatus,
      confirmedAt: producerCertification.confirmedAt,
    })
    .from(producerCertification)
    .where(eq(producerCertification.producerId, producerId))
    .orderBy(asc(producerCertification.name));
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    issuer: row.issuer,
    confirmed: row.confirmationStatus === "platform_confirmed",
    confirmedAt: row.confirmedAt,
  }));
}

export interface AdminProducerCertificationRow {
  id: string;
  name: string;
  issuer: string | null;
  confirmed: boolean;
  confirmedAt: Date | null;
  version: number;
}

// Strona /internal/producers/[id] (spec 0065 AC-10): wszystkie wpisy firmy z
// wersją, bo potwierdzenie wysyła ją jako expectedVersion.
export async function getProducerCertificationsForAdmin(producerId: string): Promise<AdminProducerCertificationRow[]> {
  const rows = await db
    .select({
      id: producerCertification.id,
      name: producerCertification.name,
      issuer: producerCertification.issuer,
      confirmationStatus: producerCertification.confirmationStatus,
      confirmedAt: producerCertification.confirmedAt,
      version: producerCertification.version,
    })
    .from(producerCertification)
    .where(eq(producerCertification.producerId, producerId))
    .orderBy(asc(producerCertification.name));
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    issuer: row.issuer,
    confirmed: row.confirmationStatus === "platform_confirmed",
    confirmedAt: row.confirmedAt,
    version: row.version,
  }));
}

export interface AdminProductAssessmentRow {
  id: string;
  countryCode: string;
  rule: string;
  status: "approved" | "conditional" | "blocked";
  reason: string;
  confirmed: boolean;
  confirmedAt: Date | null;
  version: number;
}

export interface AdminProductEnvelopeRow {
  id: string;
  element: (typeof productEnvelopeParameter.$inferSelect)["element"];
  quantity: (typeof productEnvelopeParameter.$inferSelect)["quantity"];
  value: number;
  method: (typeof productEnvelopeParameter.$inferSelect)["method"];
  methodNote: string | null;
  asOfDate: string;
  confirmed: boolean;
  confirmedAt: Date | null;
  version: number;
}

function mapEnvelopeRow(row: typeof productEnvelopeParameter.$inferSelect): AdminProductEnvelopeRow {
  return {
    id: row.id,
    element: row.element,
    quantity: row.quantity,
    value: Number(row.value),
    method: row.method,
    methodNote: row.methodNote,
    asOfDate: row.asOfDate,
    confirmed: row.confirmationStatus === "platform_confirmed",
    confirmedAt: row.confirmedAt,
    version: row.version,
  };
}

// Spec 0075 AC-9: wiersze izolacji i posadowienie jednego produktu dla ekranu edycji
// producenta. Własność produktu sprawdza strona (getProducerProductForEdit) przed wywołaniem.
export async function getProductEnvelopeForEdit(
  productId: string,
): Promise<{ foundationStatus: (typeof product.$inferSelect)["foundationStatus"]; rows: AdminProductEnvelopeRow[] }> {
  const [productRow] = await db
    .select({ foundationStatus: product.foundationStatus })
    .from(product)
    .where(eq(product.id, productId));
  const rows = await db
    .select()
    .from(productEnvelopeParameter)
    .where(eq(productEnvelopeParameter.productId, productId))
    .orderBy(asc(productEnvelopeParameter.element), asc(productEnvelopeParameter.quantity));
  return { foundationStatus: productRow?.foundationStatus ?? null, rows: rows.map(mapEnvelopeRow) };
}

export interface AdminProducerProductRow {
  id: string;
  name: string | null;
  status: string;
  family: (typeof product.$inferSelect)["family"];
  containerSubcategory: (typeof product.$inferSelect)["containerSubcategory"];
  /** Spec 0075: tylko dla produktów, które mogą mieć parametry izolacji. */
  foundationStatus: (typeof product.$inferSelect)["foundationStatus"];
  assessments: AdminProductAssessmentRow[];
  envelopeParameters: AdminProductEnvelopeRow[];
}

// Produkty producenta z ich ocenami zgodności (spec 0065 AC-10), wszystkie
// statusy, także szkice: ocenę można przygotować przed publikacją.
export async function getProducerProductsWithAssessmentsForAdmin(producerId: string): Promise<AdminProducerProductRow[]> {
  const products = await db
    .select({
      id: product.id,
      name: product.name,
      status: product.status,
      family: product.family,
      containerSubcategory: product.containerSubcategory,
      foundationStatus: product.foundationStatus,
    })
    .from(product)
    .where(and(eq(product.producerId, producerId), isNull(product.deletedAt)))
    .orderBy(asc(product.name));
  if (products.length === 0) return [];

  const envelopeRows = await db
    .select()
    .from(productEnvelopeParameter)
    .where(
      inArray(
        productEnvelopeParameter.productId,
        products.map((item) => item.id),
      ),
    )
    .orderBy(asc(productEnvelopeParameter.element), asc(productEnvelopeParameter.quantity));

  const assessmentRows = await db
    .select({
      id: productComplianceAssessment.id,
      productId: productComplianceAssessment.productId,
      countryCode: productComplianceAssessment.countryCode,
      rule: productComplianceAssessment.rule,
      status: productComplianceAssessment.status,
      reason: productComplianceAssessment.reason,
      confirmationStatus: productComplianceAssessment.confirmationStatus,
      confirmedAt: productComplianceAssessment.confirmedAt,
      version: productComplianceAssessment.version,
    })
    .from(productComplianceAssessment)
    .where(
      inArray(
        productComplianceAssessment.productId,
        products.map((item) => item.id),
      ),
    )
    .orderBy(asc(productComplianceAssessment.countryCode), asc(productComplianceAssessment.rule));

  return products.map((item) => ({
    id: item.id,
    name: item.name,
    status: item.status,
    family: item.family,
    containerSubcategory: item.containerSubcategory,
    foundationStatus: item.foundationStatus,
    envelopeParameters: envelopeRows
      .filter((row) => row.productId === item.id)
      .map((row) => ({
        id: row.id,
        element: row.element,
        quantity: row.quantity,
        value: Number(row.value),
        method: row.method,
        methodNote: row.methodNote,
        asOfDate: row.asOfDate,
        confirmed: row.confirmationStatus === "platform_confirmed",
        confirmedAt: row.confirmedAt,
        version: row.version,
      })),
    assessments: assessmentRows
      .filter((row) => row.productId === item.id)
      .map((row) => ({
        id: row.id,
        countryCode: row.countryCode,
        rule: row.rule,
        status: row.status,
        reason: row.reason,
        confirmed: row.confirmationStatus === "platform_confirmed",
        confirmedAt: row.confirmedAt,
        version: row.version,
      })),
  }));
}

export interface ProducerProductForEdit {
  id: string;
  producerId: string;
  status: (typeof product.$inferSelect)["status"];
  name: string;
  family: (typeof product.$inferSelect)["family"];
  category: (typeof product.$inferSelect)["category"];
  spaSubcategory: (typeof product.$inferSelect)["spaSubcategory"];
  containerSubcategory: (typeof product.$inferSelect)["containerSubcategory"];
  floorAreaM2: number | null;
  externalDimensions: string | null;
  rooms: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  countryOfProduction: string | null;
  deliveryCountries: string[];
  description: string | null;
  technicalSpecs: unknown;
  roomLayout: unknown;
  faq: unknown;
  clientRequirements: unknown;
  structuralWarrantyYears: number | null;
  foundationOptions: string | null;
  installationWarrantyYears: number | null;
  serviceScopeDescription: string | null;
  transportDimensions: string | null;
  craneRequirements: string | null;
  minPlotWidthM: number | null;
  simplifiedPermitEligible: boolean | null;
  descriptionEn: string | null;
  descriptionNl: string | null;
  descriptionDe: string | null;
  foundationOptionsEn: string | null;
  foundationOptionsNl: string | null;
  foundationOptionsDe: string | null;
  roomLayoutEn: unknown;
  roomLayoutNl: unknown;
  roomLayoutDe: unknown;
  faqEn: unknown;
  faqNl: unknown;
  faqDe: unknown;
  clientRequirementsEn: unknown;
  clientRequirementsNl: unknown;
  clientRequirementsDe: unknown;
}

// Zasila /producer/panel/products/[id]/edit (spec 0032 AC-5, AC-13): null
// zarówno gdy produktu nie ma, jak i gdy istnieje ale należy do innego
// producenta — wywołujący nie rozróżnia tych dwóch przypadków (ten sam
// przekaz co "cudzy/nieistniejący id -> przekierowanie do listy").
export async function getProducerProductForEdit(
  producerId: string,
  productId: string,
): Promise<ProducerProductForEdit | null> {
  const [row] = await db
    .select()
    .from(product)
    .where(and(eq(product.id, productId), eq(product.producerId, producerId), isNull(product.deletedAt)));
  if (!row) return null;

  const translations = await db
    .select({
      locale: productTranslation.locale,
      description: productTranslation.description,
      roomLayout: productTranslation.roomLayout,
      faq: productTranslation.faq,
      clientRequirements: productTranslation.clientRequirements,
      foundationOptions: productTranslation.foundationOptions,
    })
    .from(productTranslation)
    .where(eq(productTranslation.productId, productId));
  const en = translations.find((translation) => translation.locale === "en");
  const nl = translations.find((translation) => translation.locale === "nl");
  // Spec 0050 AC-28: DE czyta teraz roomLayout/faq/clientRequirements na
  // równi z EN/NL (dawne ograniczenie do EN/NL only, spec 0028 zakres AI,
  // zniesione razem ze skonsolidowanym etapem tłumaczeń).
  const de = translations.find((translation) => translation.locale === "de");

  const eligibilityRows = await db
    .select({ countryCode: productCountryEligibility.countryCode })
    .from(productCountryEligibility)
    .where(eq(productCountryEligibility.productId, productId));

  return {
    id: row.id,
    producerId: row.producerId,
    status: row.status,
    name: row.name ?? "",
    family: row.family,
    category: row.category,
    spaSubcategory: row.spaSubcategory,
    containerSubcategory: row.containerSubcategory,
    floorAreaM2: row.floorAreaM2,
    externalDimensions: row.externalDimensions,
    rooms: row.rooms,
    bedrooms: row.bedrooms,
    bathrooms: row.bathrooms,
    countryOfProduction: row.countryOfProduction,
    deliveryCountries: eligibilityRows.map((eligibility) => eligibility.countryCode),
    description: row.description,
    technicalSpecs: row.technicalSpecs,
    roomLayout: row.roomLayout,
    faq: row.faq,
    clientRequirements: row.clientRequirements,
    structuralWarrantyYears: row.structuralWarrantyYears,
    foundationOptions: row.foundationOptions,
    installationWarrantyYears: row.installationWarrantyYears,
    serviceScopeDescription: row.serviceScopeDescription,
    transportDimensions: row.transportDimensions,
    craneRequirements: row.craneRequirements,
    minPlotWidthM: row.minPlotWidthM,
    simplifiedPermitEligible: row.simplifiedPermitEligible,
    descriptionEn: en?.description ?? null,
    descriptionNl: nl?.description ?? null,
    descriptionDe: de?.description ?? null,
    foundationOptionsEn: en?.foundationOptions ?? null,
    foundationOptionsNl: nl?.foundationOptions ?? null,
    foundationOptionsDe: de?.foundationOptions ?? null,
    roomLayoutEn: en?.roomLayout ?? null,
    roomLayoutNl: nl?.roomLayout ?? null,
    roomLayoutDe: de?.roomLayout ?? null,
    faqEn: en?.faq ?? null,
    faqNl: nl?.faq ?? null,
    faqDe: de?.faq ?? null,
    clientRequirementsEn: en?.clientRequirements ?? null,
    clientRequirementsNl: nl?.clientRequirements ?? null,
    clientRequirementsDe: de?.clientRequirements ?? null,
  };
}

export interface ProducerVariantCostLineItemForEdit {
  id: string;
  label: string;
  status: (typeof costLineItem.$inferSelect)["status"];
  responsibleParty: string | null;
}

export interface ProducerVariantTimelineStageForEdit {
  stageKey: (typeof productTimelineStage.$inferSelect)["stageKey"];
  durationMinDays: number | null;
  durationMaxDays: number | null;
  startsFromLabel: string | null;
  responsibleParty: string | null;
}

export interface ProducerVariantForEdit {
  id: string;
  completionStandard: (typeof productVariant.$inferSelect)["completionStandard"];
  isDefault: boolean;
  priceMinCents: number | null;
  priceOnRequest: boolean;
  costLineItems: ProducerVariantCostLineItemForEdit[];
  timelineStages: ProducerVariantTimelineStageForEdit[];
}

// Zasila krok "Warianty i cennik" w /producer/panel/products/[id]/edit (spec
// 0045 Build plan zadanie 13, wywołane wcześniej na prośbę producenta, żeby
// móc od razu przetestować krok na istniejącym projekcie zamiast tylko na
// nowo tworzonym): productId już ownership-checked przez wywołującego (mirror
// getProductPhotosForAdmin), więc bez powtórnego sprawdzenia producerId tutaj.
export async function getProducerVariantsForEdit(productId: string): Promise<ProducerVariantForEdit[]> {
  const variantRows = await db
    .select()
    .from(productVariant)
    .where(and(eq(productVariant.productId, productId), isNull(productVariant.deletedAt)))
    .orderBy(asc(productVariant.sortOrder));
  if (variantRows.length === 0) return [];

  const variantIds = variantRows.map((row) => row.id);
  const [costItemRows, stageRows] = await Promise.all([
    db.select().from(costLineItem).where(inArray(costLineItem.productVariantId, variantIds)),
    db.select().from(productTimelineStage).where(inArray(productTimelineStage.productVariantId, variantIds)),
  ]);

  return variantRows.map((variant) => ({
    id: variant.id,
    completionStandard: variant.completionStandard,
    isDefault: variant.isDefault,
    priceMinCents: variant.priceMinCents,
    priceOnRequest: variant.priceOnRequest,
    costLineItems: costItemRows
      .filter((row) => row.productVariantId === variant.id)
      .map((row) => ({ id: row.id, label: row.label, status: row.status, responsibleParty: row.responsibleParty })),
    timelineStages: stageRows
      .filter((row) => row.productVariantId === variant.id)
      .map((row) => ({
        stageKey: row.stageKey,
        durationMinDays: row.durationMinDays,
        durationMaxDays: row.durationMaxDays,
        startsFromLabel: row.startsFromLabel,
        responsibleParty: row.responsibleParty,
      })),
  }));
}

export interface ProductOptionGroupOption {
  id: string;
  label: string;
  // Polski tekst źródłowy (spec 0067 AC-1): logika (wykrywanie opcji negatywnej)
  // dopasowuje po nim, nigdy po przetłumaczonym `label`.
  sourceLabel: string;
  priceCents: number | null;
  priceOnRequest: boolean;
  isDefault: boolean;
  imageUrl: string | null;
  // Opis dopłaty pokazywany zamiast "w cenie" (np. "+27 € za m²"); nie wchodzi do sumy opcji.
  priceNote?: string | null;
}

export interface ProductOptionGroup {
  id: string;
  name: string;
  // Polski tekst źródłowy (spec 0067 AC-1), dla ikony grupy.
  sourceName: string;
  selectionType: (typeof productOptionGroup.$inferSelect)["selectionType"];
  options: ProductOptionGroupOption[];
}

// Publiczna: zasila ProjectOptionsConfigurator na /project/[slug] (spec 0059
// AC-1). Pusta lista gdy produkt nie ma przypisanej żadnej grupy (dziś prawie
// cały katalog) — nie błąd, patrz spec 0059 API surface. Grupy i opcje
// posortowane wg sort_order (NULL na końcu, ten sam porządek co
// resolveProductVariants), usunięte miękko (deleted_at) wiersze pominięte.
//
// Spec 0067 AC-1/AC-7: dla en/de/nl left join tłumaczeń grup i opcji (po id,
// fallback na polski), dla pl żadnej tabeli tłumaczeń nie dotykamy.
export async function getProductOptionGroups(
  productId: string,
  locale: Locale = "pl",
): Promise<ProductOptionGroup[]> {
  const groupRows = await db
    .select({ id: productOptionGroup.id, name: productOptionGroup.name, selectionType: productOptionGroup.selectionType, sortOrder: productOptionGroup.sortOrder })
    .from(productOptionGroupAssignment)
    .innerJoin(productOptionGroup, eq(productOptionGroupAssignment.groupId, productOptionGroup.id))
    .where(and(eq(productOptionGroupAssignment.productId, productId), isNull(productOptionGroup.deletedAt)))
    .orderBy(asc(productOptionGroup.sortOrder));
  if (groupRows.length === 0) return [];

  const groupIds = groupRows.map((row) => row.id);
  const optionRows = await db
    .select()
    .from(productOption)
    .where(and(inArray(productOption.groupId, groupIds), isNull(productOption.deletedAt)))
    .orderBy(asc(productOption.sortOrder));

  const groupNames = new Map<string, string>();
  const optionLabels = new Map<string, string>();
  const optionPriceNotes = new Map<string, string>();
  if (locale !== "pl") {
    const [groupTranslations, optionTranslations] = await Promise.all([
      db
        .select({ groupId: productOptionGroupTranslation.groupId, name: productOptionGroupTranslation.name })
        .from(productOptionGroupTranslation)
        .where(and(inArray(productOptionGroupTranslation.groupId, groupIds), eq(productOptionGroupTranslation.locale, locale))),
      optionRows.length === 0
        ? Promise.resolve([] as { optionId: string; label: string; priceNote: string | null }[])
        : db
            .select({ optionId: productOptionTranslation.optionId, label: productOptionTranslation.label, priceNote: productOptionTranslation.priceNote })
            .from(productOptionTranslation)
            .where(
              and(
                inArray(
                  productOptionTranslation.optionId,
                  optionRows.map((row) => row.id),
                ),
                eq(productOptionTranslation.locale, locale),
              ),
            ),
    ]);
    for (const row of groupTranslations) groupNames.set(row.groupId, row.name);
    for (const row of optionTranslations) {
      optionLabels.set(row.optionId, row.label);
      if (row.priceNote) optionPriceNotes.set(row.optionId, row.priceNote);
    }
  }

  return groupRows.map((group) => ({
    id: group.id,
    name: resolveTranslatedText(group.name, groupNames.get(group.id)),
    sourceName: group.name,
    selectionType: group.selectionType,
    options: optionRows
      .filter((row) => row.groupId === group.id)
      .map((row) => ({
        id: row.id,
        label: resolveTranslatedText(row.label, optionLabels.get(row.id)),
        sourceLabel: row.label,
        priceCents: row.priceCents,
        priceOnRequest: row.priceOnRequest,
        isDefault: row.isDefault,
        imageUrl: row.imageUrl,
        priceNote: resolveTranslatedText(row.priceNote ?? "", optionPriceNotes.get(row.id)) || null,
      })),
  }));
}

export interface ProductFamilyCount {
  family: (typeof productFamilyEnum.enumValues)[number];
  subcategory: string | null;
  count: number;
}

// Publiczna: zasila CategoryShowcase na stronie głównej (spec 0022 AC-8).
// Liczy tylko status = 'published' i dopełnia zerem każdą z trzech rodzin,
// której GROUP BY nie zwrócił, więc rodzina bez produktów nadal ma kartę.
export async function getProductFamilyCounts(): Promise<ProductFamilyCount[]> {
  // Dokładnie jedna z trzech kolumn podkategorii jest wypełniona per wiersz
  // (egzekwowane przez product_family_subcategory_match), więc coalesce daje
  // "tę właściwą dla family tego wiersza". Rzutowanie na text jest konieczne:
  // to trzy różne typy enum w Postgresie, COALESCE wymaga wspólnego typu.
  const subcategory = sql<string | null>`coalesce(${product.category}::text, ${product.spaSubcategory}::text, ${product.containerSubcategory}::text)`;

  const rows = await db
    .select({
      family: product.family,
      subcategory,
      count: sql<number>`count(*)::int`,
    })
    .from(product)
    .where(eq(product.status, "published"))
    .groupBy(product.family, subcategory);

  const familiesWithRows = new Set(rows.map((row) => row.family));
  const zeroFilled = productFamilyEnum.enumValues
    .filter((family) => !familiesWithRows.has(family))
    .map((family) => ({ family, subcategory: null, count: 0 }));

  return [...rows, ...zeroFilled];
}

export interface InquiryWithItems {
  id: string;
  name: string;
  email: string;
  phone: string;
  deliveryCountryCode: string;
  status: (typeof inquiry.$inferSelect)["status"];
  receivedAt: Date;
  productNames: string[];
}

interface InquiryWithItemsRow {
  id: string;
  name: string;
  email: string;
  phone: string;
  deliveryCountryCode: string;
  status: (typeof inquiry.$inferSelect)["status"];
  receivedAt: Date;
  productName: string | null;
}

// Wiersz na pozycję zapytania -> jeden wpis na zapytanie, produkty zebrane w
// jedną tablicę. Współdzielone przez getAllInquiriesWithItems (admin) i
// getInquiriesForClient (spec 0024 AC-1), ta sama kolumnowa selekcja obu.
function groupInquiryRows(rows: InquiryWithItemsRow[]): InquiryWithItems[] {
  const byId = new Map<string, InquiryWithItems>();
  for (const row of rows) {
    let entry = byId.get(row.id);
    if (!entry) {
      entry = {
        id: row.id,
        name: row.name,
        email: row.email,
        phone: row.phone,
        deliveryCountryCode: row.deliveryCountryCode,
        status: row.status,
        receivedAt: row.receivedAt,
        productNames: [],
      };
      byId.set(row.id, entry);
    }
    if (row.productName) entry.productNames.push(row.productName);
  }

  return [...byId.values()];
}

// Zasila prosty widok wewnętrzny /internal/inquiries (spec 0023 AC-9), tylko
// dla roli admin. Najnowsze zapytania pierwsze; produkty per zapytanie
// zebrane w jedną tablicę zamiast osobnego wiersza na pozycję.
export async function getAllInquiriesWithItems(): Promise<InquiryWithItems[]> {
  const rows = await db
    .select({
      id: inquiry.id,
      name: inquiry.name,
      email: inquiry.email,
      phone: inquiry.phone,
      deliveryCountryCode: inquiry.deliveryCountryCode,
      status: inquiry.status,
      receivedAt: inquiry.receivedAt,
      productName: product.name,
    })
    .from(inquiry)
    .leftJoin(inquiryItem, eq(inquiryItem.inquiryId, inquiry.id))
    .leftJoin(product, eq(product.id, inquiryItem.productId))
    .where(eq(inquiry.stage, LEGACY_STAGE))
    .orderBy(desc(inquiry.receivedAt));

  return groupInquiryRows(rows);
}

// Zasila /klient/panel/zapytania (spec 0024 AC-1, AC-10): tylko własne
// zapytania zalogowanego klienta, filtrowane po client.id z sesji, nigdy po
// identyfikatorze podanym przez przeglądarkę.
export async function getInquiriesForClient(clientId: string): Promise<InquiryWithItems[]> {
  const rows = await db
    .select({
      id: inquiry.id,
      name: inquiry.name,
      email: inquiry.email,
      phone: inquiry.phone,
      deliveryCountryCode: inquiry.deliveryCountryCode,
      status: inquiry.status,
      receivedAt: inquiry.receivedAt,
      productName: product.name,
    })
    .from(inquiry)
    .leftJoin(inquiryItem, eq(inquiryItem.inquiryId, inquiry.id))
    .leftJoin(product, eq(product.id, inquiryItem.productId))
    .where(and(eq(inquiry.clientId, clientId), eq(inquiry.stage, LEGACY_STAGE)))
    .orderBy(desc(inquiry.receivedAt));

  return groupInquiryRows(rows);
}

// Zasila /producer/panel/inquiries (spec 0032 AC-8): innerJoin na product z
// producerId w warunku złączenia (nie w WHERE zewnętrznym) filtruje w samej
// bazie, więc odpowiedź nigdy nie niesie nazw cudzych produktów z tego samego
// zapytania (prywatność konkurencyjna) — inne producenci przy tym samym
// zapytaniu po prostu nie mają tu żadnego wiersza do zgrupowania.
export async function getInquiriesForProducer(producerId: string): Promise<InquiryWithItems[]> {
  const rows = await db
    .select({
      id: inquiry.id,
      name: inquiry.name,
      email: inquiry.email,
      phone: inquiry.phone,
      deliveryCountryCode: inquiry.deliveryCountryCode,
      status: inquiry.status,
      receivedAt: inquiry.receivedAt,
      productName: product.name,
    })
    .from(inquiry)
    .innerJoin(inquiryItem, eq(inquiryItem.inquiryId, inquiry.id))
    .innerJoin(product, and(eq(product.id, inquiryItem.productId), eq(product.producerId, producerId)))
    .where(eq(inquiry.stage, LEGACY_STAGE))
    .orderBy(desc(inquiry.receivedAt));

  return groupInquiryRows(rows);
}

// client.id wyprowadzone z sesji (session.user.id -> client.userId), nigdy z
// identyfikatora podanego przez przeglądarkę (spec 0024 AC-10), ten sam
// wzorzec co submitInquiry (spec 0023).
export async function getClientIdForUser(userId: string): Promise<string | null> {
  const [row] = await db.select({ id: client.id }).from(client).where(eq(client.userId, userId));
  return row?.id ?? null;
}

// Zasila stan serca na ResultCard i stronie szczegółów (spec 0024 AC-2):
// zbiór id produktów, które zalogowany klient już oznaczył jako ulubione.
export async function getFavoritedProductIds(clientId: string): Promise<Set<string>> {
  const rows = await db
    .select({ productId: favorite.productId })
    .from(favorite)
    .where(eq(favorite.clientId, clientId));
  return new Set(rows.map((row) => row.productId));
}

export interface AdminDashboardAccountCounts {
  activeClientCount: number;
  activeProducerCount: number;
}

// Zasila pierwszy kafelek /internal (spec 0055 AC-4): "aktywne konto" znaczy
// zawsze deleted_at i blocked_at oba puste (spec Key invariants), spójnie z
// każdym innym miejscem, gdzie ta liczba się pojawia.
export async function getAdminDashboardAccountCounts(): Promise<AdminDashboardAccountCounts> {
  const rows = await db
    .select({ role: users.role, count: sql<number>`count(*)::int` })
    .from(users)
    .where(and(isNull(users.deletedAt), isNull(users.blockedAt)))
    .groupBy(users.role);

  const countByRole = new Map(rows.map((row) => [row.role, row.count]));
  return {
    activeClientCount: countByRole.get("client") ?? 0,
    activeProducerCount: countByRole.get("producer") ?? 0,
  };
}

export interface AdminDashboardCoreCounts {
  projectCount: number;
  inquiryCount: number;
  offerCount: number;
}

// Zasila kolejne trzy kafelki /internal (spec 0055 AC-5): "zapytania" liczy
// cały wiersz inquiry, sprawy (spec 0048) i dawne zapytania bezpośrednie
// (spec 0023) razem — to jedna i ta sama tabela, rozróżniona tylko kolumną
// stage, więc żadnego filtru tu nie trzeba (ta sama definicja co AC-14).
export async function getAdminDashboardCoreCounts(): Promise<AdminDashboardCoreCounts> {
  const [[projectRow], [inquiryRow], [offerRow]] = await Promise.all([
    db.select({ count: sql<number>`count(*)::int` }).from(projectRequest),
    db.select({ count: sql<number>`count(*)::int` }).from(inquiry),
    db.select({ count: sql<number>`count(*)::int` }).from(offer),
  ]);

  return {
    projectCount: projectRow?.count ?? 0,
    inquiryCount: inquiryRow?.count ?? 0,
    offerCount: offerRow?.count ?? 0,
  };
}

const TREND_DAYS = 30;
const TREND_TIMEZONE = "Europe/Warsaw";

export interface AdminDashboardTrendPoint {
  day: string;
  registrations: number;
  inquiries: number;
}

// Ostatnie 30 dni w Europe/Warsaw jako klucze "YYYY-MM-DD", najstarszy
// pierwszy — bez tego dni bez żadnego rekordu (0 nowych) po prostu nie
// pojawiłyby się w wyniku SQL GROUP BY, a wykres potrzebuje ciągłej serii.
function buildTrendDayKeys(): string[] {
  const formatter = new Intl.DateTimeFormat("en-CA", { timeZone: TREND_TIMEZONE });
  const days: string[] = [];
  const now = Date.now();
  for (let i = TREND_DAYS - 1; i >= 0; i--) {
    days.push(formatter.format(new Date(now - i * 24 * 60 * 60 * 1000)));
  }
  return days;
}

// Zasila wykres trendu na /internal (spec 0055 AC-7): nowe rejestracje
// (users.created_at) i nowe zapytania (inquiry.received_at, sprawy i dawne
// zapytania bezpośrednie razem, ta sama definicja co AC-5), pogrupowane po
// dniu kalendarzowym w Europe/Warsaw. to_char zamiast samego ::date, żeby
// klucz zawsze wracał jako zwykły tekst "YYYY-MM-DD", niezależnie od tego, jak
// sterownik zmapowałby typ date.
export async function getAdminDashboardTrend(): Promise<AdminDashboardTrendPoint[]> {
  const dayKeys = buildTrendDayKeys();

  const [registrationRows, inquiryRows] = await Promise.all([
    db
      .select({
        day: sql<string>`to_char(${users.createdAt} AT TIME ZONE ${TREND_TIMEZONE}, 'YYYY-MM-DD')`,
        count: sql<number>`count(*)::int`,
      })
      .from(users)
      .where(sql`${users.createdAt} >= now() - interval '30 days'`)
      .groupBy(sql`1`),
    db
      .select({
        day: sql<string>`to_char(${inquiry.receivedAt} AT TIME ZONE ${TREND_TIMEZONE}, 'YYYY-MM-DD')`,
        count: sql<number>`count(*)::int`,
      })
      .from(inquiry)
      .where(sql`${inquiry.receivedAt} >= now() - interval '30 days'`)
      .groupBy(sql`1`),
  ]);

  const registrationsByDay = new Map(registrationRows.map((row) => [row.day, row.count]));
  const inquiriesByDay = new Map(inquiryRows.map((row) => [row.day, row.count]));

  return dayKeys.map((day) => ({
    day,
    registrations: registrationsByDay.get(day) ?? 0,
    inquiries: inquiriesByDay.get(day) ?? 0,
  }));
}

const ACTIVITY_FEED_LIMIT = 15;

export interface AdminActivityFeedItem {
  id: string;
  label: string;
  detail: string;
  at: Date;
}

const activityRoleLabel: Record<string, string> = {
  client: "klient",
  producer: "producent",
  admin: "administrator",
};

// Feed ostatniej aktywności na /internal (spec 0055 AC-8): najnowsze rekordy
// z kont, zapytań (sprawy i dawne zapytania bezpośrednie razem, ta sama
// tabela co AC-5/AC-14) i ofert, każde źródło pobrane osobno (limit na
// każdym, żeby nie ciągnąć całej tabeli) i scalone po dacie w JS zamiast
// jednym SQL UNION — trzy różne kształty kolumn, bez nowej tabeli zdarzeń.
export async function getAdminActivityFeed(): Promise<AdminActivityFeedItem[]> {
  const [accountRows, inquiryRows, offerRows] = await Promise.all([
    db
      .select({ id: users.id, name: users.name, email: users.email, role: users.role, createdAt: users.createdAt })
      .from(users)
      .orderBy(desc(users.createdAt))
      .limit(ACTIVITY_FEED_LIMIT),
    db
      .select({ id: inquiry.id, name: inquiry.name, stage: inquiry.stage, receivedAt: inquiry.receivedAt })
      .from(inquiry)
      .orderBy(desc(inquiry.receivedAt))
      .limit(ACTIVITY_FEED_LIMIT),
    db
      .select({ id: offer.id, producerName: producer.name, submittedAt: offer.submittedAt })
      .from(offer)
      .innerJoin(producer, eq(offer.producerId, producer.id))
      .orderBy(desc(offer.submittedAt))
      .limit(ACTIVITY_FEED_LIMIT),
  ]);

  const items: AdminActivityFeedItem[] = [
    ...accountRows.map((row) => ({
      id: `account-${row.id}`,
      label: "Nowe konto",
      detail: `${row.name ?? row.email} (${activityRoleLabel[row.role] ?? row.role})`,
      at: row.createdAt,
    })),
    ...inquiryRows.map((row) => ({
      id: `inquiry-${row.id}`,
      label: row.stage === "legacy_direct" ? "Nowe zapytanie" : "Nowa sprawa",
      detail: row.name,
      at: row.receivedAt,
    })),
    ...offerRows.map((row) => ({
      id: `offer-${row.id}`,
      label: "Nowa oferta",
      detail: row.producerName,
      at: row.submittedAt,
    })),
  ];

  return items.sort((a, b) => b.at.getTime() - a.at.getTime()).slice(0, ACTIVITY_FEED_LIMIT);
}

export const PRODUCERS_FOR_ADMIN_PAGE_SIZE = 20;

export interface ProducerForAdmin {
  producerId: string;
  memberEmails: string[];
  name: string;
  countryCode: string;
  countryName: string;
  verificationStatus: (typeof producer.$inferSelect)["verificationStatus"];
  blockedAt: Date | null;
}

export interface ProducersForAdminPage {
  items: ProducerForAdmin[];
  totalCount: number;
}

// Zasila /internal/producers (spec 0055 AC-10): wyszukiwanie po nazwie i
// paginacja, jak zapowiada spec Build plan zadanie 8 (wzorem
// getAllProductsForAdmin, ale z limit/offset bo ta lista już nie jest mała).
// Jeden wiersz na producenta (GROUP BY producer.id, spec 0057 Key invariants):
// przynależność czytana przez producer_member, memberEmails zbiera wszystkich
// dzisiejszych członków. blockedAt czytany jako min() z jednego dowolnego
// członka — bezpieczne, bo blokada zawsze obejmuje wszystkich naraz (AC-5).
export async function getAllProducersForAdmin({
  search,
  page,
}: {
  search?: string;
  page: number;
}): Promise<ProducersForAdminPage> {
  const trimmedSearch = search?.trim();
  const whereClause = trimmedSearch ? ilike(producer.name, `%${trimmedSearch}%`) : undefined;

  const [countRow, rows] = await Promise.all([
    db.select({ count: sql<number>`count(*)::int` }).from(producer).where(whereClause),
    db
      .select({
        producerId: producer.id,
        name: producer.name,
        countryCode: producer.countryCode,
        countryName: country.name,
        verificationStatus: producer.verificationStatus,
        blockedAt: sql<Date | null>`min(${users.blockedAt})`,
        memberEmails: sql<string[]>`array_agg(${users.email} order by ${users.email})`,
      })
      .from(producer)
      .innerJoin(country, eq(producer.countryCode, country.code))
      .innerJoin(producerMember, eq(producerMember.producerId, producer.id))
      .innerJoin(users, eq(producerMember.userId, users.id))
      .where(whereClause)
      .groupBy(producer.id, producer.name, producer.countryCode, country.name, producer.verificationStatus)
      .orderBy(asc(producer.name))
      .limit(PRODUCERS_FOR_ADMIN_PAGE_SIZE)
      .offset((page - 1) * PRODUCERS_FOR_ADMIN_PAGE_SIZE),
  ]);

  return { items: rows, totalCount: countRow[0]?.count ?? 0 };
}

// ---------------------------------------------------------------------------
// Tablica ogłoszeń B2B (spec 0062): otwarta pull, zastępuje dawny automatyczny
// push po kraju dostawy. Żadne z poniższych zapytań nie wybiera
// contactName/contactEmail/contactPhone zapytania — maskowanie na poziomie
// zapytania SQL (Key invariants), nie na poziomie tego, co renderuje UI.
// ---------------------------------------------------------------------------

// Bramka ekranu /producer/panel/board (AC-3): osobna, prosta funkcja, żeby
// strona nie musiała sama składać zapytania do producer_capacity_profile.
export async function getProducerVolumeVerificationStatus(
  producerId: string,
): Promise<(typeof producerCapacityProfile.$inferSelect)["volumeVerificationStatus"] | null> {
  const [row] = await db
    .select({ status: producerCapacityProfile.volumeVerificationStatus })
    .from(producerCapacityProfile)
    .where(eq(producerCapacityProfile.producerId, producerId));
  return row?.status ?? null;
}

export const PROJECT_REQUESTS_BOARD_PAGE_SIZE = 20;

export interface ProjectRequestBoardItem {
  id: string;
  // Spec 0077: projekt własny ModularHub (z nazwą projektu), zamawiającym jest platforma.
  isPlatformOwned: boolean;
  title: string | null;
  trustSignal: (typeof projectRequest.$inferSelect)["trustSignal"];
  countryCode: string;
  countryName: string;
  projectType: (typeof projectRequest.$inferSelect)["projectType"];
  families: (typeof projectRequest.$inferSelect)["families"];
  unitCount: number;
  floorAreaM2Min: number | null;
  floorAreaM2Max: number | null;
  completionStandard: (typeof projectRequest.$inferSelect)["completionStandard"];
  startWindowFrom: string | null;
  startWindowTo: string | null;
  deliveryWindowFrom: string | null;
  deliveryWindowTo: string | null;
  locationDetail: string | null;
  extrasNote: string | null;
  // Spec 0075 AC-7: planowane użytkowanie, opcjonalne.
  intendedUse: (typeof projectRequest.$inferSelect)["intendedUse"];
  intendedUseMonths: number | null;
  // Spec 0070 AC-22: producent widzi termin i stan własnej oferty, nigdy status
  // zapytania (open/quoted zdradzałoby, że ktoś inny już złożył ofertę).
  deadlineAt: Date;
  createdAt: Date;
}

const BOARD_COLUMNS = {
  id: projectRequest.id,
  isPlatformOwned: projectRequest.isPlatformOwned,
  title: projectRequest.title,
  trustSignal: projectRequest.trustSignal,
  countryCode: projectRequest.countryCode,
  countryName: country.name,
  projectType: projectRequest.projectType,
  families: projectRequest.families,
  unitCount: projectRequest.unitCount,
  floorAreaM2Min: projectRequest.floorAreaM2Min,
  floorAreaM2Max: projectRequest.floorAreaM2Max,
  completionStandard: projectRequest.completionStandard,
  startWindowFrom: projectRequest.startWindowFrom,
  startWindowTo: projectRequest.startWindowTo,
  deliveryWindowFrom: projectRequest.deliveryWindowFrom,
  deliveryWindowTo: projectRequest.deliveryWindowTo,
  locationDetail: projectRequest.locationDetail,
  extrasNote: projectRequest.extrasNote,
  intendedUse: projectRequest.intendedUse,
  intendedUseMonths: projectRequest.intendedUseMonths,
  deadlineAt: projectRequest.deadlineAt,
  createdAt: projectRequest.createdAt,
} as const;

// Statusy, w których zapytanie jest na tablicy i można składać oferty (spec 0070:
// `published` dochodzi, inaczej zapytanie znikałoby po publikacji podsumowania).
const BOARD_OPEN_STATUSES = ["open", "quoted", "published"] as const;

// Zasila /producer/panel/board. Spec 0070 AC-10: tablica pokazuje producentowi
// tylko zapytania, które pasują do niego regułą dopasowania
// (producerMatchesProjectRequestSql), ta sama funkcja co w szczególe i w
// submitProjectQuote. Spec 0062 AC-2 (tablica dla wszystkich zatwierdzonych) jest
// tym zastąpiona.
export interface ProjectRequestBoardFilters {
  countryCode?: string;
  projectType?: ProjectRequestBoardItem["projectType"];
  family?: ProjectRequestBoardItem["families"][number];
  // Spec 0074 AC-9: ukryj ogłoszenia z krajów spoza listy krajów dostawy producenta.
  onlyDeliveryCountries?: boolean;
}

export interface ProjectRequestBoardListItem extends ProjectRequestBoardItem {
  ownQuoteStatus: (typeof projectQuote.$inferSelect)["status"] | null;
  // Czy kraj zapytania jest na liście krajów dostawy producenta. Brak kraju nie
  // ukrywa zapytania, tylko włącza znacznik na tablicy i w szczególe.
  deliversToCountry: boolean;
}

export async function getOpenProjectRequestsForBoard({
  producerId,
  page,
  filters = {},
}: {
  producerId: string;
  page: number;
  filters?: ProjectRequestBoardFilters;
}): Promise<{ items: ProjectRequestBoardListItem[]; totalCount: number; hiddenByDeliveryCount: number }> {
  const baseClauses = and(
    inArray(projectRequest.status, [...BOARD_OPEN_STATUSES]),
    producerMatchesProjectRequestSql(producerId),
    filters.countryCode ? eq(projectRequest.countryCode, filters.countryCode) : undefined,
    filters.projectType ? eq(projectRequest.projectType, filters.projectType) : undefined,
    filters.family ? sql`${projectRequest.families} @> ${JSON.stringify([filters.family])}::jsonb` : undefined,
  );
  const whereClause = filters.onlyDeliveryCountries
    ? and(baseClauses, producerDeliversToRequestCountrySql(producerId))
    : baseClauses;

  const [countRow, rows, hiddenRow] = await Promise.all([
    db.select({ count: sql<number>`count(*)::int` }).from(projectRequest).where(whereClause),
    db
      .select({
        ...BOARD_COLUMNS,
        deliversToCountry: producerDeliversToRequestCountrySql(producerId),
        // Najnowsza oferta tego producenta na to zapytanie (jego własna, nie cudza).
        ownQuoteStatus: sql<ProjectRequestBoardListItem["ownQuoteStatus"]>`(
          select q.status from project_quote q
          where q.project_request_id = ${projectRequest.id} and q.producer_id = ${producerId}
          order by q.submitted_at desc limit 1
        )`,
      })
      .from(projectRequest)
      .innerJoin(country, eq(country.code, projectRequest.countryCode))
      .where(whereClause)
      .orderBy(desc(projectRequest.createdAt))
      .limit(PROJECT_REQUESTS_BOARD_PAGE_SIZE)
      .offset((page - 1) * PROJECT_REQUESTS_BOARD_PAGE_SIZE),
    // Ile ogłoszeń ukrywa przełącznik krajów dostawy (tylko gdy jest włączony).
    filters.onlyDeliveryCountries
      ? db
          .select({ count: sql<number>`count(*)::int` })
          .from(projectRequest)
          .where(and(baseClauses, sql`not ${producerDeliversToRequestCountrySql(producerId)}`))
      : Promise.resolve([{ count: 0 }]),
  ]);

  return {
    items: rows.map((row) => ({ ...row, deliversToCountry: row.deliversToCountry === true })),
    totalCount: countRow[0]?.count ?? 0,
    hiddenByDeliveryCount: hiddenRow[0]?.count ?? 0,
  };
}

export interface ProjectRequestBoardDetail extends ProjectRequestBoardItem {
  // Czy można jeszcze złożyć ofertę (spec 0070 AC-12): przed terminem, bez wyboru klienta
  // i w statusie open, quoted lub published. Producent nie widzi samego statusu (AC-22).
  acceptingQuotes: boolean;
  ownQuoteStatus: (typeof projectQuote.$inferSelect)["status"] | null;
  // Własna aktywna oferta jest już u klienta: nowa wersja czeka na cofnięcie
  // publikacji przez administratora (AC-14). Dotyczy tylko oferty tego producenta.
  ownQuotePublished: boolean;
  deliversToCountry: boolean;
  // Pliki inwestora zmieniły się po złożeniu własnej aktywnej oferty (spec 0070 AC-33).
  filesChangedAfterOwnQuote: boolean;
  // Spec 0077 AC-10: wspólny kontakt ModularHub, tylko dla projektu własnego (dla zapytań klientów
  // kolumny kontaktowe nie są w ogóle wybierane, patrz CASE w zapytaniu).
  platformContact: { name: string; email: string; phone: string | null } | null;
  // Spec 0077 AC-19: wybór w projekcie własnym zakończony (accepted) albo projekt zamknięty.
  selectionDone: boolean;
  // Własna oferta producenta jest wybraną (status accepted).
  ownQuoteSelected: boolean;
  // Spec 0077 AC-44: aktywne warianty własne producenta (tylko projekt własny).
  ownVariants: PlatformQuoteVariant[];
}

// Zasila /producer/panel/board/[id] (AC-4): pełne dane do wyceny (bez
// kontaktu) plus status własnej wyceny tego producenta, jeśli istnieje.
// Zapytanie widzi producent dopasowany (spec 0070 AC-10) w statusie
// open/quoted/published. Producent, który już złożył ofertę, widzi je też poza
// tym (wynik własnej oferty po zamknięciu, wyborze albo gdy zmieniło się
// dopasowanie), nigdy nikt inny.
export async function getProjectRequestForBoardDetail(
  id: string,
  producerId: string,
): Promise<ProjectRequestBoardDetail | null> {
  const [row] = await db
    .select({
      item: BOARD_COLUMNS,
      status: projectRequest.status,
      selectedQuoteId: projectRequest.selectedQuoteId,
      platformContactName: sql<string | null>`case when ${projectRequest.isPlatformOwned} then ${projectRequest.contactName} end`,
      platformContactEmail: sql<string | null>`case when ${projectRequest.isPlatformOwned} then ${projectRequest.contactEmail} end`,
      platformContactPhone: sql<string | null>`case when ${projectRequest.isPlatformOwned} then ${projectRequest.contactPhone} end`,
      matches: producerMatchesProjectRequestSql(producerId),
      deliversToCountry: producerDeliversToRequestCountrySql(producerId),
      filesChangedAfterOwnQuote: sql<boolean>`exists (
        select 1 from project_quote fq
        where fq.project_request_id = ${projectRequest.id} and fq.producer_id = ${producerId} and fq.status = 'active'
          and ${projectRequest.attachmentsChangedAt} is not null and ${projectRequest.attachmentsChangedAt} > fq.submitted_at
      )`,
    })
    .from(projectRequest)
    .innerJoin(country, eq(country.code, projectRequest.countryCode))
    .where(eq(projectRequest.id, id));
  if (!row) return null;

  const [ownQuote] = await db
    .select({ status: projectQuote.status, publishedToClientAt: projectQuote.publishedToClientAt })
    .from(projectQuote)
    .where(and(eq(projectQuote.projectRequestId, id), eq(projectQuote.producerId, producerId)))
    .orderBy(desc(projectQuote.submittedAt))
    .limit(1);

  const isOnBoard = (BOARD_OPEN_STATUSES as readonly string[]).includes(row.status);
  const canSee = (row.matches === true && isOnBoard) || ownQuote !== undefined;
  if (!canSee) return null;

  const acceptingQuotes = row.matches === true && isOnBoard && row.selectedQuoteId === null && row.item.deadlineAt.getTime() >= Date.now();

  const isPlatform = row.item.isPlatformOwned;
  const ownVariants = isPlatform
    ? (
        await db
          .select({
            id: projectQuote.id,
            variantLabel: projectQuote.variantLabel,
            currency: projectQuote.currency,
            priceTaxMode: projectQuote.priceTaxMode,
            vatRatePercent: projectQuote.vatRatePercent,
            totalPriceCents: projectQuote.totalPriceCents,
            unitPriceCents: projectQuote.unitPriceCents,
            scopeIncluded: projectQuote.scopeIncluded,
            scopeExcluded: projectQuote.scopeExcluded,
            logistics: projectQuote.logistics,
            paymentPlan: projectQuote.paymentPlan,
            validUntil: projectQuote.validUntil,
            warrantyNote: projectQuote.warrantyNote,
            proposedLeadTimeWeeks: projectQuote.proposedLeadTimeWeeks,
            deliveryWindowFrom: projectQuote.deliveryWindowFrom,
            deliveryWindowTo: projectQuote.deliveryWindowTo,
            notes: projectQuote.notes,
            submittedAt: projectQuote.submittedAt,
          })
          .from(projectQuote)
          .where(and(eq(projectQuote.projectRequestId, id), eq(projectQuote.producerId, producerId), eq(projectQuote.status, "active")))
          .orderBy(asc(projectQuote.submittedAt))
      ).map(toPlatformQuoteVariant)
    : [];
  const [acceptedOwn] = isPlatform
    ? await db
        .select({ id: projectQuote.id })
        .from(projectQuote)
        .where(and(eq(projectQuote.projectRequestId, id), eq(projectQuote.producerId, producerId), eq(projectQuote.status, "accepted")))
        .limit(1)
    : [];

  return {
    ...row.item,
    platformContact: isPlatform
      ? { name: row.platformContactName ?? "", email: row.platformContactEmail ?? "", phone: row.platformContactPhone }
      : null,
    selectionDone: isPlatform && (row.status === "accepted" || row.status === "closed"),
    ownQuoteSelected: acceptedOwn !== undefined,
    ownVariants,
    ownQuoteStatus: ownQuote?.status ?? null,
    ownQuotePublished: ownQuote?.status === "active" && ownQuote.publishedToClientAt !== null,
    deliversToCountry: row.deliversToCountry === true,
    filesChangedAfterOwnQuote: row.filesChangedAfterOwnQuote === true,
    acceptingQuotes,
  };
}

// Zapytanie o konkretny produkt producenta (spec 0070 AC-21): odbiorcą jest producent
// produktu, bez reguły dopasowania. Te same pola terminu i ta sama blokada co przy
// zapytaniu wolnym; kolumn kontaktowych nigdy nie wybieramy (AC-22).
export interface ProductInquiryForProducer {
  id: string;
  productId: string;
  productName: string;
  countryCode: string;
  countryName: string;
  unitCount: number;
  startWindowFrom: string | null;
  startWindowTo: string | null;
  deliveryWindowFrom: string | null;
  deliveryWindowTo: string | null;
  note: string | null;
  intendedUse: (typeof bulkProductInquiry.$inferSelect)["intendedUse"];
  intendedUseMonths: number | null;
  deadlineAt: Date;
  createdAt: Date;
  ownQuoteStatus: (typeof projectQuote.$inferSelect)["status"] | null;
  // Czy można jeszcze złożyć ofertę (AC-12): przed terminem, bez wyboru klienta, status open/quoted/published.
  acceptingQuotes: boolean;
  // Własna aktywna oferta jest już u klienta: nowa wersja czeka na cofnięcie publikacji (AC-14).
  ownQuotePublished: boolean;
  // Pliki inwestora zmieniły się po złożeniu własnej aktywnej oferty (spec 0070 AC-33).
  filesChangedAfterOwnQuote: boolean;
}

const PRODUCT_INQUIRY_PRODUCER_COLUMNS = {
  id: bulkProductInquiry.id,
  productId: bulkProductInquiry.productId,
  productName: product.name,
  countryCode: bulkProductInquiry.deliveryCountryCode,
  countryName: country.name,
  unitCount: bulkProductInquiry.unitCount,
  startWindowFrom: bulkProductInquiry.startWindowFrom,
  startWindowTo: bulkProductInquiry.startWindowTo,
  deliveryWindowFrom: bulkProductInquiry.deliveryWindowFrom,
  deliveryWindowTo: bulkProductInquiry.deliveryWindowTo,
  note: bulkProductInquiry.note,
  intendedUse: bulkProductInquiry.intendedUse,
  intendedUseMonths: bulkProductInquiry.intendedUseMonths,
  deadlineAt: bulkProductInquiry.deadlineAt,
  createdAt: bulkProductInquiry.createdAt,
  status: bulkProductInquiry.status,
  selectedQuoteId: bulkProductInquiry.selectedQuoteId,
  ownQuoteStatus: sql<ProductInquiryForProducer["ownQuoteStatus"]>`(
    select q.status from project_quote q
    where q.bulk_product_inquiry_id = ${bulkProductInquiry.id} and q.producer_id = ${product.producerId}
    order by q.submitted_at desc limit 1
  )`,
  ownQuotePublished: sql<boolean>`exists (
    select 1 from project_quote q
    where q.bulk_product_inquiry_id = ${bulkProductInquiry.id} and q.producer_id = ${product.producerId}
      and q.status = 'active' and q.published_to_client_at is not null
  )`,
  filesChangedAfterOwnQuote: sql<boolean>`exists (
    select 1 from project_quote fq
    where fq.bulk_product_inquiry_id = ${bulkProductInquiry.id} and fq.producer_id = ${product.producerId} and fq.status = 'active'
      and ${bulkProductInquiry.attachmentsChangedAt} is not null and ${bulkProductInquiry.attachmentsChangedAt} > fq.submitted_at
  )`,
} as const;

function toProductInquiryForProducer(row: {
  id: string;
  productId: string;
  productName: string | null;
  countryCode: string;
  countryName: string;
  unitCount: number;
  startWindowFrom: string | null;
  startWindowTo: string | null;
  deliveryWindowFrom: string | null;
  deliveryWindowTo: string | null;
  note: string | null;
  intendedUse: ProductInquiryForProducer["intendedUse"];
  intendedUseMonths: number | null;
  deadlineAt: Date;
  createdAt: Date;
  status: string;
  selectedQuoteId: string | null;
  ownQuoteStatus: ProductInquiryForProducer["ownQuoteStatus"];
  ownQuotePublished: boolean;
  filesChangedAfterOwnQuote: boolean;
}): ProductInquiryForProducer {
  return {
    id: row.id,
    productId: row.productId,
    productName: row.productName ?? "",
    countryCode: row.countryCode,
    countryName: row.countryName,
    unitCount: row.unitCount,
    startWindowFrom: row.startWindowFrom,
    startWindowTo: row.startWindowTo,
    deliveryWindowFrom: row.deliveryWindowFrom,
    deliveryWindowTo: row.deliveryWindowTo,
    note: row.note,
    intendedUse: row.intendedUse,
    intendedUseMonths: row.intendedUseMonths,
    deadlineAt: row.deadlineAt,
    createdAt: row.createdAt,
    ownQuoteStatus: row.ownQuoteStatus,
    ownQuotePublished: row.ownQuotePublished === true,
    filesChangedAfterOwnQuote: row.filesChangedAfterOwnQuote === true,
    acceptingQuotes:
      (BOARD_OPEN_STATUSES as readonly string[]).includes(row.status) &&
      row.selectedQuoteId === null &&
      row.deadlineAt.getTime() >= Date.now(),
  };
}

// Zasila /producer/panel/product-inquiries: zapytania o produkty tego producenta, które
// są jeszcze otwarte, oraz te, na które producent złożył ofertę (wynik własnej oferty
// widać też po zamknięciu albo wyborze). Zapytań o cudze produkty nie zwraca nigdy.
export async function getProductInquiriesForProducer(producerId: string): Promise<ProductInquiryForProducer[]> {
  const rows = await db
    .select(PRODUCT_INQUIRY_PRODUCER_COLUMNS)
    .from(bulkProductInquiry)
    .innerJoin(product, and(eq(product.id, bulkProductInquiry.productId), eq(product.producerId, producerId)))
    .innerJoin(country, eq(country.code, bulkProductInquiry.deliveryCountryCode))
    .where(
      or(
        inArray(bulkProductInquiry.status, [...BOARD_OPEN_STATUSES]),
        sql`exists (
          select 1 from project_quote q
          where q.bulk_product_inquiry_id = ${bulkProductInquiry.id} and q.producer_id = ${producerId}
        )`,
      ),
    )
    .orderBy(desc(bulkProductInquiry.createdAt))
    .limit(100);
  return rows.map(toProductInquiryForProducer);
}

// Szczegół jednego zapytania o produkt dla producenta tego produktu. Cudze zapytanie
// i nieistniejące dają to samo: null.
export async function getProductInquiryForProducerDetail(
  id: string,
  producerId: string,
): Promise<ProductInquiryForProducer | null> {
  const [row] = await db
    .select(PRODUCT_INQUIRY_PRODUCER_COLUMNS)
    .from(bulkProductInquiry)
    .innerJoin(product, and(eq(product.id, bulkProductInquiry.productId), eq(product.producerId, producerId)))
    .innerJoin(country, eq(country.code, bulkProductInquiry.deliveryCountryCode))
    .where(eq(bulkProductInquiry.id, id));
  return row ? toProductInquiryForProducer(row) : null;
}

export interface ProjectQuoteForProducer {
  id: string;
  // Spec 0077: projekt własny ModularHub (tytuł projektu i nazwa wariantu oferty).
  isPlatformOwned: boolean;
  projectTitle: string | null;
  variantLabel: string | null;
  source: "project_request" | "bulk_product_inquiry";
  sourceId: string;
  status: (typeof projectQuote.$inferSelect)["status"];
  totalPriceCents: number;
  unitPriceCents: number | null;
  proposedLeadTimeWeeks: number | null;
  submittedAt: Date;
  producerOutcome: (typeof projectQuote.$inferSelect)["producerOutcome"];
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  hasPdf: boolean;
}

// Zasila /producer/panel/board-quotes (AC-5, AC-15): status własnych wycen
// producenta, obie ścieżki (tablica i modal bulk_product_inquiry). Kontakt
// inwestora wybierany w samym SQL (CASE WHEN contact_revealed_at IS NOT NULL),
// nie po fakcie w JS (AC-15: "tym samym sprawdzeniem na poziomie zapytania
// SQL co AC-2") — wiersz bez ujawnienia wraca z NULL już z bazy.
export async function getProjectQuotesForProducer(producerId: string): Promise<ProjectQuoteForProducer[]> {
  const rows = await db
    .select({
      id: projectQuote.id,
      isPlatformOwned: sql<boolean>`coalesce(${projectRequest.isPlatformOwned}, false)`,
      projectTitle: projectRequest.title,
      variantLabel: projectQuote.variantLabel,
      projectRequestId: projectQuote.projectRequestId,
      bulkProductInquiryId: projectQuote.bulkProductInquiryId,
      status: projectQuote.status,
      totalPriceCents: projectQuote.totalPriceCents,
      unitPriceCents: projectQuote.unitPriceCents,
      proposedLeadTimeWeeks: projectQuote.proposedLeadTimeWeeks,
      submittedAt: projectQuote.submittedAt,
      producerOutcome: projectQuote.producerOutcome,
      contactName: sql<string | null>`CASE WHEN ${projectQuote.contactRevealedAt} IS NOT NULL THEN COALESCE(${projectRequest.contactName}, ${bulkProductInquiry.contactName}) ELSE NULL END`,
      contactEmail: sql<string | null>`CASE WHEN ${projectQuote.contactRevealedAt} IS NOT NULL THEN COALESCE(${projectRequest.contactEmail}, ${bulkProductInquiry.contactEmail}) ELSE NULL END`,
      contactPhone: sql<string | null>`CASE WHEN ${projectQuote.contactRevealedAt} IS NOT NULL THEN COALESCE(${projectRequest.contactPhone}, ${bulkProductInquiry.contactPhone}) ELSE NULL END`,
      // hasPdf (spec 0063 AC-8): sam fakt istnienia, nigdy URL w tej liście --
      // URL powstaje osobno, na żądanie, przez getProjectQuotePdfUrl.
      hasPdf: sql<boolean>`${document.id} IS NOT NULL`,
    })
    .from(projectQuote)
    .leftJoin(projectRequest, eq(projectRequest.id, projectQuote.projectRequestId))
    .leftJoin(bulkProductInquiry, eq(bulkProductInquiry.id, projectQuote.bulkProductInquiryId))
    .leftJoin(
      document,
      and(eq(document.projectQuoteId, projectQuote.id), eq(document.purpose, "project_quote_pdf"), isNull(document.deletedAt)),
    )
    .where(eq(projectQuote.producerId, producerId))
    .orderBy(desc(projectQuote.submittedAt));

  return rows.map((row) => ({
    id: row.id,
    isPlatformOwned: row.isPlatformOwned === true,
    projectTitle: row.projectTitle,
    variantLabel: row.variantLabel,
    source: row.projectRequestId ? ("project_request" as const) : ("bulk_product_inquiry" as const),
    sourceId: (row.projectRequestId ?? row.bulkProductInquiryId) as string,
    status: row.status,
    totalPriceCents: row.totalPriceCents,
    unitPriceCents: row.unitPriceCents,
    proposedLeadTimeWeeks: row.proposedLeadTimeWeeks,
    submittedAt: row.submittedAt,
    producerOutcome: row.producerOutcome,
    contactName: row.contactName,
    contactEmail: row.contactEmail,
    contactPhone: row.contactPhone,
    hasPdf: row.hasPdf,
  }));
}

// Kolumna logistics jest jsonb, kształt pilnuje Zod. Uszkodzony wpis nie wywraca ekranu klienta:
// pozycja bez poprawnego kształtu wypada, a ekran pokaże ją jako "brak danych".
function parseStoredLogistics(raw: unknown): StoredLogistics {
  const parsed = storedLogisticsSchema.safeParse(raw);
  return parsed.success ? parsed.data : {};
}

export interface ClientReceivedQuote {
  id: string;
  producerId: string;
  producerName: string;
  status: (typeof projectQuote.$inferSelect)["status"];
  totalPriceCents: number;
  unitPriceCents: number | null;
  proposedLeadTimeWeeks: number | null;
  notes: string | null;
  submittedAt: Date;
  contactRevealedAt: Date | null;
  hasPdf: boolean;
  // Wspólny format oferty (spec 0070 AC-11), czytany przez tabelę porównawczą (AC-15).
  // Brak wartości zostaje null/pusty, ekran pokazuje wtedy "brak danych", nigdy zero.
  priceTaxMode: (typeof projectQuote.$inferSelect)["priceTaxMode"];
  vatRatePercent: number | null;
  scopeIncluded: string | null;
  scopeExcluded: string | null;
  logistics: StoredLogistics;
  paymentPlan: string | null;
  validUntil: string | null;
  warrantyNote: string | null;
  deliveryWindowFrom: string | null;
  deliveryWindowTo: string | null;
  advisorNote: string | null;
  certifications: ClientQuoteCertification[];
}

export interface ClientQuoteCertification {
  name: string;
  confirmed: boolean;
}

// Pola wspólne dla obu rodzajów zapytania w nagłówku listy klienta (spec 0070 AC-41):
// termin ofert, zamknięcie (powód i chwila) i wybór oczekujący na połączenie.
interface ClientRequestListFields {
  deadlineAt: Date;
  closedAt: Date | null;
  closedReason: (typeof projectRequest.$inferSelect)["closedReason"];
  selectedQuoteId: string | null;
  // Od publikacji podsumowania klient nie zmienia już plików zapytania (spec 0070 AC-28).
  summaryPublishedAt: Date | null;
}

export interface ClientProjectRequestWithQuotes extends ClientRequestListFields {
  source: "project_request";
  id: string;
  countryCode: string;
  projectType: (typeof projectRequest.$inferSelect)["projectType"];
  families: (typeof projectRequest.$inferSelect)["families"];
  unitCount: number;
  status: (typeof projectRequest.$inferSelect)["status"];
  createdAt: Date;
  quotes: ClientReceivedQuote[];
}

export interface ClientBulkInquiryWithQuotes extends ClientRequestListFields {
  source: "bulk_product_inquiry";
  id: string;
  productId: string;
  productName: string;
  countryCode: string;
  unitCount: number;
  status: (typeof bulkProductInquiry.$inferSelect)["status"];
  createdAt: Date;
  quotes: ClientReceivedQuote[];
}

export type ClientRequestWithQuotes = ClientProjectRequestWithQuotes | ClientBulkInquiryWithQuotes;

// Zasila ekran panelu klienta "otrzymane wyceny" (AC-6): własne project_request
// i bulk_product_inquiry zalogowanego klienta, każde z własną listą wycen.
// Tożsamość producenta jest już publiczna (spec 0062 Context) — producerName
// zawsze widoczny, niezależnie od contactRevealedAt (to pole chroni tylko
// dane kontaktowe INWESTORA, nigdy nazwę producenta).
export async function getProjectRequestsWithQuotesForClient(
  clientId: string,
  locale: Locale = "pl",
): Promise<ClientRequestWithQuotes[]> {
  const [requestRows, bulkRows] = await Promise.all([
    db
      .select({
        id: projectRequest.id,
        countryCode: projectRequest.countryCode,
        projectType: projectRequest.projectType,
        families: projectRequest.families,
        unitCount: projectRequest.unitCount,
        status: projectRequest.status,
        createdAt: projectRequest.createdAt,
        deadlineAt: projectRequest.deadlineAt,
        closedAt: projectRequest.closedAt,
        closedReason: projectRequest.closedReason,
        selectedQuoteId: projectRequest.selectedQuoteId,
        summaryPublishedAt: projectRequest.summaryPublishedAt,
      })
      .from(projectRequest)
      .where(eq(projectRequest.clientId, clientId))
      .orderBy(desc(projectRequest.createdAt)),
    db
      .select({
        id: bulkProductInquiry.id,
        productId: bulkProductInquiry.productId,
        productName: product.name,
        countryCode: bulkProductInquiry.deliveryCountryCode,
        unitCount: bulkProductInquiry.unitCount,
        status: bulkProductInquiry.status,
        createdAt: bulkProductInquiry.createdAt,
        deadlineAt: bulkProductInquiry.deadlineAt,
        closedAt: bulkProductInquiry.closedAt,
        closedReason: bulkProductInquiry.closedReason,
        selectedQuoteId: bulkProductInquiry.selectedQuoteId,
        summaryPublishedAt: bulkProductInquiry.summaryPublishedAt,
      })
      .from(bulkProductInquiry)
      .innerJoin(product, eq(product.id, bulkProductInquiry.productId))
      .where(eq(bulkProductInquiry.clientId, clientId))
      .orderBy(desc(bulkProductInquiry.createdAt)),
  ]);

  const requestIds = requestRows.map((row) => row.id);
  const bulkIds = bulkRows.map((row) => row.id);

  const quoteRows =
    requestIds.length === 0 && bulkIds.length === 0
      ? []
      : await db
          .select({
            id: projectQuote.id,
            projectRequestId: projectQuote.projectRequestId,
            bulkProductInquiryId: projectQuote.bulkProductInquiryId,
            producerId: projectQuote.producerId,
            producerName: producer.name,
            status: projectQuote.status,
            totalPriceCents: projectQuote.totalPriceCents,
            unitPriceCents: projectQuote.unitPriceCents,
            proposedLeadTimeWeeks: projectQuote.proposedLeadTimeWeeks,
            notes: projectQuote.notes,
            submittedAt: projectQuote.submittedAt,
            contactRevealedAt: projectQuote.contactRevealedAt,
            priceTaxMode: projectQuote.priceTaxMode,
            vatRatePercent: projectQuote.vatRatePercent,
            scopeIncluded: projectQuote.scopeIncluded,
            scopeExcluded: projectQuote.scopeExcluded,
            logistics: projectQuote.logistics,
            paymentPlan: projectQuote.paymentPlan,
            validUntil: projectQuote.validUntil,
            warrantyNote: projectQuote.warrantyNote,
            deliveryWindowFrom: projectQuote.deliveryWindowFrom,
            deliveryWindowTo: projectQuote.deliveryWindowTo,
            advisorNote: projectQuote.advisorNote,
            hasPdf: sql<boolean>`${document.id} IS NOT NULL`,
          })
          .from(projectQuote)
          .innerJoin(producer, eq(producer.id, projectQuote.producerId))
          .leftJoin(
            document,
            and(eq(document.projectQuoteId, projectQuote.id), eq(document.purpose, "project_quote_pdf"), isNull(document.deletedAt)),
          )
          .where(
            and(
              // Spec 0070 AC-13: klient dostaje tylko oferty opublikowane przez administratora.
              isNotNull(projectQuote.publishedToClientAt),
              // Klient widzi jedną wersję oferty producenta, nigdy zastąpioną (spec 0070 część B, bramka publikacji).
              inArray(projectQuote.status, ["active", "accepted", "rejected"]),
              or(
                requestIds.length > 0 ? inArray(projectQuote.projectRequestId, requestIds) : undefined,
                bulkIds.length > 0 ? inArray(projectQuote.bulkProductInquiryId, bulkIds) : undefined,
              ),
            ),
          );

  // Certyfikaty firmy producenta (spec 0065), z tłumaczeniem nazwy na język strony (spec 0067).
  const producerIds = [...new Set(quoteRows.map((row) => row.producerId))];
  const certificationsByProducerId = new Map<string, ClientQuoteCertification[]>();
  if (producerIds.length > 0) {
    const certificationRows = await db
      .select({
        producerId: producerCertification.producerId,
        name: producerCertification.name,
        translatedName: producerCertificationTranslation.name,
        confirmationStatus: producerCertification.confirmationStatus,
      })
      .from(producerCertification)
      .leftJoin(
        producerCertificationTranslation,
        and(
          eq(producerCertificationTranslation.certificationId, producerCertification.id),
          // Dla pl nie ma tabeli tłumaczeń (spec 0067): warunek zawsze fałszywy, zostaje tekst źródłowy.
          locale === "pl" ? sql`false` : eq(producerCertificationTranslation.locale, locale),
        ),
      )
      .where(inArray(producerCertification.producerId, producerIds))
      .orderBy(asc(producerCertification.name));
    for (const row of certificationRows) {
      const entry = {
        name: resolveTranslatedText(row.name, row.translatedName),
        confirmed: row.confirmationStatus === "platform_confirmed",
      };
      const existing = certificationsByProducerId.get(row.producerId);
      if (existing) existing.push(entry);
      else certificationsByProducerId.set(row.producerId, [entry]);
    }
  }

  const quotesByParentId = new Map<string, ClientReceivedQuote[]>();
  for (const row of quoteRows) {
    const key = (row.projectRequestId ?? row.bulkProductInquiryId) as string;
    const quote: ClientReceivedQuote = {
      id: row.id,
      producerId: row.producerId,
      producerName: row.producerName,
      status: row.status,
      totalPriceCents: row.totalPriceCents,
      unitPriceCents: row.unitPriceCents,
      proposedLeadTimeWeeks: row.proposedLeadTimeWeeks,
      notes: row.notes,
      submittedAt: row.submittedAt,
      contactRevealedAt: row.contactRevealedAt,
      hasPdf: row.hasPdf,
      priceTaxMode: row.priceTaxMode,
      vatRatePercent: row.vatRatePercent === null ? null : Number(row.vatRatePercent),
      scopeIncluded: row.scopeIncluded,
      scopeExcluded: row.scopeExcluded,
      logistics: parseStoredLogistics(row.logistics),
      paymentPlan: row.paymentPlan,
      validUntil: row.validUntil,
      warrantyNote: row.warrantyNote,
      deliveryWindowFrom: row.deliveryWindowFrom,
      deliveryWindowTo: row.deliveryWindowTo,
      advisorNote: row.advisorNote,
      certifications: certificationsByProducerId.get(row.producerId) ?? [],
    };
    const existing = quotesByParentId.get(key);
    if (existing) existing.push(quote);
    else quotesByParentId.set(key, [quote]);
  }

  const projectRequestItems: ClientRequestWithQuotes[] = requestRows.map((row) => ({
    source: "project_request",
    id: row.id,
    countryCode: row.countryCode,
    projectType: row.projectType,
    families: row.families,
    unitCount: row.unitCount,
    status: row.status,
    createdAt: row.createdAt,
    deadlineAt: row.deadlineAt,
    closedAt: row.closedAt,
    closedReason: row.closedReason,
    selectedQuoteId: row.selectedQuoteId,
    summaryPublishedAt: row.summaryPublishedAt,
    quotes: quotesByParentId.get(row.id) ?? [],
  }));
  const bulkInquiryItems: ClientRequestWithQuotes[] = bulkRows.map((row) => ({
    source: "bulk_product_inquiry",
    id: row.id,
    productId: row.productId,
    productName: row.productName ?? "",
    countryCode: row.countryCode,
    unitCount: row.unitCount,
    status: row.status,
    createdAt: row.createdAt,
    deadlineAt: row.deadlineAt,
    closedAt: row.closedAt,
    closedReason: row.closedReason,
    selectedQuoteId: row.selectedQuoteId,
    summaryPublishedAt: row.summaryPublishedAt,
    quotes: quotesByParentId.get(row.id) ?? [],
  }));

  return [...projectRequestItems, ...bulkInquiryItems].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export interface ProductForAdmin {
  id: string;
  name: string;
  producerName: string;
  photoCount: number;
}

// Zasila /internal/products (spec 0031 AC-2, AC-9): każdy produkt razem z
// liczbą aktywnych wierszy document (purpose product_photo), żeby administrator
// widział od razu, który produkt nadal jest wyłącznie na fallbacku
// coverImageUrl (photoCount 0, AC-8).
export async function getAllProductsForAdmin(): Promise<ProductForAdmin[]> {
  const photoCounts = await db
    .select({ productId: document.productId, count: sql<number>`count(*)::int` })
    .from(document)
    .where(and(eq(document.purpose, "product_photo"), isNull(document.deletedAt)))
    .groupBy(document.productId);
  const countByProductId = new Map(
    photoCounts.filter((row) => row.productId !== null).map((row) => [row.productId as string, row.count]),
  );

  const rows = await db
    .select({ id: product.id, name: product.name, producerName: producer.name })
    .from(product)
    .innerJoin(producer, eq(product.producerId, producer.id))
    .orderBy(product.name);

  return rows.map((row) => ({
    id: row.id,
    name: row.name ?? "",
    producerName: row.producerName,
    photoCount: countByProductId.get(row.id) ?? 0,
  }));
}

// Zasila nagłówek /internal/products/[id]: nazwa produktu i producenta, bez
// reszty pól Project (getProjectById niesie więcej, niż ten ekran potrzebuje).
export async function getProductForAdmin(productId: string): Promise<{ id: string; name: string; producerName: string } | null> {
  const [row] = await db
    .select({ id: product.id, name: product.name, producerName: producer.name })
    .from(product)
    .innerJoin(producer, eq(product.producerId, producer.id))
    .where(eq(product.id, productId));
  return row ? { id: row.id, name: row.name ?? "", producerName: row.producerName } : null;
}

export interface ProductPhotoForAdmin {
  id: string;
  url: string;
  filename: string;
  isCover: boolean;
  sortOrder: number | null;
}

// Zasila /internal/products/[id] (spec 0031 AC-2, AC-4, AC-5, AC-6): galeria
// posortowana tak samo jak strona klienta (sortOrder rosnąco, brak na końcu).
export async function getProductPhotosForAdmin(productId: string): Promise<ProductPhotoForAdmin[]> {
  const rows = await db
    .select({
      id: document.id,
      r2Key: document.r2Key,
      filename: document.filename,
      isCover: document.isCover,
      sortOrder: document.sortOrder,
    })
    .from(document)
    .where(
      and(eq(document.productId, productId), eq(document.purpose, "product_photo"), isNull(document.deletedAt)),
    );

  return rows
    .map((row) => ({
      id: row.id,
      url: buildPublicUrl(row.r2Key),
      filename: row.filename,
      isCover: row.isCover,
      sortOrder: row.sortOrder,
    }))
    .sort((a, b) => (a.sortOrder ?? Number.MAX_SAFE_INTEGER) - (b.sortOrder ?? Number.MAX_SAFE_INTEGER));
}

export interface ProductFloorPlanForEdit {
  id: string;
  url: string;
  filename: string;
  productVariantId: string | null;
  sortOrder: number | null;
}

// Zasila krok "Pliki" kreatora (spec 0045 AC-7, Build plan zadanie 8): ten sam
// wzorzec co getProductPhotosForAdmin wyżej, purpose="product_floor_plan"
// zamiast "product_photo". productVariantId puste = rzut dotyczy wszystkich
// wariantów produktu (spec 0041 Feature design).
export async function getProductFloorPlansForAdmin(productId: string): Promise<ProductFloorPlanForEdit[]> {
  const rows = await db
    .select({
      id: document.id,
      r2Key: document.r2Key,
      filename: document.filename,
      productVariantId: document.productVariantId,
      sortOrder: document.sortOrder,
    })
    .from(document)
    .where(
      and(
        eq(document.productId, productId),
        eq(document.purpose, "product_floor_plan"),
        isNull(document.deletedAt),
      ),
    );

  return rows
    .map((row) => ({
      id: row.id,
      url: buildPublicUrl(row.r2Key),
      filename: row.filename,
      productVariantId: row.productVariantId,
      sortOrder: row.sortOrder,
    }))
    .sort((a, b) => (a.sortOrder ?? Number.MAX_SAFE_INTEGER) - (b.sortOrder ?? Number.MAX_SAFE_INTEGER));
}

export interface ProductSpecificationPdfForEdit {
  id: string;
  url: string;
  filename: string;
}

// Zasila krok "Pliki" kreatora (spec 0049 AC-6, AC-7, AC-8): jeden plik na
// produkt, nie tablica jak zdjęcia/rzuty — document_one_specification_per_product
// (lib/db/schema.ts) gwarantuje najwyżej jeden aktywny wiersz.
export async function getProductSpecificationPdfForAdmin(productId: string): Promise<ProductSpecificationPdfForEdit | null> {
  const [row] = await db
    .select({ id: document.id, r2Key: document.r2Key, filename: document.filename })
    .from(document)
    .where(
      and(
        eq(document.productId, productId),
        eq(document.purpose, "product_specification"),
        isNull(document.deletedAt),
      ),
    );

  return row ? { id: row.id, url: buildPublicUrl(row.r2Key), filename: row.filename } : null;
}

export interface ProductSalesPdfForEdit {
  id: string;
  url: string;
  filename: string;
}

// Zasila krok "Pliki" kreatora (spec 0050 AC-25, AC-26), ten sam wzorzec co
// getProductSpecificationPdfForAdmin wyżej — document_one_sales_pdf_per_product
// gwarantuje najwyżej jeden aktywny wiersz.
export async function getProductSalesPdfForAdmin(productId: string): Promise<ProductSalesPdfForEdit | null> {
  const [row] = await db
    .select({ id: document.id, r2Key: document.r2Key, filename: document.filename })
    .from(document)
    .where(and(eq(document.productId, productId), eq(document.purpose, "product_sales_pdf"), isNull(document.deletedAt)));

  return row ? { id: row.id, url: buildPublicUrl(row.r2Key), filename: row.filename } : null;
}

// ---------------------------------------------------------------------------
// Zapytanie -> oferta -> zamówienie (spec 0033)
// ---------------------------------------------------------------------------

export interface OfferSummary {
  id: string;
  status: (typeof offer.$inferSelect)["status"];
  transportPriceCents: number;
  installationPriceCents: number;
  submittedAt: Date;
  items: { productId: string; productName: string; housePriceCents: number }[];
}

// Zbiera offer_item per offerId dla podanego zestawu ofert w jednym
// zapytaniu, żeby getInquiryDetailForProducer/Client nie wykonywały N+1
// dodatkowych zapytań przy kilku ofertach naraz.
async function attachOfferItems(
  offerRows: Omit<OfferSummary, "items">[],
): Promise<OfferSummary[]> {
  if (offerRows.length === 0) return [];
  const offerIds = offerRows.map((row) => row.id);
  const itemRows = await db
    .select({ offerId: offerItem.offerId, productId: offerItem.productId, productName: product.name, housePriceCents: offerItem.housePriceCents })
    .from(offerItem)
    .innerJoin(product, eq(product.id, offerItem.productId))
    .where(inArray(offerItem.offerId, offerIds));

  const itemsByOfferId = new Map<string, OfferSummary["items"]>();
  for (const row of itemRows) {
    const entry = itemsByOfferId.get(row.offerId) ?? [];
    entry.push({ productId: row.productId, productName: row.productName ?? "", housePriceCents: row.housePriceCents });
    itemsByOfferId.set(row.offerId, entry);
  }

  return offerRows.map((row) => ({ ...row, items: itemsByOfferId.get(row.id) ?? [] }));
}

export interface ProducerInquiryDetail {
  id: string;
  name: string;
  email: string;
  phone: string;
  deliveryCountryCode: string;
  status: (typeof inquiry.$inferSelect)["status"];
  receivedAt: Date;
  // Wyłącznie własne produkty producenta w tym zapytaniu (spec 0033 AC-13).
  items: { productId: string; productName: string; available: boolean }[];
  // Własne oferty producenta na to zapytanie, najnowsza pierwsza (spec 0033
  // Build plan zadanie 2: "aktualna/poprzednie oferty").
  offers: OfferSummary[];
}

// Zasila /producer/panel/inquiries/[id] (spec 0033 AC-1, AC-13): zwraca null
// zarówno gdy zapytania nie ma, jak i gdy producent nie ma w nim żadnego
// własnego produktu — wywołujący nie rozróżnia tych dwóch przypadków, ten sam
// przekaz co getProducerProductForEdit (spec 0032 AC-13).
export async function getInquiryDetailForProducer(
  inquiryId: string,
  producerId: string,
): Promise<ProducerInquiryDetail | null> {
  const [inquiryRow] = await db
    .select({
      id: inquiry.id,
      name: inquiry.name,
      email: inquiry.email,
      phone: inquiry.phone,
      deliveryCountryCode: inquiry.deliveryCountryCode,
      status: inquiry.status,
      receivedAt: inquiry.receivedAt,
    })
    .from(inquiry)
    .where(and(eq(inquiry.id, inquiryId), eq(inquiry.stage, LEGACY_STAGE)));
  if (!inquiryRow) return null;

  const itemRows = await db
    .select({ productId: product.id, productName: product.name, status: product.status, deletedAt: product.deletedAt })
    .from(inquiryItem)
    .innerJoin(product, and(eq(product.id, inquiryItem.productId), eq(product.producerId, producerId)))
    .where(eq(inquiryItem.inquiryId, inquiryId));
  if (itemRows.length === 0) return null;

  const offerRows = await db
    .select({
      id: offer.id,
      status: offer.status,
      transportPriceCents: offer.transportPriceCents,
      installationPriceCents: offer.installationPriceCents,
      submittedAt: offer.submittedAt,
    })
    .from(offer)
    .where(and(eq(offer.inquiryId, inquiryId), eq(offer.producerId, producerId)))
    .orderBy(desc(offer.submittedAt));

  return {
    id: inquiryRow.id,
    name: inquiryRow.name,
    email: inquiryRow.email,
    phone: inquiryRow.phone,
    deliveryCountryCode: inquiryRow.deliveryCountryCode,
    status: inquiryRow.status,
    receivedAt: inquiryRow.receivedAt,
    items: itemRows.map((row) => ({
      productId: row.productId,
      productName: row.productName ?? "",
      available: row.status === "published" && row.deletedAt === null,
    })),
    offers: await attachOfferItems(offerRows),
  };
}

export interface ClientOfferSummary extends OfferSummary {
  producerId: string;
  producerName: string;
  clientViewedAt: Date | null;
}

export interface ClientInquiryDetail {
  id: string;
  name: string;
  email: string;
  phone: string;
  deliveryCountryCode: string;
  status: (typeof inquiry.$inferSelect)["status"];
  receivedAt: Date;
  productNames: string[];
  offers: ClientOfferSummary[];
}

// Zasila /klient/panel/zapytania/[id] (spec 0033 AC-6, AC-14): wszystkie
// oferty złożone na to zapytanie, od dowolnego producenta. null zarówno gdy
// zapytania nie ma, jak i gdy nie należy do tego klienta (AC-14).
export async function getInquiryDetailForClient(
  inquiryId: string,
  clientId: string,
): Promise<ClientInquiryDetail | null> {
  const [inquiryRow] = await db
    .select({
      id: inquiry.id,
      name: inquiry.name,
      email: inquiry.email,
      phone: inquiry.phone,
      deliveryCountryCode: inquiry.deliveryCountryCode,
      status: inquiry.status,
      receivedAt: inquiry.receivedAt,
      stage: inquiry.stage,
    })
    .from(inquiry)
    .where(and(eq(inquiry.id, inquiryId), eq(inquiry.clientId, clientId)));
  if (!inquiryRow) return null;

  const productRows = await db
    .select({ productName: product.name })
    .from(inquiryItem)
    .innerJoin(product, eq(product.id, inquiryItem.productId))
    .where(eq(inquiryItem.inquiryId, inquiryId));

  // Oferty sprawy nowego przepływu (w kontroli, nieopublikowane) nie mogą
  // trafić na stary ekran klienta (spec 0048 AC-23); nowy widok sprawy
  // przychodzi z krokiem 4 i porównaniem z krokiem 11.
  const offerRows =
    inquiryRow.stage !== LEGACY_STAGE
      ? []
      : await db
          .select({
            id: offer.id,
            producerId: offer.producerId,
            producerName: producer.name,
            status: offer.status,
            transportPriceCents: offer.transportPriceCents,
            installationPriceCents: offer.installationPriceCents,
            submittedAt: offer.submittedAt,
            clientViewedAt: offer.clientViewedAt,
          })
          .from(offer)
          .innerJoin(producer, eq(producer.id, offer.producerId))
          .where(eq(offer.inquiryId, inquiryId))
          .orderBy(desc(offer.submittedAt));

  const offersWithItems = await attachOfferItems(offerRows);
  const offers: ClientOfferSummary[] = offersWithItems.map((offerWithItems, index) => ({
    ...offerWithItems,
    producerId: offerRows[index].producerId,
    producerName: offerRows[index].producerName,
    clientViewedAt: offerRows[index].clientViewedAt,
  }));

  return {
    id: inquiryRow.id,
    name: inquiryRow.name,
    email: inquiryRow.email,
    phone: inquiryRow.phone,
    deliveryCountryCode: inquiryRow.deliveryCountryCode,
    status: inquiryRow.status,
    receivedAt: inquiryRow.receivedAt,
    productNames: productRows.map((row) => row.productName ?? ""),
    offers,
  };
}

// Zbiorczy sygnał nieprzeczytane przy odnośniku "Zapytania" (spec 0033
// AC-11): zbiór id zapytań z co najmniej jedną aktywną, jeszcze nieobejrzaną
// ofertą tego klienta.
export async function getUnreadOfferInquiryIds(clientId: string): Promise<Set<string>> {
  const rows = await db
    .select({ inquiryId: offer.inquiryId })
    .from(offer)
    .innerJoin(inquiry, eq(inquiry.id, offer.inquiryId))
    .where(
      and(
        eq(inquiry.clientId, clientId),
        eq(inquiry.stage, LEGACY_STAGE),
        eq(offer.status, "active"),
        isNull(offer.clientViewedAt),
      ),
    );
  return new Set(rows.map((row) => row.inquiryId));
}

// Symetryczny sygnał po stronie producenta (spec 0033 AC-12): zbiór id
// zapytań, na których klient podjął decyzję (accepted/rejected), jeszcze
// nieobejrzaną przez tego producenta.
export async function getUnreadDecisionInquiryIds(producerId: string): Promise<Set<string>> {
  const rows = await db
    .select({ inquiryId: offer.inquiryId })
    .from(offer)
    .innerJoin(inquiry, eq(inquiry.id, offer.inquiryId))
    .where(
      and(
        eq(offer.producerId, producerId),
        eq(inquiry.stage, LEGACY_STAGE),
        inArray(offer.status, ["accepted", "rejected"]),
        isNull(offer.producerDecisionViewedAt),
      ),
    );
  return new Set(rows.map((row) => row.inquiryId));
}

export interface AdminOfferSummary extends OfferSummary {
  producerName: string;
}

// Zasila szczegóły ofert rozwijane przy wierszu na /internal/inquiries (spec
// 0033 AC-17): wszystkie oferty (dowolny status) pogrupowane po inquiryId, w
// jednym zapytaniu zamiast osobnego na każdy wiersz listy.
export async function getOffersByInquiryIdForAdmin(): Promise<Map<string, AdminOfferSummary[]>> {
  const offerRows = await db
    .select({
      id: offer.id,
      inquiryId: offer.inquiryId,
      producerName: producer.name,
      status: offer.status,
      transportPriceCents: offer.transportPriceCents,
      installationPriceCents: offer.installationPriceCents,
      submittedAt: offer.submittedAt,
    })
    .from(offer)
    .innerJoin(producer, eq(producer.id, offer.producerId))
    .orderBy(desc(offer.submittedAt));

  const offersWithItems = await attachOfferItems(offerRows);
  const byInquiryId = new Map<string, AdminOfferSummary[]>();
  offersWithItems.forEach((offerWithItems, index) => {
    const inquiryId = offerRows[index].inquiryId;
    const entry = byInquiryId.get(inquiryId) ?? [];
    entry.push({ ...offerWithItems, producerName: offerRows[index].producerName });
    byInquiryId.set(inquiryId, entry);
  });
  return byInquiryId;
}

// ---------------------------------------------------------------------------
// Duże zamówienia w panelu admina (spec 0070 część A, AC-1, AC-2). Admin widzi
// wszystko: pełny kontakt klienta i wszystkie oferty, także nieopublikowane.
// ---------------------------------------------------------------------------

export const LARGE_ORDERS_PAGE_SIZE = 25;

export type LargeOrderKind = "request" | "product";

export const LARGE_ORDER_STATUSES = ["open", "quoted", "published", "accepted", "closed"] as const;
export type LargeOrderStatus = (typeof LARGE_ORDER_STATUSES)[number];

export interface LargeOrderListItem {
  kind: LargeOrderKind;
  id: string;
  countryCode: string;
  unitCount: number;
  deadlineAt: Date;
  status: LargeOrderStatus;
  quoteCount: number;
  pendingPublicationCount: number;
  createdAt: Date;
  // Nazwa inwestora do pierwszej kolumny: firma klienta, w razie braku imię i
  // nazwisko z zapytania, w ostateczności sam e mail (spec 0070 AC-1). Dla projektu
  // własnego ModularHub (spec 0077 AC-22) to nazwa projektu.
  investorName: string;
  investorEmail: string;
  isPlatformOwned: boolean;
}

// Spec 0077 AC-22: filtr pochodzenia na liście (projekty własne albo zapytania klientów).
export type LargeOrderOrigin = "own" | "client";

export interface LargeOrdersPage {
  items: LargeOrderListItem[];
  totalCount: number;
}

// Jedna lista z dwóch tabel (UNION ALL): identyfikatory są w osobnych
// tabelach, więc wiersz niesie `kind`, a liczniki ofert łączą się po kluczu
// właściwym dla rodzaju. Oferta "czeka na publikację", gdy jest aktywna i nie
// ma jeszcze published_to_client_at (bramka z części B).
export async function getLargeOrdersForAdmin({
  status,
  kind,
  origin,
  page,
}: {
  status?: LargeOrderStatus;
  kind?: LargeOrderKind;
  origin?: LargeOrderOrigin;
  page: number;
}): Promise<LargeOrdersPage> {
  const filters = [
    status ? sql`o.status = ${status}` : undefined,
    kind ? sql`o.kind = ${kind}` : undefined,
    origin ? sql`o.is_platform_owned = ${origin === "own"}` : undefined,
  ].filter((part) => part !== undefined);
  const where = filters.length > 0 ? sql`where ${sql.join(filters, sql` and `)}` : sql``;
  const offset = (Math.max(1, page) - 1) * LARGE_ORDERS_PAGE_SIZE;

  const orders = sql`
    select 'request'::text as kind, pr.id, pr.country_code, pr.unit_count, pr.deadline_at,
           pr.status::text as status, pr.created_at,
           case when pr.is_platform_owned then pr.title
                else coalesce(nullif(trim(c.company_name), ''), nullif(trim(pr.contact_name), ''), pr.contact_email) end as investor_name,
           pr.contact_email as investor_email,
           pr.is_platform_owned
      from project_request pr
      left join client c on c.id = pr.client_id
    union all
    select 'product'::text, b.id, b.delivery_country_code, b.unit_count, b.deadline_at,
           b.status::text, b.created_at,
           coalesce(nullif(trim(c.company_name), ''), nullif(trim(b.contact_name), ''), b.contact_email),
           b.contact_email,
           false
      from bulk_product_inquiry b
      left join client c on c.id = b.client_id`;

  const [countResult, listResult] = await Promise.all([
    db.execute<{ count: number }>(sql`with o as (${orders}) select count(*)::int as count from o ${where}`),
    db.execute<{
      kind: LargeOrderKind;
      id: string;
      country_code: string;
      unit_count: number;
      deadline_at: string | Date;
      status: LargeOrderStatus;
      created_at: string | Date;
      quote_count: number;
      pending_publication_count: number;
      investor_name: string;
      investor_email: string;
      is_platform_owned: boolean;
    }>(sql`
      with o as (${orders})
      select o.*,
        (select count(*)::int from project_quote q
          where q.status = 'active'
            and ((o.kind = 'request' and q.project_request_id = o.id)
              or (o.kind = 'product' and q.bulk_product_inquiry_id = o.id))) as quote_count,
        (select count(*)::int from project_quote q
          where q.status = 'active' and q.published_to_client_at is null
            and ((o.kind = 'request' and q.project_request_id = o.id)
              or (o.kind = 'product' and q.bulk_product_inquiry_id = o.id))) as pending_publication_count
      from o ${where}
      order by o.created_at desc
      limit ${LARGE_ORDERS_PAGE_SIZE} offset ${offset}`),
  ]);

  return {
    totalCount: countResult.rows[0]?.count ?? 0,
    items: listResult.rows.map((row) => ({
      kind: row.kind,
      id: row.id,
      countryCode: row.country_code,
      unitCount: row.unit_count,
      deadlineAt: new Date(row.deadline_at),
      status: row.status,
      quoteCount: row.quote_count,
      pendingPublicationCount: row.pending_publication_count,
      createdAt: new Date(row.created_at),
      investorName: row.investor_name,
      investorEmail: row.investor_email,
      isPlatformOwned: row.is_platform_owned === true,
    })),
  };
}

export interface LargeOrderQuoteForAdmin {
  id: string;
  // Spec 0077: nazwa wariantu (tylko projekt własny).
  variantLabel: string | null;
  producerId: string;
  producerName: string;
  status: (typeof projectQuote.$inferSelect)["status"];
  currency: string;
  totalPriceCents: number;
  unitPriceCents: number | null;
  proposedLeadTimeWeeks: number | null;
  notes: string | null;
  priceTaxMode: (typeof projectQuote.$inferSelect)["priceTaxMode"];
  vatRatePercent: string | null;
  scopeIncluded: string | null;
  scopeExcluded: string | null;
  logistics: Record<string, unknown>;
  paymentPlan: string | null;
  validUntil: string | null;
  warrantyNote: string | null;
  deliveryWindowFrom: string | null;
  deliveryWindowTo: string | null;
  advisorNote: string | null;
  publishedToClientAt: Date | null;
  contactRevealedAt: Date | null;
  producerOutcome: (typeof projectQuote.$inferSelect)["producerOutcome"];
  submittedAt: Date;
  hasPdf: boolean;
}

export interface LargeOrderDetail {
  kind: LargeOrderKind;
  id: string;
  status: LargeOrderStatus;
  contactName: string;
  contactEmail: string;
  contactPhone: string | null;
  contactLocale: string;
  clientId: string | null;
  countryCode: string;
  countryName: string;
  // Tylko zapytanie wolne (project_request); dla zapytania o produkt null.
  projectType: (typeof projectRequest.$inferSelect)["projectType"] | null;
  families: string[];
  productName: string | null;
  unitCount: number;
  deadlineAt: Date;
  note: string | null;
  createdAt: Date;
  summaryPublishedAt: Date | null;
  selectedAt: Date | null;
  selectedQuoteId: string | null;
  closedAt: Date | null;
  closedReason: (typeof projectRequest.$inferSelect)["closedReason"];
  createdByStaffUserId: string | null;
  // Spec 0077: projekt własny ModularHub, jego nazwa i tymczasowe oznaczenie admina.
  isPlatformOwned: boolean;
  title: string | null;
  platformMarkedQuoteId: string | null;
  // Producenci, którym zakolejkowano mail końcowy (project_notification_log), po nazwie.
  platformSelectionMailed: string[];
  quotes: LargeOrderQuoteForAdmin[];
}

export async function getLargeOrderForAdmin(kind: LargeOrderKind, id: string): Promise<LargeOrderDetail | null> {
  let base: Omit<LargeOrderDetail, "quotes"> | null = null;

  if (kind === "request") {
    const [row] = await db
      .select({ request: projectRequest, countryName: country.name })
      .from(projectRequest)
      .innerJoin(country, eq(country.code, projectRequest.countryCode))
      .where(eq(projectRequest.id, id));
    if (row) {
      const r = row.request;
      base = {
        kind,
        id: r.id,
        status: r.status,
        contactName: r.contactName,
        contactEmail: r.contactEmail,
        contactPhone: r.contactPhone,
        contactLocale: r.contactLocale,
        clientId: r.clientId,
        countryCode: r.countryCode,
        countryName: row.countryName,
        projectType: r.projectType,
        families: r.families,
        productName: null,
        unitCount: r.unitCount,
        deadlineAt: r.deadlineAt,
        note: r.extrasNote,
        createdAt: r.createdAt,
        summaryPublishedAt: r.summaryPublishedAt,
        selectedAt: r.selectedAt,
        selectedQuoteId: r.selectedQuoteId,
        closedAt: r.closedAt,
        closedReason: r.closedReason,
        createdByStaffUserId: r.createdByStaffUserId,
        isPlatformOwned: r.isPlatformOwned,
        title: r.title,
        platformMarkedQuoteId: r.platformMarkedQuoteId,
        platformSelectionMailed: [],
      };
    }
  } else {
    const [row] = await db
      .select({ inquiry: bulkProductInquiry, countryName: country.name, productName: product.name })
      .from(bulkProductInquiry)
      .innerJoin(country, eq(country.code, bulkProductInquiry.deliveryCountryCode))
      .innerJoin(product, eq(product.id, bulkProductInquiry.productId))
      .where(eq(bulkProductInquiry.id, id));
    if (row) {
      const r = row.inquiry;
      base = {
        kind,
        id: r.id,
        status: r.status,
        contactName: r.contactName,
        contactEmail: r.contactEmail,
        contactPhone: r.contactPhone,
        contactLocale: r.contactLocale,
        clientId: r.clientId,
        countryCode: r.deliveryCountryCode,
        countryName: row.countryName,
        projectType: null,
        families: [],
        productName: row.productName,
        unitCount: r.unitCount,
        deadlineAt: r.deadlineAt,
        note: r.note,
        createdAt: r.createdAt,
        summaryPublishedAt: r.summaryPublishedAt,
        selectedAt: r.selectedAt,
        selectedQuoteId: r.selectedQuoteId,
        closedAt: r.closedAt,
        closedReason: r.closedReason,
        createdByStaffUserId: r.createdByStaffUserId,
        isPlatformOwned: false,
        title: null,
        platformMarkedQuoteId: null,
        platformSelectionMailed: [],
      };
    }
  }
  if (!base) return null;

  if (base.isPlatformOwned) {
    const mailed = await db
      .select({ name: producer.name })
      .from(projectNotificationLog)
      .innerJoin(producer, eq(producer.id, projectNotificationLog.producerId))
      .where(and(eq(projectNotificationLog.projectRequestId, id), eq(projectNotificationLog.kind, "platform_selection_done")))
      .orderBy(asc(producer.name));
    base.platformSelectionMailed = mailed.map((row) => row.name);
  }

  const quoteRows = await db
    .select({
      quote: projectQuote,
      producerName: producer.name,
      hasPdf: sql<boolean>`exists (select 1 from ${document} d where d.project_quote_id = ${projectQuote.id} and d.purpose = 'project_quote_pdf' and d.deleted_at is null)`,
    })
    .from(projectQuote)
    .innerJoin(producer, eq(producer.id, projectQuote.producerId))
    .where(kind === "request" ? eq(projectQuote.projectRequestId, id) : eq(projectQuote.bulkProductInquiryId, id))
    .orderBy(desc(projectQuote.submittedAt));

  return {
    ...base,
    quotes: quoteRows.map(({ quote: q, producerName, hasPdf }) => ({
      id: q.id,
      variantLabel: q.variantLabel,
      producerId: q.producerId,
      producerName,
      status: q.status,
      currency: q.currency,
      totalPriceCents: q.totalPriceCents,
      unitPriceCents: q.unitPriceCents,
      proposedLeadTimeWeeks: q.proposedLeadTimeWeeks,
      notes: q.notes,
      priceTaxMode: q.priceTaxMode,
      vatRatePercent: q.vatRatePercent,
      scopeIncluded: q.scopeIncluded,
      scopeExcluded: q.scopeExcluded,
      logistics: q.logistics,
      paymentPlan: q.paymentPlan,
      validUntil: q.validUntil,
      warrantyNote: q.warrantyNote,
      deliveryWindowFrom: q.deliveryWindowFrom,
      deliveryWindowTo: q.deliveryWindowTo,
      advisorNote: q.advisorNote,
      publishedToClientAt: q.publishedToClientAt,
      contactRevealedAt: q.contactRevealedAt,
      producerOutcome: q.producerOutcome,
      submittedAt: q.submittedAt,
      hasPdf,
    })),
  };
}

// ---------------------------------------------------------------------------
// Zatwierdzenia dla admina (spec 0070 część A, AC-3, AC-4).
// ---------------------------------------------------------------------------

export interface ProducerVolumeVerificationItem {
  producerId: string;
  name: string;
  countryName: string;
  status: (typeof producerCapacityProfile.$inferSelect)["volumeVerificationStatus"];
  unitsPerMonth: number | null;
  productionLines: number | null;
  maxModuleSizeM2: number | null;
  completionStandardsSupported: string[];
  canHandleTransport: boolean;
  canHandleAssembly: boolean;
  capabilityNote: string | null;
  pastProjectReferences: string[];
  deliveryCountryCodes: string[];
  // Pola, których brak admin widzi jako ostrzeżenie przy decyzji.
  missingFields: string[];
}

// Lista profili zdolności w danym statusie (domyślnie 'pending'), z profilem
// obok przycisków decyzji. Zatwierdzenie bez pełnego profilu jest możliwe, ale
// missingFields pokazuje, czego brakuje.
export async function getProducersForVolumeVerification(
  status: (typeof producerCapacityProfile.$inferSelect)["volumeVerificationStatus"] = "pending",
): Promise<ProducerVolumeVerificationItem[]> {
  const rows = await db
    .select({
      producerId: producer.id,
      name: producer.name,
      countryName: country.name,
      profile: producerCapacityProfile,
    })
    .from(producerCapacityProfile)
    .innerJoin(producer, eq(producer.id, producerCapacityProfile.producerId))
    .innerJoin(country, eq(country.code, producer.countryCode))
    .where(eq(producerCapacityProfile.volumeVerificationStatus, status))
    .orderBy(asc(producer.name));
  if (rows.length === 0) return [];

  const countryRows = await db
    .select({ producerId: producerDeliveryCountry.producerId, countryCode: producerDeliveryCountry.countryCode })
    .from(producerDeliveryCountry)
    .where(
      inArray(
        producerDeliveryCountry.producerId,
        rows.map((row) => row.producerId),
      ),
    );

  return rows.map(({ producerId, name, countryName, profile }) => {
    const deliveryCountryCodes = countryRows
      .filter((row) => row.producerId === producerId)
      .map((row) => row.countryCode)
      .sort();
    const missingFields: string[] = [];
    if (deliveryCountryCodes.length === 0) missingFields.push("kraje dostawy");
    if (profile.unitsPerMonth === null) missingFields.push("jednostek na miesiąc");
    if (profile.productionLines === null) missingFields.push("linie produkcyjne");
    if (profile.completionStandardsSupported.length === 0) missingFields.push("standardy wykończenia");
    return {
      producerId,
      name,
      countryName,
      status: profile.volumeVerificationStatus,
      unitsPerMonth: profile.unitsPerMonth,
      productionLines: profile.productionLines,
      maxModuleSizeM2: profile.maxModuleSizeM2,
      completionStandardsSupported: profile.completionStandardsSupported,
      canHandleTransport: profile.canHandleTransport,
      canHandleAssembly: profile.canHandleAssembly,
      capabilityNote: profile.capabilityNote,
      pastProjectReferences: profile.pastProjectReferences,
      deliveryCountryCodes,
      missingFields,
    };
  });
}

export interface ClientB2bVerificationItem {
  clientId: string;
  name: string | null;
  email: string;
  // Telefon z konta, żeby zespół mógł od razu zadzwonić przy weryfikacji.
  phone: string;
  nip: string | null;
  companyName: string | null;
  status: (typeof client.$inferSelect)["b2bVerificationStatus"];
}

export async function getClientsForB2bVerification(
  status: (typeof client.$inferSelect)["b2bVerificationStatus"] = "pending",
): Promise<ClientB2bVerificationItem[]> {
  return db
    .select({
      clientId: client.id,
      name: users.name,
      email: users.email,
      phone: users.phone,
      nip: client.nip,
      companyName: client.companyName,
      status: client.b2bVerificationStatus,
    })
    .from(client)
    .innerJoin(users, eq(users.id, client.userId))
    .where(eq(client.b2bVerificationStatus, status))
    .orderBy(asc(users.email));
}

export interface CountryOption {
  code: string;
  name: string;
}

// Lista krajów do wyboru krajów dostawy (spec 0070 AC-5), z tabeli country.
export async function getAllCountries(): Promise<CountryOption[]> {
  // Spec 0075 AC-8: BE, IT i FR są w słowniku tylko dla ocen zgodności, nie jako
  // kraje dostawy, więc wybierajki krajów dostawy ich nie pokazują.
  return db
    .select({ code: country.code, name: country.name })
    .from(country)
    .where(notInArray(country.code, [...COMPLIANCE_ONLY_COUNTRY_CODES]))
    .orderBy(asc(country.name));
}

export interface ProducerCapacityProfileForPanel {
  unitsPerMonth: number | null;
  productionLines: number | null;
  leadTimeTiers: { units: number; weeks: number }[];
  maxModuleSizeM2: number | null;
  completionStandardsSupported: string[];
  canCustomizeClientDesign: boolean;
  customizationNote: string | null;
  canHandleTransport: boolean;
  canHandleAssembly: boolean;
  capabilityNote: string | null;
  pastProjectReferences: string[];
  volumeVerificationStatus: (typeof producerCapacityProfile.$inferSelect)["volumeVerificationStatus"];
  deliveryCountryCodes: string[];
}

// Profil zdolności do formularza w panelu producenta (spec 0070 AC-5). Brak
// wiersza to profil jeszcze niezłożony (status not_submitted, puste pola).
export async function getProducerCapacityProfileForPanel(producerId: string): Promise<ProducerCapacityProfileForPanel> {
  const [[profile], countryRows] = await Promise.all([
    db.select().from(producerCapacityProfile).where(eq(producerCapacityProfile.producerId, producerId)),
    db
      .select({ code: producerDeliveryCountry.countryCode })
      .from(producerDeliveryCountry)
      .where(eq(producerDeliveryCountry.producerId, producerId)),
  ]);
  return {
    unitsPerMonth: profile?.unitsPerMonth ?? null,
    productionLines: profile?.productionLines ?? null,
    leadTimeTiers: profile?.leadTimeTiers ?? [],
    maxModuleSizeM2: profile?.maxModuleSizeM2 ?? null,
    completionStandardsSupported: profile?.completionStandardsSupported ?? [],
    canCustomizeClientDesign: profile?.canCustomizeClientDesign ?? false,
    customizationNote: profile?.customizationNote ?? null,
    canHandleTransport: profile?.canHandleTransport ?? false,
    canHandleAssembly: profile?.canHandleAssembly ?? false,
    capabilityNote: profile?.capabilityNote ?? null,
    pastProjectReferences: profile?.pastProjectReferences ?? [],
    volumeVerificationStatus: profile?.volumeVerificationStatus ?? "not_submitted",
    deliveryCountryCodes: countryRows.map((row) => row.code).sort(),
  };
}

export interface ClientB2bDetails {
  nip: string | null;
  companyName: string | null;
  status: (typeof client.$inferSelect)["b2bVerificationStatus"];
}

// Sekcja danych firmy w /panel/profile (spec 0070 AC-6).
export async function getClientB2bDetails(userId: string): Promise<ClientB2bDetails | null> {
  const [row] = await db
    .select({ nip: client.nip, companyName: client.companyName, status: client.b2bVerificationStatus })
    .from(client)
    .where(eq(client.userId, userId));
  return row ?? null;
}

export interface PublishedProductOption {
  id: string;
  name: string;
  producerName: string;
}

// Spec 0070 AC-20: lista opublikowanych produktów do wyboru w formularzu "Złóż zapytanie
// w imieniu klienta" (zapytanie o konkretny produkt). Tylko `published` i nieusunięte,
// tak jak sprawdza to submitBulkProductInquiry.
export async function getPublishedProductOptionsForAdmin(): Promise<PublishedProductOption[]> {
  const rows = await db
    .select({ id: product.id, name: product.name, producerName: producer.name })
    .from(product)
    .innerJoin(producer, eq(product.producerId, producer.id))
    .where(and(eq(product.status, "published"), isNull(product.deletedAt)))
    .orderBy(producer.name, product.name);
  return rows.map((row) => ({ id: row.id, name: row.name ?? "", producerName: row.producerName }));
}

export interface PlatformProjectProducerOption {
  id: string;
  name: string;
  countryCode: string;
}

// Spec 0077 AC-7: producenci do wskazania jako odbiorcy projektu własnego. Bez usuniętych.
// Zablokowanych członków pomija dopiero zapis (createPlatformProject pokazuje listę pominiętych).
export async function getProducersForPlatformProject(): Promise<PlatformProjectProducerOption[]> {
  return db
    .select({ id: producer.id, name: producer.name, countryCode: producer.countryCode })
    .from(producer)
    .where(isNull(producer.deletedAt))
    .orderBy(asc(producer.name));
}
