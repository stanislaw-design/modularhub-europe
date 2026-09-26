"use server";

import { and, eq, isNull, sql } from "drizzle-orm";
import { after } from "next/server";
import type { CompletionStandard, CostLineItemStatus, TimelineStageKey } from "@/lib/data/types";
import { db } from "@/lib/db/client";
import { costLineItem, product, productTimelineStage, productVariant } from "@/lib/db/schema";
import { captureError } from "@/lib/observability/errors";
import { requireProducerActor } from "@/lib/producer-actor";
import { generateMissingCostLineItemLabelTranslations } from "@/lib/producer-project-translation-actions";

interface ActionResult {
  ok: boolean;
  error?: string;
}

const GENERIC_ERROR = "Nie udało się zapisać zmian. Spróbuj ponownie.";
const DENIED_ERROR = "Musisz być zalogowany jako producent.";
const DUPLICATE_STANDARD_ERROR = "Ten standard wykończenia już ma wariant.";
const MAX_VARIANTS_PER_PRODUCT = 3;

function toPriceCents(value: number | null): number | null {
  return value === null ? null : Math.round(value * 100);
}

type OwnershipStatus = "ok" | "not_found" | "denied";

async function resolveProductOwnership(actor: { producerId: string }, productId: string): Promise<OwnershipStatus> {
  const [row] = await db
    .select({ producerId: product.producerId })
    .from(product)
    .where(and(eq(product.id, productId), isNull(product.deletedAt)));
  if (!row) return "not_found";
  return row.producerId === actor.producerId ? "ok" : "denied";
}

interface VariantOwnership {
  status: OwnershipStatus;
  productId?: string;
}

// AC-12: sprawdzenie łańcuchem wariant -> produkt -> producerId z sesji, nigdy
// przez sam variantId. Reużywane przez każdą akcję operującą na wariancie
// (update/setDefault/delete) i przez akcje na jego dzieciach (cost line item
// przez variantId, timeline stage przez variantId).
async function resolveVariantOwnership(actor: { producerId: string }, variantId: string): Promise<VariantOwnership> {
  const [row] = await db
    .select({ productId: productVariant.productId, producerId: product.producerId })
    .from(productVariant)
    .innerJoin(product, eq(product.id, productVariant.productId))
    .where(and(eq(productVariant.id, variantId), isNull(productVariant.deletedAt), isNull(product.deletedAt)));
  if (!row) return { status: "not_found" };
  if (row.producerId !== actor.producerId) return { status: "denied" };
  return { status: "ok", productId: row.productId };
}

// AC-12: sprawdzenie łańcuchem pozycja kosztowa -> wariant -> produkt ->
// producerId, nie tylko przez itemId. Używane wyłącznie przy edycji/usunięciu
// istniejącej pozycji (nowa pozycja jest sprawdzana przez resolveVariantOwnership
// na variantId, do którego ma trafić).
async function resolveCostLineItemOwnership(
  actor: { producerId: string },
  itemId: string,
): Promise<OwnershipStatus> {
  const [row] = await db
    .select({ producerId: product.producerId })
    .from(costLineItem)
    .innerJoin(productVariant, eq(productVariant.id, costLineItem.productVariantId))
    .innerJoin(product, eq(product.id, productVariant.productId))
    .where(and(eq(costLineItem.id, itemId), isNull(productVariant.deletedAt), isNull(product.deletedAt)));
  if (!row) return "not_found";
  return row.producerId === actor.producerId ? "ok" : "denied";
}

export interface CreateVariantResult extends ActionResult {
  variantId?: string;
}

