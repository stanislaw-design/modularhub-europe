"use server";

import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db/client";
import { getPgErrorCode } from "@/lib/db/pg-error";
import { bulkProductInquiry, projectQuote, projectRequest, projectRequestProducerOverride } from "@/lib/db/schema";
import { withAdminActor } from "@/lib/db/with-admin-actor";
import { closeLargeOrder } from "@/lib/large-order-close";
import { connectSelection } from "@/lib/large-order-connection";
import { notifyClientOfPublishedSummary } from "@/lib/notifications/large-order-client";
import { captureError, trackEvent } from "@/lib/observability";
import { stageClientRegistration } from "@/lib/stage-client-registration";

interface ActionResult {
  ok: boolean;
  error?: string;
}

const setProducerOverrideSchema = z.object({
  projectRequestId: z.uuid(),
  producerId: z.uuid(),
  mode: z.enum(["include", "exclude", "none"]),
});

// Spec 0070 AC-10: administrator dodaje (`include`) albo wyklucza (`exclude`)
// producenta wyjątkiem od reguły dopasowania, albo zdejmuje wyjątek (`none`).
// Wyjątki dotyczą tylko zapytania wolnego (project_request). Wyjątek `exclude`
// blokuje nowe wersje oferty, ale nie usuwa już złożonej (index.md, Dopasowanie).
// Zmiana idzie przez withAdminActor, więc trafia do dziennika audytu (AC-22).
export async function setProducerOverride(
  projectRequestId: string,
  producerId: string,
  mode: "include" | "exclude" | "none",
): Promise<ActionResult> {
  const parsed = setProducerOverrideSchema.safeParse({ projectRequestId, producerId, mode });
  if (!parsed.success) return { ok: false, error: "Sprawdź dane wyjątku." };

  const session = await auth();
  if (!session || session.user.role !== "admin") {
    return { ok: false, error: "Musisz być zalogowany jako administrator." };
  }
  const adminId = session.user.id;

  try {
    if (parsed.data.mode === "none") {
      await withAdminActor(adminId, [
        db
          .delete(projectRequestProducerOverride)
          .where(
            and(
              eq(projectRequestProducerOverride.projectRequestId, parsed.data.projectRequestId),
              eq(projectRequestProducerOverride.producerId, parsed.data.producerId),
            ),
          ),
      ]);
    } else {
      await withAdminActor(adminId, [
        db
          .insert(projectRequestProducerOverride)
          .values({
            projectRequestId: parsed.data.projectRequestId,
            producerId: parsed.data.producerId,
            mode: parsed.data.mode,
            createdByUserId: adminId,
          })
          .onConflictDoUpdate({
            target: [projectRequestProducerOverride.projectRequestId, projectRequestProducerOverride.producerId],
            set: { mode: parsed.data.mode, createdByUserId: adminId, createdAt: new Date() },
          }),
      ]);
    }
  } catch (error) {
    if (getPgErrorCode(error) === "23503") return { ok: false, error: "Nie znaleziono zapytania albo producenta." };
    captureError(error, { path: "setProducerOverride", userId: adminId });
    return { ok: false, error: "Nie udało się zapisać wyjątku. Spróbuj ponownie." };
  }
  return { ok: true };
}

const extendDeadlineSchema = z.object({
  id: z.uuid(),
  kind: z.enum(["request", "product"]),
  newDeadline: z.coerce.date(),
});

