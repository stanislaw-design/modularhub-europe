import { and, eq, inArray } from "drizzle-orm";
import type { Session } from "next-auth";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

// Same boundary-mock pattern as lib/product-photo-actions.test.ts: @/auth and
// @/lib/observability/errors don't load under Vitest/jsdom, and the real
// Azure OpenAI client must never be hit from a test.
const authMock = vi.hoisted(() => vi.fn<() => Promise<Session | null>>());
vi.mock("@/auth", () => ({ auth: authMock }));
vi.mock("@/lib/observability/errors", () => ({ captureError: vi.fn() }));

const responsesParseMock = vi.hoisted(() => vi.fn());
const createAzureOpenAiClientMock = vi.hoisted(() =>
  vi.fn(() => ({ withOptions: () => ({ responses: { parse: responsesParseMock } }) })),
);
vi.mock("@/lib/ai/openai", () => ({ createAzureOpenAiClient: createAzureOpenAiClientMock }));

import { db } from "@/lib/db/client";
import { auditLog, document, producer, product, users } from "@/lib/db/schema";
import { captureError } from "@/lib/observability/errors";
import { recognizeFromAttachments, recognizeRoomLayout } from "./producer-room-layout-actions";

function sessionAs(userId: string, role: "admin" | "producer" | "client"): Session {
  return {
    user: { id: userId, role, phone: "+48000000000", name: null, email: null, image: null },
    expires: new Date(Date.now() + 3600_000).toISOString(),
  } as Session;
}

