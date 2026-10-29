"use server";

import { and, eq, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { auth, signIn } from "@/auth";
import { ADMIN_INVITE_MAX_OPEN, ADMIN_INVITE_TTL_DAYS } from "@/lib/admin-invite";
import { db } from "@/lib/db/client";
import { pendingRegistration, sessions, users } from "@/lib/db/schema";
import { withAdminActor } from "@/lib/db/with-admin-actor";
import { captureError } from "@/lib/observability/errors";

// Spec 0077 część D (AC-35 do AC-42): konta administratora. Każda akcja sprawdza rolę `admin` w kodzie
// (nie tylko w interfejsie) i zapisuje przez withAdminActor, więc zmiana trafia do audit_log z autorem.
// Zaproszenie nie nadaje żadnych uprawnień: konto z rolą admin powstaje dopiero przy pierwszym
// logowaniu z linku (auth.ts createUser).

interface ActionResult {
  ok: boolean;
  error?: string;
}

const DENIED_ERROR = "Musisz być zalogowany jako administrator.";
const GENERIC_ERROR = "Nie udało się zapisać zmiany. Spróbuj ponownie.";
const LAST_ADMIN_ERROR = "Nie można odebrać dostępu: musi zostać co najmniej jeden aktywny administrator.";
const NOT_ACTIVE_ADMIN_ERROR = "To konto nie jest aktywnym administratorem.";
const NO_INVITE_ERROR = "Nie znaleziono zaproszenia dla tego adresu.";
const SEND_FAILED_ERROR = "Zaproszenie zapisano, ale nie udało się wysłać e maila. Użyj „Wyślij ponownie”.";
const LOCALE = "pl";

const inviteSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email("Podaj prawidłowy adres e mail.")),
  name: z.string().trim().min(1, "Podaj imię i nazwisko.").max(120, "Imię i nazwisko może mieć najwyżej 120 znaków."),
  phone: z.string().trim().min(5, "Podaj numer telefonu.").max(40, "Numer telefonu może mieć najwyżej 40 znaków."),
});
const emailSchema = z.string().trim().toLowerCase().pipe(z.email("Podaj prawidłowy adres e mail."));
const userIdSchema = z.string().trim().min(1).max(200);

async function requireAdminActorId(): Promise<string | null> {
  const session = await auth();
  if (!session || session.user.role !== "admin") return null;
  return session.user.id;
}

// Wspólna blokada listy adminów (AC-39): zaproszenie, odebranie i przywrócenie biorą ją na początku
// swojej partii, więc dwie takie operacje naraz wykonują się jedna po drugiej, nie równolegle.
function lockAdminRoster() {
  return db.execute(sql`select pg_advisory_xact_lock(hashtext('admin_roster'))`);
}

async function sendInviteLink(email: string): Promise<boolean> {
  try {
    await signIn("resend", { email, redirect: false, redirectTo: `/${LOCALE}/internal` });
    return true;
  } catch (error) {
    captureError(error, { path: "sendAdminInviteLink" });
    return false;
  }
}

export async function inviteAdmin(input: { email: string; name: string; phone: string }): Promise<ActionResult> {
  const adminId = await requireAdminActorId();
  if (!adminId) return { ok: false, error: DENIED_ERROR };
  const parsed = inviteSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Sprawdź dane zaproszenia." };
  const { email, name, phone } = parsed.data;

  try {
    const [existingUser] = await db
      .select({ role: users.role, blockedAt: users.blockedAt })
      .from(users)
      .where(sql`lower(${users.email}) = ${email}`);
    if (existingUser) {
      return {
        ok: false,
        error:
          existingUser.role === "admin" && existingUser.blockedAt
            ? "Ten administrator ma odebrany dostęp. Przywróć go na liście zamiast zapraszać ponownie."
            : "Ten adres ma już konto (administrator, klient lub producent). Rola jest jedna na konto, użyj innego adresu e mail.",
      };
    }

    const [otherPending] = await db
      .select({ role: pendingRegistration.role })
      .from(pendingRegistration)
      .where(and(eq(pendingRegistration.email, email), sql`${pendingRegistration.role} <> 'admin'`));
    if (otherPending) {
      return { ok: false, error: "Ten adres ma otwartą rejestrację klienta lub producenta. Użyj innego adresu e mail." };
    }

    // Limit otwartych zaproszeń, brak konta i zapis są jedną instrukcją pod blokadą listy adminów.
    // Wiersz o tym samym adresie (ponowne zaproszenie) się odnawia, więc nie liczy się do limitu.
    const payload = JSON.stringify({ name, phone });
    const [, inserted] = await withAdminActor(adminId, [
      lockAdminRoster(),
      db.execute<{ email: string }>(sql`
        insert into pending_registration (email, role, payload, created_at)
        select ${email}::text, 'admin'::role, ${payload}::jsonb, now()
        where (
          select count(*) from pending_registration
          where role = 'admin' and email <> ${email}::text
            and created_at > now() - make_interval(days => ${ADMIN_INVITE_TTL_DAYS}::int)
        ) < ${ADMIN_INVITE_MAX_OPEN}::int
          and not exists (select 1 from users where lower(email) = ${email}::text)
        on conflict (email) do update set payload = excluded.payload, created_at = now()
          where pending_registration.role = 'admin'
        returning email
      `),
    ]);
    if (inserted.rows.length === 0) {
      return {
        ok: false,
        error: `Jest już ${ADMIN_INVITE_MAX_OPEN} otwartych zaproszeń. Anuluj któreś albo poczekaj, aż wygasną.`,
      };
    }

    if (!(await sendInviteLink(email))) return { ok: false, error: SEND_FAILED_ERROR };
    return { ok: true };
  } catch (error) {
    captureError(error, { path: "inviteAdmin", userId: adminId });
    return { ok: false, error: GENERIC_ERROR };
  }
}

