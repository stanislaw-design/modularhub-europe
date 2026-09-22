import { eq, inArray } from "drizzle-orm";
import type { Session } from "next-auth";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

// Same boundary mock as lib/producer-product-variant-actions.test.ts: @/auth
// cannot be imported under Vitest/jsdom.
const authMock = vi.hoisted(() => vi.fn<() => Promise<Session | null>>());
vi.mock("@/auth", () => ({ auth: authMock }));
vi.mock("@/lib/observability/errors", () => ({ captureError: vi.fn() }));
vi.mock("@/lib/observability", () => ({ trackEvent: vi.fn() }));

// after() (spec 0028 AC-11, Build plan zadanie 22) throws "called outside a
// request scope" without a real Next.js request context — this test replaces
// it with a queue the test drains explicitly, after the actions under test
// have returned, so assertions can wait for the AI generation the actions
// scheduled instead of racing it.
const afterQueue = vi.hoisted(() => [] as Array<() => unknown>);
const afterMock = vi.hoisted(() => vi.fn((task: () => unknown) => afterQueue.push(task)));
vi.mock("next/server", () => ({ after: afterMock }));

const generateProductTranslationsMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/ai/product-translation", () => ({
  generateProductTranslations: generateProductTranslationsMock,
}));

import { db } from "@/lib/db/client";
import { producer, product, productTranslation, users } from "@/lib/db/schema";
import { captureError } from "@/lib/observability/errors";
import { buildProducerSavePayload, createEmptyDraft } from "./producer-project-draft";
import { createProducerProduct, updateProducerProduct, type ProducerProductFields } from "./producer-product-actions";

function sessionAs(userId: string): Session {
  return {
    user: { id: userId, role: "producer", phone: "+48000000000", name: null, email: null, image: null },
    expires: new Date(Date.now() + 3600_000).toISOString(),
  } as Session;
}

// Drains every after() callback queued so far and awaits it, so assertions
// see the state generateMissingProductTranslations left behind.
async function flushAfter(): Promise<void> {
  await Promise.all(afterQueue.splice(0).map((task) => task()));
}

function draftFields(overrides: Partial<ProducerProductFields> = {}): ProducerProductFields {
  const base = buildProducerSavePayload(createEmptyDraft(), "podstawowe");
  return {
    ...base,
    family: "dom",
    floorAreaM2: 80,
    bedrooms: 2,
    countryOfProduction: "PL",
    name: "Modulor 28",
    description: "Nowoczesny dom modułowy o powierzchni 80 m².",
    ...overrides,
  };
}

async function translationsFor(productId: string) {
  const rows = await db.select().from(productTranslation).where(eq(productTranslation.productId, productId));
  return Object.fromEntries(rows.map((row) => [row.locale, row]));
}

