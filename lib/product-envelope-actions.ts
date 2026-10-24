"use server";

import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { getPgErrorCode } from "@/lib/db/pg-error";
import { product, productEnvelopeParameter } from "@/lib/db/schema";
import { captureError } from "@/lib/observability/errors";
import { requireProducerActor } from "@/lib/producer-actor";
import {
  FOUNDATION_STATUSES,
  productEnvelopeParameterInputSchema,
  supportsEnvelopeParameters,
  type FoundationStatus,
  type ProductEnvelopeParameterInput,
} from "@/lib/product-envelope-parameters";
import {
  DUPLICATE_ERROR,
  FAMILY_NOT_SUPPORTED_ERROR,
  NOT_FOUND_ERROR,
  STALE_ERROR,
  UNIQUE_VIOLATION,
  envelopeInsertValues,
  envelopeUpdateSet,
  loadEnvelopeProduct,
} from "@/lib/product-envelope-shared";

interface ActionResult {
  ok: boolean;
  error?: string;
}

const UNAUTHORIZED_ERROR = "Musisz być zalogowany jako producent.";

export type UpsertProductEnvelopeParameterInput = ProductEnvelopeParameterInput & {
  productId: string;
  id?: string;
  expectedVersion?: number;
};

// Spec 0075 AC-9, AC-18: producent zmienia wyłącznie wiersze produktów swojej
// firmy. Akcja nie przyjmuje ani nie zapisuje pól potwierdzenia: nowy wiersz
// startuje jako self_reported (DEFAULT), a zmiana treści cofa potwierdzenie
// w tej samej instrukcji UPDATE.
export async function upsertProductEnvelopeParameter(
  input: UpsertProductEnvelopeParameterInput,
): Promise<ActionResult & { id?: string }> {
  const actor = await requireProducerActor();
  if (!actor) return { ok: false, error: UNAUTHORIZED_ERROR };

  const target = await loadEnvelopeProduct(input.productId);
  if (!target || target.producerId !== actor.producerId) return { ok: false, error: UNAUTHORIZED_ERROR };
  if (!supportsEnvelopeParameters(target)) return { ok: false, error: FAMILY_NOT_SUPPORTED_ERROR };

  const parsed = productEnvelopeParameterInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Sprawdź dane parametru." };

  try {
    if (!input.id) {
      const [inserted] = await db
        .insert(productEnvelopeParameter)
        .values(envelopeInsertValues(target.id, parsed.data))
        .returning({ id: productEnvelopeParameter.id });
      return { ok: true, id: inserted.id };
    }

    if (input.expectedVersion === undefined) return { ok: false, error: STALE_ERROR };
    const updated = await db
      .update(productEnvelopeParameter)
      .set(envelopeUpdateSet(parsed.data))
      .where(
        and(
          eq(productEnvelopeParameter.id, input.id),
          eq(productEnvelopeParameter.productId, target.id),
          eq(productEnvelopeParameter.version, input.expectedVersion),
        ),
      )
      .returning({ id: productEnvelopeParameter.id });
    if (updated.length === 0) {
      const existing = await db
        .select({ id: productEnvelopeParameter.id })
        .from(productEnvelopeParameter)
        .where(and(eq(productEnvelopeParameter.id, input.id), eq(productEnvelopeParameter.productId, target.id)));
      return { ok: false, error: existing.length > 0 ? STALE_ERROR : NOT_FOUND_ERROR };
    }
    return { ok: true, id: input.id };
  } catch (error) {
    if (getPgErrorCode(error) === UNIQUE_VIOLATION) return { ok: false, error: DUPLICATE_ERROR };
    captureError(error, { path: "upsertProductEnvelopeParameter", userId: actor.userId });
    return { ok: false, error: "Nie udało się zapisać parametru. Spróbuj ponownie." };
  }
}

// Producent może usunąć także własny potwierdzony wiersz (to jego dane).
export async function deleteProductEnvelopeParameter(id: string, expectedVersion: number): Promise<ActionResult> {
  const actor = await requireProducerActor();
  if (!actor) return { ok: false, error: UNAUTHORIZED_ERROR };

  try {
    const [row] = await db
      .select({ id: productEnvelopeParameter.id, producerId: product.producerId })
      .from(productEnvelopeParameter)
      .innerJoin(product, eq(product.id, productEnvelopeParameter.productId))
      .where(eq(productEnvelopeParameter.id, id));
    if (!row || row.producerId !== actor.producerId) return { ok: false, error: NOT_FOUND_ERROR };

    const deleted = await db
      .delete(productEnvelopeParameter)
      .where(and(eq(productEnvelopeParameter.id, id), eq(productEnvelopeParameter.version, expectedVersion)))
      .returning({ id: productEnvelopeParameter.id });
    if (deleted.length === 0) return { ok: false, error: STALE_ERROR };
    return { ok: true };
  } catch (error) {
    captureError(error, { path: "deleteProductEnvelopeParameter", userId: actor.userId });
    return { ok: false, error: "Nie udało się usunąć parametru. Spróbuj ponownie." };
  }
}

// Spec 0075 AC-5: puste (`null`) znaczy "nie podano".
export async function setProductFoundationStatus(
  productId: string,
  status: FoundationStatus | null,
): Promise<ActionResult> {
  const actor = await requireProducerActor();
  if (!actor) return { ok: false, error: UNAUTHORIZED_ERROR };
  if (status !== null && !FOUNDATION_STATUSES.includes(status)) {
    return { ok: false, error: "Wybierz poprawne posadowienie." };
  }

  const target = await loadEnvelopeProduct(productId);
  if (!target || target.producerId !== actor.producerId) return { ok: false, error: UNAUTHORIZED_ERROR };
  if (!supportsEnvelopeParameters(target)) return { ok: false, error: FAMILY_NOT_SUPPORTED_ERROR };

  try {
    await db.update(product).set({ foundationStatus: status, updatedAt: new Date() }).where(eq(product.id, productId));
    return { ok: true };
  } catch (error) {
    captureError(error, { path: "setProductFoundationStatus", userId: actor.userId });
    return { ok: false, error: "Nie udało się zapisać posadowienia. Spróbuj ponownie." };
  }
}
