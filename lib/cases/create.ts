import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { getPgErrorCode } from "@/lib/db/pg-error";
import { channel, inquiry, inquiryItem, message } from "@/lib/db/schema";
import { microOffsetTimestamp, type Clock } from "./clock";
import { START_CARDS } from "./start-cards";

export interface CreateAdvisoryCaseInput {
  // null = sprawa gościa (spec 0066): bez konta, tylko migawka kontaktu.
  clientId: string | null;
  contact: { name: string; email: string; phone: string };
  projectIds: string[];
  plot: { street: string; postalCode: string; city: string; countryCode: string };
  message: string | null;
  idempotencyKey: string;
  locale: string;
  // Treść pierwszej wiadomości systemowej w języku klienta (AC-3).
  systemNoticeBody: string;
  // Spec 0066 AC-14: zalogowany klient ma kontakt potwierdzony od razu, gość
  // nie (null).
  contactEmailVerifiedAt?: Date | null;
}

// Ten sam klucz idempotencji użyty z innym e mailem albo innym klientem
// (spec 0066 AC-4): nigdy nie zwracamy cudzej sprawy.
export class IdempotencyConflictError extends Error {
  constructor() {
    super("Idempotency key already used by a different requester");
    this.name = "IdempotencyConflictError";
  }
}

type CaseRequester = { clientId: string | null; email: string };

export interface CreateAdvisoryCaseResult {
  inquiryId: string;
  channelId: string;
  created: boolean;
}

// Dla klienta pasuje klucz i client_id, dla gościa klucz i e mail (sprawa
// mogła już zostać przypięta do konta, ale to nadal jego zgłoszenie).
function isSameRequester(row: { clientId: string | null; email: string }, requester: CaseRequester): boolean {
  if (requester.clientId) return row.clientId === requester.clientId;
  return row.email.toLowerCase() === requester.email.toLowerCase();
}

export async function findExistingAdvisoryCase(idempotencyKey: string, requester: CaseRequester) {
  const [row] = await db
    .select({ id: inquiry.id, clientId: inquiry.clientId, email: inquiry.email })
    .from(inquiry)
    .where(eq(inquiry.idempotencyKey, idempotencyKey));
  if (!row) return null;
  if (!isSameRequester(row, requester)) throw new IdempotencyConflictError();

  const [channelRow] = await db.select({ id: channel.id }).from(channel).where(eq(channel.inquiryId, row.id));
  return channelRow ? { inquiryId: row.id, channelId: channelRow.id } : null;
}

// Sprawa, pozycje, kanał klient_doradca i wiadomość systemowa w jednym
// db.batch (transakcja neon-http) z identyfikatorami wygenerowanymi w
// aplikacji (spec 0048 AC-3). Najpierw odczyt po kluczu idempotencji, więc
// powtórka zwraca tę samą sprawę i ten sam kanał; wyścig dwóch równoległych
// wysyłek kończy się błędem unikalności (23505), po którym czytamy zwycięzcę.
export async function createAdvisoryCase(
  input: CreateAdvisoryCaseInput,
  clock: Clock,
): Promise<CreateAdvisoryCaseResult> {
  const requester = { clientId: input.clientId, email: input.contact.email };
  const existing = await findExistingAdvisoryCase(input.idempotencyKey, requester);
  if (existing) return { ...existing, created: false };

  const inquiryId = crypto.randomUUID();
  const channelId = crypto.randomUUID();
  const now = clock.now();

  // Wiadomość systemowa i sześć kart startowych (AC-38) powstają w tej samej
  // operacji, w jawnie rosnącej kolejności: systemowa, cztery karty warstwy
  // pierwszej, dwie karty warstwy drugiej. defaultNow() nie gwarantuje
  // kolejności w jednym db.batch, więc każdy wiersz dostaje jawny, rosnący o
  // co najmniej mikrosekundę created_at (microOffsetTimestamp).
  const orderedCardKeys = [
    ...START_CARDS.filter((card) => card.layer === 1).map((card) => card.key),
    ...START_CARDS.filter((card) => card.layer === 2).map((card) => card.key),
  ];
  const cardTimestamps = [0, ...orderedCardKeys.map((_, index) => index + 1)].map((offset) =>
    microOffsetTimestamp(now, offset),
  );

  try {
    await db.batch([
      db.insert(inquiry).values({
        id: inquiryId,
        clientId: input.clientId,
        name: input.contact.name,
        email: input.contact.email,
        phone: input.contact.phone,
        deliveryCountryCode: input.plot.countryCode,
        idempotencyKey: input.idempotencyKey,
        plotStreet: input.plot.street,
        plotPostalCode: input.plot.postalCode,
        plotCity: input.plot.city,
        clientMessage: input.message,
        stage: "nowe",
        locale: input.locale,
        contactEmailVerifiedAt: input.contactEmailVerifiedAt ?? null,
        waitingOn: "advisor",
        lastClientActivityAt: now,
      }),
      db.insert(inquiryItem).values(input.projectIds.map((productId) => ({ inquiryId, productId }))),
      db.insert(channel).values({ id: channelId, inquiryId, kind: "klient_doradca" }),
      db.insert(message).values([
        {
          channelId,
          authorKind: "system",
          type: "system_notice",
          body: input.systemNoticeBody,
          payload: { code: "case_received" },
          locale: input.locale,
          createdAt: sql`${cardTimestamps[0]}::timestamptz`,
        },
        ...orderedCardKeys.map((fieldKey, index) => ({
          channelId,
          authorKind: "system" as const,
          type: "question_card" as const,
          body: null,
          payload: { fieldKey, allowUnsure: true as const },
          locale: input.locale,
          createdAt: sql`${cardTimestamps[index + 1]}::timestamptz`,
        })),
      ]),
    ]);
  } catch (error) {
    if (getPgErrorCode(error) !== "23505") throw error;
    const winner = await findExistingAdvisoryCase(input.idempotencyKey, requester);
    if (!winner) throw error;
    return { ...winner, created: false };
  }

  return { inquiryId, channelId, created: true };
}
