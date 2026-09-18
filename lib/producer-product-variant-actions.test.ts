import { and, eq, inArray } from "drizzle-orm";
import type { Session } from "next-auth";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

// Same boundary mock as lib/product-photo-actions.test.ts: @/auth cannot be
// imported under Vitest/jsdom (next-auth's env.js does a bare `import
// "next/server"`), so it's mocked directly to be able to import this actions
// file at all.
const authMock = vi.hoisted(() => vi.fn<() => Promise<Session | null>>());
vi.mock("@/auth", () => ({ auth: authMock }));
vi.mock("@/lib/observability/errors", () => ({ captureError: vi.fn() }));

import { db } from "@/lib/db/client";
import { auditLog, costLineItem, product, productTimelineStage, productVariant, productVariantTranslation, producer, users } from "@/lib/db/schema";
import { captureError } from "@/lib/observability/errors";
import {
  cloneVariant,
  createVariant,
  deleteCostLineItem,
  deleteVariant,
  setDefaultVariant,
  updateVariant,
  updateVariantTranslation,
  upsertCostLineItem,
  upsertTimelineStage,
} from "./producer-product-variant-actions";

function sessionAs(userId: string, role: "producer" | "client"): Session {
  return {
    user: { id: userId, role, phone: "+48000000000", name: null, email: null, image: null },
    expires: new Date(Date.now() + 3600_000).toISOString(),
  } as Session;
}

