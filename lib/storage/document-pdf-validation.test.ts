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

  // spec 0063 AC-4: maxBytes jest opcjonalny, dla PDF-a wyceny (20 MB) wyższy
  // niż domyślny MAX_DOCUMENT_PDF_BYTES (10 MB) każdego innego wołającego.
  describe("maxBytes override", () => {
    const QUOTE_PDF_MAX_BYTES = 20 * 1024 * 1024;

    function largePdf(size: number): Uint8Array {
      const header = Buffer.from("%PDF-1.7\n1 0 obj\n", "latin1");
      const footer = Buffer.from("\nendobj\n%%EOF", "latin1");
      const padding = Buffer.alloc(size - header.byteLength - footer.byteLength, "A");
      return Buffer.concat([header, padding, footer]);
    }

    it("accepts a file above the default 10 MB limit when under the given maxBytes", () => {
      const aboveDefault = largePdf(MAX_DOCUMENT_PDF_BYTES + 1);
      expect(validateDocumentPdf(aboveDefault, QUOTE_PDF_MAX_BYTES)).toMatchObject({ ok: true });
    });

    it("rejects a file over the given maxBytes, naming that limit in the error", () => {
      const oversized = new Uint8Array(QUOTE_PDF_MAX_BYTES + 1);
      expect(validateDocumentPdf(oversized, QUOTE_PDF_MAX_BYTES)).toMatchObject({ ok: false, error: expect.stringContaining("20 MB") });
    });

    it("still rejects an empty file regardless of maxBytes", () => {
      expect(validateDocumentPdf(new Uint8Array(0), QUOTE_PDF_MAX_BYTES)).toMatchObject({ ok: false, error: expect.stringContaining("pusty") });
    });
  });
});
