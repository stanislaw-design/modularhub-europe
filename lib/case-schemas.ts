import { z } from "zod";
import { NIE_WIEM, START_CARDS, startCardValues } from "@/lib/cases/start-cards";

// Walidacja wejścia akcji sprawy doradczej (spec 0048). Osobno od akcji, bo
// plik z "use server" może eksportować wyłącznie funkcje asynchroniczne.
export const MAX_ADVISORY_HOMES = 3;
export const MAX_MESSAGE_LENGTH = 4000;

export const plotAddressSchema = z.object({
  street: z.string().trim().min(1).max(200),
  postalCode: z.string().trim().min(1).max(20),
  city: z.string().trim().min(1).max(120),
  countryCode: z.string().trim().min(2).max(2),
});

export const submitAdvisoryInquirySchema = z.object({
  projectIds: z.array(z.uuid()).min(1).max(MAX_ADVISORY_HOMES),
  plot: plotAddressSchema,
  message: z.string().trim().max(MAX_MESSAGE_LENGTH).optional(),
  idempotencyKey: z.string().min(8).max(100),
  locale: z.string().min(2).max(5),
});

export type SubmitAdvisoryInquiryInput = z.input<typeof submitAdvisoryInquirySchema>;

export const sendMessageSchema = z.object({
  inquiryId: z.uuid(),
  channelId: z.uuid(),
  body: z.string().trim().min(1).max(MAX_MESSAGE_LENGTH),
  locale: z.string().min(2).max(5),
  idempotencyKey: z.string().min(8).max(100),
});

export type SendMessageInput = z.input<typeof sendMessageSchema>;

// Wiadomość w kształcie bezpiecznym dla przeglądarki (daty jako ISO). payload
// jest nieprzezroczysty tu: komponent karty zawęża go po message.type (patrz
// questionCardPayloadSchema), reszta typów nie ma dziś kształtu payloadu.
export interface CaseMessageDto {
  id: string;
  authorKind: "client" | "advisor" | "producer" | "system";
  type: string;
  body: string | null;
  payload: unknown;
  locale: string;
  createdAt: string;
  cursor: string;
  redacted: boolean;
}

// Karty startowe od systemu (spec 0048 AC-38 do AC-44), payload cienki: klucz
// pola i stała informacja, że "nie wiem" jest dozwolone. Ten sam typ karty,
// question_card, obsługuje też karty od doradcy (AC-7), stąd fieldKey musi
// być jednym z kluczy katalogu, a nie dowolnym tekstem.
const startCardKeys = START_CARDS.map((card) => card.key) as [string, ...string[]];

export const questionCardPayloadSchema = z.object({
  fieldKey: z.enum(startCardKeys),
  allowUnsure: z.literal(true),
});

export type QuestionCardPayload = z.infer<typeof questionCardPayloadSchema>;

// Odpowiedź klienta na kartę (AC-7, AC-40). Wartość jest walidowana względem
// katalogu dopiero w akcji (lib/cases/cards.ts), bo zależy od fieldKey karty
// odczytanej z bazy, nie od tego, co klient deklaruje w wejściu.
export const answerCardSchema = z.object({
  inquiryId: z.uuid(),
  messageId: z.uuid(),
  value: z.string().min(1).max(100),
});

export type AnswerCardInput = z.input<typeof answerCardSchema>;

// Cztery stany podsumowania potrzeb (AC-12). "missing" ma specjalne znaczenie
// dla kart startowych (AC-40): tam zapisuje je wyłącznie wybór "nie wiem",
// nigdy sama akcja upsertCaseField, którą woła tylko doradca.
export const caseFieldStates = ["confirmed", "assumption", "missing", "not_applicable"] as const;

export const upsertCaseFieldSchema = z.object({
  inquiryId: z.uuid(),
  key: z.string().min(1).max(100),
  value: z.string().max(100).nullable(),
  state: z.enum(caseFieldStates),
});

export type UpsertCaseFieldInput = z.input<typeof upsertCaseFieldSchema>;

// Ocena gotowości (AC-13). "outcome" nie jest zapisywany jako osobna wartość:
// jego jedyny ślad to efekt w kolumnach inquiry, które już istnieją (stage,
// waitingOn, closedReason), plus obowiązkowa wiadomość z wyjaśnieniem dla
// klienta, którą ta akcja zawsze wysyła. Klient nigdy nie widzi outcome.
export const readinessOutcomes = [
  "ready_for_brief",
  "needs_more_info",
  "needs_plot_analysis",
  "no_producer",
  "out_of_area",
  "handoff_b2b",
] as const;

export const assessReadinessSchema = z.object({
  inquiryId: z.uuid(),
  outcome: z.enum(readinessOutcomes),
  message: z.string().trim().min(1).max(MAX_MESSAGE_LENGTH),
  locale: z.string().min(2).max(5),
});

export type AssessReadinessInput = z.input<typeof assessReadinessSchema>;

export { NIE_WIEM, startCardValues };
