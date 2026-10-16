import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createUploadToken, verifyUploadToken } from "./inquiry-attachment-token";
import { UPLOAD_TOKEN_TTL_MS } from "./inquiry-attachment-specs";

const ID = "6f9c3d2e-0b6a-4a52-9d57-0c6b6f1d2a10";
const OTHER_ID = "0e1c9a40-2b0f-4f6c-8f55-6a34b3a1c9d2";

describe("upload token (spec 0070 AC-29)", () => {
  const original = process.env.AUTH_SECRET;
  beforeEach(() => {
    process.env.AUTH_SECRET = "test-secret-for-upload-tokens";
  });
  afterEach(() => {
    if (original === undefined) delete process.env.AUTH_SECRET;
    else process.env.AUTH_SECRET = original;
  });

  it("accepts a fresh token for the same inquiry", () => {
    const token = createUploadToken("request", ID);
    expect(verifyUploadToken(token, "request", ID)).toBe(true);
  });

  it("rejects a token for another inquiry or another kind", () => {
    const token = createUploadToken("request", ID);
    expect(verifyUploadToken(token, "request", OTHER_ID)).toBe(false);
    expect(verifyUploadToken(token, "product", ID)).toBe(false);
  });

  it("rejects an expired token", () => {
    const issuedAt = new Date(Date.now() - UPLOAD_TOKEN_TTL_MS - 1000);
    const token = createUploadToken("request", ID, issuedAt);
    expect(verifyUploadToken(token, "request", ID)).toBe(false);
  });

  it("accepts a token just before it expires", () => {
    const issuedAt = new Date(Date.now() - UPLOAD_TOKEN_TTL_MS + 60_000);
    expect(verifyUploadToken(createUploadToken("request", ID, issuedAt), "request", ID)).toBe(true);
  });

  it("rejects a tampered expiry, a tampered signature and malformed tokens", () => {
    const token = createUploadToken("request", ID);
    const [expiry, signature] = token.split(".");
    expect(verifyUploadToken(`${Number(expiry) + 60_000}.${signature}`, "request", ID)).toBe(false);
    expect(verifyUploadToken(`${expiry}.${"0".repeat(signature.length)}`, "request", ID)).toBe(false);
    expect(verifyUploadToken(`${expiry}.zz`, "request", ID)).toBe(false);
    expect(verifyUploadToken("garbage", "request", ID)).toBe(false);
    expect(verifyUploadToken("", "request", ID)).toBe(false);
    expect(verifyUploadToken(undefined, "request", ID)).toBe(false);
  });

  it("rejects a token signed with another secret", () => {
    const token = createUploadToken("request", ID);
    process.env.AUTH_SECRET = "a-different-secret";
    expect(verifyUploadToken(token, "request", ID)).toBe(false);
  });

  it("is invalid (not throwing) when AUTH_SECRET is missing", () => {
    const token = createUploadToken("request", ID);
    delete process.env.AUTH_SECRET;
    expect(verifyUploadToken(token, "request", ID)).toBe(false);
  });
});
