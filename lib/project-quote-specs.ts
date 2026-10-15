import { z } from "zod";

// Wspólny format oferty producenta (spec 0070 AC-11). Schemat jest na granicy
// aplikacji (submitProjectQuote i QuoteForm), tak samo jak lib/project-request-specs.ts;
// kolumny w project_quote są w większości nullable, bo stare oferty ich nie mają,
// a pola obowiązkowe pilnuje ten schemat, nie baza.

export const QUOTE_PRICE_TAX_MODES = ["net", "gross"] as const;
export type QuotePriceTaxMode = (typeof QUOTE_PRICE_TAX_MODES)[number];

// Pozycje logistyki, każda osobno jako kwota, widełki albo "do późniejszej wyceny".
export const QUOTE_LOGISTICS_ITEMS = ["transport", "assembly", "crane"] as const;
export type QuoteLogisticsItem = (typeof QUOTE_LOGISTICS_ITEMS)[number];

export const QUOTE_LOGISTICS_MODES = ["amount", "range", "tbd"] as const;
export type QuoteLogisticsMode = (typeof QUOTE_LOGISTICS_MODES)[number];

const MAX_TEXT_LENGTH = 5000;
const MAX_NOTE_LENGTH = 500;

function toCents(value: number): number {
  return Math.round(value * 100);
}

// Kształt zapisany w kolumnie project_quote.logistics (kwoty w groszach). Czytają
// go ekran podsumowania klienta i admin, więc jest wyeksportowany osobno.
export const storedLogisticsItemSchema = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("amount"), amountCents: z.number().int().min(0), note: z.string().optional() }),
  z.object({
    mode: z.literal("range"),
    amountCents: z.number().int().min(0),
    maxAmountCents: z.number().int().min(0),
    note: z.string().optional(),
  }),
  z.object({ mode: z.literal("tbd"), note: z.string().optional() }),
]);

export const storedLogisticsSchema = z.object({
  transport: storedLogisticsItemSchema.optional(),
  assembly: storedLogisticsItemSchema.optional(),
  crane: storedLogisticsItemSchema.optional(),
});

export type StoredLogistics = z.infer<typeof storedLogisticsSchema>;

// Wejście formularza: kwoty w euro (tak jak totalPriceEur), przeliczane na grosze
// przed zapisem przez toStoredLogistics.
const logisticsItemInputSchema = z
  .object({
    mode: z.enum(QUOTE_LOGISTICS_MODES),
    amountEur: z.number().min(0).optional(),
    maxAmountEur: z.number().min(0).optional(),
    note: z.string().trim().max(MAX_NOTE_LENGTH).optional(),
  })
  .superRefine((item, ctx) => {
    if (item.mode === "tbd") return;
    if (item.amountEur === undefined) {
      ctx.addIssue({ code: "custom", message: "Podaj kwotę dla pozycji logistyki.", path: ["amountEur"] });
      return;
    }
    if (item.mode === "range") {
      if (item.maxAmountEur === undefined) {
        ctx.addIssue({ code: "custom", message: "Podaj górną granicę widełek.", path: ["maxAmountEur"] });
      } else if (item.maxAmountEur < item.amountEur) {
        ctx.addIssue({ code: "custom", message: "Górna granica widełek nie może być niższa od dolnej.", path: ["maxAmountEur"] });
      }
    }
  });

export type QuoteLogisticsItemInput = z.input<typeof logisticsItemInputSchema>;

export const quoteLogisticsInputSchema = z.object({
  transport: logisticsItemInputSchema.optional(),
  assembly: logisticsItemInputSchema.optional(),
  crane: logisticsItemInputSchema.optional(),
});

export type QuoteLogisticsInput = z.input<typeof quoteLogisticsInputSchema>;

export function toStoredLogistics(input: z.output<typeof quoteLogisticsInputSchema>): StoredLogistics {
  const stored: StoredLogistics = {};
  for (const key of QUOTE_LOGISTICS_ITEMS) {
    const item = input[key];
    if (!item) continue;
    const note = item.note ? { note: item.note } : {};
    if (item.mode === "tbd") stored[key] = { mode: "tbd", ...note };
    else if (item.mode === "amount") stored[key] = { mode: "amount", amountCents: toCents(item.amountEur!), ...note };
    else stored[key] = { mode: "range", amountCents: toCents(item.amountEur!), maxAmountCents: toCents(item.maxAmountEur!), ...note };
  }
  return stored;
}

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Podaj datę w formacie RRRR-MM-DD.");

// Dzisiejsza data (UTC) jako RRRR-MM-DD, do porównania z polami typu date.
export function todayDateString(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => (value ? value : undefined));

export const DELIVERY_WINDOW_ORDER_MESSAGE = "Koniec okna dostawy nie może być wcześniej niż początek.";

export function isDeliveryWindowOrdered(data: { deliveryWindowFrom?: string; deliveryWindowTo?: string }): boolean {
  return !data.deliveryWindowFrom || !data.deliveryWindowTo || data.deliveryWindowTo >= data.deliveryWindowFrom;
}

// Pola oferty bez wskazania zapytania, jako kształt do rozszerzenia (zod 4 nie
// pozwala rozszerzać schematu z refine). Obowiązkowe (AC-11): tryb ceny, cena
// łączna, zakres w cenie, ważność oferty. Reszta opcjonalna.
export const projectQuoteFieldsShape = {
  priceTaxMode: z.enum(QUOTE_PRICE_TAX_MODES),
  vatRatePercent: z.number().min(0).max(100).optional(),
  totalPriceEur: z.number().positive("Podaj cenę łączną."),
  unitPriceEur: z.number().positive().optional(),
  scopeIncluded: z.string().trim().min(1, "Opisz, co jest w cenie.").max(MAX_TEXT_LENGTH),
  scopeExcluded: optionalText(MAX_TEXT_LENGTH),
  logistics: quoteLogisticsInputSchema.optional(),
  paymentPlan: optionalText(MAX_TEXT_LENGTH),
  validUntil: dateString.refine((value) => value > todayDateString(), "Ważność oferty musi być datą w przyszłości."),
  warrantyNote: optionalText(MAX_NOTE_LENGTH),
  proposedLeadTimeWeeks: z.number().int().positive().optional(),
  deliveryWindowFrom: dateString.optional(),
  deliveryWindowTo: dateString.optional(),
  notes: z.string().trim().min(1).optional(),
};

export const projectQuoteFieldsSchema = z.object(projectQuoteFieldsShape).refine(isDeliveryWindowOrdered, {
  message: DELIVERY_WINDOW_ORDER_MESSAGE,
  path: ["deliveryWindowTo"],
});

export type ProjectQuoteFieldsInput = z.input<typeof projectQuoteFieldsSchema>;
