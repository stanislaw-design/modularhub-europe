"use server";

import { and, eq, sql } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/lib/db/client";
import { getPgErrorCode } from "@/lib/db/pg-error";
import { withAdminActor } from "@/lib/db/with-admin-actor";
import { producerCertification, productComplianceAssessment } from "@/lib/db/schema";
import { captureError } from "@/lib/observability/errors";
import {
  productComplianceAssessmentInputSchema,
  productComplianceAssessmentUpdateSchema,
  type ProductComplianceAssessmentInput,
  type ProductComplianceAssessmentUpdateInput,
} from "@/lib/product-compliance-assessment-specs";

interface ActionResult {
  ok: boolean;
  error?: string;
}

type ConfirmationStatus = "self_reported" | "platform_confirmed";

const DENIED_ERROR = "Nie masz uprawnień do tej akcji.";
const NOT_FOUND_ERROR = "Nie znaleziono wpisu.";
const STALE_ERROR = "Wpis został zmieniony od ostatniego odczytu. Odśwież stronę i spróbuj ponownie.";
const DUPLICATE_ERROR = "Ocena dla tego kraju i przepisu już istnieje.";
const UNIQUE_VIOLATION = "23505";

// Spec 0065 AC-10, AC-11: wyłącznie administrator, sprawdzane po stronie
// serwera (nie tylko ukryciem przycisku). Producent nie ma tu dostępu nawet
// przez bezpośrednie wywołanie akcji.
async function requireAdminActorId(): Promise<string | null> {
  const session = await auth();
  if (!session || session.user.role !== "admin") return null;
  return session.user.id;
}

// Każda zmiana idzie przez withAdminActor, więc trigger audit_log_capture
// zapisuje aktora (spec 0064). Wersja w WHERE to blokada optymistyczna: wiersz
// zmieniony od odczytu nie zostanie nadpisany po cichu (AC-11).
function confirmationSet(status: ConfirmationStatus, adminId: string) {
  return status === "platform_confirmed"
    ? { confirmationStatus: status, confirmedAt: new Date(), confirmedBy: adminId }
    : { confirmationStatus: status, confirmedAt: null, confirmedBy: null };
}

async function rowExists(
  table: "producer_certification" | "product_compliance_assessment",
  id: string,
): Promise<boolean> {
  const rows =
    table === "producer_certification"
      ? await db.select({ id: producerCertification.id }).from(producerCertification).where(eq(producerCertification.id, id))
      : await db
          .select({ id: productComplianceAssessment.id })
          .from(productComplianceAssessment)
          .where(eq(productComplianceAssessment.id, id));
  return rows.length > 0;
}

// Potwierdzenie certyfikatu firmy: jedna instrukcja UPDATE z warunkiem wersji.
export async function setProducerCertificationConfirmation(
  id: string,
  status: ConfirmationStatus,
  expectedVersion: number,
): Promise<ActionResult> {
  const adminId = await requireAdminActorId();
  if (!adminId) return { ok: false, error: DENIED_ERROR };

  try {
    const [updated] = await withAdminActor(adminId, [
      db
        .update(producerCertification)
        .set({ ...confirmationSet(status, adminId), version: sql`${producerCertification.version} + 1`, updatedAt: new Date() })
        .where(and(eq(producerCertification.id, id), eq(producerCertification.version, expectedVersion)))
        .returning({ id: producerCertification.id }),
    ]);
    if (updated.length === 0) {
      return { ok: false, error: (await rowExists("producer_certification", id)) ? STALE_ERROR : NOT_FOUND_ERROR };
    }
    return { ok: true };
  } catch (error) {
    captureError(error, { path: "setProducerCertificationConfirmation", userId: adminId });
    return { ok: false, error: "Nie udało się zmienić potwierdzenia. Spróbuj ponownie." };
  }
}

export async function createProductComplianceAssessment(
  productId: string,
  input: ProductComplianceAssessmentInput,
): Promise<ActionResult & { id?: string }> {
  const adminId = await requireAdminActorId();
  if (!adminId) return { ok: false, error: DENIED_ERROR };

  const parsed = productComplianceAssessmentInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Sprawdź dane oceny." };

  try {
    const [inserted] = await withAdminActor(adminId, [
      db
        .insert(productComplianceAssessment)
        .values({ productId, ...parsed.data })
        .returning({ id: productComplianceAssessment.id }),
    ]);
    return { ok: true, id: inserted[0].id };
  } catch (error) {
    if (getPgErrorCode(error) === UNIQUE_VIOLATION) return { ok: false, error: DUPLICATE_ERROR };
    captureError(error, { path: "createProductComplianceAssessment", userId: adminId });
    return { ok: false, error: "Nie udało się dodać oceny. Spróbuj ponownie." };
  }
}

