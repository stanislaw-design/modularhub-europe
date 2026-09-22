import { eq, inArray } from "drizzle-orm";
import type { Session } from "next-auth";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

// Same boundary-mock pattern as lib/producer-room-layout-actions.test.ts:
// @/auth and @/lib/observability/errors don't load under Vitest/jsdom, and
// the real Azure OpenAI client must never be hit from a test.
const authMock = vi.hoisted(() => vi.fn<() => Promise<Session | null>>());
vi.mock("@/auth", () => ({ auth: authMock }));
vi.mock("@/lib/observability/errors", () => ({ captureError: vi.fn() }));

const responsesParseMock = vi.hoisted(() => vi.fn());
const createAzureOpenAiClientMock = vi.hoisted(() =>
  vi.fn(() => ({ withOptions: () => ({ responses: { parse: responsesParseMock } }) })),
);
vi.mock("@/lib/ai/openai", () => ({ createAzureOpenAiClient: createAzureOpenAiClientMock }));

import { db } from "@/lib/db/client";
import { auditLog, producer, product, users } from "@/lib/db/schema";
import { captureError } from "@/lib/observability/errors";
import { extractFromContent, extractStandardsFromMaterial } from "./producer-standards-extraction-actions";

function sessionAs(userId: string, role: "admin" | "producer" | "client"): Session {
  return {
    user: { id: userId, role, phone: "+48000000000", name: null, email: null, image: null },
    expires: new Date(Date.now() + 3600_000).toISOString(),
  } as Session;
}

function jpegBytes(): ArrayBuffer {
  return new Uint8Array([0xff, 0xd8, 0xff, ...new Array(50).fill(0)]).buffer;
}

const sampleStandard = {
  name: "Comfort",
  priceMinEur: 90_000,
  priceMaxEur: 100_000,
  priceOnRequest: false,
  scopeSummary: "Ściany, dach, okna",
  excludedScope: "Fundament",
  proposedStandard: "deweloperski" as const,
  confidence: "high" as const,
};

