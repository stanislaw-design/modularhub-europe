import { describe, expect, it } from "vitest";
import { parseEuroAmount, parsePlainNumber, validateQuoteDraft, type QuoteFormDraft } from "./quote-form-validation";

describe("parseEuroAmount", () => {
  it.each([
    ["1202900", 1202900],
    ["1 202 900", 1202900],
    ["1\u00a0202\u00a0900", 1202900],
    ["1.202.900", 1202900],
    ["1,202,900", 1202900],
    ["1.202", 1202],
    ["61 250,50", 61250.5],
    ["61250.5", 61250.5],
    ["1.202.900,99", 1202900.99],
    ["1,202,900.99", 1202900.99],
    ["0,5", 0.5],
  ])("reads %s as %d", (raw, expected) => {
    expect(parseEuroAmount(raw)).toEqual({ ok: true, value: expected });
  });

  it("treats an empty field as no value", () => {
    expect(parseEuroAmount("  ")).toEqual({ ok: true, value: undefined });
  });

  it.each(["DO 1.202.900", "44920EURO", "185000 zł", "ok. 100", "12.34.5", "1.2345", "1,5.3", ".5", "-100", "1e6"])(
    "rejects %s",
    (raw) => {
      expect(parseEuroAmount(raw)).toEqual({ ok: false });
    },
  );
});

describe("parsePlainNumber", () => {
  it("accepts a decimal comma", () => {
    expect(parsePlainNumber("23,5")).toEqual({ ok: true, value: 23.5 });
  });
  it("rejects text", () => {
    expect(parsePlainNumber("8-10")).toEqual({ ok: false });
  });
});

function draft(overrides: Partial<QuoteFormDraft> = {}): QuoteFormDraft {
  return {
    requireVariant: false,
    variantLabel: "",
    totalPriceEur: "1000",
    unitPriceEur: "",
    vatRatePercent: "",
    scopeIncluded: "Dom",
    logistics: {
      transport: { mode: "tbd", amountEur: "", maxAmountEur: "" },
      assembly: { mode: "tbd", amountEur: "", maxAmountEur: "" },
      crane: { mode: "tbd", amountEur: "", maxAmountEur: "" },
    },
    validUntil: "2030-01-31",
    proposedLeadTimeWeeks: "",
    deliveryWindowFrom: "",
    deliveryWindowTo: "",
    ...overrides,
  };
}

describe("validateQuoteDraft", () => {
  const today = "2026-11-19";

  it("passes a complete draft", () => {
    expect(validateQuoteDraft(draft(), today)).toEqual({});
  });

  it("reports missing required fields", () => {
    expect(validateQuoteDraft(draft({ totalPriceEur: "", scopeIncluded: " ", validUntil: "" }), today)).toEqual({
      totalPrice: "required",
      scopeIncluded: "required",
      validUntil: "required",
    });
  });

  it("requires the variant name only for platform projects", () => {
    expect(validateQuoteDraft(draft({ requireVariant: true }), today)).toEqual({ variantLabel: "required" });
  });

  it("flags wrong formats and ranges", () => {
    expect(
      validateQuoteDraft(
        draft({
          totalPriceEur: "DO 1.202.900",
          unitPriceEur: "0",
          vatRatePercent: "123",
          proposedLeadTimeWeeks: "10,5",
          validUntil: today,
          deliveryWindowFrom: "2030-05-01",
          deliveryWindowTo: "2030-04-01",
        }),
        today,
      ),
    ).toEqual({
      totalPrice: "invalidAmount",
      unitPrice: "amountPositive",
      vatRate: "invalidVat",
      leadTime: "invalidWeeks",
      validUntil: "dateInFuture",
      deliveryWindowTo: "deliveryWindowOrder",
    });
  });

  it("checks logistics amounts only when the row is not left to be quoted later", () => {
    const errors = validateQuoteDraft(
      draft({
        logistics: {
          transport: { mode: "amount", amountEur: "", maxAmountEur: "" },
          assembly: { mode: "range", amountEur: "30 000", maxAmountEur: "20 000" },
          crane: { mode: "tbd", amountEur: "abc", maxAmountEur: "" },
        },
      }),
      today,
    );
    expect(errors).toEqual({ "logistics.transport.amount": "required", "logistics.assembly.max": "rangeMaxBelowMin" });
  });
});
