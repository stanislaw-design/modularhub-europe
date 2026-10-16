import type { AttachmentErrorCode } from "@/lib/inquiry-attachment-specs";

// Teksty plików inwestora (spec 0070 część D) w przestrzeni nazw `InquiryAttachments`.
// Komponenty dostają je jako obiekt, bo ten sam interfejs służy klientowi (cztery
// języki), producentowi i adminowi (admin zawsze po polsku): strony serwerowe biorą
// teksty z getInquiryAttachmentLabels, komponenty klienckie z useInquiryAttachmentLabels.
export interface InquiryAttachmentLabels {
  heading: string;
  investorFilesHeading: string;
  intro: string;
  producerIntro: string;
  adminIntro: string;
  limitsHint: string;
  warning: string;
  staffWarning: string;
  consentLabel: string;
  chooseFiles: string;
  addFiles: string;
  replace: string;
  statusUploading: string;
  statusDone: string;
  statusError: string;
  retry: string;
  dismiss: string;
  download: string;
  remove: string;
  removing: string;
  hide: string;
  unhide: string;
  hideReasonLabel: string;
  hideConfirm: string;
  cancel: string;
  hiddenBadge: string;
  hiddenReason: string;
  deletedBadge: string;
  empty: string;
  tokenExpired: string;
  lockedNote: string;
  afterSubmitHint: string;
  changedAfterQuote: string;
  downloadError: string;
  uploadedBy: { client: string; guest: string; staff: string };
  errors: Record<AttachmentErrorCode, string>;
}

const SIMPLE_KEYS = [
  "heading",
  "investorFilesHeading",
  "intro",
  "producerIntro",
  "adminIntro",
  "limitsHint",
  "warning",
  "staffWarning",
  "consentLabel",
  "chooseFiles",
  "addFiles",
  "replace",
  "statusUploading",
  "statusDone",
  "statusError",
  "retry",
  "dismiss",
  "download",
  "remove",
  "removing",
  "hide",
  "unhide",
  "hideReasonLabel",
  "hideConfirm",
  "cancel",
  "hiddenBadge",
  "hiddenReason",
  "deletedBadge",
  "empty",
  "tokenExpired",
  "lockedNote",
  "afterSubmitHint",
  "changedAfterQuote",
  "downloadError",
] as const;

// `raw` to t.raw z next-intl (klient) albo getTranslations (serwer): zwraca wartość
// klucza w przestrzeni `InquiryAttachments` bez interpolacji.
export function buildInquiryAttachmentLabels(raw: (key: string) => unknown): InquiryAttachmentLabels {
  const simple = Object.fromEntries(SIMPLE_KEYS.map((key) => [key, String(raw(key))])) as Record<
    (typeof SIMPLE_KEYS)[number],
    string
  >;
  return {
    ...simple,
    uploadedBy: raw("uploadedBy") as InquiryAttachmentLabels["uploadedBy"],
    errors: raw("errors") as InquiryAttachmentLabels["errors"],
  };
}

export function fillLabel(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (match, name: string) => values[name] ?? match);
}
