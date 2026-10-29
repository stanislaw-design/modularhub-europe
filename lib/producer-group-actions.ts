"use server";

import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/auth";
import { db } from "@/lib/db/client";
import { getPgErrorCode } from "@/lib/db/pg-error";
import { producer, producerGroup, producerGroupMember } from "@/lib/db/schema";
import { withAdminActor } from "@/lib/db/with-admin-actor";
import { captureError } from "@/lib/observability/errors";
import { expandRecipients, searchProducersForGroup as searchProducers } from "@/lib/producer-groups";

// Spec 0077 część B AC-23, AC-24, AC-27: zarządzanie własnymi grupami producentów. Każda akcja
// sprawdza rolę `admin` w kodzie (nie tylko w interfejsie) i zapisuje przez withAdminActor, więc
// zmiana trafia do audit_log z autorem.

interface ActionResult {
  ok: boolean;
  error?: string;
}

export interface CreateProducerGroupResult extends ActionResult {
  id?: string;
}

const DENIED_ERROR = "Musisz być zalogowany jako administrator.";
const GENERIC_ERROR = "Nie udało się zapisać zmiany. Spróbuj ponownie.";
const NAME_TAKEN_ERROR = "Grupa o takiej nazwie już istnieje.";
const NOT_FOUND_ERROR = "Nie znaleziono grupy.";

const idSchema = z.uuid();

const groupFieldsSchema = z.object({
  name: z.string().trim().min(2, "Nazwa grupy ma mieć od 2 do 60 znaków.").max(60, "Nazwa grupy ma mieć od 2 do 60 znaków."),
  description: z
    .string()
    .trim()
    .max(300, "Opis grupy może mieć najwyżej 300 znaków.")
    .optional()
    .transform((value) => (value ? value : null)),
});

async function requireAdminActorId(): Promise<string | null> {
  const session = await auth();
  if (!session || session.user.role !== "admin") return null;
  return session.user.id;
}

export async function createProducerGroup(input: { name: string; description?: string }): Promise<CreateProducerGroupResult> {
  const adminId = await requireAdminActorId();
  if (!adminId) return { ok: false, error: DENIED_ERROR };
  const parsed = groupFieldsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Sprawdź dane grupy." };

  try {
    const [rows] = await withAdminActor(adminId, [
      db
        .insert(producerGroup)
        .values({ name: parsed.data.name, description: parsed.data.description, createdByUserId: adminId })
        .returning({ id: producerGroup.id }),
    ]);
    return { ok: true, id: rows[0]?.id };
  } catch (error) {
    if (getPgErrorCode(error) === "23505") return { ok: false, error: NAME_TAKEN_ERROR };
    captureError(error, { path: "createProducerGroup", userId: adminId });
    return { ok: false, error: GENERIC_ERROR };
  }
}

export async function updateProducerGroup(id: string, input: { name: string; description?: string }): Promise<ActionResult> {
  if (!idSchema.safeParse(id).success) return { ok: false, error: NOT_FOUND_ERROR };
  const adminId = await requireAdminActorId();
  if (!adminId) return { ok: false, error: DENIED_ERROR };
  const parsed = groupFieldsSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Sprawdź dane grupy." };

  try {
    const [rows] = await withAdminActor(adminId, [
      db
        .update(producerGroup)
        .set({ name: parsed.data.name, description: parsed.data.description, updatedAt: new Date() })
        .where(eq(producerGroup.id, id))
        .returning({ id: producerGroup.id }),
    ]);
    if (rows.length === 0) return { ok: false, error: NOT_FOUND_ERROR };
    return { ok: true };
  } catch (error) {
    if (getPgErrorCode(error) === "23505") return { ok: false, error: NAME_TAKEN_ERROR };
    captureError(error, { path: "updateProducerGroup", userId: adminId });
    return { ok: false, error: GENERIC_ERROR };
  }
}

