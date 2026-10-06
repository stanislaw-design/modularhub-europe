import type { Session } from "next-auth";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

// Same boundary mocks as the other DB-backed action tests: auth and
// observability are I/O edges, the database is real (dev project only).
const authMock = vi.hoisted(() => vi.fn<() => Promise<Session | null>>());
const captureErrorMock = vi.hoisted(() => vi.fn());
const FakeAuthError = vi.hoisted(() => class FakeAuthError extends Error {});
vi.mock("@/auth", () => ({ auth: authMock, signIn: vi.fn() }));
vi.mock("next-auth", () => ({ AuthError: FakeAuthError }));
vi.mock("@/lib/observability/errors", () => ({ captureError: captureErrorMock }));
vi.mock("@/lib/observability", () => ({ trackEvent: vi.fn(), captureError: captureErrorMock }));

import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { auditLog, producer, producerCertification, product, productComplianceAssessment, users } from "@/lib/db/schema";
import {
  createProductComplianceAssessment,
  deleteProductComplianceAssessment,
  setProducerCertificationConfirmation,
  setProductComplianceAssessmentConfirmation,
  updateProductComplianceAssessment,
} from "./producer-certification-admin-actions";

function sessionAs(userId: string, role: "admin" | "producer" | "client"): Session {
  return {
    user: { id: userId, role, phone: "+48000000000", name: null, email: null, image: null },
    expires: new Date(Date.now() + 3600_000).toISOString(),
  } as Session;
}

