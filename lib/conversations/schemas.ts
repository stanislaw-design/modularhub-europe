import { z } from "zod";
import {
  ASSIGNEE_KINDS,
  ATTACHMENT_MAX_BYTES,
  ATTACHMENT_MIME_TYPES,
  CONTACT_CHANNELS,
  CONTACT_LANGUAGES,
  ENTRY_CHANNELS,
  ENTRY_DIRECTIONS,
  LINK_KINDS,
  PARTNER_KINDS,
  TASK_STATUSES,
} from "./constants";
import { isValidDateString, warsawLocalToDate } from "./time";

// Schematy Zod notatnika rozmów (spec 0080). Cała walidacja odbywa się przed zapisem
// wielotabelowym (db.batch), nigdy w jego trakcie.

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .nullable()
    .transform((value) => (value ? value : null));

const requiredText = (max: number, message: string) => z.string().trim().min(1, message).max(max);

export const uuidSchema = z.string().uuid();

export const linkSchema = z
  .object({ kind: z.enum(LINK_KINDS), id: requiredText(200, "Podaj identyfikator rekordu") })
  .nullable()
  .optional()
  .transform((value) => value ?? null);

export const dueDateSchema = z
  .string()
  .trim()
  .optional()
  .nullable()
  .transform((value) => (value ? value : null))
  .refine((value) => value === null || isValidDateString(value), "Podaj poprawną datę");

export const partnerInputSchema = z.object({
  name: requiredText(200, "Podaj nazwę firmy"),
  kind: z.enum(PARTNER_KINDS),
  website: optionalText(300),
  countryCode: optionalText(2),
  tags: z
    .array(z.string().trim().min(1).max(40))
    .max(20)
    .default([])
    .transform((tags) => [...new Set(tags)]),
  notes: optionalText(5000),
});
export type PartnerInput = z.input<typeof partnerInputSchema>;

export const contactInputSchema = z.object({
  name: requiredText(200, "Podaj imię i nazwisko"),
  role: optionalText(200),
  phone: optionalText(60),
  email: optionalText(254),
  preferredChannel: z.enum(CONTACT_CHANNELS).optional().nullable().transform((v) => v ?? null),
  language: z.enum(CONTACT_LANGUAGES).optional().nullable().transform((v) => v ?? null),
  note: optionalText(2000),
});
export type ContactInput = z.input<typeof contactInputSchema>;

export const threadInputSchema = z.object({
  title: requiredText(200, "Podaj tytuł sprawy"),
  ownerUserId: requiredText(100, "Wybierz właściciela"),
  templateKey: optionalText(60),
  link: linkSchema,
});
export type ThreadInput = z.input<typeof threadInputSchema>;

export const entryInputSchema = z.object({
  threadId: uuidSchema.optional().nullable().transform((v) => v ?? null),
  contactId: uuidSchema.optional().nullable().transform((v) => v ?? null),
  // Czas ścienny z formularza w Europe/Warsaw (`YYYY-MM-DDTHH:mm`); brak oznacza "teraz".
  occurredAtLocal: z
    .string()
    .trim()
    .optional()
    .nullable()
    .transform((value) => (value ? value : null))
    .refine((value) => value === null || warsawLocalToDate(value) !== null, "Podaj poprawną datę i godzinę"),
  direction: z.enum(ENTRY_DIRECTIONS),
  channel: z.enum(ENTRY_CHANNELS),
  body: requiredText(10000, "Wpisz treść"),
});
export type EntryInput = z.input<typeof entryInputSchema>;

export const taskAssigneeSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal(ASSIGNEE_KINDS[0]), userId: requiredText(100, "Wybierz osobę") }),
  z.object({
    kind: z.literal(ASSIGNEE_KINDS[1]),
    contactId: uuidSchema.optional().nullable().transform((v) => v ?? null),
  }),
]);
export type TaskAssignee = z.infer<typeof taskAssigneeSchema>;

export const taskInputSchema = z.object({
  title: requiredText(300, "Podaj tytuł zadania"),
  note: optionalText(5000),
  dueDate: dueDateSchema,
  assignee: taskAssigneeSchema,
  threadId: uuidSchema.optional().nullable().transform((v) => v ?? null),
  link: linkSchema,
});
export type TaskInput = z.input<typeof taskInputSchema>;

export const taskStatusSchema = z.enum(TASK_STATUSES);

export const closeThreadDecisionsSchema = z.record(uuidSchema, z.enum(["done", "cancelled"]));
export type CloseThreadDecisions = z.infer<typeof closeThreadDecisionsSchema>;

export const quickEntrySchema = z.object({
  partner: z.union([
    z.object({ id: uuidSchema }),
    z.object({ create: partnerInputSchema }),
  ]),
  thread: z
    .union([
      z.object({ id: uuidSchema }),
      z.object({
        create: z.object({
          title: requiredText(200, "Podaj tytuł sprawy"),
          ownerUserId: requiredText(100, "Wybierz właściciela"),
          templateKey: optionalText(60),
          link: linkSchema,
        }),
      }),
    ])
    .nullable()
    .optional()
    .transform((value) => value ?? null),
  entry: entryInputSchema.omit({ threadId: true }),
  tasks: z.array(taskInputSchema.omit({ threadId: true })).max(10).default([]),
});
export type QuickEntryInput = z.input<typeof quickEntrySchema>;

// Załączniki wpisu (AC-14): deklaracja z przeglądarki. Rozmiar i typ są sprawdzane jeszcze raz po
// wgraniu (rozmiar z HEAD, typ po bajtach pliku), więc to tylko pierwsza, tania bramka.
export const attachmentDeclarationSchema = z.object({
  filename: requiredText(255, "Podaj nazwę pliku"),
  mimeType: z.enum(ATTACHMENT_MIME_TYPES, { message: "Dozwolone są pliki PDF, JPEG, PNG i WebP" }),
  sizeBytes: z
    .number()
    .int()
    .positive("Plik jest pusty")
    .max(ATTACHMENT_MAX_BYTES, "Plik jest większy niż 20 MB"),
});
export type AttachmentDeclaration = z.infer<typeof attachmentDeclarationSchema>;
