import { and, asc, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { channel, channelReadState, inquiry, message } from "@/lib/db/schema";
import type { CaseMessageDto } from "@/lib/case-schemas";
import { requireCaseAccess, type CaseActor } from "./access";
import type { Clock } from "./clock";
import { encodeCursor } from "./poll";

// Warstwa danych komunikatora (spec 0048). Nie jest plikiem "use server":
// zegar jest wstrzykiwany (AC-6), a Server Actions w lib/case-actions.ts
// wołają tu zawsze z systemClock, nigdy z wartości od klienta.

const PAGE_SIZE = 100;
const MICROSECOND_ISO = sql<string>`to_char(${message.createdAt} at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"')`;

const messageColumns = {
  id: message.id,
  authorKind: message.authorKind,
  type: message.type,
  body: message.body,
  locale: message.locale,
  redactedAt: message.redactedAt,
  createdAtIso: MICROSECOND_ISO,
};

function toDto(row: {
  id: string;
  authorKind: CaseMessageDto["authorKind"];
  type: string;
  body: string | null;
  locale: string;
  redactedAt: Date | null;
  createdAtIso: string;
}): CaseMessageDto {
  return {
    id: row.id,
    authorKind: row.authorKind,
    type: row.type,
    body: row.body,
    locale: row.locale,
    createdAt: row.createdAtIso,
    cursor: encodeCursor(row.createdAtIso, row.id),
    redacted: row.redactedAt !== null,
  };
}

// Prosty odczyt po indeksie (channel_id, created_at, id), bez łączenia z
// innymi tabelami (spec 0048 Polling). Bez kursora zwraca najnowszą stronę.
export async function listMessages(
  channelId: string,
  cursor: { createdAt: string; id: string } | null,
): Promise<CaseMessageDto[]> {
  if (cursor) {
    const rows = await db
      .select(messageColumns)
      .from(message)
      .where(
        and(
          eq(message.channelId, channelId),
          sql`(${message.createdAt}, ${message.id}) > (${cursor.createdAt}::timestamptz, ${cursor.id}::uuid)`,
        ),
      )
      .orderBy(asc(message.createdAt), asc(message.id))
      .limit(PAGE_SIZE);
    return rows.map(toDto);
  }

  const newest = await db
    .select(messageColumns)
    .from(message)
    .where(eq(message.channelId, channelId))
    .orderBy(sql`${message.createdAt} desc, ${message.id} desc`)
    .limit(PAGE_SIZE);
  return newest.map(toDto).reverse();
}

export async function touchChannel(
  channelId: string,
  userId: string,
  clock: Clock,
  options: { read?: boolean } = {},
): Promise<void> {
  const now = clock.now();
  await db
    .insert(channelReadState)
    .values({ channelId, userId, lastSeenAt: now, lastReadAt: options.read ? now : null })
    .onConflictDoUpdate({
      target: [channelReadState.channelId, channelReadState.userId],
      set: options.read ? { lastSeenAt: now, lastReadAt: now } : { lastSeenAt: now },
    });
}

export interface PostMessageInput {
  inquiryId: string;
  channelId: string;
  body: string;
  locale: string;
  idempotencyKey: string;
}

export type PostMessageResult =
  | { ok: true; message: CaseMessageDto; created: boolean; firstAdvisorReply: boolean; inquiryId: string }
  | { ok: false; reason: "forbidden" };

// Dostęp zawsze przez requireCaseAccess (AC-31). Ponowienie z tym samym kluczem
// idempotencji zwraca istniejący wiersz zamiast duplikatu (AC-6).
export async function postMessage(
  actor: CaseActor,
  input: PostMessageInput,
  clock: Clock,
): Promise<PostMessageResult> {
  const access = await requireCaseAccess(actor, input.inquiryId, input.channelId);
  if (!access || !access.channelId) return { ok: false, reason: "forbidden" };

  const inserted = await db
    .insert(message)
    .values({
      channelId: input.channelId,
      authorUserId: actor.userId,
      authorKind: actor.kind,
      type: "text",
      body: input.body,
      locale: input.locale,
      idempotencyKey: input.idempotencyKey,
    })
    .onConflictDoNothing({ target: [message.channelId, message.idempotencyKey] })
    .returning({ id: message.id });

  const created = inserted.length > 0;
  const [row] = await db
    .select(messageColumns)
    .from(message)
    .where(
      created
        ? eq(message.id, inserted[0].id)
        : and(eq(message.channelId, input.channelId), eq(message.idempotencyKey, input.idempotencyKey)),
    );
  if (!row) return { ok: false, reason: "forbidden" };

  let firstAdvisorReply = false;
  if (created) {
    firstAdvisorReply = await advanceCaseAfterMessage(actor, input, clock);
  }

  return { ok: true, message: toDto(row), created, firstAdvisorReply, inquiryId: input.inquiryId };
}

// Po nowej wiadomości w kanale klient_doradca przestawia, kto ma następny ruch
// (waiting_on jest osobne od etapu, spec 0048), i przesuwa etap nowe -> rozmowa
// przy pierwszej odpowiedzi doradcy. Zwraca true dla pierwszej odpowiedzi.
async function advanceCaseAfterMessage(
  actor: CaseActor,
  input: PostMessageInput,
  clock: Clock,
): Promise<boolean> {
  if (actor.kind === "producer") return false;

  const [channelRow] = await db.select({ kind: channel.kind }).from(channel).where(eq(channel.id, input.channelId));
  if (channelRow?.kind !== "klient_doradca") return false;

  const now = clock.now();

  if (actor.kind === "client") {
    await db
      .update(inquiry)
      .set({ lastClientActivityAt: now, waitingOn: "advisor" })
      .where(eq(inquiry.id, input.inquiryId));
    return false;
  }

  const [before] = await db
    .select({
      stage: inquiry.stage,
      lastAdvisorActivityAt: inquiry.lastAdvisorActivityAt,
      assignedAdvisorId: inquiry.assignedAdvisorId,
    })
    .from(inquiry)
    .where(eq(inquiry.id, input.inquiryId));
  if (!before) return false;

  await db
    .update(inquiry)
    .set({
      lastAdvisorActivityAt: now,
      waitingOn: "client",
      stage: before.stage === "nowe" ? "rozmowa" : before.stage,
      assignedAdvisorId: before.assignedAdvisorId ?? actor.userId,
    })
    .where(eq(inquiry.id, input.inquiryId));

  return before.lastAdvisorActivityAt === null;
}
