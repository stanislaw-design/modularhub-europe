import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { bulkProductInquiry, projectRequest } from "@/lib/db/schema";
import { withAdminActor } from "@/lib/db/with-admin-actor";
import { notifyProducersOfClosedRequest } from "@/lib/notifications/large-order-producer";

// Bez "use server": wspólna funkcja zamykająca wołana tylko z innych akcji
// (closeRequest dla administratora, cancelRequest dla klienta), nigdy z przeglądarki.
// Spec 0070 AC-19, AC-37: ten sam zapis i ta sama neutralna informacja dla producentów
// bez względu na to, kto zamknął zapytanie.

export type LargeOrderKind = "request" | "product";
export type LargeOrderCloseReason = "client_cancelled" | "no_offers" | "expired" | "staff_closed";
type OpenStatus = "open" | "quoted" | "published" | "accepted";

interface CloseLargeOrderInput {
  kind: LargeOrderKind;
  id: string;
  reason: LargeOrderCloseReason;
  // Statusy, z których wolno zamknąć. Warunek jest w samym SQL, więc powtórne kliknięcie
  // albo wyścig z publikacją lub połączeniem nie zrobi nic drugi raz.
  fromStatuses: readonly OpenStatus[];
  // Klient zamyka tylko własne zapytanie (warunek właściciela w SQL).
  clientId?: string;
  // Administrator zamyka przez withAdminActor (dziennik audytu, AC-22).
  adminId?: string;
}

// Zwraca true, gdy ta chwila zamknęła zapytanie (wiersz się zmienił). Wtedy producenci
// z aktywną ofertą dostają neutralną informację. false: nic nie zmieniono.
export async function closeLargeOrder(input: CloseLargeOrderInput): Promise<boolean> {
  const table = input.kind === "request" ? projectRequest : bulkProductInquiry;
  const query = db
    .update(table)
    .set({ status: "closed", closedAt: sql`now()`, closedReason: input.reason, updatedAt: sql`now()` })
    .where(
      and(
        eq(table.id, input.id),
        input.clientId ? eq(table.clientId, input.clientId) : undefined,
        inArray(table.status, [...input.fromStatuses]),
      ),
    )
    .returning({ id: table.id });

  const rows = input.adminId ? (await withAdminActor(input.adminId, [query]))[0] : await query;
  if (rows.length === 0) return false;

  await notifyProducersOfClosedRequest({ kind: input.kind, id: input.id });
  return true;
}
