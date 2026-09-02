import { eq, sql } from "drizzle-orm";
import { db } from "./client";
import { product, productFamilyEnum } from "./schema";

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