// AC-23: usunięcie grupy kasuje jej członków (kaskada w bazie), ale nie rusza żadnego projektu, bo projekt
// trzyma tylko wiersze `include` ze zdjęcia stanu (AC-26). Potwierdzenie wymusza też kod, nie tylko okno.
export async function deleteProducerGroup(id: string, confirmed: boolean): Promise<ActionResult> {
  if (!idSchema.safeParse(id).success) return { ok: false, error: NOT_FOUND_ERROR };
  if (confirmed !== true) return { ok: false, error: "Potwierdź usunięcie grupy." };
  const adminId = await requireAdminActorId();
  if (!adminId) return { ok: false, error: DENIED_ERROR };

  try {
    const [rows] = await withAdminActor(adminId, [db.delete(producerGroup).where(eq(producerGroup.id, id)).returning({ id: producerGroup.id })]);
    if (rows.length === 0) return { ok: false, error: NOT_FOUND_ERROR };
    return { ok: true };
  } catch (error) {
    captureError(error, { path: "deleteProducerGroup", userId: adminId });
    return { ok: false, error: GENERIC_ERROR };
  }
}

export async function addProducerToGroup(groupId: string, producerId: string): Promise<ActionResult> {
  if (!idSchema.safeParse(groupId).success) return { ok: false, error: NOT_FOUND_ERROR };
  if (!idSchema.safeParse(producerId).success) return { ok: false, error: "Nie znaleziono producenta." };
  const adminId = await requireAdminActorId();
  if (!adminId) return { ok: false, error: DENIED_ERROR };

  try {
    const [target] = await db
      .select({ id: producer.id })
      .from(producer)
      .where(and(eq(producer.id, producerId), isNull(producer.deletedAt)));
    if (!target) return { ok: false, error: "Nie znaleziono producenta." };
    await withAdminActor(adminId, [db.insert(producerGroupMember).values({ groupId, producerId })]);
    return { ok: true };
  } catch (error) {
    const code = getPgErrorCode(error);
    if (code === "23505") return { ok: false, error: "Ten producent już jest w tej grupie." };
    if (code === "23503") return { ok: false, error: NOT_FOUND_ERROR };
    captureError(error, { path: "addProducerToGroup", userId: adminId });
    return { ok: false, error: GENERIC_ERROR };
  }
}

export async function removeProducerFromGroup(groupId: string, producerId: string): Promise<ActionResult> {
  if (!idSchema.safeParse(groupId).success || !idSchema.safeParse(producerId).success) return { ok: false, error: NOT_FOUND_ERROR };
  const adminId = await requireAdminActorId();
  if (!adminId) return { ok: false, error: DENIED_ERROR };

  try {
    const [rows] = await withAdminActor(adminId, [
      db
        .delete(producerGroupMember)
        .where(and(eq(producerGroupMember.groupId, groupId), eq(producerGroupMember.producerId, producerId)))
        .returning({ groupId: producerGroupMember.groupId }),
    ]);
    if (rows.length === 0) return { ok: false, error: "Tego producenta nie ma w grupie." };
    return { ok: true };
  } catch (error) {
    captureError(error, { path: "removeProducerFromGroup", userId: adminId });
    return { ok: false, error: GENERIC_ERROR };
  }
}

// Wyszukiwanie do dodawania członka (AC-24). To odczyt, ale też tylko dla admina.
export async function searchProducersForGroup(
  query: string,
  excludeIds: string[] = [],
): Promise<{ id: string; name: string; countryCode: string }[]> {
  if (!(await requireAdminActorId())) return [];
  try {
    return await searchProducers(query, excludeIds);
  } catch (error) {
    captureError(error, { path: "searchProducersForGroup" });
    return [];
  }
}

// AC-26: podgląd liczby unikalnych producentów po rozwinięciu wyboru z formularza projektu własnego.
export async function previewRecipients(
  groupIds: string[],
  producerIds: string[],
): Promise<{ ok: boolean; count: number; skipped: { id: string; name: string }[] }> {
  if (!(await requireAdminActorId())) return { ok: false, count: 0, skipped: [] };
  try {
    const result = await expandRecipients(groupIds, producerIds);
    return { ok: true, count: result.producers.length, skipped: result.skipped };
  } catch (error) {
    captureError(error, { path: "previewRecipients" });
    return { ok: false, count: 0, skipped: [] };
  }
}
