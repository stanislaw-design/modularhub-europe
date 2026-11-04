import "server-only";
import { and, eq, inArray, isNull, notExists, notInArray, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { crmContact, crmEntry, crmPartner, crmTask, crmThread, producer, users } from "@/lib/db/schema";
import { captureError } from "@/lib/observability";
import type { TaskStatus } from "./constants";
import {
  closeThreadDecisionsSchema,
  contactInputSchema,
  entryInputSchema,
  partnerInputSchema,
  quickEntrySchema,
  taskInputSchema,
  taskStatusSchema,
  threadInputSchema,
  uuidSchema,
  type CloseThreadDecisions,
  type ContactInput,
  type EntryInput,
  type PartnerInput,
  type QuickEntryInput,
  type TaskInput,
  type ThreadInput,
} from "./schemas";
import { buildTemplateTasks, getCaseTemplate, type TemplateTaskDraft } from "./templates";
import { warsawDateString, warsawLocalToDate } from "./time";
import { partnerNamesSimilar } from "./status";

// Funkcje zapisu notatnika rozmów (spec 0080 AC-21). Autor jest PARAMETREM (`actor`), nie
// sesją ani polem formularza: ta sama warstwa obsłuży późniejszego bota. Plik ma "server-only"
// i nigdy "use server" (inaczej każda funkcja byłaby publicznym wejściem, w którym wołający
// wybiera autora). Bramka roli i autor z sesji są w cienkich plikach akcji.
//
// Zapisy wielotabelowe idą przez `db.batch` (sterownik neon-http nie ma db.transaction),
// a identyfikatory nowych wierszy powstają w aplikacji przed batchem.

export interface Actor {
  userId: string;
  /** `web` dla formularza, `bot` dla zapisu z bota (wpisy dziennika). */
  source?: "web" | "bot";
}

export type Result<T = Record<never, never>> = ({ ok: true } & T) | { ok: false; error: string };

const fail = (error: string): { ok: false; error: string } => ({ ok: false, error });

function firstIssue(error: { issues: { message: string }[] }): string {
  return error.issues[0]?.message ?? "Nieprawidłowe dane";
}

type BatchQueries = Parameters<typeof db.batch>[0];

// ---------------------------------------------------------------------------
// Sprawdzenia wspólne
// ---------------------------------------------------------------------------

/** Aktywny administrator: rola `admin`, konto nieusunięte i niezablokowane. */
export async function isActiveAdmin(userId: string): Promise<boolean> {
  const [row] = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.id, userId), eq(users.role, "admin"), isNull(users.deletedAt), isNull(users.blockedAt)))
    .limit(1);
  return Boolean(row);
}

async function partnerExists(partnerId: string): Promise<boolean> {
  const [row] = await db.select({ id: crmPartner.id }).from(crmPartner).where(eq(crmPartner.id, partnerId)).limit(1);
  return Boolean(row);
}

async function threadOfPartner(threadId: string, partnerId: string) {
  const [row] = await db
    .select({ id: crmThread.id, closedAt: crmThread.closedAt })
    .from(crmThread)
    .where(and(eq(crmThread.id, threadId), eq(crmThread.partnerId, partnerId)))
    .limit(1);
  return row ?? null;
}

// ---------------------------------------------------------------------------
// Firmy
// ---------------------------------------------------------------------------

export interface SimilarPartner {
  id: string;
  name: string;
  archived: boolean;
}

/** Firmy o nazwie równej, zawierającej się lub zawierającej podaną (AC-5), od 4 znaków dla "zawiera". */
export async function findSimilarPartners(name: string, excludeId?: string): Promise<SimilarPartner[]> {
  const rows = await db
    .select({ id: crmPartner.id, name: crmPartner.name, archivedAt: crmPartner.archivedAt })
    .from(crmPartner);
  return rows
    .filter((row) => row.id !== excludeId && partnerNamesSimilar(row.name, name))
    .map((row) => ({ id: row.id, name: row.name, archived: row.archivedAt !== null }));
}

export async function createPartner(
  actor: Actor,
  input: PartnerInput,
): Promise<Result<{ id: string; similar: SimilarPartner[] }>> {
  const parsed = partnerInputSchema.safeParse(input);
  if (!parsed.success) return fail(firstIssue(parsed.error));
  const similar = await findSimilarPartners(parsed.data.name);
  const id = crypto.randomUUID();
  await db.insert(crmPartner).values({ id, ...parsed.data, createdBy: actor.userId });
  return { ok: true, id, similar };
}

