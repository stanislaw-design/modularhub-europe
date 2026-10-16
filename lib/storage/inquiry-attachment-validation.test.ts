import { describe, expect, it } from "vitest";
import { ATTACHMENT_MAX_FILE_BYTES } from "@/lib/inquiry-attachment-specs";
import { validateInquiryAttachment } from "./inquiry-attachment-validation";

function pdf(body = "/Type /Page\nBT sample ET"): Buffer {
  return Buffer.from(`%PDF-1.7\n1 0 obj\n${body}\nendobj\n%%EOF`, "latin1");
}

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0]);
const WEBP = Buffer.concat([Buffer.from("RIFF"), Buffer.from([0, 0, 0, 0]), Buffer.from("WEBP")]);

describe("validateInquiryAttachment (spec 0070 AC-28)", () => {
  it("accepts a PDF, JPEG, PNG and WebP by signature", () => {
    expect(validateInquiryAttachment(pdf())).toEqual({ ok: true, mimeType: "application/pdf" });
    expect(validateInquiryAttachment(JPEG)).toEqual({ ok: true, mimeType: "image/jpeg" });
    expect(validateInquiryAttachment(PNG)).toEqual({ ok: true, mimeType: "image/png" });
    expect(validateInquiryAttachment(WEBP)).toEqual({ ok: true, mimeType: "image/webp" });
  });

  it("rejects a file with no allowed signature, whatever its name", () => {
    expect(validateInquiryAttachment(Buffer.from("<html><script>alert(1)</script></html>"))).toMatchObject({
      ok: false,
      errorCode: "invalid_type",
    });
  });

  it("rejects an empty file", () => {
    expect(validateInquiryAttachment(new Uint8Array(0))).toMatchObject({ ok: false, errorCode: "invalid_type" });
  });

  it("rejects a file over 20 MB", () => {
    expect(validateInquiryAttachment(new Uint8Array(ATTACHMENT_MAX_FILE_BYTES + 1))).toMatchObject({
      ok: false,
      errorCode: "too_large",
    });
  });

  it.each([
    ["/JavaScript", "/Type /Page\n/JavaScript 5 0 R"],
    ["/JS", "/Type /Page\n/S /JavaScript /JS (app.alert(1))"],
    ["/Launch", "/Type /Page\n/S /Launch"],
    ["/Encrypt", "/Type /Page\n/Encrypt 2 0 R"],
  ])("rejects a PDF with %s", (_label, body) => {
    expect(validateInquiryAttachment(pdf(body))).toMatchObject({ ok: false, errorCode: "file_rejected" });
  });

  it("does not reject /OpenAction, which ordinary CAD PDFs contain", () => {
    expect(validateInquiryAttachment(pdf("/Type /Catalog\n/OpenAction [3 0 R /Fit]"))).toEqual({
      ok: true,
      mimeType: "application/pdf",
    });
  });

  it("does not reject a PDF that merely mentions /JSON or text containing JS", () => {
    expect(validateInquiryAttachment(pdf("/Type /Page\n/Subtype /JSON\nBT (JS) ET"))).toMatchObject({ ok: true });
  });

  it("rejects a truncated PDF", () => {
    expect(validateInquiryAttachment(Buffer.from("%PDF-1.7\n/Type /Page"))).toMatchObject({
      ok: false,
      errorCode: "file_rejected",
    });
  });
});
