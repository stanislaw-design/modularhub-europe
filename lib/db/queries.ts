import { and, asc, desc, eq, ilike, inArray, isNull, sql } from "drizzle-orm";
import { db } from "./client";
import { buildPublicUrl } from "@/lib/storage/r2-client";
import {
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
  producerDeliveryCountry,
  producerMember,
  product,
  productCountryEligibility,
  productFamilyEnum,
  productTimelineStage,
  productTranslation,
  productVariant,
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
    deliveryCountries,
  };
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