// Zmiana statusu albo powodu cofa potwierdzenie w tej samej instrukcji UPDATE,
// tak samo jak przy certyfikacie: potwierdzenie dotyczy poprzedniej treści.
export async function updateProductComplianceAssessment(
  id: string,
  input: ProductComplianceAssessmentUpdateInput,
  expectedVersion: number,
): Promise<ActionResult> {
  const adminId = await requireAdminActorId();
  if (!adminId) return { ok: false, error: DENIED_ERROR };

  const parsed = productComplianceAssessmentUpdateSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Sprawdź dane oceny." };
  const { status, reason } = parsed.data;

  const changed = sql`(${productComplianceAssessment.status} IS DISTINCT FROM ${status} OR ${productComplianceAssessment.reason} IS DISTINCT FROM ${reason})`;

  try {
    const [updated] = await withAdminActor(adminId, [
      db
        .update(productComplianceAssessment)
        .set({
          status,
          reason,
          confirmationStatus: sql`CASE WHEN ${changed} THEN 'self_reported' ELSE ${productComplianceAssessment.confirmationStatus} END`,
          confirmedAt: sql`CASE WHEN ${changed} THEN NULL ELSE ${productComplianceAssessment.confirmedAt} END`,
          confirmedBy: sql`CASE WHEN ${changed} THEN NULL ELSE ${productComplianceAssessment.confirmedBy} END`,
          version: sql`${productComplianceAssessment.version} + 1`,
          updatedAt: new Date(),
        })
        .where(and(eq(productComplianceAssessment.id, id), eq(productComplianceAssessment.version, expectedVersion)))
        .returning({ id: productComplianceAssessment.id }),
    ]);
    if (updated.length === 0) {
      return { ok: false, error: (await rowExists("product_compliance_assessment", id)) ? STALE_ERROR : NOT_FOUND_ERROR };
    }
    return { ok: true };
  } catch (error) {
    captureError(error, { path: "updateProductComplianceAssessment", userId: adminId });
    return { ok: false, error: "Nie udało się zapisać oceny. Spróbuj ponownie." };
  }
}

export async function setProductComplianceAssessmentConfirmation(
  id: string,
  status: ConfirmationStatus,
  expectedVersion: number,
): Promise<ActionResult> {
  const adminId = await requireAdminActorId();
  if (!adminId) return { ok: false, error: DENIED_ERROR };

  try {
    const [updated] = await withAdminActor(adminId, [
      db
        .update(productComplianceAssessment)
        .set({ ...confirmationSet(status, adminId), version: sql`${productComplianceAssessment.version} + 1`, updatedAt: new Date() })
        .where(and(eq(productComplianceAssessment.id, id), eq(productComplianceAssessment.version, expectedVersion)))
        .returning({ id: productComplianceAssessment.id }),
    ]);
    if (updated.length === 0) {
      return { ok: false, error: (await rowExists("product_compliance_assessment", id)) ? STALE_ERROR : NOT_FOUND_ERROR };
    }
    return { ok: true };
  } catch (error) {
    captureError(error, { path: "setProductComplianceAssessmentConfirmation", userId: adminId });
    return { ok: false, error: "Nie udało się zmienić potwierdzenia. Spróbuj ponownie." };
  }
}

export async function deleteProductComplianceAssessment(id: string, expectedVersion: number): Promise<ActionResult> {
  const adminId = await requireAdminActorId();
  if (!adminId) return { ok: false, error: DENIED_ERROR };

  try {
    const [deleted] = await withAdminActor(adminId, [
      db
        .delete(productComplianceAssessment)
        .where(and(eq(productComplianceAssessment.id, id), eq(productComplianceAssessment.version, expectedVersion)))
        .returning({ id: productComplianceAssessment.id }),
    ]);
    if (deleted.length === 0) {
      return { ok: false, error: (await rowExists("product_compliance_assessment", id)) ? STALE_ERROR : NOT_FOUND_ERROR };
    }
    return { ok: true };
  } catch (error) {
    captureError(error, { path: "deleteProductComplianceAssessment", userId: adminId });
    return { ok: false, error: "Nie udało się usunąć oceny. Spróbuj ponownie." };
  }
}
