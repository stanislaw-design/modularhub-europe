import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { getPgErrorCode } from "@/lib/db/pg-error";
import { channel, inquiry, inquiryItem, message } from "@/lib/db/schema";
import { microOffsetTimestamp, type Clock } from "./clock";
import { START_CARDS } from "./start-cards";

export interface CreateAdvisoryCaseInput {
  clientId: string;
  contact: { name: string; email: string; phone: string };
  projectIds: string[];
  plot: { street: string; postalCode: string; city: string; countryCode: string };
  message: string | null;
  idempotencyKey: string;
  locale: string;
  // Treść pierwszej wiadomości systemowej w języku klienta (AC-3).
  systemNoticeBody: string;
}

export interface CreateAdvisoryCaseResult {
  inquiryId: string;
  channelId: string;
  created: boolean;
}

async function findExisting(idempotencyKey: string, clientId: string) {
  const [row] = await db
    .select({ id: inquiry.id, clientId: inquiry.clientId })
    .from(inquiry)
    .where(eq(inquiry.idempotencyKey, idempotencyKey));
  if (!row || row.clientId !== clientId) return null;

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
  const existing = await findExisting(input.idempotencyKey, input.clientId);
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
    const winner = await findExisting(input.idempotencyKey, input.clientId);
    if (!winner) throw error;
    return { ...winner, created: false };
  }

  return { inquiryId, channelId, created: true };
}