export async function updatePartner(_actor: Actor, partnerId: string, input: PartnerInput): Promise<Result> {
  const parsed = partnerInputSchema.safeParse(input);
  if (!parsed.success) return fail(firstIssue(parsed.error));
  const updated = await db
    .update(crmPartner)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(crmPartner.id, partnerId))
    .returning({ id: crmPartner.id });
  return updated.length ? { ok: true } : fail("Nie znaleziono firmy");
}

/** Firmy z otwartą sprawą lub otwartym zadaniem nie można zarchiwizować (AC-8). */
export async function archivePartner(_actor: Actor, partnerId: string): Promise<Result> {
  const [openThreads, openTasks] = await Promise.all([
    db
      .select({ title: crmThread.title })
      .from(crmThread)
      .where(and(eq(crmThread.partnerId, partnerId), isNull(crmThread.closedAt))),
    db
      .select({ title: crmTask.title })
      .from(crmTask)
      .where(and(eq(crmTask.partnerId, partnerId), eq(crmTask.status, "open"))),
  ]);
  if (openThreads.length || openTasks.length) {
    const parts: string[] = [];
    if (openThreads.length) parts.push(`otwarte sprawy: ${openThreads.length}`);
    if (openTasks.length) parts.push(`otwarte zadania: ${openTasks.length}`);
    return fail(`Nie można zarchiwizować firmy (${parts.join(", ")}). Zamknij je najpierw.`);
  }
  const updated = await db
    .update(crmPartner)
    .set({ archivedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(crmPartner.id, partnerId), isNull(crmPartner.archivedAt)))
    .returning({ id: crmPartner.id });
  return updated.length ? { ok: true } : fail("Firma jest już zarchiwizowana lub nie istnieje");
}

/** Przywrócenie nigdy nie zderza się z unikalnością: producent zostaje przy zarchiwizowanej firmie. */
export async function restorePartner(_actor: Actor, partnerId: string): Promise<Result> {
  const updated = await db
    .update(crmPartner)
    .set({ archivedAt: null, updatedAt: new Date() })
    .where(and(eq(crmPartner.id, partnerId), sql`${crmPartner.archivedAt} IS NOT NULL`))
    .returning({ id: crmPartner.id });
  return updated.length ? { ok: true } : fail("Firma nie jest zarchiwizowana");
}

export async function linkPartnerProducer(_actor: Actor, partnerId: string, producerId: string): Promise<Result> {
  if (!uuidSchema.safeParse(producerId).success) return fail("Nieprawidłowy producent");
  const [target] = await db.select({ id: producer.id }).from(producer).where(eq(producer.id, producerId)).limit(1);
  if (!target) return fail("Nie znaleziono producenta");
  const [taken] = await db
    .select({ id: crmPartner.id, name: crmPartner.name, archivedAt: crmPartner.archivedAt })
    .from(crmPartner)
    .where(and(eq(crmPartner.producerId, producerId), sql`${crmPartner.id} <> ${partnerId}`))
    .limit(1);
  if (taken) {
    return fail(
      taken.archivedAt
        ? `Ten producent jest połączony z zarchiwizowaną firmą „${taken.name}”. Przywróć ją albo zdejmij połączenie.`
        : `Ten producent jest już połączony z firmą „${taken.name}”.`,
    );
  }
  const updated = await db
    .update(crmPartner)
    .set({ producerId, updatedAt: new Date() })
    .where(eq(crmPartner.id, partnerId))
    .returning({ id: crmPartner.id });
  return updated.length ? { ok: true } : fail("Nie znaleziono firmy");
}

export async function unlinkPartnerProducer(_actor: Actor, partnerId: string): Promise<Result> {
  const updated = await db
    .update(crmPartner)
    .set({ producerId: null, updatedAt: new Date() })
    .where(eq(crmPartner.id, partnerId))
    .returning({ id: crmPartner.id });
  return updated.length ? { ok: true } : fail("Nie znaleziono firmy");
}

// ---------------------------------------------------------------------------
// Osoby kontaktowe
// ---------------------------------------------------------------------------

