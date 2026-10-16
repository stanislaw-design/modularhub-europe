import { describe, expect, it } from "vitest";
import { extensionForMimeType, formatAttachmentSize, MAX_FILENAME_LENGTH, sanitizeAttachmentFilename } from "./inquiry-attachment-specs";

describe("sanitizeAttachmentFilename (spec 0070 AC-30)", () => {
  it("keeps a normal name, including Polish letters", () => {
    expect(sanitizeAttachmentFilename("Rzut parteru – dom żółć.pdf")).toBe("Rzut parteru – dom żółć.pdf");
  });

  it("drops path segments", () => {
    expect(sanitizeAttachmentFilename("../../etc/passwd.pdf")).toBe("passwd.pdf");
    expect(sanitizeAttachmentFilename("C:\\Users\\x\\plan.pdf")).toBe("plan.pdf");
  });

  it("removes control characters and header breaking quotes", () => {
    expect(sanitizeAttachmentFilename('pl\r\nik"\u0000.pdf')).toBe("plik_.pdf");
  });

  it("falls back to a default for an empty or dots only name", () => {
    expect(sanitizeAttachmentFilename("")).toBe("plik");
    expect(sanitizeAttachmentFilename("...")).toBe("plik");
    expect(sanitizeAttachmentFilename("../")).toBe("plik");
  });

  it("truncates to 120 characters and keeps the extension", () => {
    const result = sanitizeAttachmentFilename(`${"a".repeat(300)}.pdf`);
    expect(result).toHaveLength(MAX_FILENAME_LENGTH);
    expect(result.endsWith(".pdf")).toBe(true);
  });
});

describe("attachment helpers", () => {
  it("maps mime types to extensions", () => {
    expect(extensionForMimeType("application/pdf")).toBe(".pdf");
    expect(extensionForMimeType("image/jpeg")).toBe(".jpg");
    expect(extensionForMimeType("text/html")).toBe("");
  });

  it("formats sizes", () => {
    expect(formatAttachmentSize(500)).toBe("1 KB");
    expect(formatAttachmentSize(2 * 1024 * 1024)).toBe("2.0 MB");
  });
});
