"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db } from "@/lib/db/client";
import { producer } from "@/lib/db/schema";
import { withAdminActor } from "@/lib/db/with-admin-actor";
import { captureError } from "@/lib/observability/errors";
import { requireProducerActor } from "@/lib/producer-actor";
import { isCommunicationLocale } from "@/lib/producer-communication-locale";

export interface SetCommunicationLocaleResult {
  ok: boolean;
  error?: string;
}

const UNAUTHORIZED_ERROR = "Musisz być zalogowany jako producent.";
const DENIED_ERROR = "Nie masz uprawnień do tej akcji.";
const INVALID_ERROR = "Wybierz jeden z dostępnych języków.";
const NOT_FOUND_ERROR = "Nie znaleziono producenta.";
const SAVE_ERROR = "Nie udało się zapisać języka. Spróbuj ponownie.";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Spec 0077 AC-29: producent zmienia język maili tylko własnej firmy. producerId pochodzi z
// sesji (requireProducerActor), nigdy z danych wejściowych, więc producent A nie ustawi
// języka producenta B. Zapis przez withAdminActor, żeby audyt niósł autora (spec 0064).
export async function setProducerCommunicationLocale(locale: string): Promise<SetCommunicationLocaleResult> {
  const actor = await requireProducerActor();
  if (!actor) return { ok: false, error: UNAUTHORIZED_ERROR };
  if (!isCommunicationLocale(locale)) return { ok: false, error: INVALID_ERROR };

  try {
    await withAdminActor(actor.userId, [
      db
        .update(producer)
        .set({ communicationLocale: locale, updatedAt: new Date() })
        .where(eq(producer.id, actor.producerId)),
    ]);
  } catch (error) {
    captureError(error, { path: "setProducerCommunicationLocale", userId: actor.userId });
    return { ok: false, error: SAVE_ERROR };
  }

  revalidatePath("/[locale]/producer/panel", "layout");
  return { ok: true };
}

// Spec 0077 AC-29: administrator ustawia język producentowi, który sam tego nie zrobił.
export async function setProducerCommunicationLocaleAsAdmin(
  producerId: string,
  locale: string,
): Promise<SetCommunicationLocaleResult> {
  const session = await auth();
  if (!session || session.user.role !== "admin") return { ok: false, error: DENIED_ERROR };
  if (!isCommunicationLocale(locale)) return { ok: false, error: INVALID_ERROR };
  if (!UUID_PATTERN.test(producerId)) return { ok: false, error: NOT_FOUND_ERROR };

  try {
    const [existing] = await db.select({ id: producer.id }).from(producer).where(eq(producer.id, producerId));
    if (!existing) return { ok: false, error: NOT_FOUND_ERROR };
    await withAdminActor(session.user.id, [
      db.update(producer).set({ communicationLocale: locale, updatedAt: new Date() }).where(eq(producer.id, producerId)),
    ]);
  } catch (error) {
    captureError(error, { path: "setProducerCommunicationLocaleAsAdmin", userId: session.user.id });
    return { ok: false, error: SAVE_ERROR };
  }

  revalidatePath("/[locale]/internal/producers/[id]", "page");
  return { ok: true };
}
