import type { Session } from "next-auth";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

// Same boundary mocks as lib/project-quote-actions.test.ts: auth and
// observability are I/O edges, the database is real (dev project only).
const authMock = vi.hoisted(() => vi.fn<() => Promise<Session | null>>());
const captureErrorMock = vi.hoisted(() => vi.fn());
const FakeAuthError = vi.hoisted(() => class FakeAuthError extends Error {});
vi.mock("@/auth", () => ({ auth: authMock, signIn: vi.fn() }));
vi.mock("next-auth", () => ({ AuthError: FakeAuthError }));
vi.mock("@/lib/observability", () => ({ trackEvent: vi.fn(), captureError: captureErrorMock }));
vi.mock("@/lib/observability/errors", () => ({ captureError: captureErrorMock }));

import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { auditLog, producer, producerCertification, producerMember, users } from "@/lib/db/schema";
import {
  addProducerCertification,
  deleteProducerCertification,
  updateProducerCertification,
} from "./producer-certification-actions";

function sessionAs(userId: string, role: "admin" | "producer" | "client"): Session {
  return {
    user: { id: userId, role, phone: "+48000000000", name: null, email: null, image: null },
    expires: new Date(Date.now() + 3600_000).toISOString(),
  } as Session;
}

describe.skipIf(!process.env.DATABASE_URL)("lib/producer-certification-actions: real DB, mocked auth", () => {
  const producerUserId = crypto.randomUUID();
  const producerId = crypto.randomUUID();
  const otherUserId = crypto.randomUUID();
  const otherProducerId = crypto.randomUUID();
  const adminUserId = crypto.randomUUID();
  const allUserIds = [producerUserId, otherUserId, adminUserId];
  const allProducerIds = [producerId, otherProducerId];

  async function certRow(name: string, forProducer = producerId) {
    const [row] = await db
      .select()
      .from(producerCertification)
      .where(and(eq(producerCertification.producerId, forProducer), eq(producerCertification.name, name)));
    return row;
  }

  beforeAll(async () => {
    await db.insert(users).values([
      { id: producerUserId, email: `pca-producer-${producerUserId}@example.test`, phone: "+48000000021", role: "producer" },
      { id: otherUserId, email: `pca-other-${otherUserId}@example.test`, phone: "+48000000022", role: "producer" },
      { id: adminUserId, email: `pca-admin-${adminUserId}@example.test`, phone: "+48000000023", role: "admin" },
    ]);
    await db.insert(producer).values([
      { id: producerId, userId: producerUserId, nip: `PCA1${producerId.slice(0, 7)}`, name: "Cert Producer", countryCode: "PL", technology: "szkielet-drewniany" },
      { id: otherProducerId, userId: otherUserId, nip: `PCA2${otherProducerId.slice(0, 7)}`, name: "Cert Other", countryCode: "PL", technology: "szkielet-drewniany" },
    ]);
    await db.insert(producerMember).values([
      { producerId, userId: producerUserId },
      { producerId: otherProducerId, userId: otherUserId },
    ]);
  });

  afterEach(() => {
    authMock.mockReset();
  });

  afterAll(async () => {
    await db.delete(producer).where(inArray(producer.id, allProducerIds));
    await db.delete(auditLog).where(inArray(auditLog.actorUserId, allUserIds));
    await db.delete(users).where(inArray(users.id, allUserIds));
  });

  describe("addProducerCertification", () => {
    it("rejects a caller who is not a logged-in producer", async () => {
      authMock.mockResolvedValue(sessionAs(adminUserId, "admin"));
      const result = await addProducerCertification({ name: "Nie dodam" });
      expect(result.ok).toBe(false);
      expect(await certRow("Nie dodam")).toBeUndefined();
    });

    it("adds a self-reported certification owned by the caller's producer (spec 0065 AC-9)", async () => {
      authMock.mockResolvedValue(sessionAs(producerUserId, "producer"));
      const result = await addProducerCertification({ name: "ISO 9001", issuer: "  TÜV  " });

      expect(result.ok).toBe(true);
      const row = await certRow("ISO 9001");
      expect(row.confirmationStatus).toBe("self_reported");
      expect(row.issuer).toBe("TÜV");
      expect(row.confirmedAt).toBeNull();
      expect(row.confirmedBy).toBeNull();
    });

    it("stores a blank issuer as null", async () => {
      authMock.mockResolvedValue(sessionAs(producerUserId, "producer"));
      await addProducerCertification({ name: "CE", issuer: "   " });
      expect((await certRow("CE")).issuer).toBeNull();
    });

    it("refuses a duplicate name for the same producer with a readable error", async () => {
      authMock.mockResolvedValue(sessionAs(producerUserId, "producer"));
      const result = await addProducerCertification({ name: "ISO 9001" });
      expect(result).toEqual({ ok: false, error: "Certyfikat o tej nazwie już istnieje." });
    });

    it("rejects a blank name before touching the database", async () => {
      authMock.mockResolvedValue(sessionAs(producerUserId, "producer"));
      const result = await addProducerCertification({ name: "   " });
      expect(result.ok).toBe(false);
    });
  });

  describe("updateProducerCertification", () => {
    it("drops a platform-confirmed certification back to self-reported when its name changes, in the same update (spec 0065 AC-9)", async () => {
      authMock.mockResolvedValue(sessionAs(producerUserId, "producer"));
      const before = await certRow("ISO 9001");
      await db
        .update(producerCertification)
        .set({ confirmationStatus: "platform_confirmed", confirmedAt: new Date(), confirmedBy: adminUserId })
        .where(eq(producerCertification.id, before.id));

      const result = await updateProducerCertification(before.id, { name: "ISO 9001:2015", issuer: "TÜV" });

      expect(result.ok).toBe(true);
      const after = await certRow("ISO 9001:2015");
      expect(after.confirmationStatus).toBe("self_reported");
      expect(after.confirmedAt).toBeNull();
      expect(after.confirmedBy).toBeNull();
      expect(after.version).toBe(before.version + 1);
    });

    it("keeps the confirmation when name and issuer are unchanged", async () => {
      authMock.mockResolvedValue(sessionAs(producerUserId, "producer"));
      const before = await certRow("ISO 9001:2015");
      await db
        .update(producerCertification)
        .set({ confirmationStatus: "platform_confirmed", confirmedAt: new Date(), confirmedBy: adminUserId })
        .where(eq(producerCertification.id, before.id));

      const result = await updateProducerCertification(before.id, { name: "ISO 9001:2015", issuer: "TÜV" });

      expect(result.ok).toBe(true);
      expect((await certRow("ISO 9001:2015")).confirmationStatus).toBe("platform_confirmed");
    });

    it("cannot edit another producer's certification", async () => {
      authMock.mockResolvedValue(sessionAs(otherUserId, "producer"));
      const mine = await certRow("ISO 9001:2015");

      const result = await updateProducerCertification(mine.id, { name: "Przejęte" });

      expect(result).toEqual({ ok: false, error: "Nie znaleziono certyfikatu." });
      expect((await certRow("ISO 9001:2015")).name).toBe("ISO 9001:2015");
    });
  });

  describe("deleteProducerCertification", () => {
    it("removes the caller's own certification", async () => {
      authMock.mockResolvedValue(sessionAs(producerUserId, "producer"));
      await addProducerCertification({ name: "Do usunięcia" });
      const row = await certRow("Do usunięcia");

      const result = await deleteProducerCertification(row.id);

      expect(result.ok).toBe(true);
      expect(await certRow("Do usunięcia")).toBeUndefined();
    });

    it("cannot delete another producer's certification", async () => {
      authMock.mockResolvedValue(sessionAs(producerUserId, "producer"));
      await addProducerCertification({ name: "Cudzy" });
      const row = await certRow("Cudzy");

      authMock.mockResolvedValue(sessionAs(otherUserId, "producer"));
      const result = await deleteProducerCertification(row.id);

      expect(result.ok).toBe(false);
      expect(await certRow("Cudzy")).toBeDefined();
    });
  });
});
