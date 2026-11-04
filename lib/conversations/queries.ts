import "server-only";
import { and, asc, desc, eq, ilike, inArray, isNull, or, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { country, crmContact, crmEntry, crmPartner, crmTask, crmThread, producer, users } from "@/lib/db/schema";
import { PARTNERS_PAGE_SIZE, type PartnerKind, type ThreadStatus } from "./constants";
import { classifyTodayTask, computeThreadStatus, partnerNamesSimilar, taskOwnerUserId, type TodaySection } from "./status";

// Odczyty notatnika rozmów (spec 0080). Status sprawy jest zawsze wyliczany tutaj z zadań,
// nigdy czytany z kolumny. Brama roli jest w stronach i akcjach, nie tu.

export interface AdminOption {
  id: string;
  name: string;
  email: string;
}

/** Aktywni administratorzy: rola `admin`, konto nieusunięte i niezablokowane. */
export async function listActiveAdmins(): Promise<AdminOption[]> {
  const rows = await db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(users)
    .where(and(eq(users.role, "admin"), isNull(users.deletedAt), isNull(users.blockedAt)))
    .orderBy(asc(users.name), asc(users.email));
  return rows.map((row) => ({ id: row.id, name: row.name ?? row.email, email: row.email }));
}

/** Nazwy użytkowników po id, także nieaktywnych (do pokazania "nieaktywny administrator"). */
export async function getUserLabels(
  ids: string[],
): Promise<Map<string, { name: string; active: boolean }>> {
  const unique = [...new Set(ids)];
  if (!unique.length) return new Map();
  const rows = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      deletedAt: users.deletedAt,
      blockedAt: users.blockedAt,
    })
    .from(users)
    .where(inArray(users.id, unique));
  return new Map(
    rows.map((row) => [
      row.id,
      { name: row.name ?? row.email, active: row.role === "admin" && !row.deletedAt && !row.blockedAt },
    ]),
  );
}

// ---------------------------------------------------------------------------
// Lista firm
// ---------------------------------------------------------------------------

export interface PartnerListFilters {
  q?: string;
  kind?: PartnerKind;
  countryCode?: string;
  archived?: boolean;
  page?: number;
}

export interface PartnerListRow {
  id: string;
  name: string;
  kind: PartnerKind;
  countryCode: string | null;
  tags: string[];
  archivedAt: Date | null;
  producerId: string | null;
  openThreads: number;
  openTasks: number;
}

export async function listPartners(filters: PartnerListFilters): Promise<{ rows: PartnerListRow[]; total: number; page: number; pageCount: number }> {
  const conditions = [filters.archived ? sql`${crmPartner.archivedAt} IS NOT NULL` : isNull(crmPartner.archivedAt)];
  const q = filters.q?.trim();
  if (q) {
    const like = `%${q.replace(/[%_\\]/g, (char) => `\\${char}`)}%`;
    conditions.push(or(ilike(crmPartner.name, like), ilike(crmPartner.notes, like), sql`EXISTS (SELECT 1 FROM unnest(${crmPartner.tags}) AS tag WHERE tag ILIKE ${like})`)!);
  }
  if (filters.kind) conditions.push(eq(crmPartner.kind, filters.kind));
  if (filters.countryCode) conditions.push(eq(crmPartner.countryCode, filters.countryCode));
  const where = and(...conditions);

  const [{ total }] = await db.select({ total: sql<number>`count(*)::int` }).from(crmPartner).where(where);
  const pageCount = Math.max(1, Math.ceil(total / PARTNERS_PAGE_SIZE));
  const page = Math.min(Math.max(1, filters.page ?? 1), pageCount);

  const rows = await db
    .select({
      id: crmPartner.id,
      name: crmPartner.name,
      kind: crmPartner.kind,
      countryCode: crmPartner.countryCode,
      tags: crmPartner.tags,
      archivedAt: crmPartner.archivedAt,
      producerId: crmPartner.producerId,
      openThreads: sql<number>`(SELECT count(*)::int FROM crm_thread t WHERE t.partner_id = ${crmPartner.id} AND t.closed_at IS NULL)`,
      openTasks: sql<number>`(SELECT count(*)::int FROM crm_task k WHERE k.partner_id = ${crmPartner.id} AND k.status = 'open')`,
    })
    .from(crmPartner)
    .where(where)
    .orderBy(asc(sql`lower(${crmPartner.name})`))
    .limit(PARTNERS_PAGE_SIZE)
    .offset((page - 1) * PARTNERS_PAGE_SIZE);

  return { rows: rows.map((row) => ({ ...row, kind: row.kind as PartnerKind })), total, page, pageCount };
}

