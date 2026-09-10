import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sendMock = vi.fn().mockResolvedValue({});
const constructedConfigs: Array<{ endpoint?: string }> = [];

vi.mock("@aws-sdk/client-s3", () => {
  class FakeS3Client {
    config: { endpoint?: string };
    constructor(config: { endpoint?: string }) {
      this.config = config;
      constructedConfigs.push(config);
    }
    send(command: unknown) {
      return sendMock(command);
    }
  }
  class FakePutObjectCommand {
    input: unknown;
    constructor(input: unknown) {
      this.input = input;
    }
  }
  class FakeDeleteObjectCommand {
    input: unknown;
    constructor(input: unknown) {
      this.input = input;
    }
  }
  return { S3Client: FakeS3Client, PutObjectCommand: FakePutObjectCommand, DeleteObjectCommand: FakeDeleteObjectCommand };
});

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  sendMock.mockClear();
  constructedConfigs.length = 0;
  process.env.R2_ACCOUNT_ID = "test-account-id";
  process.env.R2_ACCESS_KEY_ID = "test-access-key";
  process.env.R2_SECRET_ACCESS_KEY = "test-secret";
  process.env.R2_BUCKET_NAME = "test-bucket";
  process.env.R2_PUBLIC_DOMAIN = "pub-test.r2.dev";
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  vi.resetModules();
});

describe("buildR2Key", () => {
  it("keeps the original extension but replaces the filename with a random UUID", async () => {
    const { buildR2Key } = await import("./r2-client");
    const key = buildR2Key("moje-prywatne-zdjecie.jpg");
    expect(key).toMatch(/^[0-9a-f-]{36}\.jpg$/);
    expect(key).not.toContain("moje-prywatne-zdjecie");
  });

  it("produces a different key on every call (no collisions)", async () => {
    const { buildR2Key } = await import("./r2-client");
    expect(buildR2Key("a.png")).not.toBe(buildR2Key("a.png"));
  });

  it("handles a filename with no extension", async () => {
    const { buildR2Key } = await import("./r2-client");
    expect(buildR2Key("noextension")).toMatch(/^[0-9a-f-]{36}$/);
  });
});

describe("buildPublicUrl", () => {
  it("builds an https URL from R2_PUBLIC_DOMAIN and the key", async () => {
    const { buildPublicUrl } = await import("./r2-client");
    expect(buildPublicUrl("abc.jpg")).toBe("https://pub-test.r2.dev/abc.jpg");
  });

  it("throws a clear error when R2_PUBLIC_DOMAIN is not set", async () => {
    delete process.env.R2_PUBLIC_DOMAIN;
    const { buildPublicUrl } = await import("./r2-client");
    expect(() => buildPublicUrl("abc.jpg")).toThrow(/R2_PUBLIC_DOMAIN/);
  });
});

// Regresja 2026-09-09: kubełek z jurysdykcją UE jest dostępny przez S3 API
// wyłącznie pod jurysdykcyjnym endpointem; wgrywanie do domyślnego endpointu
// zwraca mylące "AccessDenied", nie jasny błąd o jurysdykcji (spec 0031
// verify.md, Status update). Ten test blokuje regres tego konkretnego bugu.
describe("uploadObject / deleteObject", () => {
  it("configures the S3 client with the EU jurisdiction-specific endpoint, not the default one", async () => {
    const { uploadObject } = await import("./r2-client");
    await uploadObject("key.jpg", Buffer.from("data"), "image/jpeg");

    expect(constructedConfigs).toHaveLength(1);
    expect(constructedConfigs[0].endpoint).toBe("https://test-account-id.eu.r2.cloudflarestorage.com");
  });

  it("sends a PutObjectCommand with the bucket, key, body and content type", async () => {
    const { uploadObject } = await import("./r2-client");
    const body = Buffer.from("hello");
    await uploadObject("some-key.png", body, "image/png");

    expect(sendMock).toHaveBeenCalledTimes(1);
    const command = sendMock.mock.calls[0][0] as { input: Record<string, unknown> };
    expect(command.input).toMatchObject({
      Bucket: "test-bucket",
      Key: "some-key.png",
      Body: body,
      ContentType: "image/png",
    });
  });

  it("sends a DeleteObjectCommand with the bucket and key", async () => {
    const { deleteObject } = await import("./r2-client");
    await deleteObject("to-delete.jpg");

    expect(sendMock).toHaveBeenCalledTimes(1);
    const command = sendMock.mock.calls[0][0] as { input: Record<string, unknown> };
    expect(command.input).toMatchObject({ Bucket: "test-bucket", Key: "to-delete.jpg" });
  });

  it("throws a clear error when R2_ACCOUNT_ID is not set", async () => {
    delete process.env.R2_ACCOUNT_ID;
    const { uploadObject } = await import("./r2-client");
    await expect(uploadObject("k.jpg", Buffer.from("x"), "image/jpeg")).rejects.toThrow(/R2_ACCOUNT_ID/);
  });
});
