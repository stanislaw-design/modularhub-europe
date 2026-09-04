"use server";

import { and, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/lib/db/client";
import { favorite } from "@/lib/db/schema";
import { getClientIdForUser } from "@/lib/db/queries";
import { trackEvent } from "@/lib/observability";

export interface ToggleFavoriteResult {
  ok: boolean;
  favorited?: boolean;
  error?: string;
}

// Przyjmuje docelowy stan (favorited), wyprowadzony z tego, co przeglądarka
// aktualnie pokazuje, nie sprawdza-potem-zapisuje (spec 0024 Key invariants):
// dwa identyczne wywołania z rzędu (podwójny klik, ponów po błędzie) nigdy nie
// rzucają błędu ani nie tworzą duplikatu. Zawsze powiązane z client.id
// wyprowadzonym z sesji, ten sam wzorzec co submitInquiry (spec 0023).
export async function toggleFavorite(
  productId: string,
  favorited: boolean
): Promise<ToggleFavoriteResult> {
  const session = await auth();
  if (!session || session.user.role !== "client") {
    return { ok: false, error: "Musisz być zalogowany jako klient, żeby zapisać ulubione." };
  }

  const clientId = await getClientIdForUser(session.user.id);
  if (!clientId) {
    return { ok: false, error: "Nie znaleziono konta klienta." };
  }

  try {
    if (favorited) {
      await db
        .insert(favorite)
        .values({ clientId, productId })
        .onConflictDoNothing();
      trackEvent("product_favorited", { productId }, session.user.id);
    } else {
      await db
        .delete(favorite)
        .where(and(eq(favorite.clientId, clientId), eq(favorite.productId, productId)));
    }
    return { ok: true, favorited };
  } catch {
    return { ok: false, error: "Nie udało się zapisać zmiany. Spróbuj ponownie." };
  }
}
