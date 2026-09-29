"use server";

import { eq, inArray } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/lib/db/client";
import { producer, producerMember, sessions, users } from "@/lib/db/schema";
import { captureError } from "@/lib/observability/errors";

interface ActionResult {
  ok: boolean;
  error?: string;
}

const DENIED_ERROR = "Nie masz uprawnień do tej akcji.";

// Bramka roli admin, niezależna od bramki na samej stronie /internal/producers
// (spec 0055 Security model): ten sam wzorzec co requirePhotoActor w
// lib/product-photo-actions.ts.
async function requireAdminActorId(): Promise<string | null> {
  const session = await auth();
  if (!session || session.user.role !== "admin") return null;
  return session.user.id;
}

// AC-5 (spec 0057): blokada operuje na producerId, nie targetUserId — odcina
// wszystkich dzisiejszych członków tego producenta (przez producer_member)
// naraz, w jednej atomowej partii (db.batch, patrz lib/db/AGENTS.md), zapisuje
// kto/kiedy/opcjonalnie dlaczego, i usuwa od razu wszystkie ich sesje (strategy
// "database" w auth.ts), więc tracą dostęp natychmiast, nie dopiero po
// naturalnym wygaśnięciu. Rola producer każdego członka jest już zagwarantowana
// w chwili dodania (addProducerMember, jedyna droga wejścia do producer_member),
// nie sprawdzana tu ponownie.
export async function blockProducer(producerId: string, reason?: string): Promise<ActionResult> {
  const adminId = await requireAdminActorId();
  if (!adminId) return { ok: false, error: DENIED_ERROR };

  try {
    const [target] = await db.select({ id: producer.id }).from(producer).where(eq(producer.id, producerId));
    if (!target) return { ok: false, error: "Nie znaleziono producenta." };

    const members = await db
      .select({ userId: producerMember.userId })
      .from(producerMember)
      .where(eq(producerMember.producerId, producerId));
    const memberIds = members.map((member) => member.userId);
    if (memberIds.length === 0) return { ok: true };

    await db.batch([
      db
        .update(users)
        .set({ blockedAt: new Date(), blockedBy: adminId, blockedReason: reason?.trim() || null })
        .where(inArray(users.id, memberIds)),
      db.delete(sessions).where(inArray(sessions.userId, memberIds)),
    ]);

    return { ok: true };
  } catch (error) {
    captureError(error, { path: "blockProducer", userId: adminId });
    return { ok: false, error: "Nie udało się zablokować producenta. Spróbuj ponownie." };
  }
}

export async function unblockProducer(producerId: string): Promise<ActionResult> {
  const adminId = await requireAdminActorId();
  if (!adminId) return { ok: false, error: DENIED_ERROR };

  try {
    const [target] = await db.select({ id: producer.id }).from(producer).where(eq(producer.id, producerId));
    if (!target) return { ok: false, error: "Nie znaleziono producenta." };

    const members = await db
      .select({ userId: producerMember.userId })
      .from(producerMember)
      .where(eq(producerMember.producerId, producerId));
    const memberIds = members.map((member) => member.userId);
    if (memberIds.length === 0) return { ok: true };

    await db
      .update(users)
      .set({ blockedAt: null, blockedBy: null, blockedReason: null })
      .where(inArray(users.id, memberIds));

    return { ok: true };
  } catch (error) {
    captureError(error, { path: "unblockProducer", userId: adminId });
    return { ok: false, error: "Nie udało się odblokować producenta. Spróbuj ponownie." };
  }
}