// Pierwszy wariant produktu staje się domyślny automatycznie (spec 0045 Feature
// design), ten sam wzorzec co "pierwsze zdjęcie = okładka" w uploadProductPhoto.
export async function createVariant(
  productId: string,
  completionStandard: CompletionStandard,
): Promise<CreateVariantResult> {
  const actor = await requireProducerActor();
  if (!actor) return { ok: false, error: DENIED_ERROR };
  const ownership = await resolveProductOwnership(actor, productId);
  if (ownership === "not_found") return { ok: false, error: "Nie znaleziono produktu." };
  if (ownership === "denied") return { ok: false, error: DENIED_ERROR };

  const existing = await db
    .select({ id: productVariant.id, sortOrder: productVariant.sortOrder })
    .from(productVariant)
    .where(and(eq(productVariant.productId, productId), isNull(productVariant.deletedAt)));
  if (existing.length >= MAX_VARIANTS_PER_PRODUCT) {
    return { ok: false, error: "Można dodać maksymalnie 3 warianty." };
  }
  const maxSortOrder = existing.reduce((max, row) => Math.max(max, row.sortOrder ?? -1), -1);

  try {
    const [inserted] = await db
      .insert(productVariant)
      .values({
        productId,
        completionStandard,
        isDefault: existing.length === 0,
        sortOrder: maxSortOrder + 1,
      })
      .returning({ id: productVariant.id });
    return { ok: true, variantId: inserted.id };
  } catch (error) {
    captureError(error, { path: "createVariant", userId: actor.userId });
    return { ok: false, error: DUPLICATE_STANDARD_ERROR };
  }
}

export interface ClonedCostLineItem {
  id: string;
  label: string;
  status: CostLineItemStatus;
  responsibleParty: string | null;
}

export interface ClonedTimelineStage {
  stageKey: TimelineStageKey;
  durationMinDays: number | null;
  durationMaxDays: number | null;
  startsFromLabel: string | null;
  responsibleParty: string | null;
}

export interface ClonedVariant {
  variantId: string;
  priceMinCents: number | null;
  priceOnRequest: boolean;
  costLineItems: ClonedCostLineItem[];
  timelineStages: ClonedTimelineStage[];
}

export interface CloneVariantResult extends ActionResult {
  variant?: ClonedVariant;
}

// AC-2: klonuje pozycje kosztowe i etapy harmonogramu źródłowego wariantu jako
// punkt startowy nowego, w jednej atomowej partii (db.batch, nie db.transaction
// — driver neon-http w tym repo nie wspiera interaktywnych transakcji, patrz
// lib/db/AGENTS.md). Id nowego wariantu i jego dzieci generowane po stronie
// aplikacji (crypto.randomUUID()) przed batchem, bo db.batch nie pozwala jednej
// instrukcji użyć wyniku poprzedniej w tej samej partii — te same wygenerowane
// id wracają w wyniku, żeby UI mogło od razu traktować sklonowane pozycje jako
// zapisane (bez ryzyka zdublowania ich przy pierwszej edycji, patrz
// ProjectWizardVariantsStep).
export async function cloneVariant(
  sourceVariantId: string,
  newCompletionStandard: CompletionStandard,
): Promise<CloneVariantResult> {
  const actor = await requireProducerActor();
  if (!actor) return { ok: false, error: DENIED_ERROR };
  const ownership = await resolveVariantOwnership(actor, sourceVariantId);
  if (ownership.status === "not_found") return { ok: false, error: "Nie znaleziono wariantu źródłowego." };
  if (ownership.status === "denied") return { ok: false, error: DENIED_ERROR };
  const productId = ownership.productId!;

  const [source] = await db.select().from(productVariant).where(eq(productVariant.id, sourceVariantId));
  if (!source) return { ok: false, error: "Nie znaleziono wariantu źródłowego." };

  const existing = await db
    .select({ id: productVariant.id, sortOrder: productVariant.sortOrder })
    .from(productVariant)
    .where(and(eq(productVariant.productId, productId), isNull(productVariant.deletedAt)));
  if (existing.length >= MAX_VARIANTS_PER_PRODUCT) {
    return { ok: false, error: "Można dodać maksymalnie 3 warianty." };
  }
  const maxSortOrder = existing.reduce((max, row) => Math.max(max, row.sortOrder ?? -1), -1);

  const sourceCostItems = await db
    .select()
    .from(costLineItem)
    .where(eq(costLineItem.productVariantId, sourceVariantId));
  const sourceStages = await db
    .select()
    .from(productTimelineStage)
    .where(eq(productTimelineStage.productVariantId, sourceVariantId));

  const newVariantId = crypto.randomUUID();
  const newCostItems = sourceCostItems.map((item) => ({ ...item, id: crypto.randomUUID() }));
  const newStages = sourceStages.map((stage) => ({ ...stage, id: crypto.randomUUID() }));

  const statements = [
    db.insert(productVariant).values({
      id: newVariantId,
      productId,
      completionStandard: newCompletionStandard,
      priceMinCents: source.priceMinCents,
      priceOnRequest: source.priceOnRequest,
      isDefault: false,
      sortOrder: maxSortOrder + 1,
    }),
    ...newCostItems.map((item) =>
      db.insert(costLineItem).values({
        id: item.id,
        productVariantId: newVariantId,
        label: item.label,
        status: item.status,
        responsibleParty: item.responsibleParty,
        sortOrder: item.sortOrder,
      }),
    ),
    ...newStages.map((stage) =>
      db.insert(productTimelineStage).values({
        id: stage.id,
        productVariantId: newVariantId,
        stageKey: stage.stageKey,
        durationMinDays: stage.durationMinDays,
        durationMaxDays: stage.durationMaxDays,
        startsFromLabel: stage.startsFromLabel,
        responsibleParty: stage.responsibleParty,
        sortOrder: stage.sortOrder,
      }),
    ),
  ];

  try {
    await db.batch(statements as [(typeof statements)[number], ...typeof statements]);
    // Sklonowane etykiety zwykle są już w słowniku (pochodzą z wariantu
    // źródłowego tego samego produktu), ale nie zawsze — np. źródłowy wariant
    // sam nigdy nie przeszedł przez ten mechanizm. Nigdy nie blokuje odpowiedzi.
    after(() => generateMissingCostLineItemLabelTranslations(newCostItems.map((item) => item.label)));
    return {
      ok: true,
      variant: {
        variantId: newVariantId,
        priceMinCents: source.priceMinCents,
        priceOnRequest: source.priceOnRequest,
        costLineItems: newCostItems.map((item) => ({
          id: item.id,
          label: item.label,
          status: item.status,
          responsibleParty: item.responsibleParty,
        })),
        timelineStages: newStages.map((stage) => ({
          stageKey: stage.stageKey,
          durationMinDays: stage.durationMinDays,
          durationMaxDays: stage.durationMaxDays,
          startsFromLabel: stage.startsFromLabel,
          responsibleParty: stage.responsibleParty,
        })),
      },
    };
  } catch (error) {
    captureError(error, { path: "cloneVariant", userId: actor.userId });
    return { ok: false, error: DUPLICATE_STANDARD_ERROR };
  }
}

