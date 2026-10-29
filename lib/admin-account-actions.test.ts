import { and, eq, inArray, like } from "drizzle-orm";
import type { Session } from "next-auth";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

// @/auth i obserwowalność nie ładują się w czystym Vitest, więc są podmienione (jak w
// lib/producer-group-actions.test.ts). signIn udaje wysyłkę linku.
const authMock = vi.hoisted(() => vi.fn<() => Promise<Session | null>>());
const signInMock = vi.hoisted(() => vi.fn(async () => undefined));
vi.mock("@/auth", () => ({ auth: authMock, signIn: signInMock }));
vi.mock("next-auth", () => ({ AuthError: class AuthError extends Error {} }));
vi.mock("@/lib/observability/errors", () => ({ captureError: vi.fn() }));

import { db } from "@/lib/db/client";
import { auditLog, pendingRegistration, sessions, users } from "@/lib/db/schema";
import { registerClient } from "./auth-registration";
import { cancelAdminInvite, inviteAdmin, resendAdminInvite, restoreAdmin, revokeAdmin } from "./admin-account-actions";

function sessionAs(userId: string, role: "admin" | "producer" | "client"): Session {
  return {
    user: { id: userId, role, phone: "+48000000000", name: null, email: null, image: null },
    expires: new Date(Date.now() + 3600_000).toISOString(),
  } as Session;
}

