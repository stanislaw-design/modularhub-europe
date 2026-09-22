import { describe, expect, it } from "vitest";
import type { AnalyzeResultOutput } from "@azure-rest/ai-document-intelligence";
import { normalizeDocumentLayout } from "./document-intelligence";

describe("normalizeDocumentLayout", () => {
  it("keeps page evidence, language and average OCR confidence", () => {
    const result = {
      apiVersion: "2024-11-30",
      modelId: "prebuilt-layout",
      stringIndexType: "utf16CodeUnit",
      content: "Dom 42 m2",
      pages: [
        {
          pageNumber: 1,
          spans: [{ offset: 0, length: 9 }],
          words: [
            { content: "Dom", span: { offset: 0, length: 3 }, confidence: 0.9 },
            { content: "42", span: { offset: 4, length: 2 }, confidence: 0.8 },
          ],
          lines: [{ content: "Dom 42 m2", spans: [{ offset: 0, length: 9 }], polygon: [0, 0, 1, 0, 1, 1, 0, 1] }],
        },
      ],
      languages: [{ locale: "pl", confidence: 0.97, spans: [{ offset: 0, length: 9 }] }],
    } satisfies AnalyzeResultOutput;

    const normalized = normalizeDocumentLayout(result);
    expect(normalized.pages[0]?.averageWordConfidence).toBeCloseTo(0.85);
    expect(normalized).toEqual({
      apiVersion: "2024-11-30",
      modelId: "prebuilt-layout",
      pages: [
        {
          pageNumber: 1,
          text: "Dom 42 m2",
          averageWordConfidence: expect.any(Number),
          language: { locale: "pl", confidence: 0.97 },
          lines: [{ content: "Dom 42 m2", polygon: [0, 0, 1, 0, 1, 1, 0, 1] }],
        },
      ],
    });
  });
});