export interface UpdateVariantFields {
  // Spec 0051 AC-1: jedna cena "od", priceMaxEur usunięty.
  priceMinEur: number | null;
  // Wycena indywidualna (spec 0050 AC-13, AC-37): jawna flaga, nigdy
  // wyliczana z braku ceny. true wymusza cenę na null (CHECK
  // product_variant_price_on_request w schema.ts).
  priceOnRequest: boolean;
  variantLabel: string;
}

export async function updateVariant(variantId: string, fields: UpdateVariantFields): Promise<ActionResult> {
  const actor = await requireProducerActor();
  if (!actor) return { ok: false, error: DENIED_ERROR };
  const ownership = await resolveVariantOwnership(actor, variantId);
  if (ownership.status === "not_found") return { ok: false, error: "Nie znaleziono wariantu." };
  if (ownership.status === "denied") return { ok: false, error: DENIED_ERROR };

  const priceMinCents = fields.priceOnRequest ? null : toPriceCents(fields.priceMinEur);

  try {
    await db
      .update(productVariant)
      .set({
        priceMinCents,
        priceOnRequest: fields.priceOnRequest,
        variantLabel: fields.variantLabel || null,
        updatedAt: new Date(),
      })
      .where(eq(productVariant.id, variantId));
    return { ok: true };
  } catch (error) {
    captureError(error, { path: "updateVariant", userId: actor.userId });
    return { ok: false, error: GENERIC_ERROR };
  }
}