export async function createContact(_actor: Actor, partnerId: string, input: ContactInput): Promise<Result<{ id: string }>> {
  const parsed = contactInputSchema.safeParse(input);
  if (!parsed.success) return fail(firstIssue(parsed.error));
  if (!(await partnerExists(partnerId))) return fail("Nie znaleziono firmy");
  const id = crypto.randomUUID();
  await db.insert(crmContact).values({ id, partnerId, ...parsed.data });
  return { ok: true, id };
}

export async function updateContact(_actor: Actor, partnerId: string, contactId: string, input: ContactInput): Promise<Result> {
  const parsed = contactInputSchema.safeParse(input);
  if (!parsed.success) return fail(firstIssue(parsed.error));
  const updated = await db
    .update(crmContact)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(and(eq(crmContact.id, contactId), eq(crmContact.partnerId, partnerId), isNull(crmContact.deletedAt)))
    .returning({ id: crmContact.id });
  return updated.length ? { ok: true } : fail("Nie znaleziono osoby kontaktowej");
}

export async function deleteContact(_actor: Actor, partnerId: string, contactId: string): Promise<Result> {
  const updated = await db
    .update(crmContact)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(crmContact.id, contactId), eq(crmContact.partnerId, partnerId), isNull(crmContact.deletedAt)))
    .returning({ id: crmContact.id });
  return updated.length ? { ok: true } : fail("Nie znaleziono osoby kontaktowej");
}

// ---------------------------------------------------------------------------
// Sprawy
// ---------------------------------------------------------------------------

function taskRows(partnerId: string, threadId: string | null, drafts: TemplateTaskDraft[], createdBy: string) {
  return drafts.map((draft) => ({
    id: crypto.randomUUID(),
    partnerId,
    threadId,
    title: draft.title,
    dueDate: draft.dueDate,
    assigneeKind: draft.assigneeKind,
    assigneeUserId: draft.assigneeUserId,
    createdBy,
  }));
}

export async function createThread(
  actor: Actor,
  partnerId: string,
  input: ThreadInput,
  now: Date = new Date(),
): Promise<Result<{ id: string; createdTasks: number }>> {
  const parsed = threadInputSchema.safeParse(input);
  if (!parsed.success) return fail(firstIssue(parsed.error));
  const data = parsed.data;
  if (!(await partnerExists(partnerId))) return fail("Nie znaleziono firmy");
  if (!(await isActiveAdmin(data.ownerUserId))) return fail("Właściciel sprawy musi być aktywnym administratorem");
  const template = data.templateKey ? getCaseTemplate(data.templateKey) : null;
  if (data.templateKey && !template) return fail("Nieznany szablon sprawy");

  const threadId = crypto.randomUUID();
  const drafts = template ? buildTemplateTasks(template, warsawDateString(now), data.ownerUserId) : [];
  const queries: unknown[] = [
    db.insert(crmThread).values({
      id: threadId,
      partnerId,
      title: data.title,
      ownerUserId: data.ownerUserId,
      templateKey: template?.key ?? null,
      linkKind: data.link?.kind ?? null,
      linkId: data.link?.id ?? null,
    }),
  ];
  if (drafts.length) queries.push(db.insert(crmTask).values(taskRows(partnerId, threadId, drafts, actor.userId)));
  await db.batch(queries as unknown as BatchQueries);
  return { ok: true, id: threadId, createdTasks: drafts.length };
}

export async function updateThread(
  _actor: Actor,
  threadId: string,
  input: Pick<ThreadInput, "title" | "ownerUserId" | "link">,
): Promise<Result> {
  const parsed = threadInputSchema.pick({ title: true, ownerUserId: true, link: true }).safeParse(input);
  if (!parsed.success) return fail(firstIssue(parsed.error));
  if (!(await isActiveAdmin(parsed.data.ownerUserId))) return fail("Właściciel sprawy musi być aktywnym administratorem");
  const updated = await db
    .update(crmThread)
    .set({
      title: parsed.data.title,
      ownerUserId: parsed.data.ownerUserId,
      linkKind: parsed.data.link?.kind ?? null,
      linkId: parsed.data.link?.id ?? null,
      updatedAt: new Date(),
    })
    .where(eq(crmThread.id, threadId))
    .returning({ id: crmThread.id });
  return updated.length ? { ok: true } : fail("Nie znaleziono sprawy");
}