// Hits the real dev database (same convention as
// lib/producer-product-variant-actions.test.ts); only auth and the Azure
// OpenAI call are mocked at their boundary.
describe.skipIf(!process.env.DATABASE_URL)(
  "lib/producer-product-actions: automatic AI translation (spec 0028 AC-11 to AC-15)",
  () => {
    const producerUserId = crypto.randomUUID();
    const producerId = crypto.randomUUID();
    const createdProductIds: string[] = [];

    beforeAll(async () => {
      await db.insert(users).values({
        id: producerUserId,
        email: `ppa-producer-${producerUserId}@example.test`,
        phone: "+48000000020",
        role: "producer",
      });
      await db.insert(producer).values({
        id: producerId,
        userId: producerUserId,
        nip: `PPA${producerId.slice(0, 9)}`,
        name: "Test Producer (product actions)",
        countryCode: "PL",
        technology: "szkielet-drewniany",
      });
      authMock.mockResolvedValue(sessionAs(producerUserId));
    });

    afterAll(async () => {
      if (createdProductIds.length > 0) {
        await db.delete(productTranslation).where(inArray(productTranslation.productId, createdProductIds));
        await db.delete(product).where(inArray(product.id, createdProductIds));
      }
      await db.delete(producer).where(eq(producer.id, producerId));
      await db.delete(users).where(eq(users.id, producerUserId));
    });

    afterEach(() => {
      generateProductTranslationsMock.mockReset();
      vi.mocked(captureError).mockClear();
      afterQueue.length = 0;
    });

    it("generates en/nl/de translations for a brand-new, never-translated product", async () => {
      generateProductTranslationsMock.mockResolvedValue({
        name: { en: "Modulor 28", nl: "Modulor 28", de: "Modulor 28" },
        description: {
          en: "A modern modular house of 80 m².",
          nl: "Een modern modulair huis van 80 m².",
          de: "Ein modernes modulares Haus mit 80 m².",
        },
      });

      const result = await createProducerProduct(draftFields());
      expect(result.ok).toBe(true);
      createdProductIds.push(result.productId!);
      await flushAfter();

      expect(generateProductTranslationsMock).toHaveBeenCalledWith({
        name: "Modulor 28",
        description: "Nowoczesny dom modułowy o powierzchni 80 m².",
        locales: ["en", "nl", "de"],
        fields: ["name", "description"],
      });

      const translations = await translationsFor(result.productId!);
      for (const locale of ["en", "nl", "de"] as const) {
        expect(translations[locale].name).toBeTruthy();
        expect(translations[locale].aiGeneratedName).toBe(translations[locale].name);
        expect(translations[locale].aiTranslatedFromName).toBe("Modulor 28");
        expect(translations[locale].aiGeneratedDescription).toBe(translations[locale].description);
      }
    });

    it("never regenerates a field the producer has manually edited, but still regenerates a stale AI-owned sibling field", async () => {
      generateProductTranslationsMock.mockResolvedValue({
        name: { en: "Modulor 28", nl: "Modulor 28", de: "Modulor 28" },
        description: {
          en: "A modern modular house of 80 m².",
          nl: "Een modern modulair huis van 80 m².",
          de: "Ein modernes modulares Haus mit 80 m².",
        },
      });
      const created = await createProducerProduct(draftFields());
      const productId = created.productId!;
      createdProductIds.push(productId);
      await flushAfter();
      const afterCreate = await translationsFor(productId);

      // Producer manually overrides only the English name (AC-13), sent from
      // the "podstawowe" step (like ProjectWizardBasicInfoStep does) together
      // with the current, already-hydrated NL/DE values (as a freshly loaded
      // edit form would hold them) — not stale empties, which is the one case
      // AC-15 doesn't protect against (re-submitting straight from the tabs
      // step itself, a narrower, documented edge case).
      await updateProducerProduct(
        productId,
        draftFields({
          description: "Nowoczesny dom modułowy o powierzchni 80 m².",
          nameEn: "Modulor 28 (custom)",
          nameNl: afterCreate.nl.name!,
          nameDe: afterCreate.de.name!,
          descriptionEn: afterCreate.en.description!,
          descriptionNl: afterCreate.nl.description!,
          descriptionDe: afterCreate.de.description!,
        }),
        { publish: false },
      );
      await flushAfter();
      generateProductTranslationsMock.mockClear();

      // Polish description changes; a fresh save from the technical step
      // (no translation keys, AC-15) still regenerates the still-AI-owned
      // description, but must never touch the now producer-owned English name.
      generateProductTranslationsMock.mockResolvedValue({
        description: {
          en: "An updated modern modular house.",
          nl: "Een bijgewerkt modern modulair huis.",
          de: "Ein aktualisiertes modernes modulares Haus.",
        },
      });
      await updateProducerProduct(
        productId,
        buildProducerSavePayload(
          {
            ...createEmptyDraft(),
            family: "dom",
            floorAreaM2: 80,
            bedrooms: 2,
            countryOfProduction: "PL",
            name: "Modulor 28",
            description: "Zaktualizowany nowoczesny dom modułowy.",
          },
          "techniczne",
        ),
        { publish: false },
      );
      await flushAfter();

      expect(generateProductTranslationsMock).toHaveBeenCalledWith(
        expect.objectContaining({ fields: ["description"] }),
      );
      const translations = await translationsFor(productId);
      expect(translations.en.name).toBe("Modulor 28 (custom)");
      expect(translations.en.description).toBe("An updated modern modular house.");
    });

    it("a save without translation keys never clobbers an existing translation (AC-15)", async () => {
      generateProductTranslationsMock.mockResolvedValue({
        name: { en: "Modulor 28", nl: "Modulor 28", de: "Modulor 28" },
        description: { en: "Description.", nl: "Beschrijving.", de: "Beschreibung." },
      });
      const created = await createProducerProduct(draftFields());
      const productId = created.productId!;
      createdProductIds.push(productId);
      await flushAfter();
      const before = await translationsFor(productId);

      generateProductTranslationsMock.mockClear();
      const stepPayload = buildProducerSavePayload(
        {
          ...createEmptyDraft(),
          family: "dom",
          floorAreaM2: 80,
          bedrooms: 2,
          countryOfProduction: "PL",
          name: "Modulor 28",
          description: "Nowoczesny dom modułowy o powierzchni 80 m².",
        },
        "pliki",
      );
      expect(stepPayload.nameEn).toBeUndefined();
      const result = await updateProducerProduct(productId, stepPayload, { publish: false });
      expect(result.ok).toBe(true);
      await flushAfter();

      const after = await translationsFor(productId);
      expect(after.en.name).toBe(before.en.name);
      expect(after.en.description).toBe(before.en.description);
      // Nothing was stale (source text unchanged), so no regeneration call.
      expect(generateProductTranslationsMock).not.toHaveBeenCalled();
    });

    it("still saves the product when Azure OpenAI throws (AC-14)", async () => {
      generateProductTranslationsMock.mockRejectedValue(new Error("Azure OpenAI unavailable"));

      const result = await createProducerProduct(draftFields());
      expect(result.ok).toBe(true);
      createdProductIds.push(result.productId!);
      await flushAfter();

      expect(captureError).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({ path: "generateMissingProductTranslations" }),
      );
      // Empty forever, never regenerated (AC-14): the row exists (created by
      // upsertTranslations) but name/description stayed null, so the next
      // save's regeneration rule still sees it as a candidate.
      const translations = await translationsFor(result.productId!);
      expect(translations.en.name).toBeNull();
    });
  },
);
