import { describe, expect, it } from "vitest";
import {
  ALLOWED_IMAGE_MIME_TYPES,
  MAX_IMAGE_SIZE_BYTES,
  detectImageMimeType,
  validateProductPhotoFile,
} from "./document-validation";

function jpegBytes(padding = 100): Uint8Array {
  return new Uint8Array([0xff, 0xd8, 0xff, ...new Array(padding).fill(0)]);
}

function pngBytes(padding = 100): Uint8Array {
  return new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, ...new Array(padding).fill(0)]);
}

function webpBytes(padding = 100): Uint8Array {
  const riff = [0x52, 0x49, 0x46, 0x46]; // "RIFF"
  const size = [0x00, 0x00, 0x00, 0x00];
  const webp = [0x57, 0x45, 0x42, 0x50]; // "WEBP"
  return new Uint8Array([...riff, ...size, ...webp, ...new Array(padding).fill(0)]);
}

// spec 0031 AC-3: rozszerzenie/deklarowany Content-Type mogą być podrobione,
// więc jedyne co ma znaczenie to rzeczywista sygnatura bajtowa.
describe("detectImageMimeType", () => {
  it("recognizes a real JPEG signature", () => {
    expect(detectImageMimeType(jpegBytes())).toBe("image/jpeg");
  });

  it("recognizes a real PNG signature", () => {
    expect(detectImageMimeType(pngBytes())).toBe("image/png");
  });

  it("recognizes a real WebP signature (RIFF....WEBP)", () => {
    expect(detectImageMimeType(webpBytes())).toBe("image/webp");
  });

  // Regresja dla realnego znaleziska z migracji (spec 0031 verify.md, 2026-09-09):
  // budman-house/kazik/03_rzut.jpg okazał się być stroną HTML z rozszerzeniem
  // .jpg (nieudane pobranie przy imporcie), nie prawdziwym obrazem.
  it("rejects an HTML document saved with an .jpg extension", () => {
    const html = new TextEncoder().encode("<!DOCTYPE html>\n<html lang=\"pl\">\n<head><title>x</title>");
    expect(detectImageMimeType(html)).toBeNull();
  });

  it("rejects an empty buffer", () => {
    expect(detectImageMimeType(new Uint8Array())).toBeNull();
  });

  it("does not false-positive a RIFF file that isn't WEBP (e.g. a WAV file)", () => {
    const wav = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x41, 0x56, 0x45]); // "RIFF"...."WAVE"
    expect(detectImageMimeType(wav)).toBeNull();
  });
});

describe("validateProductPhotoFile", () => {
  it("accepts a valid JPEG under the size limit", () => {
    const result = validateProductPhotoFile(jpegBytes());
    expect(result).toEqual({ ok: true, mimeType: "image/jpeg" });
  });

  it.each(ALLOWED_IMAGE_MIME_TYPES)("accepts every allowed mime type (%s)", (mimeType) => {
    const bytes = mimeType === "image/jpeg" ? jpegBytes() : mimeType === "image/png" ? pngBytes() : webpBytes();
    const result = validateProductPhotoFile(bytes);
    expect(result.ok).toBe(true);
    expect(result.mimeType).toBe(mimeType);
  });

  it("rejects a file over the 10 MB limit even with a valid signature", () => {
    const oversized = new Uint8Array(MAX_IMAGE_SIZE_BYTES + 1);
    oversized.set(jpegBytes(0));
    const result = validateProductPhotoFile(oversized);
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/10 MB/);
  });

  it("accepts a file exactly at the size limit", () => {
    const atLimit = new Uint8Array(MAX_IMAGE_SIZE_BYTES);
    atLimit.set(jpegBytes(0));
    expect(validateProductPhotoFile(atLimit).ok).toBe(true);
  });

  it("rejects a file with an invalid signature, regardless of size", () => {
    const result = validateProductPhotoFile(new TextEncoder().encode("not a real image"));
    expect(result.ok).toBe(false);
    expect(result.mimeType).toBeUndefined();
    expect(result.error).toMatch(/JPEG, PNG lub WebP/);
  });
});
