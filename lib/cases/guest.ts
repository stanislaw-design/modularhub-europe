import { and, eq, gt, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { client, inquiry, users, verificationTokens } from "@/lib/db/schema";

// Sprawy gości (spec 0066): zapytanie bez konta zapisane z client_id NULL i
// migawką kontaktu. Konto powstaje dopiero na jawne kliknięcie, a sprawa
// dowiązuje się po e mailu przy logowaniu.

// Limity z AC-5, liczone z samej tabeli inquiry (bez nowej usługi). Liczenie
// przed zapisem na neon-http dopuszcza wyścig dwóch równoległych wysyłek,
// świadomie przyjęty w specyfikacji.
export const GUEST_CASES_PER_EMAIL_PER_DAY = 3;
export const GUEST_CASES_GLOBAL_DAILY_CAP = 200;
const DAY_MS = 24 * 60 * 60 * 1000;

export async function isGuestRateLimited(email: string, now: Date): Promise<boolean> {
  const since = new Date(now.getTime() - DAY_MS);
  const [row] = await db
    .select({
      perEmail: sql<number>`count(*) filter (where lower(${inquiry.email}) = ${email.toLowerCase()})::int`,
      guestTotal: sql<number>`count(*) filter (where ${inquiry.contactEmailVerifiedAt} is null)::int`,
    })
    .from(inquiry)
    .where(gt(inquiry.receivedAt, since));
  return (row?.perEmail ?? 0) >= GUEST_CASES_PER_EMAIL_PER_DAY || (row?.guestTotal ?? 0) >= GUEST_CASES_GLOBAL_DAILY_CAP;
}

// AC-9: przy każdym udanym logowaniu klienta (także pierwszym) sprawy gościa o
// tym e mailu dostają jego client_id i potwierdzony kontakt. Idempotentne.
export async function linkGuestCasesToClientOnLogin(email: string, clientId: string): Promise<void> {
  await db
    .update(inquiry)
    .set({ clientId, contactEmailVerifiedAt: new Date() })
    .where(and(isNull(inquiry.clientId), sql`lower(${inquiry.email}) = ${email.toLowerCase()}`));
}

// AC-10: konto klienta o tym e mailu, jeśli istnieje. Producent i
// administrator nigdy nie dostają spraw gościa.
export async function findClientIdByEmail(email: string): Promise<string | null> {
  const [row] = await db
    .select({ clientId: client.id })
    .from(users)
    .innerJoin(client, eq(client.userId, users.id))
    .where(and(eq(users.email, email.toLowerCase()), eq(users.role, "client")));
  return row?.clientId ?? null;
}

// AC-8: najwyżej 3 aktywne linki logowania na adres naraz.
export const MAX_ACTIVE_LOGIN_TOKENS = 3;

export async function countActiveLoginTokens(email: string, now: Date): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(verificationTokens)
    .where(and(eq(verificationTokens.identifier, email.toLowerCase()), gt(verificationTokens.expires, now)));
  return row?.count ?? 0;
}
