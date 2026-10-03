import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sendMock = vi.fn().mockResolvedValue({});
const constructedConfigs: Array<{ endpoint?: string; credentials?: { accessKeyId: string; secretAccessKey: string } }> = [];
const getSignedUrlMock = vi.fn().mockResolvedValue("https://signed.example/default");

vi.mock("@aws-sdk/client-s3", () => {
  class FakeS3Client {
    config: { endpoint?: string };
    constructor(config: { endpoint?: string }) {
      this.config = config;
      constructedConfigs.push(config as (typeof constructedConfigs)[number]);
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
  class FakeGetObjectCommand {
    input: unknown;
    constructor(input: unknown) {
      this.input = input;
    }
  }
  return { S3Client: FakeS3Client, PutObjectCommand: FakePutObjectCommand, GetObjectCommand: FakeGetObjectCommand };
});

vi.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: (...args: unknown[]) => getSignedUrlMock(...args),
}));

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  sendMock.mockClear();
  getSignedUrlMock.mockClear();
  getSignedUrlMock.mockResolvedValue("https://signed.example/default");
  constructedConfigs.length = 0;
  process.env.R2_ACCOUNT_ID = "test-account-id";
  process.env.PRIVATE_R2_ACCESS_KEY_ID = "test-private-access-key";
  process.env.PRIVATE_R2_SECRET_ACCESS_KEY = "test-private-secret";
  process.env.PRIVATE_R2_BUCKET_NAME = "test-private-bucket";
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  vi.resetModules();
});

describe("uploadPrivateObject", () => {
  // Same regression class as r2-client.test.ts (spec 0031 verify.md): the EU
  // jurisdiction bucket is only reachable through its jurisdiction-specific
  // endpoint, never the default one.
  it("configures the S3 client with the EU jurisdiction-specific endpoint", async () => {
    const { uploadPrivateObject } = await import("./private-r2-client");
    await uploadPrivateObject("key.pdf", Buffer.from("data"), "application/pdf");

    expect(constructedConfigs).toHaveLength(1);
    expect(constructedConfigs[0].endpoint).toBe("https://test-account-id.eu.r2.cloudflarestorage.com");
  });

  it("uses the PRIVATE_R2_* credentials, never the public R2_* ones", async () => {
    process.env.R2_ACCESS_KEY_ID = "should-not-be-used";
    process.env.R2_SECRET_ACCESS_KEY = "should-not-be-used";
    const { uploadPrivateObject } = await import("./private-r2-client");
    await uploadPrivateObject("key.pdf", Buffer.from("data"), "application/pdf");

    expect(constructedConfigs[0].credentials).toEqual({
      accessKeyId: "test-private-access-key",
      secretAccessKey: "test-private-secret",
    });
  });

  it("sends a PutObjectCommand with the private bucket, key, body and content type", async () => {
    const { uploadPrivateObject } = await import("./private-r2-client");
    const body = Buffer.from("fake pdf bytes");
    await uploadPrivateObject("wycena-123.pdf", body, "application/pdf");

    expect(sendMock).toHaveBeenCalledTimes(1);
    const command = sendMock.mock.calls[0][0] as { input: Record<string, unknown> };
    expect(command.input).toMatchObject({
      Bucket: "test-private-bucket",
      Key: "wycena-123.pdf",
      Body: body,
      ContentType: "application/pdf",
    });
  });

  it("throws a clear error when R2_ACCOUNT_ID is not set", async () => {
    delete process.env.R2_ACCOUNT_ID;
    const { uploadPrivateObject } = await import("./private-r2-client");
    await expect(uploadPrivateObject("k.pdf", Buffer.from("x"), "application/pdf")).rejects.toThrow(/R2_ACCOUNT_ID/);
  });

  it("throws a clear error when PRIVATE_R2_BUCKET_NAME is not set", async () => {
    delete process.env.PRIVATE_R2_BUCKET_NAME;
    const { uploadPrivateObject } = await import("./private-r2-client");
    await expect(uploadPrivateObject("k.pdf", Buffer.from("x"), "application/pdf")).rejects.toThrow(/PRIVATE_R2_BUCKET_NAME/);
  });
});

describe("buildSignedDownloadUrl", () => {
  // AC-7: a fresh signed URL is generated on every call; the TTL the caller
  // passes in must reach getSignedUrl untouched.
  it("builds a GetObjectCommand for the private bucket/key and returns the signed URL with the given TTL", async () => {
    getSignedUrlMock.mockResolvedValue("https://signed.example/wycena-123.pdf?sig=abc");
    const { buildSignedDownloadUrl } = await import("./private-r2-client");

    const url = await buildSignedDownloadUrl("wycena-123.pdf", 600, "oferta.pdf");

    expect(url).toBe("https://signed.example/wycena-123.pdf?sig=abc");
    expect(getSignedUrlMock).toHaveBeenCalledTimes(1);
    const [, command, options] = getSignedUrlMock.mock.calls[0] as [unknown, { input: Record<string, unknown> }, { expiresIn: number }];
    expect(command.input).toMatchObject({ Bucket: "test-private-bucket", Key: "wycena-123.pdf" });
    expect(options).toEqual({ expiresIn: 600 });
  });

  it("sets ResponseContentDisposition to the sanitized filename and ResponseCacheControl to private, no-store", async () => {
    const { buildSignedDownloadUrl } = await import("./private-r2-client");
    await buildSignedDownloadUrl("key.pdf", 600, "oferta finalna.pdf");

    const [, command] = getSignedUrlMock.mock.calls[0] as [unknown, { input: Record<string, unknown> }];
    expect(command.input.ResponseContentDisposition).toBe('attachment; filename="oferta finalna.pdf"');
    expect(command.input.ResponseCacheControl).toBe("private, no-store");
  });

  // Security: the original filename comes from the producer and is placed
  // directly into an HTTP response header; it must never be able to inject a
  // quote, carriage return or newline into that header.
  it("strips quotes and CRLF from the filename before putting it in the Content-Disposition header", async () => {
    const { buildSignedDownloadUrl } = await import("./private-r2-client");
    await buildSignedDownloadUrl("key.pdf", 600, 'evil"\r\nX-Injected: true.pdf');

    const [, command] = getSignedUrlMock.mock.calls[0] as [unknown, { input: Record<string, unknown> }];
    expect(command.input.ResponseContentDisposition).toBe('attachment; filename="evilX-Injected: true.pdf"');
  });

  it("falls back to wycena.pdf when the sanitized filename would be empty", async () => {
    const { buildSignedDownloadUrl } = await import("./private-r2-client");
    await buildSignedDownloadUrl("key.pdf", 600, '"\r\n"');

    const [, command] = getSignedUrlMock.mock.calls[0] as [unknown, { input: Record<string, unknown> }];
    expect(command.input.ResponseContentDisposition).toBe('attachment; filename="wycena.pdf"');
  });

  it("throws a clear error when PRIVATE_R2_ACCESS_KEY_ID credentials are missing the bucket name", async () => {
    delete process.env.PRIVATE_R2_BUCKET_NAME;
    const { buildSignedDownloadUrl } = await import("./private-r2-client");
    await expect(buildSignedDownloadUrl("key.pdf", 600, "oferta.pdf")).rejects.toThrow(/PRIVATE_R2_BUCKET_NAME/);
  });
});
