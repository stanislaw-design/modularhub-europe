import { eq, inArray } from "drizzle-orm";
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
import { auditLog, costLineItem, costLineItemLabelTranslation, producer, product, productVariant, users } from "@/lib/db/schema";
import { captureError } from "@/lib/observability/errors";
import {
  generateMissingCostLineItemLabelTranslations,
  generateProjectTranslations,
  getCostLineItemLabelTranslationsForProduct,
} from "./producer-project-translation-actions";

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
        // Spec 0053 AC-4: foundationOptions dołącza do tego samego worka co
        // description/roomLayout/faq/clientRequirements niżej.
        foundationOptions: "Płyta fundamentowa lub ławy fundamentowe.",
        roomLayout: [{ id: "room-1", name: "Salon", areaM2: 28, floorLevel: "parter" }],
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
    expect(result.draft).toMatchObject({
      description: {},
      foundationOptions: {},
      roomLayout: [],
      faq: [],
      clientRequirements: [],
    });
    expect(responsesParseMock).not.toHaveBeenCalled();
  });

  it("translates description, room names, FAQ, and the custom client requirement in one call", async () => {
    authMock.mockResolvedValue(sessionAs(producerUserId, "producer"));
    responsesParseMock.mockResolvedValue({
      output_parsed: {
        description: { en: "A modern modular house.", nl: "Een modern modulair huis.", de: "Ein modernes modulares Haus." },
        foundationOptions: {
          en: "Concrete slab or strip footings.",
          nl: "Vloerplaat of funderingsstroken.",
          de: "Fundamentplatte oder Streifenfundamente.",
        },
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
    // Spec 0053 AC-4: ten sam warunkowy mechanizm co description wyżej.
    expect(draft.sourceFoundationOptions).toBe("Płyta fundamentowa lub ławy fundamentowe.");
    expect(draft.foundationOptions).toEqual({
      en: "Concrete slab or strip footings.",
      nl: "Vloerplaat of funderingsstroken.",
      de: "Fundamentplatte oder Streifenfundamente.",
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

// Znalezione na żywo 2026-09-25: nowe/własne etykiety pozycji kosztowych nigdy
// dostawały tłumaczenia bez ręcznego backfillu (scripts/backfill-cost-line-
// item-label-translations-2026-09-22.ts). Nie wymaga sesji (wewnętrzna funkcja
// wywoływana z lib/producer-product-variant-actions.ts przez after(), nigdy
// bezpośrednio przez producenta).
describe.skipIf(!process.env.DATABASE_URL)(
  "generateMissingCostLineItemLabelTranslations: real DB, mocked AI client",
  () => {
    const labelOne = `PTA test label one ${crypto.randomUUID()}`;
    const labelTwo = `PTA test label two ${crypto.randomUUID()}`;

    afterEach(async () => {
      responsesParseMock.mockReset();
      vi.mocked(captureError).mockClear();
      await db
        .delete(costLineItemLabelTranslation)
        .where(inArray(costLineItemLabelTranslation.labelPl, [labelOne, labelTwo]));
    });

    it("does nothing and skips the AI call when every label is already fully translated", async () => {
      await db.insert(costLineItemLabelTranslation).values([
        { labelPl: labelOne, locale: "en", translatedLabel: "English one" },
        { labelPl: labelOne, locale: "nl", translatedLabel: "Dutch one" },
        { labelPl: labelOne, locale: "de", translatedLabel: "German one" },
      ]);

      await generateMissingCostLineItemLabelTranslations([labelOne]);

      expect(responsesParseMock).not.toHaveBeenCalled();
    });

    it("translates and inserts only the missing labels, never overwriting an existing row", async () => {
      await db.insert(costLineItemLabelTranslation).values({ labelPl: labelOne, locale: "en", translatedLabel: "Manual correction" });
      responsesParseMock.mockResolvedValue({
        output_parsed: {
          "0": { en: "AI English one", nl: "AI Dutch one", de: "AI German one" },
          "1": { en: "AI English two", nl: "AI Dutch two", de: "AI German two" },
        },
      });

      await generateMissingCostLineItemLabelTranslations([labelOne, labelOne, labelTwo, "  "]);

      expect(responsesParseMock).toHaveBeenCalledOnce();
      const rows = await db
        .select({
          labelPl: costLineItemLabelTranslation.labelPl,
          locale: costLineItemLabelTranslation.locale,
          translatedLabel: costLineItemLabelTranslation.translatedLabel,
        })
        .from(costLineItemLabelTranslation)
        .where(inArray(costLineItemLabelTranslation.labelPl, [labelOne, labelTwo]));

      const byLocale = (label: string, locale: string) =>
        rows.find((row) => row.labelPl === label && row.locale === locale)?.translatedLabel;

      // labelOne's manually-corrected "en" row survives untouched (ON CONFLICT
      // DO NOTHING); only its missing nl/de rows get the AI translation.
      expect(byLocale(labelOne, "en")).toBe("Manual correction");
      expect(byLocale(labelOne, "nl")).toBe("AI Dutch one");
      expect(byLocale(labelOne, "de")).toBe("AI German one");
      expect(byLocale(labelTwo, "en")).toBe("AI English two");
    });

    it("never throws and reports the error when the provider call fails", async () => {
      responsesParseMock.mockRejectedValue(new Error("network down"));

      await expect(generateMissingCostLineItemLabelTranslations([labelOne])).resolves.toBeUndefined();

      expect(captureError).toHaveBeenCalledOnce();
    });
  },
);

// Znalezione na żywo 2026-09-25, razem z generateMissingCostLineItemLabelTranslations:
// podgląd tylko do odczytu w kroku "Tłumaczenia" (ProjectWizardTranslationsStep)
// tego, co ta funkcja już dopisała do słownika dla etykiet TEGO produktu.
describe.skipIf(!process.env.DATABASE_URL)("getCostLineItemLabelTranslationsForProduct: real DB, mocked auth", () => {
  const producerUserId = crypto.randomUUID();
  const producerId = crypto.randomUUID();
  const otherProducerUserId = crypto.randomUUID();
  const otherProducerId = crypto.randomUUID();
  const productId = crypto.randomUUID();
  const emptyProductId = crypto.randomUUID();
  const variantId = crypto.randomUUID();
  const translatedLabel = `PTA cli label translated ${crypto.randomUUID()}`;
  const untranslatedLabel = `PTA cli label untranslated ${crypto.randomUUID()}`;

  beforeAll(async () => {
    await db.insert(users).values([
      { id: producerUserId, email: `pta-cli-producer-${producerUserId}@example.test`, phone: "+48000000040", role: "producer" },
      {
        id: otherProducerUserId,
        email: `pta-cli-other-producer-${otherProducerUserId}@example.test`,
        phone: "+48000000041",
        role: "producer",
      },
    ]);
    await db.insert(producer).values([
      {
        id: producerId,
        userId: producerUserId,
        nip: `PTC${producerId.slice(0, 8)}`,
        name: "Test Producer (cost line item translations preview)",
        countryCode: "PL",
        technology: "szkielet-drewniany",
      },
      {
        id: otherProducerId,
        userId: otherProducerUserId,
        nip: `PTD${otherProducerId.slice(0, 8)}`,
        name: "Other Test Producer (cost line item translations preview)",
        countryCode: "PL",
        technology: "szkielet-drewniany",
      },
    ]);
    await db.insert(product).values([
      { id: productId, producerId, family: "dom", status: "draft", name: "PTA cli test product", floorAreaM2: 80, countryOfProduction: "PL" },
      { id: emptyProductId, producerId, family: "dom", status: "draft", name: "PTA cli empty product", floorAreaM2: 60, countryOfProduction: "PL" },
    ]);
    await db.insert(productVariant).values({ id: variantId, productId, completionStandard: "deweloperski", isDefault: true, sortOrder: 0 });
    await db.insert(costLineItem).values([
      { productVariantId: variantId, label: translatedLabel, status: "w-cenie", sortOrder: 0 },
      { productVariantId: variantId, label: untranslatedLabel, status: "w-cenie", sortOrder: 1 },
      // Duplicate label on a second row: the preview must de-duplicate, not list it twice.
      { productVariantId: variantId, label: translatedLabel, status: "opcja", sortOrder: 2 },
    ]);
    await db.insert(costLineItemLabelTranslation).values([
      { labelPl: translatedLabel, locale: "en", translatedLabel: "Translated (EN)" },
      { labelPl: translatedLabel, locale: "nl", translatedLabel: "Translated (NL)" },
    ]);
  });

  afterAll(async () => {
    await db.delete(costLineItem).where(eq(costLineItem.productVariantId, variantId));
    await db.delete(productVariant).where(eq(productVariant.id, variantId));
    await db.delete(product).where(inArray(product.id, [productId, emptyProductId]));
    await db.delete(producer).where(inArray(producer.id, [producerId, otherProducerId]));
    await db.delete(users).where(inArray(users.id, [producerUserId, otherProducerUserId]));
    await db.delete(auditLog).where(inArray(auditLog.recordId, [producerUserId, otherProducerUserId, producerId, otherProducerId]));
    await db.delete(costLineItemLabelTranslation).where(inArray(costLineItemLabelTranslation.labelPl, [translatedLabel, untranslatedLabel]));
  });

  afterEach(() => {
    authMock.mockReset();
  });

  it("denies an unauthenticated caller", async () => {
    authMock.mockResolvedValue(null);
    const result = await getCostLineItemLabelTranslationsForProduct(productId);
    expect(result.ok).toBe(false);
  });

  it("denies a producer that does not own the product", async () => {
    authMock.mockResolvedValue(sessionAs(otherProducerUserId, "producer"));
    const result = await getCostLineItemLabelTranslationsForProduct(productId);
    expect(result.ok).toBe(false);
  });

  it("reports the product as not found for a nonexistent id", async () => {
    authMock.mockResolvedValue(sessionAs(producerUserId, "producer"));
    const result = await getCostLineItemLabelTranslationsForProduct(crypto.randomUUID());
    expect(result.ok).toBe(false);
  });

  it("returns an empty list for a product with no cost line items yet", async () => {
    authMock.mockResolvedValue(sessionAs(producerUserId, "producer"));
    const result = await getCostLineItemLabelTranslationsForProduct(emptyProductId);
    expect(result).toEqual({ ok: true, labels: [] });
  });

  it("returns one deduplicated entry per distinct label, with whatever translations already exist", async () => {
    authMock.mockResolvedValue(sessionAs(producerUserId, "producer"));

    const result = await getCostLineItemLabelTranslationsForProduct(productId);

    expect(result.ok).toBe(true);
    expect(result.labels).toHaveLength(2);
    expect(result.labels).toContainEqual({
      labelPl: translatedLabel,
      translations: { en: "Translated (EN)", nl: "Translated (NL)" },
    });
    expect(result.labels).toContainEqual({ labelPl: untranslatedLabel, translations: {} });
  });
});