describe("extractFromContent (no DB, injected client)", () => {
  afterEach(() => {
    responsesParseMock.mockReset();
    vi.mocked(captureError).mockClear();
  });

  it("returns the parsed standards on success", async () => {
    responsesParseMock.mockResolvedValue({ output_parsed: { standards: [sampleStandard] } });

    const result = await extractFromContent([{ type: "input_text", text: "Standard Comfort: 90-100 tys EUR" }], {
      client: { withOptions: () => ({ responses: { parse: responsesParseMock } }) } as never,
    });

    expect(result).toEqual({ ok: true, standards: [sampleStandard] });
  });

  it("returns a user-facing error when the model returns no parsed output", async () => {
    responsesParseMock.mockResolvedValue({ output_parsed: null, status: "incomplete" });

    const result = await extractFromContent([{ type: "input_text", text: "..." }], {
      client: { withOptions: () => ({ responses: { parse: responsesParseMock } }) } as never,
    });

    expect(result.ok).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it("returns a user-facing error and reports it when the provider call throws", async () => {
    responsesParseMock.mockRejectedValue(new Error("network down"));

    const result = await extractFromContent([{ type: "input_text", text: "..." }], {
      client: { withOptions: () => ({ responses: { parse: responsesParseMock } }) } as never,
    });

    expect(result.ok).toBe(false);
    expect(captureError).toHaveBeenCalledOnce();
  });
});

// Hits the real dev database (spec 0018 AC-5), same convention as
// lib/producer-room-layout-actions.test.ts.
describe.skipIf(!process.env.DATABASE_URL)("extractStandardsFromMaterial: real DB, mocked auth + AI client", () => {
  const producerUserId = crypto.randomUUID();
  const producerId = crypto.randomUUID();
  const otherProducerUserId = crypto.randomUUID();
  const otherProducerId = crypto.randomUUID();
  const productId = crypto.randomUUID();

  beforeAll(async () => {
    await db.insert(users).values([
      { id: producerUserId, email: `sea-producer-${producerUserId}@example.test`, phone: "+48000000020", role: "producer" },
      {
        id: otherProducerUserId,
        email: `sea-other-producer-${otherProducerUserId}@example.test`,
        phone: "+48000000021",
        role: "producer",
      },
    ]);
    await db.insert(producer).values([
      {
        id: producerId,
        userId: producerUserId,
        nip: `SEA${producerId.slice(0, 8)}`,
        name: "Test Producer (producer-standards-extraction-actions)",
        countryCode: "PL",
        technology: "szkielet-drewniany",
      },
      {
        id: otherProducerId,
        userId: otherProducerUserId,
        nip: `SEB${otherProducerId.slice(0, 8)}`,
        name: "Other Test Producer (producer-standards-extraction-actions)",
        countryCode: "PL",
        technology: "szkielet-drewniany",
      },
    ]);
    await db
      .insert(product)
      .values({ id: productId, producerId, family: "dom", status: "draft", name: "SEA test product", floorAreaM2: 80, countryOfProduction: "PL" });
  });

  afterAll(async () => {
    await db.delete(product).where(eq(product.id, productId));
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
    const result = await extractStandardsFromMaterial(productId, { kind: "text", text: "Comfort: 90-100k EUR" });
    expect(result.ok).toBe(false);
  });

  it("denies a producer that does not own the product", async () => {
    authMock.mockResolvedValue(sessionAs(otherProducerUserId, "producer"));
    const result = await extractStandardsFromMaterial(productId, { kind: "text", text: "Comfort: 90-100k EUR" });
    expect(result.ok).toBe(false);
  });

  it("reports the product as not found for a nonexistent id", async () => {
    authMock.mockResolvedValue(sessionAs(producerUserId, "producer"));
    const result = await extractStandardsFromMaterial(crypto.randomUUID(), { kind: "text", text: "Comfort: 90-100k EUR" });
    expect(result.ok).toBe(false);
  });

  it("rejects empty pasted text", async () => {
    authMock.mockResolvedValue(sessionAs(producerUserId, "producer"));
    const result = await extractStandardsFromMaterial(productId, { kind: "text", text: "   " });
    expect(result.ok).toBe(false);
    expect(responsesParseMock).not.toHaveBeenCalled();
  });

  it("rejects an oversized image file (magic-byte validated, not extension-trusted)", async () => {
    authMock.mockResolvedValue(sessionAs(producerUserId, "producer"));
    const garbage = new File(["not a real image"], "cennik.jpg", { type: "image/jpeg" });
    const result = await extractStandardsFromMaterial(productId, { kind: "file", file: garbage });
    expect(result.ok).toBe(false);
    expect(responsesParseMock).not.toHaveBeenCalled();
  });

  it("calls the AI client with the pasted text and returns its standards for an owned product", async () => {
    authMock.mockResolvedValue(sessionAs(producerUserId, "producer"));
    responsesParseMock.mockResolvedValue({ output_parsed: { standards: [sampleStandard] } });

    const result = await extractStandardsFromMaterial(productId, { kind: "text", text: "Comfort: 90-100k EUR" });

    expect(result).toEqual({ ok: true, standards: [sampleStandard] });
    expect(responsesParseMock).toHaveBeenCalledOnce();
  });

  it("calls the AI client with an image data URI for a valid image file", async () => {
    authMock.mockResolvedValue(sessionAs(producerUserId, "producer"));
    responsesParseMock.mockResolvedValue({ output_parsed: { standards: [sampleStandard] } });
    const file = new File([jpegBytes()], "cennik.jpg", { type: "image/jpeg" });

    const result = await extractStandardsFromMaterial(productId, { kind: "file", file });

    expect(result.ok).toBe(true);
    const call = responsesParseMock.mock.calls[0]![0];
    const contentParts = call.input[0].content;
    expect(contentParts.some((part: { type: string }) => part.type === "input_image")).toBe(true);
  });
});
