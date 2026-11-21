import { QUOTE_LOGISTICS_ITEMS, type QuoteLogisticsItem, type QuoteLogisticsMode, todayDateString } from "@/lib/project-quote-specs";

// Walidacja formularza oferty po stronie przeglądarki (QuoteForm). Te same reguły co
// projectQuoteFieldsShape na serwerze, ale sprawdzane od razu, żeby producent widział,
// które pole jest źle wypełnione, zanim kliknie "Wyślij" (przycisk jest wyłączony,
// dopóki lista błędów nie jest pusta). Serwer pozostaje granicą bezpieczeństwa.

export type ParsedAmount = { ok: true; value: number | undefined } | { ok: false };

const SPACES = /[\s  ]/g;

// Kwota w euro wpisana po polsku albo po angielsku: "1202900", "1 202 900", "1.202.900",
// "1,202,900", "61 250,50", "61250.5". Spacje, kropki i przecinki jako separatory
// tysięcy, ostatni separator z jedną lub dwiema cyframi po nim jako część dziesiętna.
// Litery, waluta i słowa ("DO", "EUR", "zł") dają błąd, nigdy cichego zgadywania.
export function parseEuroAmount(raw: string): ParsedAmount {
  const compact = raw.replace(SPACES, "");
  if (compact === "") return { ok: true, value: undefined };
  if (!/^[\d.,]+$/.test(compact) || !/^\d/.test(compact)) return { ok: false };

  const lastDot = compact.lastIndexOf(".");
  const lastComma = compact.lastIndexOf(",");
  let integerPart = compact;
  let fraction = "";

  if (lastDot !== -1 && lastComma !== -1) {
    // Oba separatory: ostatni z nich jest dziesiętny, drugi oddziela tysiące.
    const decimalAt = Math.max(lastDot, lastComma);
    integerPart = compact.slice(0, decimalAt);
    fraction = compact.slice(decimalAt + 1);
    const thousands = decimalAt === lastDot ? "," : ".";
    if (integerPart.includes(decimalAt === lastDot ? "." : ",")) return { ok: false };
    if (!isGroupedInteger(integerPart, thousands)) return { ok: false };
    integerPart = integerPart.split(thousands).join("");
  } else if (lastDot !== -1 || lastComma !== -1) {
    const separator = lastDot !== -1 ? "." : ",";
    const parts = compact.split(separator);
    const tail = parts[parts.length - 1]!;
    if (parts.length === 2 && tail.length >= 1 && tail.length <= 2) {
      integerPart = parts[0]!;
      fraction = tail;
    } else if (isGroupedInteger(compact, separator)) {
      integerPart = parts.join("");
    } else {
      return { ok: false };
    }
  }

  if (!/^\d+$/.test(integerPart) || (fraction !== "" && !/^\d{1,2}$/.test(fraction))) return { ok: false };
  const value = Number(fraction ? `${integerPart}.${fraction}` : integerPart);
  return Number.isFinite(value) ? { ok: true, value } : { ok: false };
}

// "1.202.900" albo "1,202,900": pierwsza grupa 1-3 cyfry, każda kolejna dokładnie 3.
function isGroupedInteger(value: string, separator: string): boolean {
  const groups = value.split(separator);
  if (groups.length < 2) return /^\d+$/.test(value);
  return /^\d{1,3}$/.test(groups[0]!) && groups.slice(1).every((group) => /^\d{3}$/.test(group));
}

// Pole tekstowe z liczbą całkowitą albo dziesiętną (VAT, tygodnie): przecinek jako separator dziesiętny.
export function parsePlainNumber(raw: string): ParsedAmount {
  const compact = raw.replace(SPACES, "").replace(",", ".");
  if (compact === "") return { ok: true, value: undefined };
  if (!/^\d+(\.\d+)?$/.test(compact)) return { ok: false };
  return { ok: true, value: Number(compact) };
}

export type QuoteFormErrorCode =
  | "required"
  | "invalidAmount"
  | "amountPositive"
  | "invalidVat"
  | "invalidWeeks"
  | "dateInFuture"
  | "rangeMaxBelowMin"
  | "deliveryWindowOrder";