// Spec 0070 AC-9: administrator zmienia termin składania ofert (przedłuża albo
// skraca) w zapytaniu wolnym lub o produkt. Nowy termin musi być w przyszłości
// (do wcześniejszego zakończenia służy zamknięcie zapytania). Dotyczy tylko
// zapytań, które jeszcze przyjmują oferty (open, quoted, published): zapytanie
// połączone lub zamknięte nie ma już terminu do przedłużania. Zmiana idzie przez
// withAdminActor, a wyzwalacze project_request_audit i bulk_product_inquiry_audit
// zapisują starą i nową wartość deadline_at (AC-22). Oferty złożone po
// przedłużeniu nie są widoczne dla klienta do ponownej publikacji (AC-12, patrz
// publishedToClientAtSql w project-quote-actions.ts).
export async function extendDeadline(
  id: string,
  kind: "request" | "product",
  newDeadline: Date | string,
): Promise<ActionResult> {
  const parsed = extendDeadlineSchema.safeParse({ id, kind, newDeadline });
  if (!parsed.success || Number.isNaN(parsed.data.newDeadline.getTime())) {
    return { ok: false, error: "Sprawdź nowy termin." };
  }
  if (parsed.data.newDeadline.getTime() <= Date.now()) {
    return { ok: false, error: "Nowy termin musi być w przyszłości. Aby zakończyć zbieranie ofert wcześniej, zamknij zapytanie." };
  }

  const session = await auth();
  if (!session || session.user.role !== "admin") {
    return { ok: false, error: "Musisz być zalogowany jako administrator." };
  }
  const adminId = session.user.id;
  const open = ["open", "quoted", "published"] as const;

  try {
    const [rows] =
      parsed.data.kind === "request"
        ? await withAdminActor(adminId, [
            db
              .update(projectRequest)
              .set({ deadlineAt: parsed.data.newDeadline, updatedAt: new Date() })
              .where(and(eq(projectRequest.id, parsed.data.id), inArray(projectRequest.status, [...open])))
              .returning({ id: projectRequest.id }),
          ])
        : await withAdminActor(adminId, [
            db
              .update(bulkProductInquiry)
              .set({ deadlineAt: parsed.data.newDeadline, updatedAt: new Date() })
              .where(and(eq(bulkProductInquiry.id, parsed.data.id), inArray(bulkProductInquiry.status, [...open])))
              .returning({ id: bulkProductInquiry.id }),
          ]);
    if (rows.length === 0) {
      return { ok: false, error: "Nie znaleziono zapytania albo jest już zamknięte lub połączone." };
    }
  } catch (error) {
    captureError(error, { path: "extendDeadline", userId: adminId });
    return { ok: false, error: "Nie udało się zmienić terminu. Spróbuj ponownie." };
  }
  return { ok: true };
}

const publishSummarySchema = z.object({
  id: z.uuid(),
  kind: z.enum(["request", "product"]),
  reviewConfirmed: z.literal(true),
});