/**
 * Zamknięcie sprawy (AC-12). Każde otwarte zadanie wymaga decyzji `done` albo `cancelled`.
 * Rozstrzygnięcie zadań i zamknięcie są w jednym batchu, a każda instrukcja ma ten sam warunek:
 * "nie ma otwartego zadania spoza decyzji". Gdy w międzyczasie powstało nowe otwarte zadanie,
 * żadna z instrukcji nic nie zmienia, więc zamknięcie jest odrzucone w całości.
 */
export async function closeThread(actor: Actor, threadId: string, decisions: CloseThreadDecisions): Promise<Result> {
  const parsedDecisions = closeThreadDecisionsSchema.safeParse(decisions);
  if (!parsedDecisions.success) return fail("Nieprawidłowe decyzje dla zadań");

  const [thread] = await db
    .select({ id: crmThread.id, closedAt: crmThread.closedAt })
    .from(crmThread)
    .where(eq(crmThread.id, threadId))
    .limit(1);
  if (!thread) return fail("Nie znaleziono sprawy");
  if (thread.closedAt) return fail("Sprawa jest już zamknięta");

  const openTasks = await db
    .select({ id: crmTask.id })
    .from(crmTask)
    .where(and(eq(crmTask.threadId, threadId), eq(crmTask.status, "open")));
  const missing = openTasks.filter((task) => !parsedDecisions.data[task.id]);
  if (missing.length) return fail(`Zdecyduj, co zrobić z otwartymi zadaniami (${missing.length}): zrobione albo anulowane`);

  const decidedIds = openTasks.map((task) => task.id);
  const noUndecidedOpen = decidedIds.length
    ? notExists(
        db
          .select({ one: sql`1` })
          .from(crmTask)
          .where(and(eq(crmTask.threadId, threadId), eq(crmTask.status, "open"), notInArray(crmTask.id, decidedIds))),
      )
    : notExists(
        db
          .select({ one: sql`1` })
          .from(crmTask)
          .where(and(eq(crmTask.threadId, threadId), eq(crmTask.status, "open"))),
      );

  const now = new Date();
  const queries: unknown[] = [];
  for (const status of ["done", "cancelled"] as const) {
    const ids = decidedIds.filter((id) => parsedDecisions.data[id] === status);
    if (!ids.length) continue;
    queries.push(
      db
        .update(crmTask)
        .set({ status, completedAt: now, completedBy: actor.userId, updatedAt: now })
        .where(
          and(
            eq(crmTask.threadId, threadId),
            eq(crmTask.status, "open"),
            inArray(crmTask.id, ids),
            noUndecidedOpen,
            sql`EXISTS (SELECT 1 FROM crm_thread WHERE id = ${threadId} AND closed_at IS NULL)`,
          ),
        )
        .returning({ id: crmTask.id }),
    );
  }
  queries.push(
    db
      .update(crmThread)
      .set({ closedAt: now, closedBy: actor.userId, updatedAt: now })
      .where(and(eq(crmThread.id, threadId), isNull(crmThread.closedAt), noUndecidedOpen))
      .returning({ id: crmThread.id }),
  );

  const results = ((await db.batch(queries as unknown as BatchQueries)) as unknown) as { id: string }[][];
  const closed = results[results.length - 1];
  if (!closed.length) return fail("W międzyczasie pojawiło się nowe otwarte zadanie. Odśwież i spróbuj ponownie.");
  return { ok: true };
}

/** Ponowne otwarcie czyści `closed_at`; zadania anulowane wcześniej zostają anulowane. */
export async function reopenThread(_actor: Actor, threadId: string): Promise<Result> {
  const updated = await db
    .update(crmThread)
    .set({ closedAt: null, closedBy: null, updatedAt: new Date() })
    .where(and(eq(crmThread.id, threadId), sql`${crmThread.closedAt} IS NOT NULL`))
    .returning({ id: crmThread.id });
  return updated.length ? { ok: true } : fail("Sprawa nie jest zamknięta");
}

// ---------------------------------------------------------------------------
// Dziennik
// ---------------------------------------------------------------------------

async function checkEntryRefs(partnerId: string, threadId: string | null): Promise<string | null> {
  if (!(await partnerExists(partnerId))) return "Nie znaleziono firmy";
  if (threadId && !(await threadOfPartner(threadId, partnerId))) return "Sprawa nie należy do tej firmy";
  return null;
}

