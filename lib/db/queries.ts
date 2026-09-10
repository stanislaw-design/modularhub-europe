import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { db } from "./client";
import { buildPublicUrl } from "@/lib/storage/r2-client";
import {
  client,
  country,
  document,
  favorite,
  inquiry,
  inquiryItem,
  producer,
  producerDeliveryCountry,
  product,
  productFamilyEnum,
  productTranslation,
} from "./schema";

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

// producer.id wyprowadzone z sesji (session.user.id -> producer.userId), nigdy z
// identyfikatora podanego przez przeglądarkę (spec 0032 AC-13), mirror
// getClientIdForUser (spec 0024 AC-10).
export async function getProducerIdForUser(userId: string): Promise<string | null> {
  const [row] = await db.select({ id: producer.id }).from(producer).where(eq(producer.userId, userId));
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
  pergolaSubcategory: (typeof product.$inferSelect)["pergolaSubcategory"];
  floorAreaM2: number | null;
  bedrooms: number | null;
  countryOfProduction: string | null;
  description: string | null;
  technicalSpecs: unknown;
  housePriceMinCents: number | null;
  housePriceMaxCents: number | null;
  completionStandard: (typeof product.$inferSelect)["completionStandard"];
  productionLeadTimeWeeksMin: number | null;
  productionLeadTimeWeeksMax: number | null;
  onSiteAssemblyDaysMin: number | null;
  onSiteAssemblyDaysMax: number | null;
  structuralWarrantyYears: number | null;
  nameEn: string | null;
  nameNl: string | null;
  descriptionEn: string | null;
  descriptionNl: string | null;
}

// Zasila /producent/panel/produkty/[id]/edytuj (spec 0032 AC-5, AC-13): null
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
    .select({ locale: productTranslation.locale, name: productTranslation.name, description: productTranslation.description })
    .from(productTranslation)
    .where(eq(productTranslation.productId, productId));
  const en = translations.find((translation) => translation.locale === "en");
  const nl = translations.find((translation) => translation.locale === "nl");

  return {
    id: row.id,
    producerId: row.producerId,
    status: row.status,
    name: row.name ?? "",
    family: row.family,
    category: row.category,
    spaSubcategory: row.spaSubcategory,
    pergolaSubcategory: row.pergolaSubcategory,
    floorAreaM2: row.floorAreaM2,
    bedrooms: row.bedrooms,
    countryOfProduction: row.countryOfProduction,
    description: row.description,
    technicalSpecs: row.technicalSpecs,
    housePriceMinCents: row.housePriceMinCents,
    housePriceMaxCents: row.housePriceMaxCents,
    completionStandard: row.completionStandard,
    productionLeadTimeWeeksMin: row.productionLeadTimeWeeksMin,
    productionLeadTimeWeeksMax: row.productionLeadTimeWeeksMax,
    onSiteAssemblyDaysMin: row.onSiteAssemblyDaysMin,
    onSiteAssemblyDaysMax: row.onSiteAssemblyDaysMax,
    structuralWarrantyYears: row.structuralWarrantyYears,
    nameEn: en?.name ?? null,
    nameNl: nl?.name ?? null,
    descriptionEn: en?.description ?? null,
    descriptionNl: nl?.description ?? null,
  };
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
  const subcategory = sql<string | null>`coalesce(${product.category}::text, ${product.spaSubcategory}::text, ${product.pergolaSubcategory}::text)`;

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

// Zasila prosty widok wewnętrzny /internal/zapytania (spec 0023 AC-9), tylko
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
    .where(eq(inquiry.clientId, clientId))
    .orderBy(desc(inquiry.receivedAt));

  return groupInquiryRows(rows);
}

// Zasila /producent/panel/zapytania (spec 0032 AC-8): innerJoin na product z
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

export interface ProductForAdmin {
  id: string;
  name: string;
  producerName: string;
  photoCount: number;
}

// Zasila /internal/produkty (spec 0031 AC-2, AC-9): każdy produkt razem z
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

// Zasila nagłówek /internal/produkty/[id]: nazwa produktu i producenta, bez
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

// Zasila /internal/produkty/[id] (spec 0031 AC-2, AC-4, AC-5, AC-6): galeria
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
