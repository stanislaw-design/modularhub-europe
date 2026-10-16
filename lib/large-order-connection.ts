import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { bulkProductInquiry, client, projectQuote, projectRequest } from "@/lib/db/schema";
import { captureError, trackEvent } from "@/lib/observability";
import { notifyOfConnection } from "@/lib/notifications/large-order-connection";
import { notifyProducersOfOtherSelected } from "@/lib/notifications/large-order-producer";

// Bez "use server": to funkcja serwerowa wołana tylko z innych akcji i z zadania
// czyszczącego, nigdy bezpośrednio z przeglądarki. Gdyby była akcją, każdy mógłby
// wymusić połączenie. Cztery miejsca wołają ją po zapisaniu własnego faktu
// (spec 0070 AC-17): wybór klienta, zatwierdzenie B2B, godzinne zadanie czyszczące
// i przycisk administratora.

export type LargeOrderKind = "request" | "product";

export type ConnectSelectionOutcome =
  // Ta chwila połączyła strony: zapis wykonał się właśnie teraz.
  | "connected"
  // Strony były już połączone wcześniej (powtórne wywołanie, nic nie zmieniono).
  | "already_connected"
  // Wybór istnieje, ale klient nie ma zatwierdzonego B2B: wybór czeka.
  | "pending_b2b"
  // Brak wyboru, zapytanie zamknięte albo wybrana oferta przestała być aktywna.
  | "skipped";

const ACTIVE_STATUSES_SQL = sql`('open', 'quoted', 'published')`;

function tables(kind: LargeOrderKind) {
  return kind === "request"
    ? ({ parent: "project_request", quoteLink: "project_request_id" } as const)
    : ({ parent: "bulk_product_inquiry", quoteLink: "bulk_product_inquiry_id" } as const);
}

// Połączenie stron: jeden db.batch z warunkami w samym SQL (ten sterownik nie ma
// transakcji, patrz lib/db/AGENTS.md). Każdy krok sam sprawdza wybór, B2B i status,
// więc przy równoległym wołaniu z dwóch miejsc wygrywa jedno, a drugie jest bez efektu.
// Maile połączenia wychodzą tylko wtedy, gdy pierwszy krok faktycznie zmienił wiersz,
// czyli najwyżej raz na zapytanie.
export async function connectSelection(kind: LargeOrderKind, id: string): Promise<ConnectSelectionOutcome> {
  const { parent, quoteLink } = tables(kind);
  const parentTable = sql.identifier(parent);
  const link = sql.identifier(quoteLink);

  const results = await db.batch([
    // 1. Wybrana oferta: accepted i ujawnienie kontaktu w jednej operacji (spec 0062 AC-7).
    db.execute(sql`
      UPDATE "project_quote" q SET "status" = 'accepted', "contact_revealed_at" = now()
      WHERE q."status" = 'active' AND q."published_to_client_at" IS NOT NULL
        AND EXISTS (
          SELECT 1 FROM ${parentTable} r
          INNER JOIN "client" c ON c."id" = r."client_id"
          WHERE r."id" = ${id} AND r."selected_quote_id" = q."id"
            AND r."status" IN ${ACTIVE_STATUSES_SQL}
            AND c."b2b_verification_status" = 'approved'
        )
    `),
    // 2. Pozostałe aktywne oferty tego zapytania: rejected, ale tylko gdy krok 1 zadziałał
    // (wybrana oferta jest już accepted).
    db.execute(sql`
      UPDATE "project_quote" o SET "status" = 'rejected'
      WHERE o.${link} = ${id} AND o."status" = 'active'
        AND EXISTS (
          SELECT 1 FROM "project_quote" w
          WHERE w.${link} = ${id} AND w."status" = 'accepted' AND w."contact_revealed_at" IS NOT NULL
            AND w."id" = (SELECT p."selected_quote_id" FROM ${parentTable} p WHERE p."id" = ${id})
        )
    `),
    // 3. Zapytanie: accepted, tylko gdy wybrana oferta jest accepted.
    db.execute(sql`
      UPDATE ${parentTable} r SET "status" = 'accepted', "updated_at" = now()
      WHERE r."id" = ${id} AND r."status" IN ${ACTIVE_STATUSES_SQL}
        AND EXISTS (
          SELECT 1 FROM "project_quote" w
          WHERE w."id" = r."selected_quote_id" AND w."status" = 'accepted' AND w."contact_revealed_at" IS NOT NULL
        )
    `),
  ]);

  if (((results[0] as { rowCount: number | null }).rowCount ?? 0) > 0) {
    trackEvent("large_order_connected", { kind, id }, id);
    await notifyOfConnection({ kind, id });
    await notifyProducersOfOtherSelected({ kind, id });
    return "connected";
  }

  return readConnectionState(kind, id);
}