export async function listCountries(): Promise<{ code: string; name: string }[]> {
  return db.select({ code: country.code, name: country.name }).from(country).orderBy(asc(country.name));
}

// ---------------------------------------------------------------------------
// Karta firmy i karta sprawy
// ---------------------------------------------------------------------------

export interface ThreadRow {
  id: string;
  partnerId: string;
  title: string;
  ownerUserId: string;
  closedAt: Date | null;
  linkKind: string | null;
  linkId: string | null;
  createdAt: Date;
  status: ThreadStatus;
  openUserTasks: number;
  openExternalTasks: number;
}

const threadColumns = {
  id: crmThread.id,
  partnerId: crmThread.partnerId,
  title: crmThread.title,
  ownerUserId: crmThread.ownerUserId,
  closedAt: crmThread.closedAt,
  linkKind: crmThread.linkKind,
  linkId: crmThread.linkId,
  createdAt: crmThread.createdAt,
  openUserTasks: sql<number>`(SELECT count(*)::int FROM crm_task k WHERE k.thread_id = ${crmThread.id} AND k.status = 'open' AND k.assignee_kind = 'user')`,
  openExternalTasks: sql<number>`(SELECT count(*)::int FROM crm_task k WHERE k.thread_id = ${crmThread.id} AND k.status = 'open' AND k.assignee_kind = 'external')`,
};

function withStatus<T extends { closedAt: Date | null; openUserTasks: number; openExternalTasks: number }>(row: T): T & { status: ThreadStatus } {
  return { ...row, status: computeThreadStatus(row) };
}

export interface TaskRow {
  id: string;
  partnerId: string;
  threadId: string | null;
  threadTitle: string | null;
  title: string;
  note: string | null;
  dueDate: string | null;
  assigneeKind: "user" | "external";
  assigneeUserId: string | null;
  externalContactId: string | null;
  externalContactName: string | null;
  status: "open" | "done" | "cancelled";
  createdBy: string;
  linkKind: string | null;
  linkId: string | null;
}

const taskColumns = {
  id: crmTask.id,
  partnerId: crmTask.partnerId,
  threadId: crmTask.threadId,
  threadTitle: crmThread.title,
  title: crmTask.title,
  note: crmTask.note,
  dueDate: crmTask.dueDate,
  assigneeKind: crmTask.assigneeKind,
  assigneeUserId: crmTask.assigneeUserId,
  externalContactId: crmTask.externalContactId,
  externalContactName: crmContact.name,
  status: crmTask.status,
  createdBy: crmTask.createdBy,
  linkKind: crmTask.linkKind,
  linkId: crmTask.linkId,
};

function selectTasks() {
  return db
    .select(taskColumns)
    .from(crmTask)
    .leftJoin(crmThread, eq(crmThread.id, crmTask.threadId))
    .leftJoin(crmContact, eq(crmContact.id, crmTask.externalContactId));
}

export interface EntryRow {
  id: string;
  partnerId: string;
  threadId: string | null;
  threadTitle: string | null;
  contactId: string | null;
  contactName: string | null;
  authorUserId: string;
  occurredAt: Date;
  direction: "outbound" | "inbound" | "internal";
  channel: "phone" | "whatsapp" | "email" | "meeting" | "platform" | "other";
  body: string;
  source: "web" | "bot";
  editedAt: Date | null;
}

function selectEntries() {
  return db
    .select({
      id: crmEntry.id,
      partnerId: crmEntry.partnerId,
      threadId: crmEntry.threadId,
      threadTitle: crmThread.title,
      contactId: crmEntry.contactId,
      contactName: crmContact.name,
      authorUserId: crmEntry.authorUserId,
      occurredAt: crmEntry.occurredAt,
      direction: crmEntry.direction,
      channel: crmEntry.channel,
      body: crmEntry.body,
      source: crmEntry.source,
      editedAt: crmEntry.editedAt,
    })
    .from(crmEntry)
    .leftJoin(crmThread, eq(crmThread.id, crmEntry.threadId))
    .leftJoin(crmContact, eq(crmContact.id, crmEntry.contactId));
}

