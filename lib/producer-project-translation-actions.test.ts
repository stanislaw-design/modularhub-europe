import { inArray } from "drizzle-orm";
import type { Session } from "next-auth";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

// Same boundary-mock pattern as lib/producer-standards-extraction-actions.test.ts:
// @/auth and @/lib/observability/errors don't load under Vitest/jsdom, and the
// real Azure OpenAI client must never be hit from a test.
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
import { generateProjectTranslations } from "./producer-project-translation-actions";

function sessionAs(userId: string, role: "admin" | "producer" | "client"): Session {
  return {
    user: { id: userId, role, phone: "+48000000000", name: null, email: null, image: null },
    expires: new Date(Date.now() + 3600_000).toISOString(),
  } as Session;
}

// Hits the real dev database (spec 0018 AC-5), same convention as
// lib/producer-standards-extraction-actions.test.ts.
describe.skipIf(!process.env.DATABASE_URL)("generateProjectTranslations: real DB, mocked auth + AI client (spec 0050 AC-28 to AC-30, AC-34)", () => {
  const producerUserId = crypto.randomUUID();
  const producerId = crypto.randomUUID();
  const otherProducerUserId = crypto.randomUUID();
  const otherProducerId = crypto.randomUUID();
  const productId = crypto.randomUUID();
  const emptyProductId = crypto.randomUUID();

  beforeAll(async () => {
    await db.insert(users).values([
      { id: producerUserId, email: `pta-producer-${producerUserId}@example.test`, phone: "+48000000030", role: "producer" },
      {
        id: otherProducerUserId,
        email: `pta-other-producer-${otherProducerUserId}@example.test`,
        phone: "+48000000031",
        role: "producer",
      },
    ]);
    await db.insert(producer).values([
      {
        id: producerId,
        userId: producerUserId,
        nip: `PTA${producerId.slice(0, 8)}`,
        name: "Test Producer (producer-project-translation-actions)",
        countryCode: "PL",
        technology: "szkielet-drewniany",
      },
      {
        id: otherProducerId,
        userId: otherProducerUserId,
        nip: `PTB${otherProducerId.slice(0, 8)}`,
        name: "Other Test Producer (producer-project-translation-actions)",
        countryCode: "PL",
        technology: "szkielet-drewniany",
      },
    ]);
    await db.insert(product).values([
      {
        id: productId,
        producerId,
        family: "dom",
        status: "draft",
        name: "PTA test product",
        floorAreaM2: 80,
        countryOfProduction: "PL",
        description: "Nowoczesny dom modułowy.",
        roomLayout: [{ id: "room-1", name: "Salon", areaM2: 28, function: "Dzienna", floorLevel: "parter" }],
        faq: [{ id: "faq-1", question: "Czy dom ma antresolę?", answer: "Opcjonalnie." }],
        clientRequirements: [
          { id: "req-catalog", key: "fundament", label: "Fundament", custom: false },
          { id: "req-custom", key: null, label: "Wyburzenie starej szopy", custom: true },
        ],
      },
      {
        id: emptyProductId,
        producerId,
        family: "dom",
        status: "draft",
        name: "PTA empty product",
        floorAreaM2: 60,
        countryOfProduction: "PL",
      },
    ]);
  });

  afterAll(async () => {
    await db.delete(product).where(inArray(product.id, [productId, emptyProductId]));
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
    const result = await generateProjectTranslations(productId);
    expect(result.ok).toBe(false);
  });

  it("denies a producer that does not own the product", async () => {
    authMock.mockResolvedValue(sessionAs(otherProducerUserId, "producer"));
    const result = await generateProjectTranslations(productId);
    expect(result.ok).toBe(false);
  });

  it("reports the product as not found for a nonexistent id", async () => {
    authMock.mockResolvedValue(sessionAs(producerUserId, "producer"));
    const result = await generateProjectTranslations(crypto.randomUUID());
    expect(result.ok).toBe(false);
  });

  it("skips the AI call entirely and returns an empty draft when the product has no translatable content", async () => {
    authMock.mockResolvedValue(sessionAs(producerUserId, "producer"));
    const result = await generateProjectTranslations(emptyProductId);
    expect(result.ok).toBe(true);
    expect(result.draft).toMatchObject({ description: {}, roomLayout: [], faq: [], clientRequirements: [] });
    expect(responsesParseMock).not.toHaveBeenCalled();
  });

  it("translates description, room names, FAQ, and the custom client requirement in one call", async () => {
    authMock.mockResolvedValue(sessionAs(producerUserId, "producer"));
    responsesParseMock.mockResolvedValue({
      output_parsed: {
        description: { en: "A modern modular house.", nl: "Een modern modulair huis.", de: "Ein modernes modulares Haus." },
        "room:room-1": { en: "Living room", nl: "Woonkamer", de: "Wohnzimmer" },
        "faq:faq-1:question": { en: "Does the house have a mezzanine?", nl: "Heeft het huis een tussenverdieping?", de: "Hat das Haus ein Zwischengeschoss?" },
        "faq:faq-1:answer": { en: "Optional.", nl: "Optioneel.", de: "Optional." },
        "requirement:req-custom": { en: "Demolish the old shed.", nl: "Sloop de oude schuur.", de: "Alten Schuppen abreißen." },
      },
    });

    const result = await generateProjectTranslations(productId);

    expect(result.ok).toBe(true);
    expect(responsesParseMock).toHaveBeenCalledOnce();
    const draft = result.draft!;
    expect(draft.description).toEqual({
      en: "A modern modular house.",
      nl: "Een modern modulair huis.",
      de: "Ein modernes modulares Haus.",
    });
    expect(draft.roomLayout).toEqual([
      { id: "room-1", sourceName: "Salon", name: { en: "Living room", nl: "Woonkamer", de: "Wohnzimmer" } },
    ]);
    expect(draft.faq).toEqual([
      {
        id: "faq-1",
        sourceQuestion: "Czy dom ma antresolę?",
        sourceAnswer: "Opcjonalnie.",
        question: { en: "Does the house have a mezzanine?", nl: "Heeft het huis een tussenverdieping?", de: "Hat das Haus ein Zwischengeschoss?" },
        answer: { en: "Optional.", nl: "Optioneel.", de: "Optional." },
      },
    ]);
    // AC-28: only the custom entry gets a translation, the catalog entry never does.
    expect(draft.clientRequirements).toEqual([
      { id: "req-custom", sourceLabel: "Wyburzenie starej szopy", label: { en: "Demolish the old shed.", nl: "Sloop de oude schuur.", de: "Alten Schuppen abreißen." } },
    ]);
  });

  it("requests only the given locale when regenerating a single language (AC-34)", async () => {
    authMock.mockResolvedValue(sessionAs(producerUserId, "producer"));
    responsesParseMock.mockResolvedValue({ output_parsed: { description: { de: "Ein modernes modulares Haus." } } });

    const result = await generateProjectTranslations(productId, ["de"]);

    expect(result.ok).toBe(true);
    expect(result.draft!.locales).toEqual(["de"]);
    expect(result.draft!.description).toEqual({ de: "Ein modernes modulares Haus." });
    expect(responsesParseMock).toHaveBeenCalledOnce();
  });

  it("reports a user-facing error and captures it when the provider call throws", async () => {
    authMock.mockResolvedValue(sessionAs(producerUserId, "producer"));
    responsesParseMock.mockRejectedValue(new Error("network down"));

    const result = await generateProjectTranslations(productId);

    expect(result.ok).toBe(false);
    expect(captureError).toHaveBeenCalledOnce();
  });
});