export async function resendAdminInvite(emailInput: string): Promise<ActionResult> {
  const adminId = await requireAdminActorId();
  if (!adminId) return { ok: false, error: DENIED_ERROR };
  const parsed = emailSchema.safeParse(emailInput);
  if (!parsed.success) return { ok: false, error: NO_INVITE_ERROR };
  const email = parsed.data;

  try {
    const [rows] = await withAdminActor(adminId, [
      db
        .update(pendingRegistration)
        .set({ createdAt: new Date() })
        .where(and(eq(pendingRegistration.email, email), eq(pendingRegistration.role, "admin")))
        .returning({ email: pendingRegistration.email }),
    ]);
    if (rows.length === 0) return { ok: false, error: NO_INVITE_ERROR };

    if (!(await sendInviteLink(email))) return { ok: false, error: SEND_FAILED_ERROR };
    return { ok: true };
  } catch (error) {
    captureError(error, { path: "resendAdminInvite", userId: adminId });
    return { ok: false, error: GENERIC_ERROR };
  }
}

export async function cancelAdminInvite(emailInput: string): Promise<ActionResult> {
  const adminId = await requireAdminActorId();
  if (!adminId) return { ok: false, error: DENIED_ERROR };
  const parsed = emailSchema.safeParse(emailInput);
  if (!parsed.success) return { ok: false, error: NO_INVITE_ERROR };

  try {
    const [rows] = await withAdminActor(adminId, [
      db
        .delete(pendingRegistration)
        .where(and(eq(pendingRegistration.email, parsed.data), eq(pendingRegistration.role, "admin")))
        .returning({ email: pendingRegistration.email }),
    ]);
    if (rows.length === 0) return { ok: false, error: NO_INVITE_ERROR };
    return { ok: true };
  } catch (error) {
    captureError(error, { path: "cancelAdminInvite", userId: adminId });
    return { ok: false, error: GENERIC_ERROR };
  }
}

// AC-38, AC-39: blokada konta, jego sesje i ochrona ostatniego admina w jednej partii pod blokadą
// listy adminów. UPDATE wykonuje się tylko wtedy, gdy po nim zostanie inny aktywny admin (dotyczy też
// odebrania sobie). Sesje kasujemy tylko, gdy konto jest faktycznie zablokowane po UPDATE.
export async function revokeAdmin(userIdInput: string, reason?: string): Promise<ActionResult> {
  const adminId = await requireAdminActorId();
  if (!adminId) return { ok: false, error: DENIED_ERROR };
  const parsedId = userIdSchema.safeParse(userIdInput);
  if (!parsedId.success) return { ok: false, error: NOT_ACTIVE_ADMIN_ERROR };
  const userId = parsedId.data;
  const cleanReason = reason?.trim().slice(0, 300) || null;

  try {
    const [, updated] = await withAdminActor(adminId, [
      lockAdminRoster(),
      db
        .update(users)
        .set({ blockedAt: new Date(), blockedBy: adminId, blockedReason: cleanReason })
        .where(
          and(
            eq(users.id, userId),
            eq(users.role, "admin"),
            isNull(users.blockedAt),
            isNull(users.deletedAt),
            sql`exists (
              select 1 from users other
              where other.role = 'admin' and other.blocked_at is null and other.deleted_at is null and other.id <> ${userId}
            )`,
          ),
        )
        .returning({ id: users.id }),
      db.delete(sessions).where(
        and(
          eq(sessions.userId, userId),
          sql`exists (select 1 from users blocked where blocked.id = ${userId} and blocked.role = 'admin' and blocked.blocked_at is not null)`,
        ),
      ),
    ]);
    if (updated.length > 0) return { ok: true };

    const [target] = await db
      .select({ role: users.role, blockedAt: users.blockedAt, deletedAt: users.deletedAt })
      .from(users)
      .where(eq(users.id, userId));
    if (!target || target.role !== "admin" || target.blockedAt || target.deletedAt) {
      return { ok: false, error: NOT_ACTIVE_ADMIN_ERROR };
    }
    return { ok: false, error: LAST_ADMIN_ERROR };
  } catch (error) {
    captureError(error, { path: "revokeAdmin", userId: adminId });
    return { ok: false, error: GENERIC_ERROR };
  }
}

export async function restoreAdmin(userIdInput: string): Promise<ActionResult> {
  const adminId = await requireAdminActorId();
  if (!adminId) return { ok: false, error: DENIED_ERROR };
  const parsedId = userIdSchema.safeParse(userIdInput);
  if (!parsedId.success) return { ok: false, error: "To konto nie jest zablokowanym administratorem." };

  try {
    const [, restored] = await withAdminActor(adminId, [
      lockAdminRoster(),
      db
        .update(users)
        .set({ blockedAt: null, blockedBy: null, blockedReason: null })
        .where(and(eq(users.id, parsedId.data), eq(users.role, "admin"), sql`${users.blockedAt} is not null`, isNull(users.deletedAt)))
        .returning({ id: users.id }),
    ]);
    if (restored.length === 0) return { ok: false, error: "To konto nie jest zablokowanym administratorem." };
    return { ok: true };
  } catch (error) {
    captureError(error, { path: "restoreAdmin", userId: adminId });
    return { ok: false, error: GENERIC_ERROR };
  }
}
