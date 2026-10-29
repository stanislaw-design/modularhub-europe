"use server";

import { randomUUID } from "node:crypto";
import { and, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db/client";
import { getPgErrorCode } from "@/lib/db/pg-error";
import { getProducerIdForUser } from "@/lib/db/queries";
import { producer, projectQuote, projectRequest, projectRequestProducerOverride } from "@/lib/db/schema";
import { withAdminActor } from "@/lib/db/with-admin-actor";
import { intendedUseColumns, intendedUseRefinement, intendedUseShape } from "@/lib/intended-use";
import { claimNotification } from "@/lib/large-order-reminders";
import { notifyProducersOfNewPlatformProject, sendPlatformSelectionDoneToProducer } from "@/lib/notifications/large-order-producer";
import { captureError, trackEvent } from "@/lib/observability";
import { COMPLETION_STANDARDS } from "@/lib/producer-capacity-profile-specs";
import { getPlatformContact } from "@/lib/platform-contact";
import { expandRecipients } from "@/lib/producer-groups";
import { projectRequestFamiliesSchema, PROJECT_TYPES } from "@/lib/project-request-specs";

// Spec 0077 część A: projekt własny ModularHub. Wszystkie akcje tego pliku są tylko
// dla roli `admin` (sprawdzane tutaj, nie tylko w interfejsie) i zapisują przez
// withAdminActor, więc trafiają do dziennika audytu z autorem.

interface ActionResult {
  ok: boolean;
  error?: string;
}

export interface CreatePlatformProjectResult extends ActionResult {
  id?: string;
  // Producenci wskazani w formularzu, których pominięto (usunięci albo zablokowani).
  skippedProducers?: { id: string; name: string }[];
}

const GENERIC_ERROR = "Nie udało się założyć projektu. Spróbuj ponownie.";
const NOT_ADMIN_ERROR = "Musisz być zalogowany jako administrator.";
const DEFAULT_DEADLINE_DAYS = 14;
const MAX_DEADLINE_DAYS = 90;
const MAX_UNIT_COUNT = 10000;

const dateStringSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Nieprawidłowa data.");

const createPlatformProjectSchema = z
  .object({
    title: z.string().trim().min(3, "Nazwa projektu ma mieć od 3 do 120 znaków.").max(120, "Nazwa projektu ma mieć od 3 do 120 znaków."),
    countryCode: z.string().min(1, "Wybierz kraj."),
    locationDetail: z.string().trim().min(1).optional(),
    projectType: z.enum(PROJECT_TYPES),
    families: projectRequestFamiliesSchema,
    unitCount: z
      .number("Podaj liczbę sztuk.")
      .int("Liczba sztuk ma być liczbą całkowitą.")
      .min(1, "Minimalna liczba sztuk to 1.")
      .max(MAX_UNIT_COUNT, `Maksymalna liczba sztuk to ${MAX_UNIT_COUNT}.`),
    floorAreaM2Min: z.number().positive().optional(),
    floorAreaM2Max: z.number().positive().optional(),
    completionStandard: z.enum(COMPLETION_STANDARDS).optional(),
    startWindowFrom: dateStringSchema.optional(),
    startWindowTo: dateStringSchema.optional(),
    deliveryWindowFrom: dateStringSchema.optional(),
    deliveryWindowTo: dateStringSchema.optional(),
    extrasNote: z.string().trim().min(1).optional(),
    // Dzień terminu składania ofert (do końca tego dnia); brak = teraz plus 14 dni.
    deadlineDate: dateStringSchema.optional(),
    // Pojedynczy producenci i grupy (własne uuid, gotowe "family:<rodzina>"), spec 0077 część B. Razem
    // muszą dać co najmniej jednego producenta po rozwinięciu (sprawdza akcja).
    producerIds: z.array(z.uuid()).default([]),
    groupIds: z.array(z.string().min(1).max(60)).max(50).default([]),
    ...intendedUseShape,
  })
  .refine(intendedUseRefinement.check, intendedUseRefinement.params)
  .refine((data) => !data.startWindowFrom || !data.startWindowTo || data.startWindowTo >= data.startWindowFrom, {
    message: "Data 'do' okna startu musi być równa lub późniejsza niż 'od'.",
    path: ["startWindowTo"],
  })
  .refine(
    (data) => !data.deliveryWindowFrom || !data.deliveryWindowTo || data.deliveryWindowTo >= data.deliveryWindowFrom,
    {
      message: "Data 'do' okna dostawy musi być równa lub późniejsza niż 'od'.",
      path: ["deliveryWindowTo"],
    },
  );

export type CreatePlatformProjectInput = z.input<typeof createPlatformProjectSchema>;

// Koniec dnia podanej daty (czas serwera) jako termin ofert. Musi być w przyszłości, nie dalej niż 90 dni.
function resolveDeadline(deadlineDate: string | undefined, now: Date): { ok: true; at: Date | null } | { ok: false; error: string } {
  if (!deadlineDate) return { ok: true, at: null };
  const at = new Date(`${deadlineDate}T23:59:59`);
  if (Number.isNaN(at.getTime()) || at.getTime() <= now.getTime()) {
    return { ok: false, error: "Termin składania ofert musi być w przyszłości." };
  }
  if (at.getTime() > now.getTime() + MAX_DEADLINE_DAYS * 24 * 60 * 60 * 1000) {
    return { ok: false, error: `Termin składania ofert może być odległy najwyżej o ${MAX_DEADLINE_DAYS} dni.` };
  }
  return { ok: true, at };
}

// AC-1 do AC-8: admin zakłada projekt, w którym zamawiającym jest ModularHub. Kontakt kopiujemy
// ze zmiennych PLATFORM_CONTACT_* w chwili zapisu (AC-3), brak konfiguracji blokuje zapis (AC-4).
// Projekt nie ma klienta, zgody ani publikacji podsumowania (AC-6). Odbiorcy to wiersze `include`
// (AC-7, zdjęcie stanu). Mail do producentów to best effort (AC-8).
export async function createPlatformProject(input: CreatePlatformProjectInput): Promise<CreatePlatformProjectResult> {
  const session = await auth();
  if (!session || session.user.role !== "admin") return { ok: false, error: NOT_ADMIN_ERROR };
  const adminId = session.user.id;

  const contact = getPlatformContact();
  if (!contact.ok) return { ok: false, error: contact.error };

  const parsed = createPlatformProjectSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Sprawdź dane formularza." };
  const data = parsed.data;

  const deadline = resolveDeadline(data.deadlineDate, new Date());
  if (!deadline.ok) return { ok: false, error: deadline.error };

  try {
    // Grupy rozwijają się do listy producentów teraz i dalej nie wpływają na projekt (zdjęcie stanu, AC-26).
    const expanded = await expandRecipients(data.groupIds, data.producerIds);
    const recipients = { ok: expanded.producers.map((item) => item.id), skipped: expanded.skipped };
    if (recipients.ok.length === 0) {
      return {
        ok: false,
        error:
          recipients.skipped.length > 0
            ? "Żaden ze wskazanych producentów nie może dostać projektu (usunięci lub zablokowani)."
            : "Wybierz co najmniej jednego producenta albo grupę z producentami.",
        skippedProducers: recipients.skipped,
      };
    }

    const id = randomUUID();
    await withAdminActor(adminId, [
      db.insert(projectRequest).values({
        id,
        isPlatformOwned: true,
        title: data.title,
        clientId: null,
        contactName: contact.contact.name,
        contactEmail: contact.contact.email,
        contactPhone: contact.contact.phone,
        countryCode: data.countryCode,
        locationDetail: data.locationDetail ?? null,
        projectType: data.projectType,
        families: data.families,
        unitCount: data.unitCount,
        floorAreaM2Min: data.floorAreaM2Min ?? null,
        floorAreaM2Max: data.floorAreaM2Max ?? null,
        completionStandard: data.completionStandard ?? null,
        startWindowFrom: data.startWindowFrom ?? null,
        startWindowTo: data.startWindowTo ?? null,
        deliveryWindowFrom: data.deliveryWindowFrom ?? null,
        deliveryWindowTo: data.deliveryWindowTo ?? null,
        extrasNote: data.extrasNote ?? null,
        ...intendedUseColumns(data),
        ...(deadline.at ? { deadlineAt: deadline.at } : { deadlineAt: sql`now() + make_interval(days => ${DEFAULT_DEADLINE_DAYS})` }),
        contactLocale: "pl",
        createdByStaffUserId: adminId,
        staffConsentNote: null,
      }),
      db.insert(projectRequestProducerOverride).values(
        recipients.ok.map((producerId) => ({
          projectRequestId: id,
          producerId,
          mode: "include" as const,
          createdByUserId: adminId,
        })),
      ),
    ]);

    trackEvent("platform_project_created", { countryCode: data.countryCode, unitCount: data.unitCount, recipients: recipients.ok.length }, id);
    await notifyProducersOfNewPlatformProject({ id });
    return { ok: true, id, skippedProducers: recipients.skipped };
  } catch (error) {
    if (getPgErrorCode(error) === "23503") return { ok: false, error: "Nie znaleziono kraju albo producenta." };
    captureError(error, { path: "createPlatformProject", userId: adminId });
    return { ok: false, error: GENERIC_ERROR };
  }
}

const quoteIdSchema = z.uuid();
const requestIdSchema = z.uuid();

// Spec 0077 AC-44: producent wycofuje jeden ze swoich aktywnych wariantów w projekcie własnym
// (status superseded, bez zmiany typu w bazie). Niemożliwe po zakończeniu wyboru lub zamknięciu
// projektu. Wycofany wariant znika z tabeli admina, a jeśli był oznaczony, oznaczenie jest czyszczone.
// Blokada doradcza na projekcie jest ta sama co przy składaniu ofert i zakończeniu wyboru.
export async function withdrawProjectQuoteVariant(quoteId: string): Promise<ActionResult> {
  if (!quoteIdSchema.safeParse(quoteId).success) return { ok: false, error: "Nie znaleziono wariantu." };
  const session = await auth();
  if (!session || session.user.role !== "producer") return { ok: false, error: "Musisz być zalogowany jako producent." };
  const producerId = await getProducerIdForUser(session.user.id);
  if (!producerId) return { ok: false, error: "Nie znaleziono konta producenta." };

  try {
    const [quote] = await db
      .select({ projectRequestId: projectQuote.projectRequestId })
      .from(projectQuote)
      .where(and(eq(projectQuote.id, quoteId), eq(projectQuote.producerId, producerId)));
    if (!quote?.projectRequestId) return { ok: false, error: "Nie znaleziono wariantu." };
    const requestId = quote.projectRequestId;

    const results = await db.batch([
      db.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${requestId}))`),
      db.execute(sql`
        UPDATE "project_quote" q SET "status" = 'superseded'
        WHERE q."id" = ${quoteId} AND q."producer_id" = ${producerId} AND q."status" = 'active'
          AND EXISTS (
            SELECT 1 FROM "project_request" r
            WHERE r."id" = q."project_request_id" AND r."is_platform_owned" AND r."status" IN ('open', 'quoted')
          )
      `),
      db.execute(sql`
        UPDATE "project_request" SET "platform_marked_quote_id" = NULL, "updated_at" = now()
        WHERE "id" = ${requestId} AND "platform_marked_quote_id" = ${quoteId}
          AND EXISTS (SELECT 1 FROM "project_quote" w WHERE w."id" = ${quoteId} AND w."status" = 'superseded' AND w."producer_id" = ${producerId})
      `),
    ]);
    if (((results[1] as { rowCount: number | null }).rowCount ?? 0) === 0) {
      return { ok: false, error: "Tego wariantu nie można już wycofać: wybór został zakończony, projekt jest zamknięty albo wariant nie jest aktywny." };
    }
    trackEvent("platform_quote_variant_withdrawn", {}, quoteId);
    return { ok: true };
  } catch (error) {
    captureError(error, { path: "withdrawProjectQuoteVariant", userId: session.user.id });
    return { ok: false, error: "Nie udało się wycofać wariantu. Spróbuj ponownie." };
  }
}

// Spec 0077 AC-16: admin oznacza jedną aktywną ofertę projektu własnego jako wybraną. Zapis dotyczy
// wyłącznie platform_marked_quote_id (nie selected_quote_id, bo ten blokuje oferty i przypomnienia).
// Można zmieniać dowolną liczbę razy do zakończenia wyboru. Bez maila i bez zmiany statusów.
export async function selectPlatformQuote(requestId: string, quoteId: string): Promise<ActionResult> {
  if (!requestIdSchema.safeParse(requestId).success || !quoteIdSchema.safeParse(quoteId).success) {
    return { ok: false, error: "Nie znaleziono oferty." };
  }
  const session = await auth();
  if (!session || session.user.role !== "admin") return { ok: false, error: NOT_ADMIN_ERROR };
  const adminId = session.user.id;

  try {
    const [rows] = await withAdminActor(adminId, [
      db
        .update(projectRequest)
        .set({ platformMarkedQuoteId: quoteId, updatedAt: new Date() })
        .where(
          and(
            eq(projectRequest.id, requestId),
            eq(projectRequest.isPlatformOwned, true),
            inArray(projectRequest.status, ["open", "quoted"]),
            sql`exists (
              select 1 from project_quote q
              where q.id = ${quoteId} and q.project_request_id = ${projectRequest.id} and q.status = 'active'
            )`,
          ),
        )
        .returning({ id: projectRequest.id }),
    ]);
    if (rows.length === 0) {
      return { ok: false, error: "Nie można oznaczyć tej oferty: nie jest aktywna, nie należy do projektu albo wybór został już zakończony." };
    }
    trackEvent("platform_quote_marked", {}, requestId);
    return { ok: true };
  } catch (error) {
    captureError(error, { path: "selectPlatformQuote", userId: adminId });
    return { ok: false, error: "Nie udało się oznaczyć oferty. Spróbuj ponownie." };
  }
}

export interface FinishPlatformSelectionResult extends ActionResult {
  // Producenci, do których mail został zakolejkowany (AC-18), po nazwie.
  queuedProducers?: string[];
  alreadyFinished?: boolean;
}

const STALE_MARK_ERROR = "Oznaczenie nieaktualne: wybrana oferta nie jest już aktywna. Oznacz ofertę ponownie.";

// Spec 0077 AC-17, AC-45: "Zakończ wybór i powiadom". Wymaga oznaczonej, wciąż aktywnej oferty.
// Jeden db.batch: blokada doradcza projektu (ta sama co przy składaniu ofert), wybrana oferta na
// accepted, pozostałe aktywne na rejected, projekt na accepted z selected_quote_id. Kroki 2 i 3
// zależą od kroku 1 przez EXISTS, więc oferta złożona równolegle nie zostaje active po zakończeniu.
// Idempotentna: drugie kliknięcie nic nie zmienia i nie wysyła maili. Nie woła connectSelection ani
// notifyProducersOfOtherSelected (to ścieżka klienta).
export async function finishPlatformSelection(requestId: string, confirmed: boolean): Promise<FinishPlatformSelectionResult> {
  if (!requestIdSchema.safeParse(requestId).success) return { ok: false, error: "Nie znaleziono projektu." };
  if (confirmed !== true) return { ok: false, error: "Potwierdź zakończenie wyboru." };
  const session = await auth();
  if (!session || session.user.role !== "admin") return { ok: false, error: NOT_ADMIN_ERROR };
  const adminId = session.user.id;

  try {
    const [state] = await db
      .select({
        isPlatformOwned: projectRequest.isPlatformOwned,
        status: projectRequest.status,
        markedQuoteId: projectRequest.platformMarkedQuoteId,
      })
      .from(projectRequest)
      .where(eq(projectRequest.id, requestId));
    if (!state || !state.isPlatformOwned) return { ok: false, error: "Nie znaleziono projektu własnego." };
    if (state.status === "accepted") return { ok: true, alreadyFinished: true, queuedProducers: [] };
    if (state.status !== "open" && state.status !== "quoted") return { ok: false, error: "Projekt jest zamknięty." };
    if (!state.markedQuoteId) return { ok: false, error: "Najpierw oznacz wybraną ofertę." };

    const results = await withAdminActor(adminId, [
      db.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${requestId}))`),
      db.execute(sql`
        UPDATE "project_quote" q SET "status" = 'accepted'
        WHERE q."status" = 'active' AND q."project_request_id" = ${requestId}
          AND EXISTS (
            SELECT 1 FROM "project_request" r
            WHERE r."id" = ${requestId} AND r."is_platform_owned" AND r."status" IN ('open', 'quoted')
              AND r."platform_marked_quote_id" = q."id" AND r."selected_quote_id" IS NULL
          )
      `),
      db.execute(sql`
        UPDATE "project_quote" o SET "status" = 'rejected'
        WHERE o."project_request_id" = ${requestId} AND o."status" = 'active'
          AND EXISTS (
            SELECT 1 FROM "project_quote" w
            JOIN "project_request" r ON r."id" = w."project_request_id"
            WHERE w."project_request_id" = ${requestId} AND w."status" = 'accepted' AND w."id" = r."platform_marked_quote_id"
              AND r."status" IN ('open', 'quoted')
          )
      `),
      db.execute(sql`
        UPDATE "project_request" r SET "status" = 'accepted', "selected_quote_id" = r."platform_marked_quote_id", "selected_at" = now(), "updated_at" = now()
        WHERE r."id" = ${requestId} AND r."is_platform_owned" AND r."status" IN ('open', 'quoted')
          AND EXISTS (SELECT 1 FROM "project_quote" w WHERE w."id" = r."platform_marked_quote_id" AND w."status" = 'accepted')
      `),
    ]);
    const finished = (results[3] as { rowCount: number | null }).rowCount ?? 0;
    if (finished === 0) {
      const [after] = await db.select({ status: projectRequest.status }).from(projectRequest).where(eq(projectRequest.id, requestId));
      if (after?.status === "accepted") return { ok: true, alreadyFinished: true, queuedProducers: [] };
      return { ok: false, error: STALE_MARK_ERROR };
    }

    trackEvent("platform_selection_finished", {}, requestId);
    const queuedProducers = await mailPlatformSelectionDone(requestId);
    return { ok: true, queuedProducers };
  } catch (error) {
    captureError(error, { path: "finishPlatformSelection", userId: adminId });
    return { ok: false, error: "Nie udało się zakończyć wyboru. Spróbuj ponownie." };
  }
}

// Jeden mail na producenta z dowolną ofertą w projekcie, najwyżej raz (project_notification_log).
// Best effort: błąd idzie do Sentry i nie cofa zakończenia wyboru. Zwraca nazwy producentów,
// którym mail zakolejkowano.
async function mailPlatformSelectionDone(requestId: string): Promise<string[]> {
  try {
    const producers = await db
      .selectDistinct({ producerId: projectQuote.producerId, name: producer.name })
      .from(projectQuote)
      .innerJoin(producer, eq(producer.id, projectQuote.producerId))
      .where(eq(projectQuote.projectRequestId, requestId));
    const queued: string[] = [];
    for (const item of producers) {
      try {
        if (!(await claimNotification("request", requestId, item.producerId, "platform_selection_done"))) continue;
        queued.push(item.name);
        await sendPlatformSelectionDoneToProducer({ id: requestId, producerId: item.producerId });
      } catch (error) {
        captureError(error, { path: "finishPlatformSelection:mail", userId: item.producerId });
      }
    }
    return queued.sort((a, b) => a.localeCompare(b, "pl"));
  } catch (error) {
    captureError(error, { path: "finishPlatformSelection:mailPlatformSelectionDone" });
    return [];
  }
}
