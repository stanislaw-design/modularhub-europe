import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { caseField, channel, inquiry, message } from "@/lib/db/schema";
import { NIE_WIEM, getStartCard, startCardValues } from "@/lib/cases/start-cards";
import type {
  AnswerCardInput,
  AssessReadinessInput,
  UpsertCaseFieldInput,
} from "@/lib/case-schemas";
import { questionCardPayloadSchema } from "@/lib/case-schemas";
import { requireCaseAccess, type CaseActor } from "./access";
import type { Clock } from "./clock";

// Podsumowanie potrzeb i karty startowe (spec 0048 AC-7, AC-12, AC-13, AC-38
// do AC-44). Dostęp zawsze przez requireCaseAccess, tak jak reszta warstwy
// danych sprawy.

export type CaseFieldsByKey = Record<string, { value: unknown; state: string }>;

// Stan kart w interfejsie klienta (AC-43): karta jest odpowiedziana dokładnie
// wtedy, gdy case_field ma stan potwierdzone albo brak informacji, nigdy po
// osobnej fladze na wiadomości (AC-40).
export async function getCaseFields(inquiryId: string): Promise<CaseFieldsByKey> {
  const rows = await db
    .select({ key: caseField.key, value: caseField.value, state: caseField.state })
    .from(caseField)
    .where(eq(caseField.inquiryId, inquiryId));
  const byKey: CaseFieldsByKey = {};
  for (const row of rows) byKey[row.key] = { value: row.value, state: row.state };
  return byKey;
}

export type AnswerCardResult = { ok: true } | { ok: false; reason: "forbidden" | "invalid" };

// Odpowiedź klienta na kartę pytania, systemową (AC-38) albo od doradcy
// (AC-7). "nie wiem" zapisuje stan brak informacji zamiast potwierdzone,
// jedyny wyjątek od ogólnej reguły (AC-40). Upsert nadpisuje bez sprawdzania,
// czy karta była już odpowiedziana: dwie równoległe odpowiedzi kończą się
// jednym wierszem, ostatni zapis wygrywa (AC-40), nigdy błędem ani duplikatem.
export async function answerCard(actor: CaseActor, input: AnswerCardInput, clock: Clock): Promise<AnswerCardResult> {
  if (actor.kind !== "client") return { ok: false, reason: "forbidden" };

  const [row] = await db
    .select({ channelId: message.channelId, type: message.type, payload: message.payload })
    .from(message)
    .where(eq(message.id, input.messageId));
  if (!row || row.type !== "question_card") return { ok: false, reason: "invalid" };

  const access = await requireCaseAccess(actor, input.inquiryId, row.channelId);
  if (!access || !access.channelId) return { ok: false, reason: "forbidden" };

  const payload = questionCardPayloadSchema.safeParse(row.payload);
  if (!payload.success) return { ok: false, reason: "invalid" };
  const { fieldKey } = payload.data;

  const allowed = startCardValues(fieldKey);
  if (!allowed.includes(input.value)) return { ok: false, reason: "invalid" };

  const isUnsure = input.value === NIE_WIEM;
  await db
    .insert(caseField)
    .values({
      inquiryId: input.inquiryId,
      key: fieldKey,
      value: isUnsure ? null : input.value,
      state: isUnsure ? "missing" : "confirmed",
      source: "client_card",
      updatedBy: actor.userId,
      updatedAt: clock.now(),
    })
    .onConflictDoUpdate({
      target: [caseField.inquiryId, caseField.key],
      set: {
        value: isUnsure ? null : input.value,
        state: isUnsure ? "missing" : "confirmed",
        source: "client_card",
        updatedBy: actor.userId,
        updatedAt: clock.now(),
      },
    });

  return { ok: true };
}

export type UpsertCaseFieldResult = { ok: true } | { ok: false; reason: "forbidden" | "invalid" };