export interface PartnerCard {
  partner: {
    id: string;
    name: string;
    kind: PartnerKind;
    website: string | null;
    countryCode: string | null;
    countryName: string | null;
    tags: string[];
    notes: string | null;
    producerId: string | null;
    archivedAt: Date | null;
  };
  producer: { available: true; name: string; nip: string; verificationStatus: string } | { available: false } | null;
  contacts: (typeof crmContact.$inferSelect)[];
  threads: ThreadRow[];
  entries: EntryRow[];
  tasks: TaskRow[];
}

export async function getPartnerCard(partnerId: string, entryThreadFilter?: string): Promise<PartnerCard | null> {
  const [partner] = await db
    .select({
      id: crmPartner.id,
      name: crmPartner.name,
      kind: crmPartner.kind,
      website: crmPartner.website,
      countryCode: crmPartner.countryCode,
      countryName: country.name,
      tags: crmPartner.tags,
      notes: crmPartner.notes,
      producerId: crmPartner.producerId,
      archivedAt: crmPartner.archivedAt,
    })
    .from(crmPartner)
    .leftJoin(country, eq(country.code, crmPartner.countryCode))
    .where(eq(crmPartner.id, partnerId))
    .limit(1);
  if (!partner) return null;

  const entryWhere = and(
    eq(crmEntry.partnerId, partnerId),
    isNull(crmEntry.deletedAt),
    entryThreadFilter ? eq(crmEntry.threadId, entryThreadFilter) : undefined,
  );

  const [contacts, threads, entries, tasks, producerInfo] = await Promise.all([
    db
      .select()
      .from(crmContact)
      .where(and(eq(crmContact.partnerId, partnerId), isNull(crmContact.deletedAt)))
      .orderBy(asc(crmContact.createdAt)),
    db.select(threadColumns).from(crmThread).where(eq(crmThread.partnerId, partnerId)).orderBy(desc(crmThread.createdAt)),
    selectEntries().where(entryWhere).orderBy(desc(crmEntry.occurredAt)),
    selectTasks()
      .where(eq(crmTask.partnerId, partnerId))
      .orderBy(sql`${crmTask.status} = 'open' DESC`, sql`${crmTask.dueDate} ASC NULLS LAST`, asc(crmTask.createdAt)),
    partner.producerId ? readProducerInfo(partner.producerId) : Promise.resolve(null),
  ]);

  return {
    partner: { ...partner, kind: partner.kind as PartnerKind },
    producer: producerInfo,
    contacts,
    threads: threads.map(withStatus),
    entries: entries as EntryRow[],
    tasks: tasks as TaskRow[],
  };
}

/** NIP i status weryfikacji czytane z `producer` (AC-7); brak lub usunięty producent to "konto niedostępne". */
async function readProducerInfo(producerId: string): Promise<PartnerCard["producer"]> {
  try {
    const [row] = await db
      .select({ name: producer.name, nip: producer.nip, verificationStatus: producer.verificationStatus, deletedAt: producer.deletedAt })
      .from(producer)
      .where(eq(producer.id, producerId))
      .limit(1);
    if (!row || row.deletedAt) return { available: false };
    return { available: true, name: row.name, nip: row.nip, verificationStatus: row.verificationStatus };
  } catch {
    return { available: false };
  }
}

export interface ThreadCard {
  thread: ThreadRow & { partnerName: string; templateKey: string | null };
  tasks: TaskRow[];
  entries: EntryRow[];
}

export async function getThreadCard(threadId: string): Promise<ThreadCard | null> {
  const [thread] = await db
    .select({ ...threadColumns, partnerName: crmPartner.name, templateKey: crmThread.templateKey })
    .from(crmThread)
    .innerJoin(crmPartner, eq(crmPartner.id, crmThread.partnerId))
    .where(eq(crmThread.id, threadId))
    .limit(1);
  if (!thread) return null;
  const [tasks, entries] = await Promise.all([
    selectTasks()
      .where(eq(crmTask.threadId, threadId))
      .orderBy(sql`${crmTask.status} = 'open' DESC`, sql`${crmTask.dueDate} ASC NULLS LAST`, asc(crmTask.createdAt)),
    selectEntries().where(and(eq(crmEntry.threadId, threadId), isNull(crmEntry.deletedAt))).orderBy(desc(crmEntry.occurredAt)),
  ]);
  return { thread: withStatus(thread), tasks: tasks as TaskRow[], entries: entries as EntryRow[] };
}