export async function createEntry(actor: Actor, partnerId: string, input: EntryInput, now: Date = new Date()): Promise<Result<{ id: string }>> {
  const parsed = entryInputSchema.safeParse(input);
  if (!parsed.success) return fail(firstIssue(parsed.error));
  const refError = await checkEntryRefs(partnerId, parsed.data.threadId);
  if (refError) return fail(refError);
  const id = crypto.randomUUID();
  try {
    await db.insert(crmEntry).values(entryRow(id, partnerId, parsed.data.threadId, actor, parsed.data, now));
  } catch (error) {
    captureError(error, { path: "conversations:createEntry" });
    return fail("Nie udało się zapisać wpisu. Sprawdź, czy osoba kontaktowa należy do tej firmy.");
  }
  return { ok: true, id };
}

function entryRow(id: string, partnerId: string, threadId: string | null, actor: Actor, data: Omit<EntryInput, "threadId">, now: Date) {
  const occurredAt = data.occurredAtLocal ? warsawLocalToDate(data.occurredAtLocal) : null;
  return {
    id,
    partnerId,
    threadId,
    contactId: data.contactId,
    authorUserId: actor.userId,
    occurredAt: occurredAt ?? now,
    direction: data.direction,
    channel: data.channel,
    body: data.body,
    source: actor.source ?? "web",
  };
}

/** Każdy administrator może edytować każdy wpis (AC-13); wpis dostaje adnotację "edytowano". */
export async function updateEntry(_actor: Actor, entryId: string, input: EntryInput): Promise<Result> {
  const parsed = entryInputSchema.safeParse(input);
  if (!parsed.success) return fail(firstIssue(parsed.error));
  const [existing] = await db
    .select({ partnerId: crmEntry.partnerId, occurredAt: crmEntry.occurredAt })
    .from(crmEntry)
    .where(and(eq(crmEntry.id, entryId), isNull(crmEntry.deletedAt)))
    .limit(1);
  if (!existing) return fail("Nie znaleziono wpisu");
  if (parsed.data.threadId && !(await threadOfPartner(parsed.data.threadId, existing.partnerId))) {
    return fail("Sprawa nie należy do tej firmy");
  }
  const occurredAt = parsed.data.occurredAtLocal ? warsawLocalToDate(parsed.data.occurredAtLocal) : null;
  try {
    await db
      .update(crmEntry)
      .set({
        threadId: parsed.data.threadId,
        contactId: parsed.data.contactId,
        occurredAt: occurredAt ?? existing.occurredAt,
        direction: parsed.data.direction,
        channel: parsed.data.channel,
        body: parsed.data.body,
        editedAt: new Date(),
      })
      .where(eq(crmEntry.id, entryId));
  } catch (error) {
    captureError(error, { path: "conversations:updateEntry" });
    return fail("Nie udało się zapisać wpisu. Sprawdź, czy osoba kontaktowa należy do tej firmy.");
  }
  return { ok: true };
}

export async function deleteEntry(_actor: Actor, entryId: string): Promise<Result> {
  const updated = await db
    .update(crmEntry)
    .set({ deletedAt: new Date() })
    .where(and(eq(crmEntry.id, entryId), isNull(crmEntry.deletedAt)))
    .returning({ id: crmEntry.id });
  return updated.length ? { ok: true } : fail("Nie znaleziono wpisu");
}

// ---------------------------------------------------------------------------
// Zadania
// ---------------------------------------------------------------------------

/**
 * Tworzenie zadania w zamkniętej sprawie jest odrzucone (AC-22): warunek "sprawa otwarta" jest
 * w samym INSERT ... SELECT, więc nie da się go wyprzedzić zamknięciem sprawy w międzyczasie.
 */
