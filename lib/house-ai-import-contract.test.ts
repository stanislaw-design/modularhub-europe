import { describe, expect, it } from "vitest";
import { buildAiProductDraftValues, resolveHousePdfImportView } from "./house-ai-import-contract";

describe("house import draft contract", () => {
  it("creates an empty house draft and never copies extracted values before review", () => {
    const values = buildAiProductDraftValues({
      productId: "product-id",
      sessionId: "session-id",
      producerId: "producer-id",
      userId: "user-id",
      model: "gpt-5-mini@2025-08-07",
    });

    expect(values.product).toEqual({
      id: "product-id",
      producerId: "producer-id",
      status: "draft",
      family: "dom",
      currency: "EUR",
    });
    expect(values.product).not.toHaveProperty("name");
    expect(values.product).not.toHaveProperty("description");
    expect(values.product).not.toHaveProperty("technicalSpecs");
  });

  it.each([
    ["uploading", "upload"],
    ["queued", "processing"],
    ["extracting", "processing"],
    ["review_ready", "review"],
    ["applied", "review"],
    ["failed", "error"],
  ])("maps %s to the %s screen", (status, expected) => {
    expect(resolveHousePdfImportView(status)).toBe(expected);
  });
});
