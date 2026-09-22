import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { sendMock, constructedConfigs } = vi.hoisted(() => ({
  sendMock: vi.fn(),
  constructedConfigs: [] as Array<Record<string, unknown>>,
}));

vi.mock("@aws-sdk/client-s3", () => {
  class FakeS3Client {
    constructor(config: Record<string, unknown>) {
      constructedConfigs.push(config);
    }
    send(command: unknown) {
      return sendMock(command);
    }
  }
  class FakeGetObjectCommand {
    input: unknown;
    constructor(input: unknown) {
      this.input = input;
    }
  }
  class FakeCommand {
    input: unknown;
    constructor(input: unknown) {
      this.input = input;
    }
  }
  return {
    S3Client: FakeS3Client,
    GetObjectCommand: FakeGetObjectCommand,
    PutObjectCommand: FakeCommand,
    HeadObjectCommand: FakeCommand,
    DeleteObjectCommand: FakeCommand,
  };
});

vi.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: vi.fn().mockResolvedValue("https://signed-upload.example"),
}));

const ORIGINAL_ENV = { ...process.env };

beforeEach(async () => {
  sendMock.mockReset();
  constructedConfigs.length = 0;
  process.env.R2_ACCOUNT_ID = "account-id";
  process.env.AI_PRIVATE_R2_ACCESS_KEY_ID = "private-access";
  process.env.AI_PRIVATE_R2_SECRET_ACCESS_KEY = "private-secret";
  process.env.AI_PRIVATE_R2_BUCKET_NAME = "private-pdf";
  const { resetAiPrivateR2ClientForTests } = await import("./ai-private-r2-client");
  resetAiPrivateR2ClientForTests();
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe("private R2 source PDF client", () => {
  it("uses the EU endpoint and credentials dedicated to the private bucket", async () => {
    sendMock.mockResolvedValue({
      ContentLength: 4,
      Body: { transformToByteArray: async () => new Uint8Array([1, 2, 3, 4]) },
    });
    const { downloadAiSourcePdf } = await import("./ai-private-r2-client");

    await downloadAiSourcePdf("quarantine/source.pdf");

    expect(constructedConfigs).toHaveLength(1);
    expect(constructedConfigs[0]).toMatchObject({
      endpoint: "https://account-id.eu.r2.cloudflarestorage.com",
      credentials: { accessKeyId: "private-access", secretAccessKey: "private-secret" },
    });
    const command = sendMock.mock.calls[0]?.[0] as { input: Record<string, unknown> };
    expect(command.input).toEqual({ Bucket: "private-pdf", Key: "quarantine/source.pdf" });
  });

  it("fully consumes and returns the object body", async () => {
    const bytes = new Uint8Array([37, 80, 68, 70]);
    sendMock.mockResolvedValue({
      ContentLength: bytes.byteLength,
      Body: { transformToByteArray: async () => bytes },
    });
    const { downloadAiSourcePdf } = await import("./ai-private-r2-client");

    await expect(downloadAiSourcePdf("source.pdf")).resolves.toEqual(bytes);
  });

  it("rejects an oversized object before consuming its stream", async () => {
    const destroy = vi.fn();
    const transformToByteArray = vi.fn();
    sendMock.mockResolvedValue({
      ContentLength: 25 * 1024 * 1024 + 1,
      Body: { destroy, transformToByteArray },
    });
    const { downloadAiSourcePdf } = await import("./ai-private-r2-client");

    await expect(downloadAiSourcePdf("source.pdf")).rejects.toThrow("AI_PRIVATE_R2_OBJECT_TOO_LARGE");
    expect(destroy).toHaveBeenCalledOnce();
    expect(transformToByteArray).not.toHaveBeenCalled();
  });

  it("fails loudly when private bucket credentials are missing", async () => {
    delete process.env.AI_PRIVATE_R2_ACCESS_KEY_ID;
    const { downloadAiSourcePdf } = await import("./ai-private-r2-client");

    await expect(downloadAiSourcePdf("source.pdf")).rejects.toThrow("AI_PRIVATE_R2_ACCESS_KEY_ID");
  });

  it("creates a short lived PUT URL for a quarantine key", async () => {
    const { createAiSourcePdfUploadUrl } = await import("./ai-private-r2-client");

    await expect(createAiSourcePdfUploadUrl("quarantine/producer/session/source.pdf")).resolves.toEqual({
      url: "https://signed-upload.example",
      headers: { "Content-Type": "application/pdf" },
    });
  });

  it("rejects a signed upload outside the quarantine prefix", async () => {
    const { createAiSourcePdfUploadUrl } = await import("./ai-private-r2-client");

    await expect(createAiSourcePdfUploadUrl("public/source.pdf")).rejects.toThrow("AI_PRIVATE_R2_OBJECT_KEY_INVALID");
  });
});
