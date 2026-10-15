import { describe, expect, it } from "vitest";
import {
  projectQuoteFieldsSchema,
  quoteLogisticsInputSchema,
  storedLogisticsSchema,
  todayDateString,
  toStoredLogistics,
} from "./project-quote-specs";

const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
const valid = { priceTaxMode: "net", totalPriceEur: 1000, scopeIncluded: "Dom", validUntil: tomorrow } as const;

// Spec 0070 AC-11: pola obowiązkowe i walidacja formatu oferty.
describe("projectQuoteFieldsSchema (AC-11)", () => {
  it("accepts the four required fields alone", () => {
    expect(projectQuoteFieldsSchema.safeParse(valid).success).toBe(true);
  });

  it.each(["priceTaxMode", "totalPriceEur", "scopeIncluded", "validUntil"] as const)("rejects a quote without %s", (field) => {
    const input: Record<string, unknown> = { ...valid };
    delete input[field];
    expect(projectQuoteFieldsSchema.safeParse(input).success).toBe(false);
  });

  it("rejects blank scope, zero price, unknown tax mode and a VAT rate above 100", () => {
    expect(projectQuoteFieldsSchema.safeParse({ ...valid, scopeIncluded: "   " }).success).toBe(false);
    expect(projectQuoteFieldsSchema.safeParse({ ...valid, totalPriceEur: 0 }).success).toBe(false);
    expect(projectQuoteFieldsSchema.safeParse({ ...valid, priceTaxMode: "other" }).success).toBe(false);
    expect(projectQuoteFieldsSchema.safeParse({ ...valid, vatRatePercent: 101 }).success).toBe(false);
  });

  it("requires validUntil to be strictly after today", () => {
    expect(projectQuoteFieldsSchema.safeParse({ ...valid, validUntil: todayDateString() }).success).toBe(false);
    expect(projectQuoteFieldsSchema.safeParse({ ...valid, validUntil: "2020-01-01" }).success).toBe(false);
    expect(projectQuoteFieldsSchema.safeParse({ ...valid, validUntil: "31.12.2099" }).success).toBe(false);
  });

  it("rejects a delivery window that ends before it starts", () => {
    const bad = projectQuoteFieldsSchema.safeParse({ ...valid, deliveryWindowFrom: "2030-05-01", deliveryWindowTo: "2030-04-01" });
    const ok = projectQuoteFieldsSchema.safeParse({ ...valid, deliveryWindowFrom: "2030-04-01", deliveryWindowTo: "2030-04-01" });
    expect(bad.success).toBe(false);
    expect(ok.success).toBe(true);
  });

  it("turns blank optional texts into undefined", () => {
    const parsed = projectQuoteFieldsSchema.parse({ ...valid, scopeExcluded: "  ", paymentPlan: "" });
    expect(parsed.scopeExcluded).toBeUndefined();
    expect(parsed.paymentPlan).toBeUndefined();
  });
});

describe("logistics items (AC-11)", () => {
  it("requires an amount for amount and range, and a max not below the min for range", () => {
    expect(quoteLogisticsInputSchema.safeParse({ transport: { mode: "amount" } }).success).toBe(false);
    expect(quoteLogisticsInputSchema.safeParse({ transport: { mode: "range", amountEur: 10 } }).success).toBe(false);
    expect(quoteLogisticsInputSchema.safeParse({ transport: { mode: "range", amountEur: 10, maxAmountEur: 5 } }).success).toBe(false);
    expect(quoteLogisticsInputSchema.safeParse({ transport: { mode: "range", amountEur: 10, maxAmountEur: 10 } }).success).toBe(true);
    expect(quoteLogisticsInputSchema.safeParse({ crane: { mode: "tbd" } }).success).toBe(true);
  });

  it("converts euro to cents without float drift and produces a shape the stored schema accepts", () => {
    const input = quoteLogisticsInputSchema.parse({
      transport: { mode: "amount", amountEur: 0.29, note: "do placu" },
      assembly: { mode: "range", amountEur: 20000, maxAmountEur: 30000 },
      crane: { mode: "tbd" },
    });
    const stored = toStoredLogistics(input);
    expect(stored).toEqual({
      transport: { mode: "amount", amountCents: 29, note: "do placu" },
      assembly: { mode: "range", amountCents: 2000000, maxAmountCents: 3000000 },
      crane: { mode: "tbd" },
    });
    expect(storedLogisticsSchema.safeParse(stored).success).toBe(true);
  });

  it("never stores a zero amount for an item that is to be quoted later", () => {
    expect(toStoredLogistics({ transport: { mode: "tbd", amountEur: 500 } })).toEqual({ transport: { mode: "tbd" } });
    expect(toStoredLogistics({})).toEqual({});
  });
});