// Spec 0070 AC-14: administrator publikuje podsumowanie jedną akcją. Wymaga
// potwierdzenia, że przejrzał PDF i teksty ofert pod kątem danych kontaktowych
// producenta (klient zobaczy je bez dalszego przeglądu), oraz co najmniej jednej
// aktywnej oferty. Ustawia published_to_client_at na aktywnych ofertach, które
// jeszcze go nie mają, status zapytania na `published` i summary_published_at
// (pierwsza publikacja, kolejne jej nie przesuwają). Oba kroki idą w jednym
// withAdminActor (db.batch) i niosą ten sam warunek statusu, więc zapytanie
// połączone lub zamknięte nie zmienia się.
export async function publishSummary(
  id: string,
  kind: "request" | "product",
  reviewConfirmed: boolean,
): Promise<ActionResult> {
  const parsed = publishSummarySchema.safeParse({ id, kind, reviewConfirmed });
  if (!parsed.success) {
    return {
      ok: false,
      error: reviewConfirmed
        ? "Sprawdź dane zapytania."
        : "Potwierdź, że przejrzałeś PDF i teksty ofert pod kątem danych kontaktowych producenta.",
    };
  }

  const session = await auth();
  if (!session || session.user.role !== "admin") {
    return { ok: false, error: "Musisz być zalogowany jako administrator." };
  }
  const adminId = session.user.id;
  const table = sql.identifier(parsed.data.kind === "request" ? "project_request" : "bulk_product_inquiry");
  const quoteColumn = sql.identifier(parsed.data.kind === "request" ? "project_request_id" : "bulk_product_inquiry_id");
  // Spec 0077 AC-6: projektu własnego ModularHub nie publikujemy (nie ma klienta), bramka jest w samym SQL.
  const publishable =
    parsed.data.kind === "request"
      ? sql`r."id" = ${parsed.data.id} AND r."status" IN ('open', 'quoted', 'published') AND NOT r."is_platform_owned"`
      : sql`r."id" = ${parsed.data.id} AND r."status" IN ('open', 'quoted', 'published')`;

  try {
    const [, requestStep] = await withAdminActor(adminId, [
      db.execute(sql`
        UPDATE "project_quote" q SET "published_to_client_at" = now()
        WHERE q.${quoteColumn} = ${parsed.data.id} AND q."status" = 'active' AND q."published_to_client_at" IS NULL
          AND EXISTS (SELECT 1 FROM ${table} r WHERE ${publishable})
      `),
      db.execute(sql`
        UPDATE ${table} r SET "status" = 'published', "summary_published_at" = coalesce(r."summary_published_at", now()), "updated_at" = now()
        WHERE ${publishable}
          AND EXISTS (SELECT 1 FROM "project_quote" q WHERE q.${quoteColumn} = r."id" AND q."status" = 'active')
      `),
    ]);
    if ((requestStep.rowCount ?? 0) === 0) {
      return {
        ok: false,
        error: "Nie można opublikować podsumowania: zapytanie nie istnieje, jest już połączone lub zamknięte, albo nie ma aktywnej oferty.",
      };
    }
  } catch (error) {
    captureError(error, { path: "publishSummary", userId: adminId });
    return { ok: false, error: "Nie udało się opublikować podsumowania. Spróbuj ponownie." };
  }
  await mailPublishedSummary(parsed.data.kind, parsed.data.id);
  return { ok: true };
}

// Spec 0070 AC-14, AC-23, AC-24: mail do klienta po publikacji, w języku zapytania, z linkiem
// do logowania prowadzącym na /{contact_locale}/panel/quotes. Klient bez konta dostaje
// oczekującą rejestrację, więc pierwsze logowanie zakłada konto. Best effort: publikacja
// jest już zapisana, błąd idzie do Sentry. Powtórna publikacja (kolejne oferty) wysyła
// kolejny mail, bo zespół świadomie ją wykonuje.
async function mailPublishedSummary(kind: "request" | "product", id: string): Promise<void> {
  try {
    const [row] =
      kind === "request"
        ? await db
            .select({
              name: projectRequest.contactName,
              email: projectRequest.contactEmail,
              phone: projectRequest.contactPhone,
              locale: projectRequest.contactLocale,
              countryCode: projectRequest.countryCode,
              unitCount: projectRequest.unitCount,
            })
            .from(projectRequest)
            .where(eq(projectRequest.id, id))
        : await db
            .select({
              name: bulkProductInquiry.contactName,
              email: bulkProductInquiry.contactEmail,
              phone: bulkProductInquiry.contactPhone,
              locale: bulkProductInquiry.contactLocale,
              countryCode: bulkProductInquiry.deliveryCountryCode,
              unitCount: bulkProductInquiry.unitCount,
            })
            .from(bulkProductInquiry)
            .where(eq(bulkProductInquiry.id, id));
    if (!row) return;
    await stageClientRegistration(row.email, row.name, row.phone ?? undefined);
    await notifyClientOfPublishedSummary({
      kind,
      id,
      email: row.email,
      name: row.name,
      locale: row.locale,
      countryCode: row.countryCode,
      unitCount: row.unitCount,
    });
  } catch (error) {
    captureError(error, { path: "publishSummary:mailPublishedSummary" });
  }
}

const quoteIdSchema = z.uuid();