// ---------------------------------------------------------------------------
// "Najbliższe" (AC-15)
// ---------------------------------------------------------------------------

export interface TodayTask extends TaskRow {
  partnerName: string;
  threadOwnerUserId: string | null;
  ownerUserId: string;
  /** Osoba, do której zadanie należy według reguły "moje". */
  responsibleLabel: string;
  responsibleActive: boolean;
}

export type TodayView = Record<TodaySection, TodayTask[]>;

/** Dzień "dziś" w Europe/Warsaw liczony w SQL, bez zależności od strefy procesu. */
export async function getWarsawToday(): Promise<string> {
  const result = await db.execute<{ today: string }>(sql`SELECT ((now() AT TIME ZONE 'Europe/Warsaw')::date)::text AS today`);
  return result.rows[0].today;
}

/** Otwarte zadania aktywnych (niezarchiwizowanych) firm i otwartych spraw, z właścicielem według reguły "moje". */
export async function listOpenTasksWithOwners(): Promise<TodayTask[]> {
  const rows = await db
    .select({
      ...taskColumns,
      partnerName: crmPartner.name,
      threadOwnerUserId: crmThread.ownerUserId,
    })
    .from(crmTask)
    .innerJoin(crmPartner, eq(crmPartner.id, crmTask.partnerId))
    .leftJoin(crmThread, eq(crmThread.id, crmTask.threadId))
    .leftJoin(crmContact, eq(crmContact.id, crmTask.externalContactId))
    .where(and(eq(crmTask.status, "open"), isNull(crmPartner.archivedAt), sql`(${crmTask.threadId} IS NULL OR ${crmThread.closedAt} IS NULL)`))
    .orderBy(sql`${crmTask.dueDate} ASC NULLS LAST`, asc(crmTask.createdAt));

  const ownerIds = rows.map((row) => taskOwnerUserId({ ...row, assigneeKind: row.assigneeKind as "user" | "external" }));
  const labels = await getUserLabels(ownerIds);
  return rows.map((row) => {
    const assigneeKind = row.assigneeKind as "user" | "external";
    const ownerUserId = taskOwnerUserId({ ...row, assigneeKind });
    const label = labels.get(ownerUserId);
    return {
      ...row,
      assigneeKind,
      status: row.status as TaskRow["status"],
      threadOwnerUserId: row.threadOwnerUserId,
      ownerUserId,
      responsibleLabel: label ? (label.active ? label.name : `${label.name} (nieaktywny administrator)`) : "nieaktywny administrator",
      responsibleActive: label?.active ?? false,
    };
  });
}

export async function getTodayView(viewerUserId: string, scope: "mine" | "all"): Promise<{ today: string; view: TodayView }> {
  const [today, tasks] = await Promise.all([getWarsawToday(), listOpenTasksWithOwners()]);
  const view: TodayView = { toDo: [], waitingThem: [], noDueDate: [] };
  for (const task of tasks) {
    if (scope === "mine" && task.ownerUserId !== viewerUserId) continue;
    const section = classifyTodayTask(task);
    if (section) view[section].push(task);
  }
  return { today, view };
}

// ---------------------------------------------------------------------------
// Opcje do okna szybkiego wpisu (AC-17)
// ---------------------------------------------------------------------------

export interface QuickEntryOptions {
  partners: { id: string; name: string }[];
  threads: { id: string; partnerId: string; title: string }[];
  contacts: { id: string; partnerId: string; name: string }[];
}

/** Aktywne firmy, otwarte sprawy i osoby kontaktowe: przy skali dwóch administratorów to małe listy. */
export async function getQuickEntryOptions(): Promise<QuickEntryOptions> {
  const [partners, threads, contacts] = await Promise.all([
    db
      .select({ id: crmPartner.id, name: crmPartner.name })
      .from(crmPartner)
      .where(isNull(crmPartner.archivedAt))
      .orderBy(asc(sql`lower(${crmPartner.name})`)),
    db
      .select({ id: crmThread.id, partnerId: crmThread.partnerId, title: crmThread.title })
      .from(crmThread)
      .innerJoin(crmPartner, eq(crmPartner.id, crmThread.partnerId))
      .where(and(isNull(crmThread.closedAt), isNull(crmPartner.archivedAt)))
      .orderBy(asc(crmThread.title)),
    db
      .select({ id: crmContact.id, partnerId: crmContact.partnerId, name: crmContact.name })
      .from(crmContact)
      .innerJoin(crmPartner, eq(crmPartner.id, crmContact.partnerId))
      .where(and(isNull(crmContact.deletedAt), isNull(crmPartner.archivedAt)))
      .orderBy(asc(crmContact.name)),
  ]);
  return { partners, threads, contacts };
}

