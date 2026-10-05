"use server";

import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { getPgErrorCode } from "@/lib/db/pg-error";
import { producerCertification } from "@/lib/db/schema";
import { captureError } from "@/lib/observability/errors";
import { requireProducerActor } from "@/lib/producer-actor";
import { producerCertificationInputSchema, type ProducerCertificationFormInput } from "@/lib/producer-certification-specs";

interface ActionResult {
  ok: boolean;
  error?: string;
}

const UNAUTHORIZED_ERROR = "Musisz być zalogowany jako producent.";
const DUPLICATE_ERROR = "Certyfikat o tej nazwie już istnieje.";
const NOT_FOUND_ERROR = "Nie znaleziono certyfikatu.";
const UNIQUE_VIOLATION = "23505";

// Spec 0065 AC-9, AC-11: producent dodaje, zmienia i usuwa wyłącznie własne
// certyfikaty. Żadna z tych akcji nie przyjmuje ani nie zapisuje statusu
// potwierdzenia, nowy wpis zawsze startuje jako self_reported (DEFAULT w bazie).
export async function addProducerCertification(input: ProducerCertificationFormInput): Promise<ActionResult> {
  const actor = await requireProducerActor();
  if (!actor) return { ok: false, error: UNAUTHORIZED_ERROR };

  const parsed = producerCertificationInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Sprawdź dane certyfikatu." };

  try {
    await db.insert(producerCertification).values({
      producerId: actor.producerId,
      name: parsed.data.name,
      issuer: parsed.data.issuer,
    });
  } catch (error) {
    if (getPgErrorCode(error) === UNIQUE_VIOLATION) return { ok: false, error: DUPLICATE_ERROR };
    captureError(error, { path: "addProducerCertification", userId: actor.userId });
    return { ok: false, error: "Nie udało się dodać certyfikatu. Spróbuj ponownie." };
  }
  return { ok: true };
}

// Zmiana nazwy lub wystawcy cofa potwierdzenie w tej samej instrukcji UPDATE
// (spec 0065 Key invariants), więc nigdy nie ma stanu "nowa nazwa, stare
// potwierdzenie". Wyrażenia w SET widzą wartości sprzed zmiany, więc "changed"
// porównuje nową wartość z tą, która jest jeszcze w bazie.
export async function updateProducerCertification(
  id: string,
  input: ProducerCertificationFormInput,
): Promise<ActionResult> {
  const actor = await requireProducerActor();
  if (!actor) return { ok: false, error: UNAUTHORIZED_ERROR };

  const parsed = producerCertificationInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Sprawdź dane certyfikatu." };
  const { name, issuer } = parsed.data;

  const changed = sql`(${producerCertification.name} IS DISTINCT FROM ${name} OR ${producerCertification.issuer} IS DISTINCT FROM ${issuer})`;

  try {
    const updated = await db
      .update(producerCertification)
      .set({
        name,
        issuer,
        confirmationStatus: sql`CASE WHEN ${changed} THEN 'self_reported' ELSE ${producerCertification.confirmationStatus} END`,
        confirmedAt: sql`CASE WHEN ${changed} THEN NULL ELSE ${producerCertification.confirmedAt} END`,
        confirmedBy: sql`CASE WHEN ${changed} THEN NULL ELSE ${producerCertification.confirmedBy} END`,
        version: sql`${producerCertification.version} + 1`,
        updatedAt: new Date(),
      })
      .where(and(eq(producerCertification.id, id), eq(producerCertification.producerId, actor.producerId)))
      .returning({ id: producerCertification.id });
    if (updated.length === 0) return { ok: false, error: NOT_FOUND_ERROR };
  } catch (error) {
    if (getPgErrorCode(error) === UNIQUE_VIOLATION) return { ok: false, error: DUPLICATE_ERROR };
    captureError(error, { path: "updateProducerCertification", userId: actor.userId });
    return { ok: false, error: "Nie udało się zapisać certyfikatu. Spróbuj ponownie." };
  }
  return { ok: true };
}

export async function deleteProducerCertification(id: string): Promise<ActionResult> {
  const actor = await requireProducerActor();
  if (!actor) return { ok: false, error: UNAUTHORIZED_ERROR };

  try {
    const deleted = await db
      .delete(producerCertification)
      .where(and(eq(producerCertification.id, id), eq(producerCertification.producerId, actor.producerId)))
      .returning({ id: producerCertification.id });
    if (deleted.length === 0) return { ok: false, error: NOT_FOUND_ERROR };
  } catch (error) {
    captureError(error, { path: "deleteProducerCertification", userId: actor.userId });
    return { ok: false, error: "Nie udało się usunąć certyfikatu. Spróbuj ponownie." };
  }
  return { ok: true };
}
