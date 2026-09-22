import { describe, expect, it } from "vitest";
import { vi } from "vitest";
import { AzureAiProviderError } from "@/lib/ai/azure-errors";
import type { AzureDocumentLayout } from "@/lib/ai/document-intelligence";
import {
  bisectDocumentLayout,
  extractHouseProject,
  filterUnsupportedVariantCandidates,
  findVariantAssignmentIssues,
  normalizeHouseProjectExtraction,
  splitDocumentLayout,
  type HouseProjectExtractionModelOutput,
} from "@/lib/ai/house-project-extraction";

const layout: AzureDocumentLayout = {
  apiVersion: "2024-11-30",
  modelId: "prebuilt-layout",
  pages: [
    {
      pageNumber: 3,
      text: "Powierzchnia użytkowa 67,57 m2",
      averageWordConfidence: 0.96,
      language: { locale: "pl", confidence: 0.99 },
      lines: [],
    },
  ],
};

function output(
  candidate: Omit<HouseProjectExtractionModelOutput["candidates"][number], "sourceCurrency" | "taxBasis"> &
    Partial<Pick<HouseProjectExtractionModelOutput["candidates"][number], "sourceCurrency" | "taxBasis">>,
): HouseProjectExtractionModelOutput {
  return {
    documentLanguage: "pl",
    candidates: [{ sourceCurrency: null, taxBasis: null, ...candidate }],
  };
}