// ---------------------------------------------------------------------------
// Podpowiedzi producentów do połączenia z firmą (AC-7)
// ---------------------------------------------------------------------------

export type ProducerSuggestionReason = "email" | "name" | "search";

export interface ProducerSuggestion {
  id: string;
  name: string;
  nip: string;
  countryCode: string;
  verificationStatus: string;
  reason: ProducerSuggestionReason;
  /** Firma, z którą producent jest już połączony (także zarchiwizowana); wtedy nie da się go wybrać. */
  linkedPartnerId: string | null;
  linkedPartnerName: string | null;
  linkedPartnerArchived: boolean;
}

const SUGGESTION_LIMIT = 12;

/** Wzorzec ILIKE "zawiera" z zabezpieczonymi znakami specjalnymi. */
function escapeLike(value: string): string {
  return "%" + value.replace(/[%_\\]/g, (char) => "\\" + char) + "%";
}

/**
 * Producenci do wyboru: najpierw ci, których konto ma mail jednej z osób kontaktowych firmy, potem
 * o nazwie podobnej do nazwy firmy (ta sama reguła co ostrzeżenie o duplikatach), na końcu trafienia
 * wpisanej nazwy (od 2 znaków). Wyszukiwanie po nazwie działa także bez podpowiedzi.
 */
export async function suggestProducersForPartner(partnerId: string, rawQuery: string): Promise<ProducerSuggestion[]> {
  const q = rawQuery.trim().slice(0, 100);
  const [partner] = await db.select({ name: crmPartner.name }).from(crmPartner).where(eq(crmPartner.id, partnerId)).limit(1);
  if (!partner) return [];

  const contactEmails = (
    await db
      .select({ email: crmContact.email })
      .from(crmContact)
      .where(and(eq(crmContact.partnerId, partnerId), isNull(crmContact.deletedAt)))
  ).flatMap((row) => (row.email ? [row.email.trim().toLowerCase()] : []));

  const base = {
    id: producer.id,
    name: producer.name,
    nip: producer.nip,
    countryCode: producer.countryCode,
    verificationStatus: producer.verificationStatus,
    linkedPartnerId: crmPartner.id,
    linkedPartnerName: crmPartner.name,
    linkedPartnerArchivedAt: crmPartner.archivedAt,
  };
  const select = () =>
    db
      .select(base)
      .from(producer)
      .leftJoin(crmPartner, eq(crmPartner.producerId, producer.id))
      .innerJoin(users, eq(users.id, producer.userId));

  const [byEmail, allProducers, byQuery] = await Promise.all([
    contactEmails.length
      ? select().where(and(isNull(producer.deletedAt), inArray(sql`lower(${users.email})`, contactEmails)))
      : Promise.resolve([]),
    select().where(isNull(producer.deletedAt)),
    q.length >= 2
      ? select()
          .where(and(isNull(producer.deletedAt), ilike(producer.name, escapeLike(q))))
          .orderBy(asc(producer.name))
          .limit(SUGGESTION_LIMIT)
      : Promise.resolve([]),
  ]);

  const result = new Map<string, ProducerSuggestion>();
  const add = (rows: (typeof byEmail), reason: ProducerSuggestionReason) => {
    for (const row of rows) {
      if (result.has(row.id)) continue;
      result.set(row.id, {
        id: row.id,
        name: row.name,
        nip: row.nip,
        countryCode: row.countryCode,
        verificationStatus: row.verificationStatus,
        reason,
        linkedPartnerId: row.linkedPartnerId,
        linkedPartnerName: row.linkedPartnerName,
        linkedPartnerArchived: row.linkedPartnerArchivedAt !== null,
      });
    }
  };
  add(byEmail, "email");
  add(allProducers.filter((row) => partnerNamesSimilar(row.name, partner.name)), "name");
  add(byQuery, "search");
  return [...result.values()].slice(0, SUGGESTION_LIMIT);
}