// Gdy nic nie zmieniono, czytamy stan, żeby wołający wiedział dlaczego.
async function readConnectionState(kind: LargeOrderKind, id: string): Promise<ConnectSelectionOutcome> {
  const parentTable = kind === "request" ? projectRequest : bulkProductInquiry;
  const [row] = await db
    .select({
      status: parentTable.status,
      selectedQuoteId: parentTable.selectedQuoteId,
      b2b: client.b2bVerificationStatus,
      selectedQuoteStatus: projectQuote.status,
    })
    .from(parentTable)
    .leftJoin(client, eq(client.id, parentTable.clientId))
    .leftJoin(projectQuote, eq(projectQuote.id, parentTable.selectedQuoteId))
    .where(eq(parentTable.id, id));

  if (!row || !row.selectedQuoteId) return "skipped";
  if (row.status === "accepted" && row.selectedQuoteStatus === "accepted") return "already_connected";
  if (row.status !== "open" && row.status !== "quoted" && row.status !== "published") return "skipped";
  if (row.selectedQuoteStatus !== "active") return "skipped";
  return row.b2b === "approved" ? "skipped" : "pending_b2b";
}

// Po zatwierdzeniu B2B łączymy wszystkie zapytania tego klienta, które mają wybór bez
// połączenia (AC-17). Błąd jednego zapytania nie zatrzymuje pozostałych i nie cofa
// zatwierdzenia: zaległość zbierze godzinne zadanie czyszczące.
export async function connectPendingSelectionsForClient(clientId: string): Promise<void> {
  const pending = await getPendingSelections({ clientId });
  for (const item of pending) {
    try {
      await connectSelection(item.kind, item.id);
    } catch (error) {
      captureError(error, { path: "connectPendingSelectionsForClient" });
    }
  }
}

// Zapytania z wyborem klienta, które jeszcze nie są połączone. Dla zadania czyszczącego
// (część C) i dla przycisku administratora; ograniczone do jednego klienta albo wszystkie.
export async function getPendingSelections(scope: { clientId?: string } = {}): Promise<{ kind: LargeOrderKind; id: string }[]> {
  const [requests, products] = await Promise.all([
    db
      .select({ id: projectRequest.id })
      .from(projectRequest)
      .where(
        and(
          scope.clientId ? eq(projectRequest.clientId, scope.clientId) : undefined,
          inArray(projectRequest.status, ["open", "quoted", "published"]),
          sql`${projectRequest.selectedQuoteId} IS NOT NULL`,
        ),
      ),
    db
      .select({ id: bulkProductInquiry.id })
      .from(bulkProductInquiry)
      .where(
        and(
          scope.clientId ? eq(bulkProductInquiry.clientId, scope.clientId) : undefined,
          inArray(bulkProductInquiry.status, ["open", "quoted", "published"]),
          sql`${bulkProductInquiry.selectedQuoteId} IS NOT NULL`,
        ),
      ),
  ]);
  return [
    ...requests.map((row) => ({ kind: "request" as const, id: row.id })),
    ...products.map((row) => ({ kind: "product" as const, id: row.id })),
  ];
}