export async function createTask(actor: Actor, partnerId: string, input: TaskInput): Promise<Result<{ id: string }>> {
  const parsed = taskInputSchema.safeParse(input);
  if (!parsed.success) return fail(firstIssue(parsed.error));
  const data = parsed.data;
  if (!(await partnerExists(partnerId))) return fail("Nie znaleziono firmy");
  if (data.assignee.kind === "user" && !(await isActiveAdmin(data.assignee.userId))) {
    return fail("Osoba odpowiedzialna musi być aktywnym administratorem");
  }
  if (data.threadId) {
    const thread = await threadOfPartner(data.threadId, partnerId);
    if (!thread) return fail("Sprawa nie należy do tej firmy");
    if (thread.closedAt) return fail("Sprawa jest zamknięta. Otwórz ją ponownie, żeby dodać zadanie.");
  }
  const id = crypto.randomUUID();
  const assigneeUserId = data.assignee.kind === "user" ? data.assignee.userId : null;
  const externalContactId = data.assignee.kind === "external" ? data.assignee.contactId : null;
  try {
    const result = await db.execute(sql`
      INSERT INTO "crm_task" ("id", "partner_id", "thread_id", "title", "note", "due_date", "assignee_kind",
        "assignee_user_id", "external_contact_id", "created_by", "link_kind", "link_id")
      SELECT ${id}::uuid, ${partnerId}::uuid, ${data.threadId}::uuid, ${data.title}, ${data.note}, ${data.dueDate}::date,
        ${data.assignee.kind}, ${assigneeUserId}, ${externalContactId}::uuid, ${actor.userId},
        ${data.link?.kind ?? null}, ${data.link?.id ?? null}
      WHERE ${data.threadId}::uuid IS NULL
        OR EXISTS (SELECT 1 FROM "crm_thread" WHERE "id" = ${data.threadId}::uuid AND "closed_at" IS NULL)
    `);
    if ((result.rowCount ?? 0) === 0) return fail("Sprawa jest zamknięta. Otwórz ją ponownie, żeby dodać zadanie.");
  } catch (error) {
    captureError(error, { path: "conversations:createTask" });
    return fail("Nie udało się zapisać zadania. Sprawdź, czy osoba kontaktowa należy do tej firmy.");
  }
  return { ok: true, id };
}

export async function updateTask(_actor: Actor, taskId: string, input: Omit<TaskInput, "threadId">): Promise<Result> {
  const parsed = taskInputSchema.omit({ threadId: true }).safeParse(input);
  if (!parsed.success) return fail(firstIssue(parsed.error));
  const data = parsed.data;
  if (data.assignee.kind === "user" && !(await isActiveAdmin(data.assignee.userId))) {
    return fail("Osoba odpowiedzialna musi być aktywnym administratorem");
  }
  try {
    const updated = await db
      .update(crmTask)
      .set({
        title: data.title,
        note: data.note,
        dueDate: data.dueDate,
        assigneeKind: data.assignee.kind,
        assigneeUserId: data.assignee.kind === "user" ? data.assignee.userId : null,
        externalContactId: data.assignee.kind === "external" ? data.assignee.contactId : null,
        linkKind: data.link?.kind ?? null,
        linkId: data.link?.id ?? null,
        updatedAt: new Date(),
      })
      .where(eq(crmTask.id, taskId))
      .returning({ id: crmTask.id });
    return updated.length ? { ok: true } : fail("Nie znaleziono zadania");
  } catch (error) {
    captureError(error, { path: "conversations:updateTask" });
    return fail("Nie udało się zapisać zadania. Sprawdź, czy osoba kontaktowa należy do tej firmy.");
  }
}

/** Odhaczenie, anulowanie i ponowne otwarcie; otwarcie w zamkniętej sprawie jest odrzucone (AC-22). */
export async function setTaskStatus(actor: Actor, taskId: string, status: TaskStatus): Promise<Result> {
  if (!taskStatusSchema.safeParse(status).success) return fail("Nieprawidłowy status");
  const now = new Date();
  if (status === "open") {
    const updated = await db
      .update(crmTask)
      .set({ status: "open", completedAt: null, completedBy: null, updatedAt: now })
      .where(
        and(
          eq(crmTask.id, taskId),
          sql`${crmTask.status} <> 'open'`,
          sql`(${crmTask.threadId} IS NULL OR EXISTS (SELECT 1 FROM crm_thread WHERE crm_thread.id = ${crmTask.threadId} AND crm_thread.closed_at IS NULL))`,
        ),
      )
      .returning({ id: crmTask.id });
    return updated.length ? { ok: true } : fail("Nie można otworzyć zadania. Sprawa jest zamknięta, otwórz ją ponownie.");
  }
  const updated = await db
    .update(crmTask)
    .set({ status, completedAt: now, completedBy: actor.userId, updatedAt: now })
    .where(and(eq(crmTask.id, taskId), eq(crmTask.status, "open")))
    .returning({ id: crmTask.id });
  return updated.length ? { ok: true } : fail("Zadanie nie jest otwarte");
}

