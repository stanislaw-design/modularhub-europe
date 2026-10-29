import {
  QUOTE_LOGISTICS_ITEMS,
  storedLogisticsSchema,
  type QuoteLogisticsItem,
  type QuoteLogisticsMode,
  type QuotePriceTaxMode,
} from "@/lib/project-quote-specs";

// Spec 0077 AC-44: wariant oferty producenta w projekcie własnym, w kształcie, który formularz
// oferty (QuoteForm) wypełnia jako wartości początkowe przy poprawianiu wariantu. Same napisy,
// bo stan formularza to napisy (kwoty w euro, daty RRRR-MM-DD).
export interface QuoteLogisticsDraftValues {
  mode: QuoteLogisticsMode;
  amountEur: string;
  maxAmountEur: string;
  note: string;
}

export interface QuoteFormInitialValues {
  variantLabel: string;
  priceTaxMode: QuotePriceTaxMode;
  vatRatePercent: string;
  totalPriceEur: string;
  unitPriceEur: string;
  scopeIncluded: string;
  scopeExcluded: string;
  logistics: Record<QuoteLogisticsItem, QuoteLogisticsDraftValues>;
  paymentPlan: string;
  validUntil: string;
  warrantyNote: string;
  proposedLeadTimeWeeks: string;
  deliveryWindowFrom: string;
  deliveryWindowTo: string;
  notes: string;
}

export interface PlatformQuoteVariant {
  id: string;
  variantLabel: string;
  totalPriceCents: number;
  currency: string;
  submittedAt: Date;
  initialValues: QuoteFormInitialValues;
}

export interface QuoteRowForVariant {
  id: string;
  variantLabel: string | null;
  currency: string;
  priceTaxMode: QuotePriceTaxMode;
  vatRatePercent: string | null;
  totalPriceCents: number;
  unitPriceCents: number | null;
  scopeIncluded: string | null;
  scopeExcluded: string | null;
  logistics: Record<string, unknown>;
  paymentPlan: string | null;
  validUntil: string | null;
  warrantyNote: string | null;
  proposedLeadTimeWeeks: number | null;
  deliveryWindowFrom: string | null;
  deliveryWindowTo: string | null;
  notes: string | null;
  submittedAt: Date;
}

function eur(cents: number): string {
  return String(cents / 100);
}

export function toPlatformQuoteVariant(row: QuoteRowForVariant): PlatformQuoteVariant {
  const stored = storedLogisticsSchema.safeParse(row.logistics);
  const logistics = Object.fromEntries(
    QUOTE_LOGISTICS_ITEMS.map((item) => {
      const value = stored.success ? stored.data[item] : undefined;
      const draft: QuoteLogisticsDraftValues = !value
        ? { mode: "tbd", amountEur: "", maxAmountEur: "", note: "" }
        : value.mode === "tbd"
          ? { mode: "tbd", amountEur: "", maxAmountEur: "", note: value.note ?? "" }
          : value.mode === "amount"
            ? { mode: "amount", amountEur: eur(value.amountCents), maxAmountEur: "", note: value.note ?? "" }
            : {
                mode: "range",
                amountEur: eur(value.amountCents),
                maxAmountEur: eur(value.maxAmountCents),
                note: value.note ?? "",
              };
      return [item, draft];
    }),
  ) as Record<QuoteLogisticsItem, QuoteLogisticsDraftValues>;

  return {
    id: row.id,
    variantLabel: row.variantLabel ?? "",
    totalPriceCents: row.totalPriceCents,
    currency: row.currency,
    submittedAt: row.submittedAt,
    initialValues: {
      variantLabel: row.variantLabel ?? "",
      priceTaxMode: row.priceTaxMode,
      vatRatePercent: row.vatRatePercent ?? "",
      totalPriceEur: eur(row.totalPriceCents),
      unitPriceEur: row.unitPriceCents === null ? "" : eur(row.unitPriceCents),
      scopeIncluded: row.scopeIncluded ?? "",
      scopeExcluded: row.scopeExcluded ?? "",
      logistics,
      paymentPlan: row.paymentPlan ?? "",
      validUntil: row.validUntil ?? "",
      warrantyNote: row.warrantyNote ?? "",
      proposedLeadTimeWeeks: row.proposedLeadTimeWeeks === null ? "" : String(row.proposedLeadTimeWeeks),
      deliveryWindowFrom: row.deliveryWindowFrom ?? "",
      deliveryWindowTo: row.deliveryWindowTo ?? "",
      notes: row.notes ?? "",
    },
  };
}