// Hits the real dev database (spec 0018 AC-5, same convention as
// lib/product-photo-actions.test.ts); only auth is mocked at its boundary.
describe.skipIf(!process.env.DATABASE_URL)("lib/producer-product-variant-actions: real DB, mocked auth", () => {
  const producerUserId = crypto.randomUUID();
  const producerId = crypto.randomUUID();
  const otherProducerUserId = crypto.randomUUID();
  const otherProducerId = crypto.randomUUID();
  const productId = crypto.randomUUID();
  const otherProductId = crypto.randomUUID();

  beforeAll(async () => {
    await db.insert(users).values([
      { id: producerUserId, email: `ppva-producer-${producerUserId}@example.test`, phone: "+48000000010", role: "producer" },
      { id: otherProducerUserId, email: `ppva-other-${otherProducerUserId}@example.test`, phone: "+48000000011", role: "producer" },
    ]);
    await db.insert(producer).values([
      { id: producerId, userId: producerUserId, nip: `PVA${producerId.slice(0, 9)}`, name: "Test Producer (variant actions)", countryCode: "PL", technology: "szkielet-drewniany" },
      { id: otherProducerId, userId: otherProducerUserId, nip: `PVB${otherProducerId.slice(0, 9)}`, name: "Other Test Producer (variant actions)", countryCode: "PL", technology: "szkielet-drewniany" },
    ]);
    await db.insert(product).values([
      { id: productId, producerId, family: "dom", name: "Variant actions test product", floorAreaM2: 80, countryOfProduction: "PL" },
      { id: otherProductId, producerId: otherProducerId, family: "dom", name: "Other producer's product", floorAreaM2: 80, countryOfProduction: "PL" },
    ]);
  });

  async function deleteVariantChildren(): Promise<void> {
    const variantIds = (
      await db.select({ id: productVariant.id }).from(productVariant).where(inArray(productVariant.productId, [productId, otherProductId]))
    ).map((row) => row.id);
    if (variantIds.length === 0) return;
    await db.delete(costLineItem).where(inArray(costLineItem.productVariantId, variantIds));
    await db.delete(productTimelineStage).where(inArray(productTimelineStage.productVariantId, variantIds));
    await db.delete(productVariantTranslation).where(inArray(productVariantTranslation.productVariantId, variantIds));
  }

  afterAll(async () => {
    await deleteVariantChildren();
    await db.delete(productVariant).where(inArray(productVariant.productId, [productId, otherProductId]));
    await db.delete(product).where(inArray(product.id, [productId, otherProductId]));
    await db.delete(producer).where(inArray(producer.id, [producerId, otherProducerId]));
    await db.delete(users).where(inArray(users.id, [producerUserId, otherProducerUserId]));
    await db.delete(auditLog).where(inArray(auditLog.recordId, [producerUserId, otherProducerUserId, producerId, otherProducerId]));
  });

  afterEach(async () => {
    authMock.mockReset();
    vi.mocked(captureError).mockClear();
    // Each test starts from a clean variant slate for both test products.
    await deleteVariantChildren();
    await db.delete(productVariant).where(inArray(productVariant.productId, [productId, otherProductId]));
  });

  describe("createVariant", () => {
    it("rejects with no session", async () => {
      authMock.mockResolvedValue(null);
      const result = await createVariant(productId, "deweloperski");
      expect(result.ok).toBe(false);
    });

    it("rejects a client session", async () => {
      authMock.mockResolvedValue(sessionAs(producerUserId, "client"));
      const result = await createVariant(productId, "deweloperski");
      expect(result.ok).toBe(false);
    });

    it("allows a producer to create a variant on its own product, defaulting the first one", async () => {
      authMock.mockResolvedValue(sessionAs(producerUserId, "producer"));
      const result = await createVariant(productId, "deweloperski");
      expect(result.ok).toBe(true);
      expect(result.variantId).toBeDefined();
      const [row] = await db.select().from(productVariant).where(eq(productVariant.id, result.variantId!));
      expect(row.isDefault).toBe(true);
    });

    // AC-12: chain of ownership, never just the id given by the caller.
    it("rejects a producer creating a variant on another producer's product", async () => {
      authMock.mockResolvedValue(sessionAs(producerUserId, "producer"));
      const result = await createVariant(otherProductId, "deweloperski");
      expect(result.ok).toBe(false);
    });

    it("rejects a duplicate completion standard for the same product", async () => {
      authMock.mockResolvedValue(sessionAs(producerUserId, "producer"));
      await createVariant(productId, "deweloperski");
      const result = await createVariant(productId, "deweloperski");
      expect(result.ok).toBe(false);
    });

    it("rejects a fourth variant on the same product (AC-1: 1 to 3 variants)", async () => {
      authMock.mockResolvedValue(sessionAs(producerUserId, "producer"));
      await createVariant(productId, "surowy-zamkniety");
      await createVariant(productId, "deweloperski");
      await createVariant(productId, "pod-klucz");
      const result = await createVariant(productId, "surowy-zamkniety");
      expect(result.ok).toBe(false);
    });
  });

  describe("cloneVariant", () => {
    it("copies cost line items and timeline stages from the source variant (AC-2)", async () => {
      authMock.mockResolvedValue(sessionAs(producerUserId, "producer"));
      const source = await createVariant(productId, "surowy-zamkniety");
      await upsertCostLineItem(source.variantId!, { id: null, label: "Fundament", status: "w-cenie", responsibleParty: "" });
      await upsertTimelineStage(source.variantId!, "formalnosci", { durationMinDays: 2, durationMaxDays: 4, startsFromLabel: "", responsibleParty: "" });

      const cloned = await cloneVariant(source.variantId!, "deweloperski");
      expect(cloned.ok).toBe(true);
      expect(cloned.variant?.costLineItems).toHaveLength(1);
      expect(cloned.variant?.costLineItems[0].label).toBe("Fundament");
      expect(cloned.variant?.timelineStages).toHaveLength(1);
      expect(cloned.variant?.timelineStages[0].durationMinDays).toBe(2);

      const clonedCostItems = await db.select().from(costLineItem).where(eq(costLineItem.productVariantId, cloned.variant!.variantId));
      const clonedStages = await db.select().from(productTimelineStage).where(eq(productTimelineStage.productVariantId, cloned.variant!.variantId));
      expect(clonedCostItems).toHaveLength(1);
      expect(clonedStages).toHaveLength(1);

      // The clone is never the default: only the original stays default.
      const [clonedRow] = await db.select().from(productVariant).where(eq(productVariant.id, cloned.variant!.variantId));
      expect(clonedRow.isDefault).toBe(false);
    });

    it("rejects cloning a variant belonging to another producer", async () => {
      authMock.mockResolvedValue(sessionAs(otherProducerUserId, "producer"));
      const source = await createVariant(otherProductId, "surowy-zamkniety");
      authMock.mockResolvedValue(sessionAs(producerUserId, "producer"));
      const result = await cloneVariant(source.variantId!, "deweloperski");
      expect(result.ok).toBe(false);
    });
  });

  describe("updateVariant", () => {
    it("updates price and scope summary on an owned variant", async () => {
      authMock.mockResolvedValue(sessionAs(producerUserId, "producer"));
      const created = await createVariant(productId, "deweloperski");
      const result = await updateVariant(created.variantId!, {
        priceMinEur: 100000,
        priceMaxEur: 120000,
        scopeSummary: "Zakres podstawowy",
        variantLabel: "Comfort",
      });
      expect(result.ok).toBe(true);
      const [row] = await db.select().from(productVariant).where(eq(productVariant.id, created.variantId!));
      expect(row.priceMinCents).toBe(10_000_000);
      expect(row.priceMaxCents).toBe(12_000_000);
      expect(row.scopeSummary).toBe("Zakres podstawowy");
    });

    it("rejects a max price below the min price", async () => {
      authMock.mockResolvedValue(sessionAs(producerUserId, "producer"));
      const created = await createVariant(productId, "deweloperski");
      const result = await updateVariant(created.variantId!, {
        priceMinEur: 100000,
        priceMaxEur: 50000,
        scopeSummary: "",
        variantLabel: "",
      });
      expect(result.ok).toBe(false);
    });

    it("rejects updating another producer's variant", async () => {
      authMock.mockResolvedValue(sessionAs(otherProducerUserId, "producer"));
      const created = await createVariant(otherProductId, "deweloperski");
      authMock.mockResolvedValue(sessionAs(producerUserId, "producer"));
      const result = await updateVariant(created.variantId!, {
        priceMinEur: 1,
        priceMaxEur: 2,
        scopeSummary: "",
        variantLabel: "",
      });
      expect(result.ok).toBe(false);
    });
  });

  describe("updateVariantTranslation", () => {
    it("upserts en and nl scope summaries as separate rows", async () => {
      authMock.mockResolvedValue(sessionAs(producerUserId, "producer"));
      const created = await createVariant(productId, "deweloperski");
      await updateVariantTranslation(created.variantId!, "en", "Base scope");
      await updateVariantTranslation(created.variantId!, "nl", "Basisomvang");
      // second write to the same locale must update, not duplicate
      await updateVariantTranslation(created.variantId!, "en", "Base scope v2");

      const rows = await db
        .select()
        .from(productVariantTranslation)
        .where(eq(productVariantTranslation.productVariantId, created.variantId!));
      expect(rows).toHaveLength(2);
      expect(rows.find((row) => row.locale === "en")?.scopeSummary).toBe("Base scope v2");
      expect(rows.find((row) => row.locale === "nl")?.scopeSummary).toBe("Basisomvang");
    });
  });

  describe("setDefaultVariant", () => {
    // AC-3 regression: exactly one row must have is_default = true after the
    // switch, verified against the real DB, not assumed from the query shape.
    it("flips the default to exactly one variant when switching", async () => {
      authMock.mockResolvedValue(sessionAs(producerUserId, "producer"));
      await createVariant(productId, "surowy-zamkniety");
      const second = await createVariant(productId, "deweloperski");

      const result = await setDefaultVariant(second.variantId!);
      expect(result.ok).toBe(true);

      const rows = await db.select().from(productVariant).where(eq(productVariant.productId, productId));
      const defaults = rows.filter((row) => row.isDefault);
      expect(defaults).toHaveLength(1);
      expect(defaults[0].id).toBe(second.variantId);
    });

    it("rejects setting another producer's variant as default", async () => {
      authMock.mockResolvedValue(sessionAs(otherProducerUserId, "producer"));
      const created = await createVariant(otherProductId, "deweloperski");
      authMock.mockResolvedValue(sessionAs(producerUserId, "producer"));
      const result = await setDefaultVariant(created.variantId!);
      expect(result.ok).toBe(false);
    });
  });

  describe("deleteVariant", () => {
    // AC-13: always allowed, even for the default variant; children are hard
    // deleted in the same batch (cost_line_item/product_timeline_stage have no
    // own deletedAt).
    it("soft-deletes the variant and hard-deletes its cost items and timeline stages, even when default", async () => {
      authMock.mockResolvedValue(sessionAs(producerUserId, "producer"));
      const created = await createVariant(productId, "deweloperski");
      await upsertCostLineItem(created.variantId!, { id: null, label: "Fundament", status: "w-cenie", responsibleParty: "" });
      await upsertTimelineStage(created.variantId!, "produkcja", { durationMinDays: 1, durationMaxDays: 2, startsFromLabel: "", responsibleParty: "" });

      const result = await deleteVariant(created.variantId!);
      expect(result.ok).toBe(true);

      const [row] = await db.select().from(productVariant).where(eq(productVariant.id, created.variantId!));
      expect(row.deletedAt).not.toBeNull();
      expect(row.isDefault).toBe(false);
      const remainingCostItems = await db.select().from(costLineItem).where(eq(costLineItem.productVariantId, created.variantId!));
      const remainingStages = await db.select().from(productTimelineStage).where(eq(productTimelineStage.productVariantId, created.variantId!));
      expect(remainingCostItems).toHaveLength(0);
      expect(remainingStages).toHaveLength(0);
    });

    it("rejects deleting another producer's variant", async () => {
      authMock.mockResolvedValue(sessionAs(otherProducerUserId, "producer"));
      const created = await createVariant(otherProductId, "deweloperski");
      authMock.mockResolvedValue(sessionAs(producerUserId, "producer"));
      const result = await deleteVariant(created.variantId!);
      expect(result.ok).toBe(false);
    });
  });

  describe("upsertCostLineItem / deleteCostLineItem", () => {
    it("inserts then updates the same item by id", async () => {
      authMock.mockResolvedValue(sessionAs(producerUserId, "producer"));
      const variant = await createVariant(productId, "deweloperski");
      const inserted = await upsertCostLineItem(variant.variantId!, { id: null, label: "Fundament", status: "w-cenie", responsibleParty: "" });
      expect(inserted.ok).toBe(true);

      const updated = await upsertCostLineItem(variant.variantId!, {
        id: inserted.itemId!,
        label: "Fundament żelbetowy",
        status: "obowiazkowa-doplata",
        responsibleParty: "Klient",
      });
      expect(updated.ok).toBe(true);

      const rows = await db.select().from(costLineItem).where(eq(costLineItem.productVariantId, variant.variantId!));
      expect(rows).toHaveLength(1);
      expect(rows[0].label).toBe("Fundament żelbetowy");
      expect(rows[0].status).toBe("obowiazkowa-doplata");
    });

    // AC-12: full chain (item -> variant -> product -> producerId), not just variantId.
    it("rejects editing a cost line item that belongs to another producer's variant", async () => {
      authMock.mockResolvedValue(sessionAs(otherProducerUserId, "producer"));
      const variant = await createVariant(otherProductId, "deweloperski");
      const inserted = await upsertCostLineItem(variant.variantId!, { id: null, label: "Fundament", status: "w-cenie", responsibleParty: "" });

      authMock.mockResolvedValue(sessionAs(producerUserId, "producer"));
      const result = await upsertCostLineItem(variant.variantId!, {
        id: inserted.itemId!,
        label: "Hacked",
        status: "opcja",
        responsibleParty: "",
      });
      expect(result.ok).toBe(false);
    });

    it("rejects deleting a cost line item that belongs to another producer's variant", async () => {
      authMock.mockResolvedValue(sessionAs(otherProducerUserId, "producer"));
      const variant = await createVariant(otherProductId, "deweloperski");
      const inserted = await upsertCostLineItem(variant.variantId!, { id: null, label: "Fundament", status: "w-cenie", responsibleParty: "" });

      authMock.mockResolvedValue(sessionAs(producerUserId, "producer"));
      const result = await deleteCostLineItem(inserted.itemId!);
      expect(result.ok).toBe(false);
    });

    it("deletes an owned cost line item", async () => {
      authMock.mockResolvedValue(sessionAs(producerUserId, "producer"));
      const variant = await createVariant(productId, "deweloperski");
      const inserted = await upsertCostLineItem(variant.variantId!, { id: null, label: "Fundament", status: "w-cenie", responsibleParty: "" });

      const result = await deleteCostLineItem(inserted.itemId!);
      expect(result.ok).toBe(true);
      const rows = await db.select().from(costLineItem).where(eq(costLineItem.productVariantId, variant.variantId!));
      expect(rows).toHaveLength(0);
    });
  });

  describe("upsertTimelineStage", () => {
    it("inserts then updates the same (variant, stageKey) row", async () => {
      authMock.mockResolvedValue(sessionAs(producerUserId, "producer"));
      const variant = await createVariant(productId, "deweloperski");
      await upsertTimelineStage(variant.variantId!, "montaz", { durationMinDays: 3, durationMaxDays: 5, startsFromLabel: "", responsibleParty: "" });
      await upsertTimelineStage(variant.variantId!, "montaz", { durationMinDays: 4, durationMaxDays: 6, startsFromLabel: "po transporcie", responsibleParty: "Producent" });

      const rows = await db.select().from(productTimelineStage).where(and(eq(productTimelineStage.productVariantId, variant.variantId!), eq(productTimelineStage.stageKey, "montaz")));
      expect(rows).toHaveLength(1);
      expect(rows[0].durationMinDays).toBe(4);
      expect(rows[0].startsFromLabel).toBe("po transporcie");
    });

    it("rejects a max duration below the min duration", async () => {
      authMock.mockResolvedValue(sessionAs(producerUserId, "producer"));
      const variant = await createVariant(productId, "deweloperski");
      const result = await upsertTimelineStage(variant.variantId!, "transport", { durationMinDays: 5, durationMaxDays: 2, startsFromLabel: "", responsibleParty: "" });
      expect(result.ok).toBe(false);
    });

    it("rejects setting a timeline stage on another producer's variant", async () => {
      authMock.mockResolvedValue(sessionAs(otherProducerUserId, "producer"));
      const variant = await createVariant(otherProductId, "deweloperski");
      authMock.mockResolvedValue(sessionAs(producerUserId, "producer"));
      const result = await upsertTimelineStage(variant.variantId!, "wykonczenie", { durationMinDays: 1, durationMaxDays: 2, startsFromLabel: "", responsibleParty: "" });
      expect(result.ok).toBe(false);
    });
  });
});
