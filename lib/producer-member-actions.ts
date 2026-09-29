"use server";

import { and, eq } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/lib/db/client";
import { producer, producerMember, sessions, users } from "@/lib/db/schema";
import { captureError } from "@/lib/observability/errors";

interface ActionResult {
  ok: boolean;
  error?: string;
}

const DENIED_ERROR = "Nie masz uprawnień do tej akcji.";

// Bramka roli admin, ten sam wzorzec co lib/producer-block-actions.ts. Brak
// nowej powierzchni HTTP (spec 0057 Security model): te funkcje wywołuje
// dziś wyłącznie skrypt uruchamiany przez inżyniera, nie formularz w panelu.
async function requireAdminActorId(): Promise<string | null> {
  const session = await auth();
  if (!session || session.user.role !== "admin") return null;
  return session.user.id;
}

export interface AddProducerMemberInput {
  producerId: string;
  email: string;
  name: string;
  phone: string;
}

// AC-3: dodaje osobę o podanym adresie e mail do producenta. E mail zawsze
// porównywany/zapisywany w małych literach: Auth.js normalizuje adres do
// małych liter przy każdym logowaniu (dostawca Resend), więc wiersz zapisany
// z wielkimi literami nigdy by się nie dopasował i createUser rzuciłby błąd
// braku oczekującej rejestracji (spec Key invariants). Jeśli e mail nie ma
// jeszcze konta, zakłada je bezpośrednio z rolą producer (bez
// pending_registration — Auth.js znajdzie ten wiersz users przy pierwszym
// logowaniu i po prostu wyśle magic link, ten sam wzorzec co
// scripts/import-domihaus-catalog.ts). Jeśli ma, odmawia z czytelnym błędem
// gdy: inna rola, już członek innego producenta, już członek tego samego
// producenta. Odmawia też, gdy producent jest dziś zablokowany — administrator
// musi najpierw odblokować (inaczej nowa osoba dostałaby od razu działające
// logowanie do zablokowanej firmy).
export async function addProducerMember(input: AddProducerMemberInput): Promise<ActionResult> {
  const adminId = await requireAdminActorId();
  if (!adminId) return { ok: false, error: DENIED_ERROR };

  const email = input.email.trim().toLowerCase();
  const name = input.name.trim();
  const phone = input.phone.trim();
  if (!email || !name || !phone) {
    return { ok: false, error: "Adres e mail, imię i telefon są wymagane." };
  }

  try {
    const [target] = await db.select({ id: producer.id }).from(producer).where(eq(producer.id, input.producerId));
    if (!target) return { ok: false, error: "Nie znaleziono producenta." };

    const members = await db
      .select({ userId: producerMember.userId, blockedAt: users.blockedAt })
      .from(producerMember)
      .innerJoin(users, eq(producerMember.userId, users.id))
      .where(eq(producerMember.producerId, input.producerId));
    if (members.some((member) => member.blockedAt !== null)) {
      return { ok: false, error: "Producent jest dziś zablokowany. Odblokuj go najpierw." };
    }

    const [existingUser] = await db.select().from(users).where(eq(users.email, email));

    if (existingUser) {
      if (existingUser.role !== "producer") {
        return { ok: false, error: "Ten adres e mail należy już do konta innej roli." };
      }
      const [existingMembership] = await db
        .select({ producerId: producerMember.producerId })
        .from(producerMember)
        .where(eq(producerMember.userId, existingUser.id));
      if (existingMembership) {
        return {
          ok: false,
          error:
            existingMembership.producerId === input.producerId
              ? "Ta osoba jest już członkiem tego producenta."
              : "Ta osoba jest już członkiem innego producenta.",
        };
      }

      await db.insert(producerMember).values({
        producerId: input.producerId,
        userId: existingUser.id,
        addedBy: adminId,
      });
      return { ok: true };
    }

    const newUserId = crypto.randomUUID();
    await db.batch([
      db.insert(users).values({
        id: newUserId,
        email,
        name,
        phone,
        role: "producer",
      }),
      db.insert(producerMember).values({
        producerId: input.producerId,
        userId: newUserId,
        addedBy: adminId,
      }),
    ]);
    return { ok: true };
  } catch (error) {
    captureError(error, { path: "addProducerMember", userId: adminId });
    return { ok: false, error: "Nie udało się dodać osoby. Spróbuj ponownie." };
  }
}

// AC-4: usuwa osobę z producenta; odmawia, gdy dotyczy ostatniego pozostałego
// członka (producent nigdy nie zostaje bez żadnego użytkownika). Udane
// usunięcie kończy natychmiast aktywne sesje usuniętej osoby, ten sam wzorzec
// co blockProducer (strategy "database" w auth.ts).
export async function removeProducerMember(producerId: string, userId: string): Promise<ActionResult> {
  const adminId = await requireAdminActorId();
  if (!adminId) return { ok: false, error: DENIED_ERROR };

  try {
    const members = await db
      .select({ userId: producerMember.userId })
      .from(producerMember)
      .where(eq(producerMember.producerId, producerId));
    if (!members.some((member) => member.userId === userId)) {
      return { ok: false, error: "Ta osoba nie jest członkiem tego producenta." };
    }
    if (members.length <= 1) {
      return { ok: false, error: "Nie można usunąć ostatniego pozostałego członka producenta." };
    }

    await db.batch([
      db
        .delete(producerMember)
        .where(and(eq(producerMember.producerId, producerId), eq(producerMember.userId, userId))),
      db.delete(sessions).where(eq(sessions.userId, userId)),
    ]);
    return { ok: true };
  } catch (error) {
    captureError(error, { path: "removeProducerMember", userId: adminId });
    return { ok: false, error: "Nie udało się usunąć osoby. Spróbuj ponownie." };
  }
}
