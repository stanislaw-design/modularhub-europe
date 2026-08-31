import { eq } from "drizzle-orm";
import { db } from "./client";
import { product } from "./schema";

// Wzorzec autoryzacji na poziomie aplikacji (spec 0018, AC-5): każde
// zapytanie filtruje po producer_id/client_id/user_id uwierzytelnionego
// konta, nie przez Row Level Security.
export async function getProductsForProducer(producerId: string) {
  return db.select().from(product).where(eq(product.producerId, producerId));
}