// Doradca prowadzi lub poprawia podsumowanie potrzeb (AC-12). Stan brak
// informacji i nie dotyczy nigdy nie noszą wartości: tylko potwierdzone i
// założenie doradcy wskazują jedną z opcji katalogu danego klucza.
export async function upsertCaseField(
  actor: CaseActor,
  input: UpsertCaseFieldInput,
  clock: Clock,
): Promise<UpsertCaseFieldResult> {
  if (actor.kind !== "advisor") return { ok: false, reason: "forbidden" };
  const access = await requireCaseAccess(actor, input.inquiryId);
  if (!access) return { ok: false, reason: "forbidden" };

  const card = getStartCard(input.key);
  if (!card) return { ok: false, reason: "invalid" };

  const needsValue = input.state === "confirmed" || input.state === "assumption";
  if (needsValue && (input.value === null || !card.options.some((option) => option.value === input.value))) {
    return { ok: false, reason: "invalid" };
  }

  await db
    .insert(caseField)
    .values({
      inquiryId: input.inquiryId,
      key: input.key,
      value: needsValue ? input.value : null,
      state: input.state,
      source: "advisor",
      updatedBy: actor.userId,
      updatedAt: clock.now(),
    })
    .onConflictDoUpdate({
      target: [caseField.inquiryId, caseField.key],
      set: {
        value: needsValue ? input.value : null,
        state: input.state,
        source: "advisor",
        updatedBy: actor.userId,
        updatedAt: clock.now(),
      },
    });

  return { ok: true };
}

export type AssessReadinessResult = { ok: true } | { ok: false; reason: "forbidden" };

// Ocena gotowości (AC-13). "outcome" nie ma własnej kolumny: jego jedyny ślad
// jest w stage/waitingOn/closedReason, kolumnach, które już istnieją, plus
// wiadomość z wyjaśnieniem, którą ta akcja zawsze wysyła do klienta. Klient
// nigdy nie widzi outcome ani etykiety "odrzucone" w żadnym języku.
export async function assessReadiness(
  actor: CaseActor,
  input: AssessReadinessInput,
  clock: Clock,
): Promise<AssessReadinessResult> {
  if (actor.kind !== "advisor") return { ok: false, reason: "forbidden" };
  const access = await requireCaseAccess(actor, input.inquiryId);
  if (!access) return { ok: false, reason: "forbidden" };

  const [channelRow] = await db
    .select({ id: channel.id })
    .from(channel)
    .where(and(eq(channel.inquiryId, input.inquiryId), eq(channel.kind, "klient_doradca")));
  if (!channelRow) return { ok: false, reason: "forbidden" };

  const [caseRow] = await db.select({ stage: inquiry.stage }).from(inquiry).where(eq(inquiry.id, input.inquiryId));
  if (!caseRow) return { ok: false, reason: "forbidden" };

  const now = clock.now();
  const inquiryUpdate: Partial<typeof inquiry.$inferInsert> = { lastAdvisorActivityAt: now };

  switch (input.outcome) {
    case "ready_for_brief":
      if (caseRow.stage === "nowe" || caseRow.stage === "rozmowa") {
        inquiryUpdate.stage = "brief_do_zatwierdzenia";
      }
      inquiryUpdate.waitingOn = "advisor";
      break;
    case "needs_more_info":
    case "needs_plot_analysis":
      inquiryUpdate.waitingOn = "client";
      break;
    case "no_producer":
      inquiryUpdate.stage = "zamkniete_bez_wyboru";
      inquiryUpdate.closedReason = "inny";
      inquiryUpdate.closedAt = now;
      inquiryUpdate.waitingOn = null;
      break;
    case "out_of_area":
      inquiryUpdate.stage = "zamkniete_bez_wyboru";
      inquiryUpdate.closedReason = "poza_obszarem";
      inquiryUpdate.closedAt = now;
      inquiryUpdate.waitingOn = null;
      break;
    case "handoff_b2b":
      inquiryUpdate.stage = "zamkniete_bez_wyboru";
      inquiryUpdate.closedReason = "do_b2b";
      inquiryUpdate.closedAt = now;
      inquiryUpdate.waitingOn = null;
      break;
  }

  await db.batch([
    db.insert(message).values({
      channelId: channelRow.id,
      authorUserId: actor.userId,
      authorKind: "advisor",
      type: "text",
      body: input.message,
      locale: input.locale,
    }),
    db.update(inquiry).set(inquiryUpdate).where(eq(inquiry.id, input.inquiryId)),
  ]);

  return { ok: true };
}