// AC-3: pojedyncze zapytanie UPDATE z porównaniem w SET, nigdy dwa osobne
// UPDATE (nawet w db.batch) — lib/db/AGENTS.md: trigger product_variant_price_sync
// czytałby chwilowy stan zero-wariantów-domyślnych między dwoma zapytaniami.
export async function setDefaultVariant(variantId: string): Promise<ActionResult> {
  const actor = await requireProducerActor();
  if (!actor) return { ok: false, error: DENIED_ERROR };
  const ownership = await resolveVariantOwnership(actor, variantId);
  if (ownership.status === "not_found") return { ok: false, error: "Nie znaleziono wariantu." };
  if (ownership.status === "denied") return { ok: false, error: DENIED_ERROR };

  try {
    await db
      .update(productVariant)
      .set({ isDefault: sql<boolean>`${productVariant.id} = ${variantId}`, updatedAt: new Date() })
      .where(and(eq(productVariant.productId, ownership.productId!), isNull(productVariant.deletedAt)));
    return { ok: true };
  } catch (error) {
    captureError(error, { path: "setDefaultVariant", userId: actor.userId });
    return { ok: false, error: GENERIC_ERROR };
  }
}

// AC-13: usuwanie zawsze dozwolone, niezależnie od istniejących zapytań/wycen
// klienta odnoszących się do tego wariantu, niezależnie od tego, czy jest
// domyślny (produkt wtedy po prostu wraca do "wycena indywidualna" przez
// trigger product_variant_price_sync, który już filtruje deleted_at IS NULL).
// cost_line_item/product_timeline_stage nie mają własnego deletedAt (Key
// invariants), więc kaskadowe twarde usunięcie w tej samej atomowej partii co
// miękkie usunięcie wariantu.
export async function deleteVariant(variantId: string): Promise<ActionResult> {
  const actor = await requireProducerActor();
  if (!actor) return { ok: false, error: DENIED_ERROR };
  const ownership = await resolveVariantOwnership(actor, variantId);
  if (ownership.status === "not_found") return { ok: false, error: "Nie znaleziono wariantu." };
  if (ownership.status === "denied") return { ok: false, error: DENIED_ERROR };

  try {
    await db.batch([
      db.delete(costLineItem).where(eq(costLineItem.productVariantId, variantId)),
      db.delete(productTimelineStage).where(eq(productTimelineStage.productVariantId, variantId)),
      db.update(productVariant).set({ deletedAt: new Date(), isDefault: false }).where(eq(productVariant.id, variantId)),
    ]);
    return { ok: true };
  } catch (error) {
    captureError(error, { path: "deleteVariant", userId: actor.userId });
    return { ok: false, error: "Nie udało się usunąć wariantu. Spróbuj ponownie." };
  }
}

export interface UpsertCostLineItemFields {
  id: string | null;
  label: string;
  status: CostLineItemStatus;
  responsibleParty: string;
}

export interface UpsertCostLineItemResult extends ActionResult {
  itemId?: string;
}

// Zawsze wywołuje generateMissingCostLineItemLabelTranslations(fields.label) w
// tle po udanym zapisie (after(), błąd nigdy nie cofa/blokuje tego zapisu,
// patrz komentarz przy tej funkcji) — jedyny sposób, żeby nowa/własna etykieta
// wpisana tu (albo zaakceptowana z ekstrakcji AI) trafiła kiedykolwiek do
// cost_line_item_label_translation bez ręcznego backfillu.
export async function upsertCostLineItem(
  variantId: string,
  fields: UpsertCostLineItemFields,
): Promise<UpsertCostLineItemResult> {
  const actor = await requireProducerActor();
  if (!actor) return { ok: false, error: DENIED_ERROR };

  if (fields.id) {
    // AC-12: łańcuchem pozycja -> wariant -> produkt -> producerId, nie tylko
    // przez variantId z żądania (który mógłby wskazywać na cudzy wariant).
    const itemOwnership = await resolveCostLineItemOwnership(actor, fields.id);
    if (itemOwnership === "not_found") return { ok: false, error: "Nie znaleziono pozycji kosztowej." };
    if (itemOwnership === "denied") return { ok: false, error: DENIED_ERROR };

    try {
      await db
        .update(costLineItem)
        .set({
          label: fields.label,
          status: fields.status,
          responsibleParty: fields.responsibleParty || null,
          updatedAt: new Date(),
        })
        .where(eq(costLineItem.id, fields.id));
      after(() => generateMissingCostLineItemLabelTranslations([fields.label]));
      return { ok: true, itemId: fields.id };
    } catch (error) {
      captureError(error, { path: "upsertCostLineItem.update", userId: actor.userId });
      return { ok: false, error: GENERIC_ERROR };
    }
  }

  const ownership = await resolveVariantOwnership(actor, variantId);
  if (ownership.status === "not_found") return { ok: false, error: "Nie znaleziono wariantu." };
  if (ownership.status === "denied") return { ok: false, error: DENIED_ERROR };

  try {
    const existing = await db
      .select({ sortOrder: costLineItem.sortOrder })
      .from(costLineItem)
      .where(eq(costLineItem.productVariantId, variantId));
    const maxSortOrder = existing.reduce((max, row) => Math.max(max, row.sortOrder ?? -1), -1);

    const [inserted] = await db
      .insert(costLineItem)
      .values({
        productVariantId: variantId,
        label: fields.label,
        status: fields.status,
        responsibleParty: fields.responsibleParty || null,
        sortOrder: maxSortOrder + 1,
      })
      .returning({ id: costLineItem.id });
    after(() => generateMissingCostLineItemLabelTranslations([fields.label]));
    return { ok: true, itemId: inserted.id };
  } catch (error) {
    captureError(error, { path: "upsertCostLineItem.insert", userId: actor.userId });
    return { ok: false, error: GENERIC_ERROR };
  }
}

