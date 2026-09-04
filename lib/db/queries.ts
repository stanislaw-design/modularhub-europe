import { desc, eq, sql } from "drizzle-orm";
import { db } from "./client";
import { client, favorite, inquiry, inquiryItem, product, productFamilyEnum } from "./schema";

// Wzorzec autoryzacji na poziomie aplikacji (spec 0018, AC-5): każde
// zapytanie filtruje po producer_id/client_id/user_id uwierzytelnionego
// konta, nie przez Row Level Security.
export async function getProductsForProducer(producerId: string) {
  return db.select().from(product).where(eq(product.producerId, producerId));
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