export type LogisticsFieldKey = `logistics.${QuoteLogisticsItem}.amount` | `logistics.${QuoteLogisticsItem}.max`;

export type QuoteFormFieldKey =
  | "variantLabel"
  | "totalPrice"
  | "unitPrice"
  | "vatRate"
  | "scopeIncluded"
  | LogisticsFieldKey
  | "validUntil"
  | "leadTime"
  | "deliveryWindowTo";

// Kolejność pól w formularzu, w tej samej kolejności pokazywana jest lista braków.
export const QUOTE_FORM_FIELD_ORDER: readonly QuoteFormFieldKey[] = [
  "variantLabel",
  "totalPrice",
  "unitPrice",
  "vatRate",
  "scopeIncluded",
  ...QUOTE_LOGISTICS_ITEMS.flatMap((item) => [`logistics.${item}.amount`, `logistics.${item}.max`] as const),
  "validUntil",
  "leadTime",
  "deliveryWindowTo",
];

export interface QuoteFormDraft {
  requireVariant: boolean;
  variantLabel: string;
  totalPriceEur: string;
  unitPriceEur: string;
  vatRatePercent: string;
  scopeIncluded: string;
  logistics: Record<QuoteLogisticsItem, { mode: QuoteLogisticsMode; amountEur: string; maxAmountEur: string }>;
  validUntil: string;
  proposedLeadTimeWeeks: string;
  deliveryWindowFrom: string;
  deliveryWindowTo: string;
}

export type QuoteFormErrors = Partial<Record<QuoteFormFieldKey, QuoteFormErrorCode>>;

function amountError(raw: string, required: boolean): QuoteFormErrorCode | undefined {
  const parsed = parseEuroAmount(raw);
  if (!parsed.ok) return "invalidAmount";
  if (parsed.value === undefined) return required ? "required" : undefined;
  return parsed.value > 0 ? undefined : "amountPositive";
}

export function validateQuoteDraft(draft: QuoteFormDraft, today: string = todayDateString()): QuoteFormErrors {
  const errors: QuoteFormErrors = {};

  if (draft.requireVariant && draft.variantLabel.trim().length === 0) errors.variantLabel = "required";

  const totalError = amountError(draft.totalPriceEur, true);
  if (totalError) errors.totalPrice = totalError;
  const unitError = amountError(draft.unitPriceEur, false);
  if (unitError) errors.unitPrice = unitError;

  const vat = parsePlainNumber(draft.vatRatePercent);
  if (!vat.ok || (vat.value !== undefined && vat.value > 100)) errors.vatRate = "invalidVat";

  if (draft.scopeIncluded.trim().length === 0) errors.scopeIncluded = "required";

  for (const item of QUOTE_LOGISTICS_ITEMS) {
    const row = draft.logistics[item];
    if (row.mode === "tbd") continue;
    const min = parseEuroAmount(row.amountEur);
    if (!min.ok) errors[`logistics.${item}.amount`] = "invalidAmount";
    else if (min.value === undefined) errors[`logistics.${item}.amount`] = "required";
    if (row.mode === "range") {
      const max = parseEuroAmount(row.maxAmountEur);
      if (!max.ok) errors[`logistics.${item}.max`] = "invalidAmount";
      else if (max.value === undefined) errors[`logistics.${item}.max`] = "required";
      else if (min.ok && min.value !== undefined && max.value < min.value) errors[`logistics.${item}.max`] = "rangeMaxBelowMin";
    }
  }

  if (!draft.validUntil) errors.validUntil = "required";
  else if (draft.validUntil <= today) errors.validUntil = "dateInFuture";

  const weeks = parsePlainNumber(draft.proposedLeadTimeWeeks);
  if (!weeks.ok || (weeks.value !== undefined && (!Number.isInteger(weeks.value) || weeks.value < 1))) errors.leadTime = "invalidWeeks";

  if (draft.deliveryWindowFrom && draft.deliveryWindowTo && draft.deliveryWindowTo < draft.deliveryWindowFrom) {
    errors.deliveryWindowTo = "deliveryWindowOrder";
  }

  return errors;
}
