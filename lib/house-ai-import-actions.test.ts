import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  selectRows: [] as unknown[][],
  insertedValues: [] as unknown[],
  updatedValues: [] as unknown[],
  batch: vi.fn(),
  enqueue: vi.fn(),
  actor: vi.fn(),
  createUploadUrl: vi.fn(),
}));

function resultBuilder(rows: unknown[]) {
  return {
    from() { return this; },
    innerJoin() { return this; },
    where() { return this; },
    orderBy() { return this; },
    limit: async () => rows,
    returning: async () => rows,
    then(resolve: (value: unknown[]) => unknown, reject?: (reason: unknown) => unknown) {
      return Promise.resolve(rows).then(resolve, reject);
    },
  };
}

vi.mock("@/lib/db/client", () => ({
  db: {
    select: vi.fn(() => resultBuilder(mocks.selectRows.shift() ?? [])),
    insert: vi.fn(() => ({
      values(value: unknown) {
        mocks.insertedValues.push(value);
        return resultBuilder([]);
      },
    })),
    update: vi.fn(() => ({
      set(value: unknown) {
        mocks.updatedValues.push(value);
        return resultBuilder([{ id: "session-id" }]);
      },
    })),
    batch: mocks.batch,
  },
}));
vi.mock("@/lib/producer-actor", () => ({ requireProducerActor: mocks.actor }));
vi.mock("@/lib/ai/house-import-service-bus", () => ({ enqueueHouseImportSession: mocks.enqueue }));
vi.mock("@/lib/observability/errors", () => ({ captureError: vi.fn() }));
vi.mock("@/lib/storage/ai-private-r2-client", () => ({
  createAiSourcePdfUploadUrl: mocks.createUploadUrl,
  deleteAiSourcePdf: vi.fn(),
  downloadAiSourcePdf: vi.fn(),
  inspectAiSourcePdf: vi.fn(),
}));

const ORIGINAL_ENV = { ...process.env };

beforeEach(() => {
  mocks.selectRows.length = 0;
  mocks.insertedValues.length = 0;
  mocks.updatedValues.length = 0;
  mocks.batch.mockReset().mockResolvedValue(undefined);
  mocks.enqueue.mockReset().mockResolvedValue(undefined);
  mocks.actor.mockReset().mockResolvedValue({ userId: "user-id", producerId: "producer-id" });
  mocks.createUploadUrl.mockReset().mockResolvedValue({
    url: "https://r2.example/signed",
    headers: { "Content-Type": "application/pdf" },
  });
  process.env.AZURE_OPENAI_DEPLOYMENT = "gpt-5-mini";
  process.env.AZURE_OPENAI_MODEL_SNAPSHOT = "2025-08-07";
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe("house AI import actions", () => {
  it("creates only an empty house draft and an uploading extraction session", async () => {
    mocks.selectRows.push([], [{ value: 0 }]);
    const { createAiProductDraft } = await import("./house-ai-import-actions");

    const result = await createAiProductDraft();

    expect(result).toMatchObject({ ok: true, productId: expect.any(String), sessionId: expect.any(String) });
    expect(mocks.insertedValues[0]).toMatchObject({
      producerId: "producer-id",
      status: "draft",
      family: "dom",
      currency: "EUR",
    });
    expect(mocks.insertedValues[0]).not.toHaveProperty("name");
    expect(mocks.insertedValues[1]).toMatchObject({
      producerId: "producer-id",
      status: "uploading",
      currentStage: "upload",
      model: "gpt-5-mini@2025-08-07",
    });
    expect(mocks.batch).toHaveBeenCalledOnce();
  });

  it("queues a validated session with a message containing only sessionId", async () => {
    mocks.selectRows.push(
      [{ id: "d3f21fca-f208-4d21-8853-5fc45d6f205a", status: "uploading" }],
      [{ pageCount: 12 }],
    );
    const { startAiExtraction } = await import("./house-ai-import-actions");

    const result = await startAiExtraction({
      sessionId: "d3f21fca-f208-4d21-8853-5fc45d6f205a",
      declarationConfirmed: true,
    });

    expect(result).toEqual({
      ok: true,
      sessionId: "d3f21fca-f208-4d21-8853-5fc45d6f205a",
    });
    expect(mocks.updatedValues[0]).toMatchObject({ status: "queued", currentStage: "queue", progress: 5 });
    expect(mocks.enqueue).toHaveBeenCalledWith("d3f21fca-f208-4d21-8853-5fc45d6f205a");
  });

  it("does not queue without the producer declaration", async () => {
    const { startAiExtraction } = await import("./house-ai-import-actions");

    await expect(startAiExtraction({
      sessionId: "d3f21fca-f208-4d21-8853-5fc45d6f205a",
      declarationConfirmed: false,
    })).resolves.toMatchObject({ ok: false });
    expect(mocks.enqueue).not.toHaveBeenCalled();
  });

  it("reserves an upload for a small, correctly typed PDF instead of rejecting it as oversized", async () => {
    mocks.selectRows.push(
      [{ id: "d3f21fca-f208-4d21-8853-5fc45d6f205a", productId: "product-id" }],
      [{ value: 0 }],
    );
    const { createAiSourceUpload } = await import("./house-ai-import-actions");

    const result = await createAiSourceUpload({
      sessionId: "d3f21fca-f208-4d21-8853-5fc45d6f205a",
      filename: "Oferta_MODUVO_Wariant_1.pdf",
      sizeBytes: 460_300,
      contentType: "application/pdf",
    });

    expect(result).toMatchObject({ ok: true, uploadUrl: "https://r2.example/signed" });
    expect(mocks.insertedValues[0]).toMatchObject({
      filename: "Oferta_MODUVO_Wariant_1.pdf",
      mimeType: "application/pdf",
      sizeBytes: 460_300,
    });
  });
});
