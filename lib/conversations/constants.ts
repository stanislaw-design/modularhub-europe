// Wartości i etykiety notatnika rozmów (spec 0080). Bez "server-only": korzystają z tego
// także komponenty klienckie (formularze, pigułki). Wartości odpowiadają ograniczeniom CHECK
// w lib/db/schema.ts (crm_*).

export const PARTNER_KINDS = ["producent", "dostawca", "klient", "partner", "inny"] as const;
export type PartnerKind = (typeof PARTNER_KINDS)[number];
export const PARTNER_KIND_LABELS: Record<PartnerKind, string> = {
  producent: "Producent",
  dostawca: "Dostawca",
  klient: "Klient",
  partner: "Partner",
  inny: "Inny",
};

export const CONTACT_CHANNELS = ["phone", "whatsapp", "email"] as const;
export type ContactChannel = (typeof CONTACT_CHANNELS)[number];
export const CONTACT_CHANNEL_LABELS: Record<ContactChannel, string> = {
  phone: "Telefon",
  whatsapp: "WhatsApp",
  email: "Mail",
};

export const CONTACT_LANGUAGES = ["pl", "en", "de", "nl"] as const;
export type ContactLanguage = (typeof CONTACT_LANGUAGES)[number];
export const CONTACT_LANGUAGE_LABELS: Record<ContactLanguage, string> = {
  pl: "Polski",
  en: "Angielski",
  de: "Niemiecki",
  nl: "Niderlandzki",
};

export const ENTRY_DIRECTIONS = ["outbound", "inbound", "internal"] as const;
export type EntryDirection = (typeof ENTRY_DIRECTIONS)[number];
export const ENTRY_DIRECTION_LABELS: Record<EntryDirection, string> = {
  outbound: "My do nich",
  inbound: "Oni do nas",
  internal: "Notatka wewnętrzna",
};

export const ENTRY_CHANNELS = ["phone", "whatsapp", "email", "meeting", "platform", "other"] as const;
export type EntryChannel = (typeof ENTRY_CHANNELS)[number];
export const ENTRY_CHANNEL_LABELS: Record<EntryChannel, string> = {
  phone: "Telefon",
  whatsapp: "WhatsApp",
  email: "Mail",
  meeting: "Spotkanie",
  platform: "Platforma",
  other: "Inne",
};

export const ENTRY_SOURCES = ["web", "bot"] as const;
export type EntrySource = (typeof ENTRY_SOURCES)[number];

export const TASK_STATUSES = ["open", "done", "cancelled"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];
export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  open: "Otwarte",
  done: "Zrobione",
  cancelled: "Anulowane",
};

export const ASSIGNEE_KINDS = ["user", "external"] as const;
export type AssigneeKind = (typeof ASSIGNEE_KINDS)[number];

export const LINK_KINDS = ["producer", "project_request", "bulk_product_inquiry", "case", "product"] as const;
export type LinkKind = (typeof LINK_KINDS)[number];
export const LINK_KIND_LABELS: Record<LinkKind, string> = {
  producer: "Producent",
  project_request: "Duże zamówienie (projekt)",
  bulk_product_inquiry: "Duże zamówienie (produkt)",
  case: "Case",
  product: "Produkt",
};

export const PRODUCER_VERIFICATION_LABELS: Record<string, string> = {
  not_submitted: "Weryfikacja nie wysłana",
  pending: "Weryfikacja w toku",
  approved: "Zweryfikowany",
  rejected: "Odrzucony",
};

export const THREAD_STATUSES = ["closed", "waiting_us", "waiting_them", "open"] as const;
export type ThreadStatus = (typeof THREAD_STATUSES)[number];
export const THREAD_STATUS_LABELS: Record<ThreadStatus, string> = {
  closed: "Zamknięta",
  waiting_us: "Czekamy na nas",
  waiting_them: "Czekamy na nich",
  open: "Otwarta",
};

export const ATTACHMENT_MAX_PER_ENTRY = 5;
export const ATTACHMENT_MAX_BYTES = 20 * 1024 * 1024;
export const ATTACHMENT_MIME_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"] as const;

export const PARTNERS_PAGE_SIZE = 25;
export const CRM_TIME_ZONE = "Europe/Warsaw";