// Spec 0077 część D (AC-35 do AC-42): prawdziwa baza dev. Aby nie ruszać prawdziwych adminów,
// testy dotyczące "ostatniego admina" liczą się względem wszystkich aktywnych adminów w bazie,
// więc sprawdzamy to, co da się sprawdzić niezależnie od innych adminów.
describe.skipIf(!process.env.DATABASE_URL)("lib/admin-account-actions (spec 0077 D)", () => {
  const tag = crypto.randomUUID().slice(0, 8);
  const adminA = crypto.randomUUID();
  const adminB = crypto.randomUUID();
  const clientUser = crypto.randomUUID();
  const email = (name: string) => `adm-${name}-${tag}@example.test`;
  const createdEmails: string[] = [];

  beforeAll(async () => {
    await db.insert(users).values([
      { id: adminA, email: email("a"), name: "Admin A", phone: "+48000000101", role: "admin" },
      { id: adminB, email: email("b"), name: "Admin B", phone: "+48000000102", role: "admin" },
      { id: clientUser, email: email("client"), name: "Klient", phone: "+48000000103", role: "client" },
    ]);
  });

  afterEach(() => {
    authMock.mockReset();
    signInMock.mockClear();
  });

  afterAll(async () => {
    const all = [...createdEmails, email("a"), email("b"), email("client")];
    await db.delete(pendingRegistration).where(inArray(pendingRegistration.email, all));
    await db.delete(sessions).where(inArray(sessions.userId, [adminA, adminB, clientUser]));
    await db.delete(auditLog).where(inArray(auditLog.actorUserId, [adminA, adminB]));
    await db.update(users).set({ blockedBy: null }).where(inArray(users.id, [adminA, adminB]));
    await db.delete(users).where(inArray(users.id, [adminA, adminB, clientUser]));
  });

  it("odrzuca wywołanie bez roli admin (AC-42)", async () => {
    authMock.mockResolvedValue(sessionAs(clientUser, "client"));
    const input = { email: email("x"), name: "X", phone: "+48000000999" };
    expect((await inviteAdmin(input)).ok).toBe(false);
    expect((await resendAdminInvite(input.email)).ok).toBe(false);
    expect((await cancelAdminInvite(input.email)).ok).toBe(false);
    expect((await revokeAdmin(adminB)).ok).toBe(false);
    expect((await restoreAdmin(adminB)).ok).toBe(false);
    authMock.mockResolvedValue(null);
    expect((await inviteAdmin(input)).ok).toBe(false);
    expect(signInMock).not.toHaveBeenCalled();
  });

  it("zaprasza, normalizuje adres, wysyła link i zapisuje audyt z autorem (AC-35, AC-41)", async () => {
    authMock.mockResolvedValue(sessionAs(adminA, "admin"));
    const mixed = `  ${email("new").toUpperCase().replace("@EXAMPLE.TEST", "@example.test")} `;
    createdEmails.push(email("new"));
    const result = await inviteAdmin({ email: mixed, name: "Nowa Osoba", phone: "+48111222333" });
    expect(result).toEqual({ ok: true });
    expect(signInMock).toHaveBeenCalledWith("resend", expect.objectContaining({ email: email("new") }));

    const [row] = await db.select().from(pendingRegistration).where(eq(pendingRegistration.email, email("new")));
    expect(row.role).toBe("admin");
    expect(row.payload).toMatchObject({ name: "Nowa Osoba", phone: "+48111222333" });

    const audit = await db
      .select()
      .from(auditLog)
      .where(and(eq(auditLog.tableName, "pending_registration"), eq(auditLog.actorUserId, adminA)));
    expect(audit.length).toBeGreaterThan(0);
    // Wąska lista pól: bez imienia i telefonu.
    expect(JSON.stringify(audit.map((entry) => entry.newValues))).not.toContain("Nowa Osoba");
  });

  it("odrzuca adres z istniejącym kontem klienta, także z wielkimi literami (AC-35)", async () => {
    authMock.mockResolvedValue(sessionAs(adminA, "admin"));
    const result = await inviteAdmin({ email: email("client").toUpperCase(), name: "K", phone: "+48000000103" });
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/ma już konto/);
    const rows = await db.select().from(pendingRegistration).where(eq(pendingRegistration.email, email("client")));
    expect(rows).toHaveLength(0);
  });

  it("odrzuca zablokowanego admina i wskazuje przywrócenie (AC-35)", async () => {
    authMock.mockResolvedValue(sessionAs(adminA, "admin"));
    await db.update(users).set({ blockedAt: new Date() }).where(eq(users.id, adminB));
    const result = await inviteAdmin({ email: email("b"), name: "B", phone: "+48000000102" });
    expect(result.error).toMatch(/Przywróć/);
    await db.update(users).set({ blockedAt: null }).where(eq(users.id, adminB));
  });

  it("ponowne wysłanie odświeża datę, anulowanie usuwa wiersz (AC-36)", async () => {
    authMock.mockResolvedValue(sessionAs(adminA, "admin"));
    const old = new Date(Date.now() - 10 * 86400_000);
    await db.update(pendingRegistration).set({ createdAt: old }).where(eq(pendingRegistration.email, email("new")));
    expect((await resendAdminInvite(email("new"))).ok).toBe(true);
    const [row] = await db.select().from(pendingRegistration).where(eq(pendingRegistration.email, email("new")));
    expect(row.createdAt.getTime()).toBeGreaterThan(Date.now() - 60_000);

    expect((await cancelAdminInvite(email("new"))).ok).toBe(true);
    expect((await cancelAdminInvite(email("new"))).ok).toBe(false);
  });

  it("rejestracja klienta nie nadpisuje zaproszenia admina (AC-37)", async () => {
    authMock.mockResolvedValue(sessionAs(adminA, "admin"));
    createdEmails.push(email("guard"));
    expect((await inviteAdmin({ email: email("guard"), name: "Guard", phone: "+48000000555" })).ok).toBe(true);
    signInMock.mockClear();

    const form = new FormData();
    form.set("name", "Intruz");
    form.set("email", email("guard"));
    form.set("phone", "+48000000666");
    form.set("callbackUrl", "/pl");
    const outcome = await registerClient({ status: "idle" }, form);
    expect(outcome.status).toBe("error");
    expect(signInMock).not.toHaveBeenCalled();

    const [row] = await db.select().from(pendingRegistration).where(eq(pendingRegistration.email, email("guard")));
    expect(row.role).toBe("admin");
    expect(row.payload.name).toBe("Guard");
  });

  it("odbiera dostęp: blokada, powód, autor i usunięcie sesji; przywraca (AC-38, AC-40, AC-41)", async () => {
    authMock.mockResolvedValue(sessionAs(adminA, "admin"));
    await db.insert(sessions).values({ sessionToken: `tok-${tag}`, userId: adminB, expires: new Date(Date.now() + 3600_000) });

    // Są co najmniej dwaj aktywni admini (A i B), więc odebranie B się udaje.
    expect(await revokeAdmin(adminB, "  odszedł z firmy ")).toEqual({ ok: true });
    const [blocked] = await db.select().from(users).where(eq(users.id, adminB));
    expect(blocked.blockedAt).not.toBeNull();
    expect(blocked.blockedBy).toBe(adminA);
    expect(blocked.blockedReason).toBe("odszedł z firmy");
    expect(blocked.role).toBe("admin");
    expect(await db.select().from(sessions).where(eq(sessions.userId, adminB))).toHaveLength(0);

    // Drugi raz: konto nie jest już aktywnym adminem.
    expect((await revokeAdmin(adminB)).error).toMatch(/nie jest aktywnym/);

    const audit = await db.select().from(auditLog).where(and(eq(auditLog.tableName, "users"), eq(auditLog.recordId, adminB), eq(auditLog.actorUserId, adminA)));
    expect(audit.length).toBeGreaterThan(0);

    expect(await restoreAdmin(adminB)).toEqual({ ok: true });
    const [restored] = await db.select().from(users).where(eq(users.id, adminB));
    expect(restored.blockedAt).toBeNull();
    expect((await restoreAdmin(adminB)).ok).toBe(false);
  });

  it("nie odbierze dostępu ostatniemu aktywnemu adminowi, w tym sobie (AC-39)", async () => {
    // Wszyscy inni aktywni admini w bazie dev są na chwilę zablokowani? Nie ruszamy ich: zamiast tego
    // blokujemy B i sprawdzamy ochronę względem puli, w której A jest jedynym kandydatem tylko wtedy,
    // gdy w bazie nie ma innych adminów. Test jest więc warunkowy.
    const others = await db.select({ id: users.id }).from(users).where(and(eq(users.role, "admin"), like(users.email, "%@%")));
    const activeOthers = others.filter((row) => row.id !== adminA && row.id !== adminB);
    if (activeOthers.length > 0) return;

    authMock.mockResolvedValue(sessionAs(adminA, "admin"));
    await db.update(users).set({ blockedAt: new Date() }).where(eq(users.id, adminB));
    const self = await revokeAdmin(adminA);
    expect(self.ok).toBe(false);
    expect(self.error).toMatch(/co najmniej jeden aktywny/);
    const [still] = await db.select().from(users).where(eq(users.id, adminA));
    expect(still.blockedAt).toBeNull();
    await db.update(users).set({ blockedAt: null }).where(eq(users.id, adminB));
  });
});
