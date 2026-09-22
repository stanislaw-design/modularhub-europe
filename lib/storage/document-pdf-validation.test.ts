import { describe, expect, it } from "vitest";
import { MAX_DOCUMENT_PDF_BYTES, validateDocumentPdf } from "./document-pdf-validation";

function pdf(body = "/Type /Page\nBT sample ET"): Uint8Array {
  return Buffer.from(`%PDF-1.7\n1 0 obj\n${body}\nendobj\n%%EOF`, "latin1");
}

describe("document PDF validation", () => {
  it("accepts a well formed PDF", () => {
    expect(validateDocumentPdf(pdf())).toEqual({ ok: true });
  });

  it("rejects an empty file", () => {
    expect(validateDocumentPdf(new Uint8Array(0))).toMatchObject({ ok: false, error: expect.stringContaining("pusty") });
  });

  it("rejects a file over the 10 MB limit", () => {
    const oversized = new Uint8Array(MAX_DOCUMENT_PDF_BYTES + 1);
    expect(validateDocumentPdf(oversized)).toMatchObject({ ok: false, error: expect.stringContaining("10 MB") });
  });

  it.each([
    ["spoofed content", Buffer.from("not-a-pdf"), "sygnatury PDF"],
    ["missing trailer", Buffer.from("%PDF-1.7\n/Type /Page"), "niekompletny"],
    ["encrypted document", pdf("/Type /Page\n/Encrypt 2 0 R"), "Zaszyfrowane"],
  ])("rejects %s", (_label, bytes, message) => {
    expect(validateDocumentPdf(bytes)).toMatchObject({ ok: false, error: expect.stringContaining(message) });
  });
});
