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

import { eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { auditLog, producer, producerMember, product, productEnvelopeParameter, users } from "@/lib/db/schema";
import {
  adminSetProductFoundationStatus,
  adminUpsertProductEnvelopeParameter,
  setProductEnvelopeParameterConfirmation,
} from "./product-envelope-admin-actions";
import {
  deleteProductEnvelopeParameter,
  setProductFoundationStatus,
  upsertProductEnvelopeParameter,
} from "./product-envelope-actions";

function sessionAs(userId: string, role: "admin" | "producer" | "client"): Session {
  return {
    user: { id: userId, role, phone: "+48000000000", name: null, email: null, image: null },
    expires: new Date(Date.now() + 3600_000).toISOString(),
  } as Session;
}

const wall = {
  element: "wall",
  quantity: "u_value",
  value: "0,22",
  method: "calculation",
  asOfDate: "2026-10-01",
} as const;

describe.skipIf(!process.env.DATABASE_URL)("lib/product-envelope-actions: real DB, mocked auth (spec 0075)", () => {
  const adminUserId = crypto.randomUUID();
  const ownerUserId = crypto.randomUUID();
  const otherUserId = crypto.randomUUID();
  const ownerProducerId = crypto.randomUUID();
  const otherProducerId = crypto.randomUUID();
  const houseId = crypto.randomUUID();
  const spaId = crypto.randomUUID();
  const dining = crypto.randomUUID();
  const userIds = [adminUserId, ownerUserId, otherUserId];

  beforeAll(async () => {
    await db.insert(users).values([
      { id: adminUserId, email: `env-admin-${adminUserId}@example.test`, phone: "+48000000051", role: "admin" },
      { id: ownerUserId, email: `env-owner-${ownerUserId}@example.test`, phone: "+48000000052", role: "producer" },
      { id: otherUserId, email: `env-other-${otherUserId}@example.test`, phone: "+48000000053", role: "producer" },
    ]);
    await db.insert(producer).values([
      {
        id: ownerProducerId,
        userId: ownerUserId,
        nip: `ENVO${ownerProducerId.slice(0, 7)}`,
        name: "Envelope Owner",
        countryCode: "PL",
        technology: "szkielet-drewniany",
      },
      {
        id: otherProducerId,
        userId: otherUserId,
        nip: `ENVX${otherProducerId.slice(0, 7)}`,
        name: "Envelope Other",
        countryCode: "PL",
        technology: "szkielet-drewniany",
      },
    ]);
    await db.insert(producerMember).values([
      { producerId: ownerProducerId, userId: ownerUserId },
      { producerId: otherProducerId, userId: otherUserId },
    ]);
    await db.insert(product).values([
      { id: houseId, producerId: ownerProducerId, family: "dom", status: "published", name: "Envelope House" },
      { id: spaId, producerId: ownerProducerId, family: "spa-modulowe", status: "published", name: "Envelope Spa" },
      {
        id: dining,
        producerId: ownerProducerId,
        family: "kontenery-modulowe",
        containerSubcategory: "gastronomiczne",
        status: "published",
        name: "Envelope Diner",
      },
    ]);
  });

  afterAll(async () => {
    await db.delete(product).where(inArray(product.id, [houseId, spaId, dining]));
    await db.delete(producer).where(inArray(producer.id, [ownerProducerId, otherProducerId]));
    await db.delete(auditLog).where(inArray(auditLog.actorUserId, userIds));
    await db.delete(users).where(inArray(users.id, userIds));
  });

  async function rows() {
    return db.select().from(productEnvelopeParameter).where(eq(productEnvelopeParameter.productId, houseId));
  }

  it("a producer adds a row that starts as self_reported (AC-9, AC-18)", async () => {
    authMock.mockResolvedValue(sessionAs(ownerUserId, "producer"));
    // Extra confirmation fields passed straight to the action are ignored (AC-18).
    const result = await upsertProductEnvelopeParameter({
      productId: houseId,
      ...wall,
      ...({ confirmationStatus: "platform_confirmed", version: 99 } as object),
    });

    expect(result.ok).toBe(true);
    const [row] = await rows();
    expect(row.confirmationStatus).toBe("self_reported");
    expect(row.confirmedBy).toBeNull();
    expect(row.version).toBe(1);
    expect(Number(row.value)).toBe(0.22);
  });

  it("returns duplicate for the same element and quantity (AC-9)", async () => {
    authMock.mockResolvedValue(sessionAs(ownerUserId, "producer"));
    const result = await upsertProductEnvelopeParameter({ productId: houseId, ...wall, value: "0,3" });
    expect(result.ok).toBe(false);
    expect(result.error).toContain("już istnieje");
  });

  it("refuses Rc for a door at the action and U above 6 at the database (AC-2)", async () => {
    authMock.mockResolvedValue(sessionAs(ownerUserId, "producer"));
    const action = await upsertProductEnvelopeParameter({
      productId: houseId,
      ...wall,
      element: "door",
      quantity: "rc_value",
      value: "2",
    });
    expect(action.ok).toBe(false);

    await expect(
      db.insert(productEnvelopeParameter).values({
        productId: houseId,
        element: "door",
        quantity: "rc_value",
        value: "2",
        method: "calculation",
        asOfDate: "2026-10-01",
      }),
    ).rejects.toThrow();
    await expect(
      db.insert(productEnvelopeParameter).values({
        productId: houseId,
        element: "door",
        quantity: "u_value",
        value: "9",
        method: "calculation",
        asOfDate: "2026-10-01",
      }),
    ).rejects.toThrow();
  });

  it("rejects a product from another family and from another producer (AC-4, AC-18)", async () => {
    authMock.mockResolvedValue(sessionAs(ownerUserId, "producer"));
    const spa = await upsertProductEnvelopeParameter({ productId: spaId, ...wall });
    expect(spa.ok).toBe(false);
    expect(spa.error).toContain("domu albo kontenera mieszkalnego");
    const diner = await upsertProductEnvelopeParameter({ productId: dining, ...wall });
    expect(diner.ok).toBe(false);

    authMock.mockResolvedValue(sessionAs(otherUserId, "producer"));
    const foreign = await upsertProductEnvelopeParameter({ productId: houseId, ...wall, element: "roof" });
    expect(foreign.ok).toBe(false);
    expect((await rows()).filter((row) => row.element === "roof")).toHaveLength(0);
  });

  it("refuses a producer calling an admin action and a client calling a producer action (AC-18)", async () => {
    const [row] = await rows();
    authMock.mockResolvedValue(sessionAs(ownerUserId, "producer"));
    const confirm = await setProductEnvelopeParameterConfirmation(row.id, "platform_confirmed", row.version);
    expect(confirm.ok).toBe(false);
    const adminUpsert = await adminUpsertProductEnvelopeParameter({ productId: houseId, ...wall, element: "roof" });
    expect(adminUpsert.ok).toBe(false);

    authMock.mockResolvedValue(sessionAs(adminUserId, "client"));
    expect((await upsertProductEnvelopeParameter({ productId: houseId, ...wall, element: "roof" })).ok).toBe(false);
    expect((await rows())[0].confirmationStatus).toBe("self_reported");
  });

  it("an admin confirms, a stale second confirmation is refused, an audit row names the admin (AC-3, AC-10)", async () => {
    authMock.mockResolvedValue(sessionAs(adminUserId, "admin"));
    const [before] = await rows();

    const first = await setProductEnvelopeParameterConfirmation(before.id, "platform_confirmed", before.version);
    expect(first.ok).toBe(true);
    const [after] = await rows();
    expect(after.confirmationStatus).toBe("platform_confirmed");
    expect(after.confirmedBy).toBe(adminUserId);
    expect(after.version).toBe(before.version + 1);

    const second = await setProductEnvelopeParameterConfirmation(before.id, "self_reported", before.version);
    expect(second.ok).toBe(false);
    expect(second.error).toContain("zmieniony od ostatniego odczytu");

    const audit = await db.select().from(auditLog).where(eq(auditLog.recordId, before.id));
    expect(audit.some((entry) => entry.actorUserId === adminUserId && entry.action === "update")).toBe(true);
  });

  it("a producer change of a confirmed value resets the confirmation in the same update (AC-9)", async () => {
    authMock.mockResolvedValue(sessionAs(ownerUserId, "producer"));
    const [before] = await rows();
    expect(before.confirmationStatus).toBe("platform_confirmed");

    const result = await upsertProductEnvelopeParameter({
      productId: houseId,
      ...wall,
      value: "0,2",
      id: before.id,
      expectedVersion: before.version,
    });

    expect(result.ok).toBe(true);
    const [after] = await rows();
    expect(after.confirmationStatus).toBe("self_reported");
    expect(after.confirmedAt).toBeNull();
    expect(after.confirmedBy).toBeNull();
    expect(Number(after.value)).toBe(0.2);
    expect(after.version).toBe(before.version + 1);
  });

  it("a note only change keeps a confirmation, and a stale version is refused (AC-9)", async () => {
    authMock.mockResolvedValue(sessionAs(adminUserId, "admin"));
    const [row] = await rows();
    await setProductEnvelopeParameterConfirmation(row.id, "platform_confirmed", row.version);
    const [confirmed] = await rows();

    authMock.mockResolvedValue(sessionAs(ownerUserId, "producer"));
    const stale = await upsertProductEnvelopeParameter({
      productId: houseId,
      ...wall,
      value: "0,2",
      id: confirmed.id,
      expectedVersion: confirmed.version - 1,
    });
    expect(stale.ok).toBe(false);
    expect(stale.error).toContain("zmieniony od ostatniego odczytu");

    const noteOnly = await upsertProductEnvelopeParameter({
      productId: houseId,
      ...wall,
      value: "0,2",
      methodNote: "EN ISO 6946",
      id: confirmed.id,
      expectedVersion: confirmed.version,
    });
    expect(noteOnly.ok).toBe(true);
    const [after] = await rows();
    expect(after.confirmationStatus).toBe("platform_confirmed");
    expect(after.methodNote).toBe("EN ISO 6946");
  });

  it("changing a row to an existing pair returns duplicate, not a raw database error (AC-9)", async () => {
    authMock.mockResolvedValue(sessionAs(ownerUserId, "producer"));
    const roof = await upsertProductEnvelopeParameter({ productId: houseId, ...wall, element: "roof" });
    expect(roof.ok).toBe(true);
    const [wallRow] = (await rows()).filter((row) => row.element === "wall");

    const result = await upsertProductEnvelopeParameter({
      productId: houseId,
      ...wall,
      element: "roof",
      id: wallRow.id,
      expectedVersion: wallRow.version,
    });

    expect(result.ok).toBe(false);
    expect(result.error).toContain("już istnieje");
  });

  it("a producer deletes an own confirmed row but not a foreign one (AC-9)", async () => {
    const [target] = (await rows()).filter((row) => row.element === "wall");

    authMock.mockResolvedValue(sessionAs(otherUserId, "producer"));
    expect((await deleteProductEnvelopeParameter(target.id, target.version)).ok).toBe(false);
    expect((await rows()).some((row) => row.id === target.id)).toBe(true);

    authMock.mockResolvedValue(sessionAs(ownerUserId, "producer"));
    expect((await deleteProductEnvelopeParameter(target.id, target.version)).ok).toBe(true);
    expect((await rows()).some((row) => row.id === target.id)).toBe(false);
  });

  it("sets the foundation status for a house, refuses a spa and a diner (AC-4, AC-5)", async () => {
    authMock.mockResolvedValue(sessionAs(ownerUserId, "producer"));
    expect((await setProductFoundationStatus(houseId, "temporary")).ok).toBe(true);
    const [house] = await db.select({ status: product.foundationStatus }).from(product).where(eq(product.id, houseId));
    expect(house.status).toBe("temporary");

    expect((await setProductFoundationStatus(spaId, "permanent")).ok).toBe(false);
    expect((await setProductFoundationStatus(dining, "permanent")).ok).toBe(false);
    await expect(db.update(product).set({ foundationStatus: "permanent" }).where(eq(product.id, dining))).rejects.toThrow();

    authMock.mockResolvedValue(sessionAs(otherUserId, "producer"));
    expect((await setProductFoundationStatus(houseId, "permanent")).ok).toBe(false);

    authMock.mockResolvedValue(sessionAs(adminUserId, "admin"));
    expect((await adminSetProductFoundationStatus(houseId, null)).ok).toBe(true);
    const [cleared] = await db.select({ status: product.foundationStatus }).from(product).where(eq(product.id, houseId));
    expect(cleared.status).toBeNull();
  });

  it("clearing the container subcategory in the same update keeps the CHECK satisfied (AC-5)", async () => {
    const residential = crypto.randomUUID();
    await db.insert(product).values({
      id: residential,
      producerId: ownerProducerId,
      family: "kontenery-modulowe",
      containerSubcategory: "mieszkalne",
      foundationStatus: "permanent",
      status: "draft",
      name: "Envelope Residential",
    });
    try {
      await expect(
        db.update(product).set({ containerSubcategory: "gastronomiczne" }).where(eq(product.id, residential)),
      ).rejects.toThrow();
      await db
        .update(product)
        .set({ containerSubcategory: "gastronomiczne", foundationStatus: null })
        .where(eq(product.id, residential));
      const [row] = await db
        .select({ sub: product.containerSubcategory, status: product.foundationStatus })
        .from(product)
        .where(eq(product.id, residential));
      expect(row).toEqual({ sub: "gastronomiczne", status: null });
    } finally {
      await db.delete(product).where(eq(product.id, residential));
    }
  });
});