// Spec 0070 AC-14: cofnięcie publikacji jednej oferty. Dopiero ono pozwala
// producentowi złożyć nową wersję. Oferty, którą klient wybrał, i ofert zapytania
// połączonego lub zamkniętego nie cofamy. Gdy zapytanie nie ma już żadnej
// opublikowanej aktywnej oferty, status wraca z `published` na `quoted`
// (summary_published_at zostaje, więc kolejne oferty nadal czekają na publikację).
export async function unpublishQuote(quoteId: string): Promise<ActionResult> {
  if (!quoteIdSchema.safeParse(quoteId).success) return { ok: false, error: "Nie znaleziono oferty." };

  const session = await auth();
  if (!session || session.user.role !== "admin") {
    return { ok: false, error: "Musisz być zalogowany jako administrator." };
  }
  const adminId = session.user.id;

  try {
    const [unpublished] = await withAdminActor(adminId, [
      db.execute(sql`
        UPDATE "project_quote" q SET "published_to_client_at" = NULL
        WHERE q."id" = ${quoteId} AND q."status" = 'active' AND q."published_to_client_at" IS NOT NULL
          AND NOT EXISTS (
            SELECT 1 FROM "project_request" r
            WHERE r."id" = q."project_request_id" AND (r."selected_quote_id" = q."id" OR r."status" IN ('accepted', 'closed') OR r."is_platform_owned")
          )
          AND NOT EXISTS (
            SELECT 1 FROM "bulk_product_inquiry" b
            WHERE b."id" = q."bulk_product_inquiry_id" AND (b."selected_quote_id" = q."id" OR b."status" IN ('accepted', 'closed'))
          )
      `),
      db.execute(sql`
        UPDATE "project_request" r SET "status" = 'quoted', "updated_at" = now()
        WHERE r."status" = 'published'
          AND r."id" = (SELECT "project_request_id" FROM "project_quote" WHERE "id" = ${quoteId})
          AND NOT EXISTS (
            SELECT 1 FROM "project_quote" q
            WHERE q."project_request_id" = r."id" AND q."status" = 'active' AND q."published_to_client_at" IS NOT NULL
          )
      `),
      db.execute(sql`
        UPDATE "bulk_product_inquiry" b SET "status" = 'quoted', "updated_at" = now()
        WHERE b."status" = 'published'
          AND b."id" = (SELECT "bulk_product_inquiry_id" FROM "project_quote" WHERE "id" = ${quoteId})
          AND NOT EXISTS (
            SELECT 1 FROM "project_quote" q
            WHERE q."bulk_product_inquiry_id" = b."id" AND q."status" = 'active' AND q."published_to_client_at" IS NOT NULL
          )
      `),
    ]);
    if ((unpublished.rowCount ?? 0) === 0) {
      return {
        ok: false,
        error: "Nie można cofnąć publikacji: oferta nie jest opublikowana, klient ją wybrał albo zapytanie jest już połączone lub zamknięte.",
      };
    }
  } catch (error) {
    captureError(error, { path: "unpublishQuote", userId: adminId });
    return { ok: false, error: "Nie udało się cofnąć publikacji. Spróbuj ponownie." };
  }
  return { ok: true };
}

const MAX_ADVISOR_NOTE_LENGTH = 2000;

// Spec 0070 AC-14: komentarz ModularHub do oferty, bez oceny i punktacji. Tylko
// do oferty jeszcze nieopublikowanej: klient widzi po publikacji dokładnie to, co
// administrator przejrzał. Pusty tekst usuwa komentarz.
export async function setAdvisorNote(quoteId: string, note: string): Promise<ActionResult> {
  if (!quoteIdSchema.safeParse(quoteId).success) return { ok: false, error: "Nie znaleziono oferty." };
  const text = note.trim();
  if (text.length > MAX_ADVISOR_NOTE_LENGTH) {
    return { ok: false, error: `Komentarz może mieć najwyżej ${MAX_ADVISOR_NOTE_LENGTH} znaków.` };
  }

  const session = await auth();
  if (!session || session.user.role !== "admin") {
    return { ok: false, error: "Musisz być zalogowany jako administrator." };
  }
  const adminId = session.user.id;

  try {
    const [rows] = await withAdminActor(adminId, [
      db
        .update(projectQuote)
        .set({ advisorNote: text === "" ? null : text })
        .where(and(eq(projectQuote.id, quoteId), eq(projectQuote.status, "active"), isNull(projectQuote.publishedToClientAt)))
        .returning({ id: projectQuote.id }),
    ]);
    if (rows.length === 0) {
      return { ok: false, error: "Komentarz dodasz tylko do aktywnej oferty, której klient jeszcze nie widzi. Cofnij najpierw jej publikację." };
    }
  } catch (error) {
    captureError(error, { path: "setAdvisorNote", userId: adminId });
    return { ok: false, error: "Nie udało się zapisać komentarza. Spróbuj ponownie." };
  }
  return { ok: true };
}