// ---------------------------------------------------------------------------
// Szybki wpis (AC-17): firma, sprawa, wpis i zadania w jednym batchu
// ---------------------------------------------------------------------------

export interface QuickEntryResult {
  partnerId: string;
  threadId: string | null;
  entryId: string;
  similar: SimilarPartner[];
}

export async function createQuickEntry(actor: Actor, input: QuickEntryInput, now: Date = new Date()): Promise<Result<QuickEntryResult>> {
  const parsed = quickEntrySchema.safeParse(input);
  if (!parsed.success) return fail(firstIssue(parsed.error));
  const data = parsed.data;

  // Wszystkie identyfikatory i cała walidacja przed batchem (konwencja neon-http).
  const queries: unknown[] = [];
  let partnerId: string;
  let similar: SimilarPartner[] = [];
  if ("id" in data.partner) {
    partnerId = data.partner.id;
    if (!(await partnerExists(partnerId))) return fail("Nie znaleziono firmy");
  } else {
    partnerId = crypto.randomUUID();
    similar = await findSimilarPartners(data.partner.create.name);
    queries.push(db.insert(crmPartner).values({ id: partnerId, ...data.partner.create, createdBy: actor.userId }));
  }

  let threadId: string | null = null;
  if (data.thread) {
    if ("id" in data.thread) {
      threadId = data.thread.id;
      const thread = await threadOfPartner(threadId, partnerId);
      if (!thread) return fail("Sprawa nie należy do tej firmy");
      if (thread.closedAt && data.tasks.length) return fail("Sprawa jest zamknięta. Otwórz ją ponownie, żeby dodać zadania.");
    } else {
      const create = data.thread.create;
      if (!(await isActiveAdmin(create.ownerUserId))) return fail("Właściciel sprawy musi być aktywnym administratorem");
      const template = create.templateKey ? getCaseTemplate(create.templateKey) : null;
      if (create.templateKey && !template) return fail("Nieznany szablon sprawy");
      threadId = crypto.randomUUID();
      queries.push(
        db.insert(crmThread).values({
          id: threadId,
          partnerId,
          title: create.title,
          ownerUserId: create.ownerUserId,
          templateKey: template?.key ?? null,
          linkKind: create.link?.kind ?? null,
          linkId: create.link?.id ?? null,
        }),
      );
      if (template) {
        const drafts = buildTemplateTasks(template, warsawDateString(now), create.ownerUserId);
        queries.push(db.insert(crmTask).values(taskRows(partnerId, threadId, drafts, actor.userId)));
      }
    }
  }

  for (const task of data.tasks) {
    if (task.assignee.kind === "user" && !(await isActiveAdmin(task.assignee.userId))) {
      return fail("Osoba odpowiedzialna musi być aktywnym administratorem");
    }
  }

  const entryId = crypto.randomUUID();
  queries.push(db.insert(crmEntry).values(entryRow(entryId, partnerId, threadId, actor, data.entry, now)));
  if (data.tasks.length) {
    queries.push(
      db.insert(crmTask).values(
        data.tasks.map((task) => ({
          id: crypto.randomUUID(),
          partnerId,
          threadId,
          title: task.title,
          note: task.note,
          dueDate: task.dueDate,
          assigneeKind: task.assignee.kind,
          assigneeUserId: task.assignee.kind === "user" ? task.assignee.userId : null,
          externalContactId: task.assignee.kind === "external" ? task.assignee.contactId : null,
          createdBy: actor.userId,
          linkKind: task.link?.kind ?? null,
          linkId: task.link?.id ?? null,
        })),
      ),
    );
  }

  try {
    await db.batch(queries as unknown as BatchQueries);
  } catch (error) {
    // Albo powstaje wszystko, albo nic: batch jest jedną transakcją.
    captureError(error, { path: "conversations:createQuickEntry" });
    return fail("Nie udało się zapisać. Nic nie zostało dodane. Sprawdź, czy osoby kontaktowe należą do wybranej firmy.");
  }
  return { ok: true, partnerId, threadId, entryId, similar };
}

