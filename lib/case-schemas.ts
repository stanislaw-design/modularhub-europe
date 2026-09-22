import { z } from "zod";

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

// Wiadomość w kształcie bezpiecznym dla przeglądarki (daty jako ISO).
export interface CaseMessageDto {
  id: string;
  authorKind: "client" | "advisor" | "producer" | "system";
  type: string;
  body: string | null;
  locale: string;
  createdAt: string;
  cursor: string;
  redacted: boolean;
}
