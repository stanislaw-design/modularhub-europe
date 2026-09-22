import { describe, expect, it } from "vitest";
import {
  sanitizeAiSourceFilename,
  validateAiSourcePdf,
  validateAiSourceUploadMetadata,
} from "./ai-source-pdf-validation";

function pdf(body = "/Type /Page\nBT sample ET"): Uint8Array {
  return Buffer.from(`%PDF-1.7\n1 0 obj\n${body}\nendobj\n%%EOF`, "latin1");
}

describe("AI source PDF validation", () => {
  it("accepts a structural PDF and derives only server owned metadata", () => {
    expect(validateAiSourcePdf(pdf())).toMatchObject({
      ok: true,
      pageCount: 1,
      pdfKind: "text",
      sha256: expect.stringMatching(/^[a-f0-9]{64}$/),
    });
  });

  it.each([
    ["spoofed content", Buffer.from("not-a-pdf"), "sygnatury PDF"],
    ["missing trailer", Buffer.from("%PDF-1.7\n/Type /Page"), "niekompletny"],
    ["encrypted document", pdf("/Type /Page\n/Encrypt 2 0 R"), "Zaszyfrowane"],
  ])("rejects %s", (_label, bytes, message) => {
    expect(validateAiSourcePdf(bytes)).toMatchObject({ ok: false, error: expect.stringContaining(message) });
  });

  it("does not trust a PDF extension with a non PDF declared type", () => {
    expect(validateAiSourceUploadMetadata({
      filename: "offer.pdf",
      sizeBytes: 100,
      contentType: "text/plain",
    })).toMatchObject({ ok: false });
  });

  it("removes path and control characters from the display name", () => {
    expect(sanitizeAiSourceFilename("../secret/offer\u0000.pdf")).toBe("offer.pdf");
  });
});