describe("recognizeFromAttachments (no DB, injected client)", () => {
  afterEach(() => {
    responsesParseMock.mockReset();
    vi.mocked(captureError).mockClear();
  });

  it("returns the parsed rooms on success", async () => {
    const rooms = [{ name: "Salon", areaM2: 28, floorLevel: "parter", confidence: "high" }];
    responsesParseMock.mockResolvedValue({ output_parsed: { rooms } });

    const result = await recognizeFromAttachments([{ type: "input_image", image_url: "https://x/a.jpg", detail: "high" }], {
      client: { withOptions: () => ({ responses: { parse: responsesParseMock } }) } as never,
    });

    expect(result).toEqual({ ok: true, rooms });
  });

  it("returns a user-facing error when the model returns no parsed output", async () => {
    responsesParseMock.mockResolvedValue({ output_parsed: null, status: "incomplete" });

    const result = await recognizeFromAttachments([{ type: "input_image", image_url: "https://x/a.jpg", detail: "high" }], {
      client: { withOptions: () => ({ responses: { parse: responsesParseMock } }) } as never,
    });

    expect(result.ok).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it("returns a user-facing error and reports it when the provider call throws", async () => {
    responsesParseMock.mockRejectedValue(new Error("network down"));

    const result = await recognizeFromAttachments([{ type: "input_image", image_url: "https://x/a.jpg", detail: "high" }], {
      client: { withOptions: () => ({ responses: { parse: responsesParseMock } }) } as never,
    });

    expect(result.ok).toBe(false);
    expect(result.error).toBeTruthy();
    expect(captureError).toHaveBeenCalledOnce();
  });
});

// Hits the real dev database (spec 0018 AC-5), same convention as
// lib/product-photo-actions.test.ts; only auth, observability and the Azure
// OpenAI client are mocked at their boundary.
describe.skipIf(!process.env.DATABASE_URL)("recognizeRoomLayout: real DB, mocked auth + AI client", () => {
  const producerUserId = crypto.randomUUID();
  const producerId = crypto.randomUUID();
  const otherProducerUserId = crypto.randomUUID();
  const otherProducerId = crypto.randomUUID();
  const productId = crypto.randomUUID();
  const otherProductId = crypto.randomUUID();
  let floorPlanDocId: string;

  beforeAll(async () => {
    await db.insert(users).values([
      { id: producerUserId, email: `rla-producer-${producerUserId}@example.test`, phone: "+48000000010", role: "producer" },
      {
        id: otherProducerUserId,
        email: `rla-other-producer-${otherProducerUserId}@example.test`,
        phone: "+48000000011",
        role: "producer",
      },
    ]);
    await db.insert(producer).values([
      {
        id: producerId,
        userId: producerUserId,
        nip: `RLA${producerId.slice(0, 8)}`,
        name: "Test Producer (producer-room-layout-actions)",
        countryCode: "PL",
        technology: "szkielet-drewniany",
      },
      {
        id: otherProducerId,
        userId: otherProducerUserId,
        nip: `RLB${otherProducerId.slice(0, 8)}`,
        name: "Other Test Producer (producer-room-layout-actions)",
        countryCode: "PL",
        technology: "szkielet-drewniany",
      },
    ]);
    await db.insert(product).values([
      { id: productId, producerId, family: "dom", status: "draft", name: "RLA test product", floorAreaM2: 80, countryOfProduction: "PL" },
      { id: otherProductId, producerId: otherProducerId, family: "dom", status: "draft", name: "RLA other product", floorAreaM2: 80, countryOfProduction: "PL" },
    ]);
    const [inserted] = await db
      .insert(document)
      .values({
        r2Key: `rla-test/${crypto.randomUUID()}.jpg`,
        filename: "rzut.jpg",
        mimeType: "image/jpeg",
        sizeBytes: 1024,
        purpose: "product_floor_plan",
        ownerUserId: producerUserId,
        productId,
      })
      .returning({ id: document.id });
    floorPlanDocId = inserted!.id;
  });

  afterAll(async () => {
    const allProductIds = [productId, otherProductId];
    const docs = await db.select({ id: document.id }).from(document).where(inArray(document.productId, allProductIds));
    const docIds = docs.map((d) => d.id);
    if (docIds.length > 0) {
      await db.delete(auditLog).where(and(eq(auditLog.tableName, "document"), inArray(auditLog.recordId, docIds)));
      await db.delete(document).where(inArray(document.id, docIds));
    }
    await db.delete(product).where(inArray(product.id, allProductIds));
    await db.delete(producer).where(inArray(producer.id, [producerId, otherProducerId]));
    await db.delete(users).where(inArray(users.id, [producerUserId, otherProducerUserId]));
    await db.delete(auditLog).where(inArray(auditLog.recordId, [producerUserId, otherProducerUserId, producerId, otherProducerId]));
  });

  afterEach(() => {
    authMock.mockReset();
    responsesParseMock.mockReset();
    vi.mocked(captureError).mockClear();
  });

  it("denies an unauthenticated caller", async () => {
    authMock.mockResolvedValue(null);
    const result = await recognizeRoomLayout(productId, [floorPlanDocId]);
    expect(result).toEqual({ ok: false, error: expect.any(String) });
  });

  it("denies a producer that does not own the product", async () => {
    authMock.mockResolvedValue(sessionAs(otherProducerUserId, "producer"));
    const result = await recognizeRoomLayout(productId, [floorPlanDocId]);
    expect(result.ok).toBe(false);
  });

  it("reports the product as not found for a nonexistent id", async () => {
    authMock.mockResolvedValue(sessionAs(producerUserId, "producer"));
    const result = await recognizeRoomLayout(crypto.randomUUID(), [floorPlanDocId]);
    expect(result.ok).toBe(false);
  });

  it("rejects an empty selection", async () => {
    authMock.mockResolvedValue(sessionAs(producerUserId, "producer"));
    const result = await recognizeRoomLayout(productId, []);
    expect(result.ok).toBe(false);
  });

  it("rejects more than five floor plans in one call (AC-4)", async () => {
    authMock.mockResolvedValue(sessionAs(producerUserId, "producer"));
    const result = await recognizeRoomLayout(productId, [floorPlanDocId, floorPlanDocId, floorPlanDocId, floorPlanDocId, floorPlanDocId, floorPlanDocId]);
    expect(result.ok).toBe(false);
  });

  it("reports an error when none of the selected ids match an uploaded floor plan of this product", async () => {
    authMock.mockResolvedValue(sessionAs(producerUserId, "producer"));
    const result = await recognizeRoomLayout(productId, [crypto.randomUUID()]);
    expect(result.ok).toBe(false);
  });

  it("calls the AI client and returns its rooms for a valid, owned selection", async () => {
    authMock.mockResolvedValue(sessionAs(producerUserId, "producer"));
    const rooms = [{ name: "Salon", areaM2: 28, floorLevel: "parter", confidence: "high" }];
    responsesParseMock.mockResolvedValue({ output_parsed: { rooms } });

    const result = await recognizeRoomLayout(productId, [floorPlanDocId]);

    expect(result).toEqual({ ok: true, rooms });
    expect(responsesParseMock).toHaveBeenCalledOnce();
  });
});