export async function deleteCostLineItem(itemId: string): Promise<ActionResult> {
  const actor = await requireProducerActor();
  if (!actor) return { ok: false, error: DENIED_ERROR };
  const ownership = await resolveCostLineItemOwnership(actor, itemId);
  if (ownership === "not_found") return { ok: false, error: "Nie znaleziono pozycji kosztowej." };
  if (ownership === "denied") return { ok: false, error: DENIED_ERROR };

  try {
    await db.delete(costLineItem).where(eq(costLineItem.id, itemId));
    return { ok: true };
  } catch (error) {
    captureError(error, { path: "deleteCostLineItem", userId: actor.userId });
    return { ok: false, error: "Nie udało się usunąć pozycji kosztowej. Spróbuj ponownie." };
  }
}

export interface UpsertTimelineStageFields {
  durationMinDays: number | null;
  durationMaxDays: number | null;
  startsFromLabel: string;
  responsibleParty: string;
}

// Kluczowane po (variantId, stageKey), nie po osobnym id (spec 0045 Feature
// design): dokładnie jeden wiersz na etap, ownership sprawdzany przez
// resolveVariantOwnership tak jak przy updateVariant.
export async function upsertTimelineStage(
  variantId: string,
  stageKey: TimelineStageKey,
  fields: UpsertTimelineStageFields,
): Promise<ActionResult> {
  const actor = await requireProducerActor();
  if (!actor) return { ok: false, error: DENIED_ERROR };
  const ownership = await resolveVariantOwnership(actor, variantId);
  if (ownership.status === "not_found") return { ok: false, error: "Nie znaleziono wariantu." };
  if (ownership.status === "denied") return { ok: false, error: DENIED_ERROR };

  if (
    fields.durationMinDays !== null &&
    fields.durationMaxDays !== null &&
    fields.durationMaxDays < fields.durationMinDays
  ) {
    return { ok: false, error: "Czas trwania do nie może być krótszy niż od." };
  }

  try {
    await db
      .insert(productTimelineStage)
      .values({
        productVariantId: variantId,
        stageKey,
        durationMinDays: fields.durationMinDays,
        durationMaxDays: fields.durationMaxDays,
        startsFromLabel: fields.startsFromLabel || null,
        responsibleParty: fields.responsibleParty || null,
      })
      .onConflictDoUpdate({
        target: [productTimelineStage.productVariantId, productTimelineStage.stageKey],
        set: {
          durationMinDays: fields.durationMinDays,
          durationMaxDays: fields.durationMaxDays,
          startsFromLabel: fields.startsFromLabel || null,
          responsibleParty: fields.responsibleParty || null,
          updatedAt: new Date(),
        },
      });
    return { ok: true };
  } catch (error) {
    captureError(error, { path: "upsertTimelineStage", userId: actor.userId });
    return { ok: false, error: GENERIC_ERROR };
  }
}