describe("house project extraction normalization", () => {
  it("retries one unparsed model response before accepting the chunk", async () => {
    const parse = vi.fn()
      .mockResolvedValueOnce({
        id: "response-invalid",
        status: "incomplete",
        incomplete_details: { reason: "max_output_tokens" },
        output_parsed: null,
        usage: { input_tokens: 10, output_tokens: 20 },
      })
      .mockResolvedValueOnce({
        id: "response-valid",
        status: "completed",
        incomplete_details: null,
        output_parsed: output({
          fieldPath: "product.name",
          entityKey: null,
          parentEntityKey: null,
          value: "Herdla",
          origin: "extracted",
          evidence: [{ pageNumber: 3, excerpt: "Herdla" }],
        }),
        usage: { input_tokens: 11, output_tokens: 21 },
      });
    const client = { withOptions: () => ({ responses: { parse } }) };

    const result = await extractHouseProject(layout, { client: client as never });

    expect(parse).toHaveBeenCalledTimes(2);
    expect(result.responseIds).toEqual(["response-invalid", "response-valid"]);
    expect(result.inputTokens).toBe(21);
    expect(result.outputTokens).toBe(41);
    expect(result.candidates).toHaveLength(1);
  });

  it("retries one parsed response that fails deterministic normalization", async () => {
    const invalid = output({
      fieldPath: "product.name",
      entityKey: null,
      parentEntityKey: null,
      value: "Herdla",
      origin: "extracted",
      evidence: [{ pageNumber: 99, excerpt: "Herdla" }],
    });
    const valid = output({
      fieldPath: "product.name",
      entityKey: null,
      parentEntityKey: null,
      value: "Herdla",
      origin: "extracted",
      evidence: [{ pageNumber: 3, excerpt: "Herdla" }],
    });
    const parse = vi.fn()
      .mockResolvedValueOnce({
        id: "response-invalid",
        status: "completed",
        incomplete_details: null,
        output_parsed: invalid,
        usage: { input_tokens: 10, output_tokens: 20 },
      })
      .mockResolvedValueOnce({
        id: "response-valid",
        status: "completed",
        incomplete_details: null,
        output_parsed: valid,
        usage: { input_tokens: 11, output_tokens: 21 },
      });
    const client = { withOptions: () => ({ responses: { parse } }) };

    const result = await extractHouseProject(layout, { client: client as never });

    expect(parse).toHaveBeenCalledTimes(2);
    expect(result.responseIds).toEqual(["response-invalid", "response-valid"]);
    expect(result.candidates).toHaveLength(1);
  });

  it("splits a long document into bounded page chunks", () => {
    const pages = Array.from({ length: 14 }, (_, index) => ({
      ...layout.pages[0],
      pageNumber: index + 1,
    }));
    const chunks = splitDocumentLayout({ ...layout, pages });

    expect(chunks.map((chunk) => chunk.pages.map((page) => page.pageNumber))).toEqual([
      [1, 2, 3, 4, 5],
      [6, 7, 8, 9, 10],
      [11, 12, 13, 14],
    ]);
  });

  it("bisects an oversized chunk without losing page order", () => {
    const pages = Array.from({ length: 5 }, (_, index) => ({
      ...layout.pages[0],
      pageNumber: index + 1,
    }));

    const chunks = bisectDocumentLayout({ ...layout, pages });

    expect(chunks.map((chunk) => chunk.pages.map((page) => page.pageNumber))).toEqual([
      [1, 2, 3],
      [4, 5],
    ]);
  });

  it("normalizes a supported candidate and derives confidence", async () => {
    const { candidates: [candidate] } = await normalizeHouseProjectExtraction(output({
      fieldPath: "product.floorAreaM2",
      entityKey: null,
      parentEntityKey: null,
      value: 67.57,
      origin: "extracted",
      evidence: [{ pageNumber: 3, excerpt: "Powierzchnia użytkowa 67,57 m2" }],
    }), layout, "treevia-nord-68");

    expect(candidate).toMatchObject({
      fieldPath: "product.floorAreaM2",
      normalizedValue: 67.57,
      confidence: "high",
      ocrConfidence: 0.96,
    });
  });

  it("drops a candidate with a disallowed origin without losing valid extraction", async () => {
    const result = await normalizeHouseProjectExtraction({
      documentLanguage: "pl",
      candidates: [
        {
          fieldPath: "product.name",
          entityKey: null,
          parentEntityKey: null,
          value: "NORD 68",
          sourceCurrency: null,
          taxBasis: null,
          origin: "extracted",
          evidence: [{ pageNumber: 3, excerpt: "NORD 68" }],
        },
        {
          fieldPath: "technical.ventilation",
          entityKey: null,
          parentEntityKey: null,
          value: "Wentylacja mechaniczna z rekuperacją",
          sourceCurrency: null,
          taxBasis: null,
          origin: "generated",
          evidence: [],
        },
      ],
    }, layout, "treevia-nord-68");

    expect(result.candidates).toHaveLength(1);
    expect(result.candidates[0]).toMatchObject({
      fieldPath: "product.name",
      normalizedValue: "NORD 68",
    });
    expect(result.issues).toEqual([{
      code: "ORIGIN_NOT_ALLOWED",
      fieldPath: "technical.ventilation",
      entityKey: null,
      parentEntityKey: null,
      evidencePages: [],
    }]);
  });

  it("drops an inferred turnkey standard when the evidence does not name it", async () => {
    const result = await normalizeHouseProjectExtraction(output({
      fieldPath: "variants[].completionStandard",
      entityKey: "variant-basic",
      parentEntityKey: null,
      value: "pod-klucz",
      origin: "inferred",
      evidence: [{ pageNumber: 3, excerpt: "pełny standard całoroczny" }],
    }), layout, "house");

    expect(result.candidates).toEqual([]);
    expect(result.issues).toEqual([expect.objectContaining({
      code: "ORIGIN_NOT_ALLOWED",
      fieldPath: "variants[].completionStandard",
    })]);
  });

  it("keeps an explicitly named turnkey standard", async () => {
    const result = await normalizeHouseProjectExtraction(output({
      fieldPath: "variants[].completionStandard",
      entityKey: "variant-turnkey",
      parentEntityKey: null,
      value: "pod-klucz",
      origin: "inferred",
      evidence: [{ pageNumber: 3, excerpt: "Standard pod klucz" }],
    }), layout, "house");

    expect(result.candidates).toHaveLength(1);
    expect(result.issues).toEqual([]);
  });

  it("drops STAN ZERO and a price-only installation estimate", async () => {
    const normalized = await normalizeHouseProjectExtraction({
      documentLanguage: "pl",
      candidates: [
        {
          fieldPath: "variants[].variantLabel",
          entityKey: "variant-basic",
          parentEntityKey: null,
          value: "BASIC",
          sourceCurrency: null,
          taxBasis: null,
          origin: "extracted",
          evidence: [{ pageNumber: 3, excerpt: "WARIANT BASIC" }],
        },
        {
          fieldPath: "variants[].variantLabel",
          entityKey: "variant-zero",
          parentEntityKey: null,
          value: "STAN ZERO",
          sourceCurrency: null,
          taxBasis: null,
          origin: "extracted",
          evidence: [{ pageNumber: 3, excerpt: "STAN ZERO" }],
        },
        {
          fieldPath: "variants[].priceMinCents",
          entityKey: "variant-installation-estimate",
          parentEntityKey: null,
          value: "57000",
          sourceCurrency: "PLN",
          taxBasis: "net",
          origin: "extracted",
          evidence: [{ pageNumber: 3, excerpt: "montaż orientacyjnie 57 000 PLN netto" }],
        },
      ],
    }, layout, "house", async () => ({
      provider: "ECB",
      series: "EXR.D.PLN.EUR.SP00.A",
      sourceCurrency: "PLN",
      targetCurrency: "EUR",
      rate: "4.5000",
      rateDate: "2026-09-18",
      retrievedAt: "2026-09-20T10:00:00.000Z",
    }));

    const filtered = filterUnsupportedVariantCandidates(normalized.candidates);

    expect(filtered).toHaveLength(1);
    expect(filtered[0]).toMatchObject({
      fieldPath: "variants[].variantLabel",
      normalizedValue: "BASIC",
    });
  });

  it("namespaces repeated entity keys", async () => {
    const { candidates: [candidate] } = await normalizeHouseProjectExtraction(output({
      fieldPath: "rooms[].name",
      entityKey: "Pokój 1",
      parentEntityKey: null,
      value: "Sypialnia",
      origin: "extracted",
      evidence: [{ pageNumber: 3, excerpt: "Sypialnia" }],
    }), layout, "treevia-nord-68");

    expect(candidate.entityKey).toBe("treevia-nord-68:page-3-pokoj-1");
  });

  it("canonicalizes package prefixes and ALL-IN entity key spelling", async () => {
    const { candidates } = await normalizeHouseProjectExtraction(output({
      fieldPath: "variants[].variantLabel",
      entityKey: "wariant-all-in",
      parentEntityKey: null,
      value: "WARIANT ALL-IN",
      origin: "extracted",
      evidence: [{ pageNumber: 3, excerpt: "WARIANT ALL-IN" }],
    }), layout, "house");

    expect(candidates[0]).toMatchObject({
      entityKey: "house:variant-allin",
      normalizedValue: "ALL-IN",
    });
  });

  it("keeps the same local room key separate on different floor-plan pages", async () => {
    const groundFloor = await normalizeHouseProjectExtraction(output({
      fieldPath: "rooms[].name",
      entityKey: "room-1",
      parentEntityKey: null,
      value: "Salon z jadalnią",
      origin: "extracted",
      evidence: [{ pageNumber: 3, excerpt: "1. Salon z jadalnią 21,75 m²" }],
    }), layout, "treevia-nord-68");
    const atticLayout = {
      ...layout,
      pages: [{ ...layout.pages[0], pageNumber: 7 }],
    };
    const attic = await normalizeHouseProjectExtraction(output({
      fieldPath: "rooms[].name",
      entityKey: "room-1",
      parentEntityKey: null,
      value: "Sypialnia 1",
      origin: "extracted",
      evidence: [{ pageNumber: 7, excerpt: "1. Sypialnia 1 10,52 m²" }],
    }), atticLayout, "treevia-nord-68");

    expect(groundFloor.candidates[0]?.entityKey).toBe("treevia-nord-68:page-3-room-1");
    expect(attic.candidates[0]?.entityKey).toBe("treevia-nord-68:page-7-room-1");
  });

  it("rejects evidence pointing outside the analyzed document", async () => {
    await expect(normalizeHouseProjectExtraction(output({
      fieldPath: "product.name",
      entityKey: null,
      parentEntityKey: null,
      value: "NORD 68",
      origin: "extracted",
      evidence: [{ pageNumber: 99, excerpt: "NORD 68" }],
    }), layout)).rejects.toThrow(AzureAiProviderError);
  });

  it("keeps a dependent candidate without a guessed variant and reports it for manual assignment", async () => {
    const { candidates } = await normalizeHouseProjectExtraction(output({
      fieldPath: "variants[].timeline[].startsFromLabel",
      entityKey: "montaz",
      parentEntityKey: null,
      value: "od zakończenia produkcji",
      origin: "extracted",
      evidence: [{ pageNumber: 3, excerpt: "Montaż od zakończenia produkcji" }],
    }), layout, "treevia-nord-68");

    expect(candidates).toHaveLength(1);
    expect(findVariantAssignmentIssues(candidates)).toEqual([{
      code: "VARIANT_ASSIGNMENT_REQUIRED",
      fieldPath: "variants[].timeline[].startsFromLabel",
      entityKey: "treevia-nord-68:montaz",
      parentEntityKey: null,
      evidencePages: [3],
    }]);
  });

  it("accepts a dependent candidate assigned to a variant found in another chunk", async () => {
    const { candidates: variant } = await normalizeHouseProjectExtraction(output({
      fieldPath: "variants[].variantLabel",
      entityKey: "wariant-pod-klucz",
      parentEntityKey: null,
      value: "Pod klucz",
      origin: "extracted",
      evidence: [{ pageNumber: 3, excerpt: "Wariant pod klucz" }],
    }), layout, "treevia-nord-68");
    const { candidates: stage } = await normalizeHouseProjectExtraction(output({
      fieldPath: "variants[].timeline[].startsFromLabel",
      entityKey: "montaz",
      parentEntityKey: "wariant-pod-klucz",
      value: "od zakończenia produkcji",
      origin: "extracted",
      evidence: [{ pageNumber: 3, excerpt: "Montaż od zakończenia produkcji" }],
    }), layout, "treevia-nord-68");

    expect(findVariantAssignmentIssues([...variant, ...stage])).toEqual([]);
  });

  it("converts an extracted net PLN price to EUR and keeps its source", async () => {
    const rateProvider = async () => ({
      provider: "ECB" as const,
      series: "EXR.D.PLN.EUR.SP00.A",
      sourceCurrency: "PLN",
      targetCurrency: "EUR" as const,
      rate: "4.5000",
      rateDate: "2026-09-18",
      retrievedAt: "2026-09-20T10:00:00.000Z",
    });
    const result = await normalizeHouseProjectExtraction(output({
      fieldPath: "variants[].priceMinCents",
      entityKey: "wariant-basic",
      parentEntityKey: null,
      value: "454149.00",
      sourceCurrency: "PLN",
      taxBasis: "net",
      origin: "extracted",
      evidence: [{ pageNumber: 3, excerpt: "Cena netto 454 149 PLN" }],
    }), layout, "treevia-nord-68", rateProvider);

    expect(result.issues).toEqual([]);
    expect(result.candidates[0]).toMatchObject({
      rawValue: { amount: "454149.00", currency: "PLN", taxBasis: "net" },
      normalizedValue: 10_092_200,
      normalizationMetadata: {
        provider: "ECB",
        rate: "4.5000",
        rounding: "HALF_UP_2",
      },
    });
  });

  it("uses the labelled net amount from evidence when the model drops the decimal separator", async () => {
    const rateProvider = async () => ({
      provider: "ECB" as const,
      series: "EXR.D.PLN.EUR.SP00.A",
      sourceCurrency: "PLN",
      targetCurrency: "EUR" as const,
      rate: "4.5000",
      rateDate: "2026-09-18",
      retrievedAt: "2026-09-20T10:00:00.000Z",
    });
    const result = await normalizeHouseProjectExtraction(output({
      fieldPath: "variants[].priceMinCents",
      entityKey: "wariant-basic",
      parentEntityKey: null,
      value: "45414900",
      sourceCurrency: "PLN",
      taxBasis: "net",
      origin: "extracted",
      evidence: [{ pageNumber: 3, excerpt: "Cena netto: 454 149,00 PLN" }],
    }), layout, "treevia-nord-68", rateProvider);

    expect(result.candidates[0]).toMatchObject({
      rawValue: { amount: "454149.00", currency: "PLN", taxBasis: "net" },
      normalizedValue: 10_092_200,
    });
  });

  it("repairs a price multiplied by 100 from one currency-labelled evidence amount", async () => {
    const rateProvider = async () => ({
      provider: "ECB" as const,
      series: "EXR.D.PLN.EUR.SP00.A",
      sourceCurrency: "PLN",
      targetCurrency: "EUR" as const,
      rate: "4.5000",
      rateDate: "2026-09-18",
      retrievedAt: "2026-09-20T10:00:00.000Z",
    });
    const result = await normalizeHouseProjectExtraction(output({
      fieldPath: "variants[].priceMinCents",
      entityKey: "variant-all-in",
      parentEntityKey: null,
      value: "53619500",
      sourceCurrency: "PLN",
      taxBasis: "net",
      origin: "extracted",
      evidence: [{ pageNumber: 3, excerpt: "WARIANT ALL-IN . STAN DEWELOPERSKI 536 195 zł" }],
    }), layout, "house", rateProvider);

    expect(result.candidates[0]).toMatchObject({
      entityKey: "house:variant-allin",
      rawValue: { amount: "536195", currency: "PLN", taxBasis: "net" },
    });
  });

  it("keeps named packages separate from their canonical completion standard", async () => {
    const result = await normalizeHouseProjectExtraction({
      documentLanguage: "pl",
      candidates: [
        {
          fieldPath: "variants[].variantLabel",
          entityKey: "wariant-all-in",
          parentEntityKey: null,
          value: "ALL-IN",
          sourceCurrency: null,
          taxBasis: null,
          origin: "extracted",
          evidence: [{ pageNumber: 3, excerpt: "WARIANT ALL-IN" }],
        },
        {
          fieldPath: "variants[].completionStandard",
          entityKey: "wariant-all-in",
          parentEntityKey: null,
          value: "Stan deweloperski",
          sourceCurrency: null,
          taxBasis: null,
          origin: "inferred",
          evidence: [{ pageNumber: 3, excerpt: "zamknięte płyty GK i wykonane jastrychy" }],
        },
      ],
    }, layout, "treevia-nord-68");

    expect(result.candidates).toMatchObject([
      { fieldPath: "variants[].variantLabel", normalizedValue: "ALL-IN", entityKey: "treevia-nord-68:variant-allin" },
      { fieldPath: "variants[].completionStandard", normalizedValue: "deweloperski", entityKey: "treevia-nord-68:variant-allin" },
    ]);
  });

  it.each([
    ["Stan surowy zamknięty", "surowy-zamkniety"],
    ["Closed shell", "surowy-zamkniety"],
    ["Geschlossener Rohbau", "surowy-zamkniety"],
    ["Wind- en waterdicht", "surowy-zamkniety"],
    ["Stan deweloperski", "deweloperski"],
    ["Developer finish", "deweloperski"],
    ["Ausbaustandard", "deweloperski"],
    ["Ontwikkelaarsstandaard", "deweloperski"],
    ["Stan pod klucz", "pod-klucz"],
    ["Turnkey", "pod-klucz"],
    ["Schlüsselfertig", "pod-klucz"],
    ["Sleutelklaar", "pod-klucz"],
  ])("normalizes completion standard %s to %s", async (sourceValue, expectedValue) => {
    const result = await normalizeHouseProjectExtraction(output({
      fieldPath: "variants[].completionStandard",
      entityKey: "variant-1",
      parentEntityKey: null,
      value: sourceValue,
      sourceCurrency: null,
      taxBasis: null,
      origin: "extracted",
      evidence: [{ pageNumber: 3, excerpt: sourceValue }],
    }), layout, "completion-standard-test");

    expect(result.candidates[0]?.normalizedValue).toBe(expectedValue);
  });

  it("does not treat a package price difference as the total variant price", async () => {
    let rateRequested = false;
    const result = await normalizeHouseProjectExtraction(output({
      fieldPath: "variants[].priceMinCents",
      entityKey: "wariant-all-in",
      parentEntityKey: null,
      value: "82046.00",
      sourceCurrency: "PLN",
      taxBasis: "net",
      origin: "extracted",
      evidence: [{ pageNumber: 3, excerpt: "Różnica pomiędzy BASIC i ALL-IN: 82 046 PLN netto" }],
    }), layout, "treevia-nord-68", async () => {
      rateRequested = true;
      throw new Error("rate provider must not be called for a price difference");
    });

    expect(result.candidates).toEqual([]);
    expect(rateRequested).toBe(false);
  });

  it("does not import a gross price", async () => {
    const result = await normalizeHouseProjectExtraction(output({
      fieldPath: "variants[].priceMinCents",
      entityKey: "wariant-basic",
      parentEntityKey: null,
      value: "490481.00",
      sourceCurrency: "PLN",
      taxBasis: "gross",
      origin: "extracted",
      evidence: [{ pageNumber: 3, excerpt: "Cena brutto 490 481 PLN" }],
    }), layout);

    expect(result.candidates).toEqual([]);
    expect(result.issues).toEqual([]);
  });

  it("does not import the gross amount from a compact net and gross price row", async () => {
    let rateRequested = false;
    const result = await normalizeHouseProjectExtraction(output({
      fieldPath: "variants[].priceMinCents",
      entityKey: "wariant-basic",
      parentEntityKey: null,
      value: "805739",
      sourceCurrency: "PLN",
      taxBasis: "net",
      origin: "extracted",
      evidence: [{ pageNumber: 3, excerpt: "CENA NETTO · BRUTTO 805 739 ZŁ (VAT" }],
    }), layout, "treevia-barn-124", async () => {
      rateRequested = true;
      throw new Error("rate provider must not be called for a gross amount");
    });

    expect(result.candidates).toEqual([]);
    expect(rateRequested).toBe(false);
  });

  it("does not treat a gross price as a maximum when the model labels it as net", async () => {
    let rateRequested = false;
    const result = await normalizeHouseProjectExtraction(output({
      fieldPath: "variants[].priceMaxCents",
      entityKey: "wariant-basic",
      parentEntityKey: null,
      value: "490481.00",
      sourceCurrency: "PLN",
      taxBasis: "net",
      origin: "extracted",
      evidence: [{ pageNumber: 3, excerpt: "Cena brutto: 490 481 PLN" }],
    }), layout, "treevia-nord-68", async () => {
      rateRequested = true;
      throw new Error("rate provider must not be called for a gross maximum");
    });

    expect(result.candidates).toEqual([]);
    expect(rateRequested).toBe(false);
  });

  it("keeps priceMax empty without an explicit upper bound", async () => {
    let rateRequested = false;
    const result = await normalizeHouseProjectExtraction(output({
      fieldPath: "variants[].priceMaxCents",
      entityKey: "wariant-basic",
      parentEntityKey: null,
      value: "490481.00",
      sourceCurrency: "PLN",
      taxBasis: "net",
      origin: "extracted",
      evidence: [{ pageNumber: 3, excerpt: "Cena netto: 490 481 PLN" }],
    }), layout, "treevia-nord-68", async () => {
      rateRequested = true;
      throw new Error("rate provider must not be called without an explicit maximum");
    });

    expect(result.candidates).toEqual([]);
    expect(rateRequested).toBe(false);
  });

  it("keeps priceMax when the document explicitly labels an upper net price", async () => {
    const result = await normalizeHouseProjectExtraction(output({
      fieldPath: "variants[].priceMaxCents",
      entityKey: "wariant-individual",
      parentEntityKey: null,
      value: "490481.00",
      sourceCurrency: "PLN",
      taxBasis: "net",
      origin: "extracted",
      evidence: [{ pageNumber: 3, excerpt: "Cena maksymalna netto: 490 481 PLN" }],
    }), layout, "treevia-nord-68", async () => ({
      provider: "ECB" as const,
      series: "EXR.D.PLN.EUR.SP00.A",
      sourceCurrency: "PLN",
      targetCurrency: "EUR" as const,
      rate: "4.5000",
      rateDate: "2026-09-18",
      retrievedAt: "2026-09-20T10:00:00.000Z",
    }));

    expect(result.candidates[0]).toMatchObject({
      fieldPath: "variants[].priceMaxCents",
      rawValue: { amount: "490481.00", currency: "PLN", taxBasis: "net" },
    });
  });

  it("reports a missing ECB rate without rejecting the remaining extraction", async () => {
    const result = await normalizeHouseProjectExtraction(output({
      fieldPath: "variants[].priceMinCents",
      entityKey: "wariant-basic",
      parentEntityKey: null,
      value: "454149.00",
      sourceCurrency: "PLN",
      taxBasis: "net",
      origin: "extracted",
      evidence: [{ pageNumber: 3, excerpt: "Cena netto 454 149 PLN" }],
    }), layout, "treevia-nord-68", async () => {
      const { EcbRateUnavailableError } = await import("@/lib/ai/ecb-exchange-rates");
      throw new EcbRateUnavailableError("PLN");
    });

    expect(result.candidates).toEqual([]);
    expect(result.issues).toEqual([{
      code: "FX_RATE_UNAVAILABLE",
      fieldPath: "variants[].priceMinCents",
      entityKey: "treevia-nord-68:variant-basic",
      parentEntityKey: null,
      evidencePages: [3],
    }]);
  });
});
