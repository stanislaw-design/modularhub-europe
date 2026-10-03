import { and, eq, inArray, or } from "drizzle-orm";
import type { Session } from "next-auth";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

// @/auth and @/lib/observability/errors don't resolve under plain
// Vitest/jsdom (same boundary problem as lib/producer-block-actions.test.ts).
const authMock = vi.hoisted(() => vi.fn<() => Promise<Session | null>>());
const captureErrorMock = vi.hoisted(() => vi.fn());
vi.mock("@/auth", () => ({ auth: authMock }));
vi.mock("@/lib/observability/errors", () => ({ captureError: captureErrorMock }));

import { db } from "@/lib/db/client";
import { auditLog, producer, producerMember, sessions, users } from "@/lib/db/schema";
import { addProducerMember, removeProducerMember } from "./producer-member-actions";

function sessionAs(userId: string, role: "admin" | "producer" | "client"): Session {
  return {
    user: { id: userId, role, phone: "+48000000000", name: null, email: null, image: null },
    expires: new Date(Date.now() + 3600_000).toISOString(),
  } as Session;
}

describe.skipIf(!process.env.DATABASE_URL)("lib/producer-member-actions: real DB, mocked auth", () => {
  const adminUserId = crypto.randomUUID();
  const producerId = crypto.randomUUID();
  const firstMemberUserId = crypto.randomUUID();
  const otherProducerId = crypto.randomUUID();
  const otherProducerUserId = crypto.randomUUID();
  const existingProducerUserId = crypto.randomUUID();
  const clientRoleUserId = crypto.randomUUID();
  const newUserIds: string[] = [];

  beforeAll(async () => {
    await db.insert(users).values([
      { id: adminUserId, email: `pma-admin-${adminUserId}@example.test`, phone: "+48000000020", role: "admin" },
      { id: firstMemberUserId, email: `pma-first-${firstMemberUserId}@example.test`, phone: "+48000000021", role: "producer" },
      { id: otherProducerUserId, email: `pma-other-${otherProducerUserId}@example.test`, phone: "+48000000022", role: "producer" },
      { id: existingProducerUserId, email: `pma-existing-${existingProducerUserId}@example.test`, phone: "+48000000023", role: "producer" },
      { id: clientRoleUserId, email: `pma-client-${clientRoleUserId}@example.test`, phone: "+48000000024", role: "client" },
    ]);
    await db.insert(producer).values([
      { id: producerId, userId: firstMemberUserId, nip: `PMA1${producerId.slice(0, 7)}`, name: "Producer Member Test Producer", countryCode: "PL" },
      { id: otherProducerId, userId: otherProducerUserId, nip: `PMA2${otherProducerId.slice(0, 7)}`, name: "Producer Member Test Other Producer", countryCode: "PL" },
    ]);
    await db.insert(producerMember).values([
      { producerId, userId: firstMemberUserId },
      { producerId: otherProducerId, userId: otherProducerUserId },
    ]);
  });

  afterEach(() => {
    authMock.mockReset();
    captureErrorMock.mockReset();
  });

  afterAll(async () => {
    await db.delete(producerMember).where(eq(producerMember.producerId, producerId));
    await db.delete(producerMember).where(eq(producerMember.producerId, otherProducerId));
    await db.delete(producer).where(eq(producer.id, producerId));
    await db.delete(producer).where(eq(producer.id, otherProducerId));
    const allUserIds = [adminUserId, firstMemberUserId, otherProducerUserId, existingProducerUserId, clientRoleUserId, ...newUserIds];
    // The FK on audit_log.actor_user_id has no ON DELETE behavior (spec 0064
    // Consequences): attributed rows must go before the users rows they
    // reference, or this delete fails. Scoped to our own fixture ids, never a
    // blanket delete on table_name = 'users' (that would wipe unrelated
    // history in the shared dev database).
    await db.delete(auditLog).where(or(inArray(auditLog.actorUserId, allUserIds), inArray(auditLog.recordId, allUserIds)));
    for (const id of allUserIds) {
      await db.delete(users).where(eq(users.id, id));
    }
  });

  describe("addProducerMember", () => {
    it("rejects a non-admin session", async () => {
      authMock.mockResolvedValue(sessionAs(firstMemberUserId, "producer"));
      const result = await addProducerMember({ producerId, email: "x@example.test", name: "X", phone: "+48000000099" });
      expect(result.ok).toBe(false);
    });

    it("rejects missing required fields", async () => {
      authMock.mockResolvedValue(sessionAs(adminUserId, "admin"));
      const result = await addProducerMember({ producerId, email: "  ", name: "X", phone: "+48000000099" });
      expect(result.ok).toBe(false);
      expect(result.error).toBeTruthy();
    });

    it("returns not-found for a producer id that does not exist", async () => {
      authMock.mockResolvedValue(sessionAs(adminUserId, "admin"));
      const result = await addProducerMember({
        producerId: crypto.randomUUID(),
        email: `pma-ghost-${crypto.randomUUID()}@example.test`,
        name: "Ghost",
        phone: "+48000000098",
      });
      expect(result.ok).toBe(false);
      expect(result.error).toBe("Nie znaleziono producenta.");
    });

    it("refuses to add a member to a blocked producer", async () => {
      authMock.mockResolvedValue(sessionAs(adminUserId, "admin"));
      await db.update(users).set({ blockedAt: new Date() }).where(eq(users.id, firstMemberUserId));

      try {
        const result = await addProducerMember({
          producerId,
          email: `pma-blocked-attempt-${crypto.randomUUID()}@example.test`,
          name: "Blocked Attempt",
          phone: "+48000000097",
        });
        expect(result.ok).toBe(false);
        expect(result.error).toBe("Producent jest dziś zablokowany. Odblokuj go najpierw.");
      } finally {
        await db.update(users).set({ blockedAt: null }).where(eq(users.id, firstMemberUserId));
      }
    });

    it("rejects an existing user whose role is not producer", async () => {
      authMock.mockResolvedValue(sessionAs(adminUserId, "admin"));
      const [clientUser] = await db.select({ email: users.email }).from(users).where(eq(users.id, clientRoleUserId));
      const result = await addProducerMember({ producerId, email: clientUser.email!, name: "X", phone: "+48000000096" });
      expect(result.ok).toBe(false);
      expect(result.error).toBe("Ten adres e mail należy już do konta innej roli.");
    });

    it("rejects an existing producer user already a member of this same producer", async () => {
      authMock.mockResolvedValue(sessionAs(adminUserId, "admin"));
      const [member] = await db.select({ email: users.email }).from(users).where(eq(users.id, firstMemberUserId));
      const result = await addProducerMember({ producerId, email: member.email!, name: "X", phone: "+48000000095" });
      expect(result.ok).toBe(false);
      expect(result.error).toBe("Ta osoba jest już członkiem tego producenta.");
    });

    it("rejects an existing producer user already a member of a different producer", async () => {
      authMock.mockResolvedValue(sessionAs(adminUserId, "admin"));
      const [other] = await db.select({ email: users.email }).from(users).where(eq(users.id, otherProducerUserId));
      const result = await addProducerMember({ producerId, email: other.email!, name: "X", phone: "+48000000094" });
      expect(result.ok).toBe(false);
      expect(result.error).toBe("Ta osoba jest już członkiem innego producenta.");
    });

    it("adds an existing unaffiliated producer-role user to the producer", async () => {
      authMock.mockResolvedValue(sessionAs(adminUserId, "admin"));
      const [existing] = await db.select({ email: users.email }).from(users).where(eq(users.id, existingProducerUserId));

      const result = await addProducerMember({ producerId, email: existing.email!, name: "X", phone: "+48000000093" });
      expect(result.ok).toBe(true);

      const [row] = await db
        .select({ userId: producerMember.userId })
        .from(producerMember)
        .where(and(eq(producerMember.producerId, producerId), eq(producerMember.userId, existingProducerUserId)));
      expect(row).toBeDefined();
    });

    // Spec 0064 AC-1: creating a brand new user writes to `users`, which IS
    // audit-trigger covered, so the admin who did this must be attributed.
    it("creates a brand new user and attributes the resulting audit_log row to the acting admin (AC-1)", async () => {
      authMock.mockResolvedValue(sessionAs(adminUserId, "admin"));
      const email = `pma-newuser-${crypto.randomUUID()}@example.test`;

      const result = await addProducerMember({ producerId, email, name: "Brand New Member", phone: "+48000000092" });
      expect(result.ok).toBe(true);

      const [newUser] = await db.select({ id: users.id }).from(users).where(eq(users.email, email));
      expect(newUser).toBeDefined();
      newUserIds.push(newUser.id);

      const [auditRow] = await db
        .select({ actorUserId: auditLog.actorUserId })
        .from(auditLog)
        .where(and(eq(auditLog.tableName, "users"), eq(auditLog.recordId, newUser.id)));
      expect(auditRow?.actorUserId).toBe(adminUserId);

      const [memberRow] = await db
        .select({ userId: producerMember.userId })
        .from(producerMember)
        .where(and(eq(producerMember.producerId, producerId), eq(producerMember.userId, newUser.id)));
      expect(memberRow).toBeDefined();
    });
  });

  describe("removeProducerMember", () => {
    it("rejects a non-admin session", async () => {
      authMock.mockResolvedValue(sessionAs(firstMemberUserId, "producer"));
      const result = await removeProducerMember(producerId, firstMemberUserId);
      expect(result.ok).toBe(false);
    });

    it("rejects a user id that is not a member of this producer", async () => {
      authMock.mockResolvedValue(sessionAs(adminUserId, "admin"));
      const result = await removeProducerMember(producerId, crypto.randomUUID());
      expect(result.ok).toBe(false);
      expect(result.error).toBe("Ta osoba nie jest członkiem tego producenta.");
    });

    it("refuses to remove the last remaining member", async () => {
      authMock.mockResolvedValue(sessionAs(adminUserId, "admin"));
      const result = await removeProducerMember(otherProducerId, otherProducerUserId);
      expect(result.ok).toBe(false);
      expect(result.error).toBe("Nie można usunąć ostatniego pozostałego członka producenta.");

      const [stillThere] = await db
        .select({ userId: producerMember.userId })
        .from(producerMember)
        .where(and(eq(producerMember.producerId, otherProducerId), eq(producerMember.userId, otherProducerUserId)));
      expect(stillThere).toBeDefined();
    });

    it("removes a member and ends their active sessions", async () => {
      authMock.mockResolvedValue(sessionAs(adminUserId, "admin"));
      const extraMemberUserId = crypto.randomUUID();
      await db.insert(users).values({
        id: extraMemberUserId,
        email: `pma-extra-${extraMemberUserId}@example.test`,
        phone: "+48000000091",
        role: "producer",
      });
      await db.insert(producerMember).values({ producerId, userId: extraMemberUserId });
      await db.insert(sessions).values({
        sessionToken: `pma-session-${extraMemberUserId}`,
        userId: extraMemberUserId,
        expires: new Date(Date.now() + 3600_000),
      });

      try {
        const result = await removeProducerMember(producerId, extraMemberUserId);
        expect(result.ok).toBe(true);

        const [memberRow] = await db
          .select({ userId: producerMember.userId })
          .from(producerMember)
          .where(and(eq(producerMember.producerId, producerId), eq(producerMember.userId, extraMemberUserId)));
        expect(memberRow).toBeUndefined();

        const [sessionRow] = await db.select({ userId: sessions.userId }).from(sessions).where(eq(sessions.userId, extraMemberUserId));
        expect(sessionRow).toBeUndefined();
      } finally {
        await db.delete(sessions).where(eq(sessions.userId, extraMemberUserId));
        await db.delete(producerMember).where(eq(producerMember.userId, extraMemberUserId));
        await db.delete(users).where(eq(users.id, extraMemberUserId));
      }
    });
  });
});