describe.skipIf(!process.env.DATABASE_URL)("lib/producer-certification-admin-actions: real DB, mocked auth", () => {
  const adminUserId = crypto.randomUUID();
  const producerUserId = crypto.randomUUID();
  const producerId = crypto.randomUUID();
  const productId = crypto.randomUUID();
  const certId = crypto.randomUUID();
  const allUserIds = [adminUserId, producerUserId];

  beforeAll(async () => {
    await db.insert(users).values([
      { id: adminUserId, email: `pcaa-admin-${adminUserId}@example.test`, phone: "+48000000041", role: "admin" },
      { id: producerUserId, email: `pcaa-producer-${producerUserId}@example.test`, phone: "+48000000042", role: "producer" },
    ]);
    await db.insert(producer).values({
      id: producerId,
      userId: producerUserId,
      nip: `PCAA${producerId.slice(0, 7)}`,
      name: "Admin Cert Producer",
      countryCode: "PL",
      technology: "szkielet-drewniany",
    });
    await db.insert(product).values({ id: productId, producerId, family: "dom", status: "published", name: "Admin Cert Product" });
    await db.insert(producerCertification).values({ id: certId, producerId, name: "ISO 9001", issuer: "TÜV" });
  });

  afterAll(async () => {
    // Cascade removes certifications and assessments with their producer and product.
    await db.delete(product).where(eq(product.id, productId));
    await db.delete(producer).where(eq(producer.id, producerId));
    await db.delete(auditLog).where(inArray(auditLog.actorUserId, allUserIds));
    await db.delete(users).where(inArray(users.id, allUserIds));
  });

  async function certRow() {
    const [row] = await db.select().from(producerCertification).where(eq(producerCertification.id, certId));
    return row;
  }

  describe("setProducerCertificationConfirmation", () => {
    it("refuses a producer calling the admin action directly, and changes nothing (spec 0065 AC-11)", async () => {
      authMock.mockResolvedValue(sessionAs(producerUserId, "producer"));
      const before = await certRow();

      const result = await setProducerCertificationConfirmation(certId, "platform_confirmed", before.version);

      expect(result.ok).toBe(false);
      expect(await certRow()).toEqual(before);
    });

    it("confirms with the admin as confirmer, bumps version, and writes an audit row with the actor (spec 0065 AC-10)", async () => {
      authMock.mockResolvedValue(sessionAs(adminUserId, "admin"));
      const before = await certRow();

      const result = await setProducerCertificationConfirmation(certId, "platform_confirmed", before.version);

      expect(result.ok).toBe(true);
      const after = await certRow();
      expect(after.confirmationStatus).toBe("platform_confirmed");
      expect(after.confirmedBy).toBe(adminUserId);
      expect(after.confirmedAt).not.toBeNull();
      expect(after.version).toBe(before.version + 1);

      const [audit] = await db
        .select()
        .from(auditLog)
        .where(and(eq(auditLog.tableName, "producer_certification"), eq(auditLog.recordId, certId), eq(auditLog.action, "update")))
        .orderBy(auditLog.createdAt);
      expect(audit?.actorUserId).toBe(adminUserId);
    });

    it("returns stale and changes nothing when the admin saw an older version (spec 0065 AC-11)", async () => {
      authMock.mockResolvedValue(sessionAs(adminUserId, "admin"));
      const before = await certRow();

      const result = await setProducerCertificationConfirmation(certId, "self_reported", before.version - 1);

      expect(result.ok).toBe(false);
      expect(result.error).toContain("zmieniony od ostatniego odczytu");
      expect(await certRow()).toEqual(before);
    });

    it("withdraws the confirmation back to self-reported with both fields cleared", async () => {
      authMock.mockResolvedValue(sessionAs(adminUserId, "admin"));
      const before = await certRow();

      const result = await setProducerCertificationConfirmation(certId, "self_reported", before.version);

      expect(result.ok).toBe(true);
      const after = await certRow();
      expect(after.confirmationStatus).toBe("self_reported");
      expect(after.confirmedAt).toBeNull();
      expect(after.confirmedBy).toBeNull();
    });
  });

  describe("product compliance assessments", () => {
    let assessmentId: string;

    it("refuses a producer creating an assessment", async () => {
      authMock.mockResolvedValue(sessionAs(producerUserId, "producer"));
      const result = await createProductComplianceAssessment(productId, { countryCode: "NL", rule: "bbl", status: "approved", reason: "Zgodny" });
      expect(result.ok).toBe(false);
    });

    it("creates a self-reported assessment, and refuses a second one for the same country and rule", async () => {
      authMock.mockResolvedValue(sessionAs(adminUserId, "admin"));
      const created = await createProductComplianceAssessment(productId, { countryCode: "NL", rule: "bbl", status: "conditional", reason: "Wymaga wentylacji" });

      expect(created.ok).toBe(true);
      assessmentId = created.id!;
      const [row] = await db.select().from(productComplianceAssessment).where(eq(productComplianceAssessment.id, assessmentId));
      expect(row.confirmationStatus).toBe("self_reported");
      expect(row.version).toBe(1);

      const duplicate = await createProductComplianceAssessment(productId, { countryCode: "NL", rule: "bbl", status: "approved", reason: "Inna" });
      expect(duplicate).toEqual({ ok: false, error: "Ocena dla tego kraju i przepisu już istnieje." });
    });

    it("confirms an assessment, then a change to its status drops the confirmation in the same update", async () => {
      authMock.mockResolvedValue(sessionAs(adminUserId, "admin"));
      const confirmed = await setProductComplianceAssessmentConfirmation(assessmentId, "platform_confirmed", 1);
      expect(confirmed.ok).toBe(true);

      const changed = await updateProductComplianceAssessment(assessmentId, { status: "approved", reason: "Wymaga wentylacji" }, 2);

      expect(changed.ok).toBe(true);
      const [row] = await db.select().from(productComplianceAssessment).where(eq(productComplianceAssessment.id, assessmentId));
      expect(row.status).toBe("approved");
      expect(row.confirmationStatus).toBe("self_reported");
      expect(row.confirmedBy).toBeNull();
      expect(row.version).toBe(3);
    });

    it("keeps confirmation when an edit saves identical content", async () => {
      authMock.mockResolvedValue(sessionAs(adminUserId, "admin"));
      await setProductComplianceAssessmentConfirmation(assessmentId, "platform_confirmed", 3);

      const same = await updateProductComplianceAssessment(assessmentId, { status: "approved", reason: "Wymaga wentylacji" }, 4);

      expect(same.ok).toBe(true);
      const [row] = await db.select().from(productComplianceAssessment).where(eq(productComplianceAssessment.id, assessmentId));
      expect(row.confirmationStatus).toBe("platform_confirmed");
    });

    it("returns stale on an edit with an outdated version", async () => {
      authMock.mockResolvedValue(sessionAs(adminUserId, "admin"));
      const result = await updateProductComplianceAssessment(assessmentId, { status: "blocked", reason: "Nowy" }, 1);
      expect(result.ok).toBe(false);
      expect(result.error).toContain("zmieniony od ostatniego odczytu");
    });

    it("deletes with the current version and refuses a stale delete", async () => {
      authMock.mockResolvedValue(sessionAs(adminUserId, "admin"));

      const stale = await deleteProductComplianceAssessment(assessmentId, 1);
      expect(stale.ok).toBe(false);

      const deleted = await deleteProductComplianceAssessment(assessmentId, 5);
      expect(deleted.ok).toBe(true);
      const rows = await db.select().from(productComplianceAssessment).where(eq(productComplianceAssessment.id, assessmentId));
      expect(rows).toHaveLength(0);
    });
  });
});