// Spec 0070 AC-17: przycisk administratora dla wyboru klienta, który czeka na połączenie
// (na przykład po zatwierdzeniu B2B, gdy automatyczne połączenie się nie udało). Ta sama
// idempotentna funkcja co po wyborze klienta i w zadaniu czyszczącym.
export async function connectSelectionAsAdmin(kind: "request" | "product", id: string): Promise<ActionResult> {
  if (!z.uuid().safeParse(id).success || (kind !== "request" && kind !== "product")) {
    return { ok: false, error: "Nie znaleziono zapytania." };
  }
  const session = await auth();
  if (!session || session.user.role !== "admin") {
    return { ok: false, error: "Musisz być zalogowany jako administrator." };
  }
  try {
    const outcome = await connectSelection(kind, id);
    if (outcome === "connected" || outcome === "already_connected") return { ok: true };
    if (outcome === "pending_b2b") {
      return { ok: false, error: "Klient nie ma zatwierdzonych danych firmy (B2B). Zatwierdź je, a strony połączą się same." };
    }
    return { ok: false, error: "Nie ma wyboru do połączenia: zapytanie nie ma wyboru klienta, jest zamknięte albo wybrana oferta nie jest już aktywna." };
  } catch (error) {
    captureError(error, { path: "connectSelectionAsAdmin", userId: session.user.id });
    return { ok: false, error: "Nie udało się połączyć stron. Spróbuj ponownie." };
  }
}

const closeRequestSchema = z.object({
  id: z.uuid(),
  kind: z.enum(["request", "product"]),
  reason: z.enum(["client_cancelled", "no_offers", "expired", "staff_closed"]),
});

// Spec 0070 AC-19: administrator zamyka zapytanie z powodem (client_cancelled, no_offers,
// expired, staff_closed), także już połączone (po połączeniu stron zamyka tylko administrator).
// Jeden UPDATE z warunkiem statusu w SQL przez withAdminActor (audyt, AC-22). Producenci z
// aktywną ofertą dostają neutralną informację z tej samej funkcji co przy zamknięciu przez
// klienta; błąd wysyłki nie cofa zamknięcia.
export async function closeRequest(
  id: string,
  kind: "request" | "product",
  reason: "client_cancelled" | "no_offers" | "expired" | "staff_closed",
): Promise<ActionResult> {
  const parsed = closeRequestSchema.safeParse({ id, kind, reason });
  if (!parsed.success) return { ok: false, error: "Sprawdź dane zamknięcia." };

  const session = await auth();
  if (!session || session.user.role !== "admin") {
    return { ok: false, error: "Musisz być zalogowany jako administrator." };
  }
  const adminId = session.user.id;

  try {
    const closed = await closeLargeOrder({
      kind: parsed.data.kind,
      id: parsed.data.id,
      reason: parsed.data.reason,
      fromStatuses: ["open", "quoted", "published", "accepted"],
      adminId,
    });
    if (!closed) return { ok: false, error: "Zapytanie jest już zamknięte albo go nie ma." };
    trackEvent("request_closed_by_staff", { kind: parsed.data.kind, reason: parsed.data.reason }, parsed.data.id);
    return { ok: true };
  } catch (error) {
    captureError(error, { path: "closeRequest", userId: adminId });
    return { ok: false, error: "Nie udało się zamknąć zapytania. Spróbuj ponownie." };
  }
}
