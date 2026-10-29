"use server";

import { and, eq, sql } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/lib/db/client";
import { getPgErrorCode } from "@/lib/db/pg-error";
import { withAdminActor } from "@/lib/db/with-admin-actor";
import { product, productEnvelopeParameter } from "@/lib/db/schema";
import { captureError } from "@/lib/observability/errors";
import {
  FOUNDATION_STATUSES,
  productEnvelopeParameterInputSchema,
  supportsEnvelopeParameters,
  type FoundationStatus,
} from "@/lib/product-envelope-parameters";
import type { UpsertProductEnvelopeParameterInput } from "@/lib/product-envelope-actions";
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

const DENIED_ERROR = "Nie masz uprawnień do tej akcji.";

// Spec 0075 AC-10: wyłącznie administrator, sprawdzane po stronie serwera.
async function requireAdminActorId(): Promise<string | null> {
  const session = await auth();
  if (!session || session.user.role !== "admin") return null;
  return session.user.id;
}

async function rowExists(id: string): Promise<boolean> {
  const rows = await db
    .select({ id: productEnvelopeParameter.id })
    .from(productEnvelopeParameter)
    .where(eq(productEnvelopeParameter.id, id));
  return rows.length > 0;
}

// Zapis tego, co producent przekazał administratorowi: nowy wiersz jest zawsze
// self_reported, zmiana treści cofa potwierdzenie (ta sama zasada co u producenta).
export async function adminUpsertProductEnvelopeParameter(
  input: UpsertProductEnvelopeParameterInput,
): Promise<ActionResult & { id?: string }> {
  const adminId = await requireAdminActorId();
  if (!adminId) return { ok: false, error: DENIED_ERROR };

  const target = await loadEnvelopeProduct(input.productId);
  if (!target) return { ok: false, error: NOT_FOUND_ERROR };
  if (!supportsEnvelopeParameters(target)) return { ok: false, error: FAMILY_NOT_SUPPORTED_ERROR };

  const parsed = productEnvelopeParameterInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Sprawdź dane parametru." };

  try {
    if (!input.id) {
      const [inserted] = await withAdminActor(adminId, [
        db
          .insert(productEnvelopeParameter)
          .values(envelopeInsertValues(target.id, parsed.data))
          .returning({ id: productEnvelopeParameter.id }),
      ]);
      return { ok: true, id: inserted[0].id };
    }

    if (input.expectedVersion === undefined) return { ok: false, error: STALE_ERROR };
    const [updated] = await withAdminActor(adminId, [
      db
        .update(productEnvelopeParameter)
        .set(envelopeUpdateSet(parsed.data))
        .where(
          and(
            eq(productEnvelopeParameter.id, input.id),
            eq(productEnvelopeParameter.productId, target.id),
            eq(productEnvelopeParameter.version, input.expectedVersion),
          ),
        )
        .returning({ id: productEnvelopeParameter.id }),
    ]);
    if (updated.length === 0) return { ok: false, error: (await rowExists(input.id)) ? STALE_ERROR : NOT_FOUND_ERROR };
    return { ok: true, id: input.id };
  } catch (error) {
    if (getPgErrorCode(error) === UNIQUE_VIOLATION) return { ok: false, error: DUPLICATE_ERROR };
    captureError(error, { path: "adminUpsertProductEnvelopeParameter", userId: adminId });
    return { ok: false, error: "Nie udało się zapisać parametru. Spróbuj ponownie." };
  }
}

export async function adminDeleteProductEnvelopeParameter(id: string, expectedVersion: number): Promise<ActionResult> {
  const adminId = await requireAdminActorId();
  if (!adminId) return { ok: false, error: DENIED_ERROR };

  try {
    const [deleted] = await withAdminActor(adminId, [
      db
        .delete(productEnvelopeParameter)
        .where(and(eq(productEnvelopeParameter.id, id), eq(productEnvelopeParameter.version, expectedVersion)))
        .returning({ id: productEnvelopeParameter.id }),
    ]);
    if (deleted.length === 0) return { ok: false, error: (await rowExists(id)) ? STALE_ERROR : NOT_FOUND_ERROR };
    return { ok: true };
  } catch (error) {
    captureError(error, { path: "adminDeleteProductEnvelopeParameter", userId: adminId });
    return { ok: false, error: "Nie udało się usunąć parametru. Spróbuj ponownie." };
  }
}

export async function setProductEnvelopeParameterConfirmation(
  id: string,
  status: "self_reported" | "platform_confirmed",
  expectedVersion: number,
): Promise<ActionResult> {
  const adminId = await requireAdminActorId();
  if (!adminId) return { ok: false, error: DENIED_ERROR };

  const confirmation =
    status === "platform_confirmed"
      ? { confirmationStatus: status, confirmedAt: new Date(), confirmedBy: adminId }
      : { confirmationStatus: status, confirmedAt: null, confirmedBy: null };

  try {
    const [updated] = await withAdminActor(adminId, [
      db
        .update(productEnvelopeParameter)
        .set({ ...confirmation, version: sql`${productEnvelopeParameter.version} + 1`, updatedAt: new Date() })
        .where(and(eq(productEnvelopeParameter.id, id), eq(productEnvelopeParameter.version, expectedVersion)))
        .returning({ id: productEnvelopeParameter.id }),
    ]);
    if (updated.length === 0) return { ok: false, error: (await rowExists(id)) ? STALE_ERROR : NOT_FOUND_ERROR };
    return { ok: true };
  } catch (error) {
    captureError(error, { path: "setProductEnvelopeParameterConfirmation", userId: adminId });
    return { ok: false, error: "Nie udało się zmienić potwierdzenia. Spróbuj ponownie." };
  }
}

export async function adminSetProductFoundationStatus(
  productId: string,
  status: FoundationStatus | null,
): Promise<ActionResult> {
  const adminId = await requireAdminActorId();
  if (!adminId) return { ok: false, error: DENIED_ERROR };
  if (status !== null && !FOUNDATION_STATUSES.includes(status)) {
    return { ok: false, error: "Wybierz poprawne posadowienie." };
  }

  const target = await loadEnvelopeProduct(productId);
  if (!target) return { ok: false, error: NOT_FOUND_ERROR };
  if (!supportsEnvelopeParameters(target)) return { ok: false, error: FAMILY_NOT_SUPPORTED_ERROR };

  try {
    await withAdminActor(adminId, [
      db.update(product).set({ foundationStatus: status, updatedAt: new Date() }).where(eq(product.id, productId)),
    ]);
    return { ok: true };
  } catch (error) {
    captureError(error, { path: "adminSetProductFoundationStatus", userId: adminId });
    return { ok: false, error: "Nie udało się zapisać posadowienia. Spróbuj ponownie." };
  }
}
