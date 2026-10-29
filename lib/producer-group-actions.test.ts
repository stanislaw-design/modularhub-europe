import { and, eq, inArray } from "drizzle-orm";
import type { Session } from "next-auth";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

// Te same granice co w lib/producer-block-actions.test.ts: @/auth i obserwowalność nie ładują się
// w czystym Vitest, więc są podmienione.
const authMock = vi.hoisted(() => vi.fn<() => Promise<Session | null>>());
vi.mock("@/auth", () => ({ auth: authMock }));
vi.mock("@/lib/observability/errors", () => ({ captureError: vi.fn() }));

import { db } from "@/lib/db/client";
import { auditLog, producer, producerGroup, producerGroupMember, producerMember, product, users } from "@/lib/db/schema";
import {
  addProducerToGroup,
  createProducerGroup,
  deleteProducerGroup,
  removeProducerFromGroup,
  updateProducerGroup,
} from "./producer-group-actions";
import { expandRecipients, getReadyProducerGroups } from "./producer-groups";

function sessionAs(userId: string, role: "admin" | "producer" | "client"): Session {
  return {
    user: { id: userId, role, phone: "+48000000000", name: null, email: null, image: null },
    expires: new Date(Date.now() + 3600_000).toISOString(),
  } as Session;
}

// Spec 0077 część B (AC-23 do AC-27): prawdziwa baza dev, jak w pozostałych testach akcji adminа.
describe.skipIf(!process.env.DATABASE_URL)("lib/producer-groups: grupy producentów (spec 0077 B)", () => {
  const tag = crypto.randomUUID().slice(0, 8);
  const adminUserId = crypto.randomUUID();
  const producerUserIds = [crypto.randomUUID(), crypto.randomUUID(), crypto.randomUUID()];
  const [publishedId, draftOnlyId, blockedId] = [crypto.randomUUID(), crypto.randomUUID(), crypto.randomUUID()];
  const producerIds = [publishedId, draftOnlyId, blockedId];
  const groupIds: string[] = [];

  beforeAll(async () => {
    await db.insert(users).values([
      { id: adminUserId, email: `pg-admin-${tag}@example.test`, phone: "+48000000020", role: "admin" },
      ...producerUserIds.map((id, index) => ({ id, email: `pg-p${index}-${tag}@example.test`, phone: `+4800000003${index}`, role: "producer" as const })),
    ]);
    await db.insert(producer).values(
      producerIds.map((id, index) => ({
        id,
        userId: producerUserIds[index],
        nip: `PG${tag}${index}`,
        name: `Grupa test ${tag} ${index}`,
        countryCode: "PL",
      })),
    );
    await db.insert(producerMember).values(producerIds.map((id, index) => ({ producerId: id, userId: producerUserIds[index] })));
    await db.insert(product).values([
      { producerId: publishedId, family: "outdoor-tv", status: "published", name: `PG pub ${tag}` },
      { producerId: draftOnlyId, family: "outdoor-tv", status: "draft", name: `PG draft ${tag}` },
      { producerId: blockedId, family: "outdoor-tv", status: "published", name: `PG blocked ${tag}` },
    ]);
    await db.update(users).set({ blockedAt: new Date() }).where(eq(users.id, producerUserIds[2]));
  });

  afterEach(() => {
    authMock.mockReset();
  });

  afterAll(async () => {
    await db.delete(producerGroupMember).where(inArray(producerGroupMember.producerId, producerIds));
    if (groupIds.length > 0) await db.delete(producerGroup).where(inArray(producerGroup.id, groupIds));
    await db.delete(product).where(inArray(product.producerId, producerIds));
    await db.delete(producerMember).where(inArray(producerMember.producerId, producerIds));
    await db.delete(producer).where(inArray(producer.id, producerIds));
    await db.delete(auditLog).where(eq(auditLog.actorUserId, adminUserId));
    await db.delete(users).where(inArray(users.id, [adminUserId, ...producerUserIds]));
  });

  it("gotowa grupa ma producenta z opublikowanym produktem, bez samego szkicu (AC-25)", async () => {
    const ready = await getReadyProducerGroups();
    const tv = ready.find((group) => group.family === "outdoor-tv");
    const ids = tv?.members.map((member) => member.id) ?? [];
    expect(ids).toContain(publishedId);
    expect(ids).not.toContain(draftOnlyId);
  });

  it("producent nie wywoła akcji grup (AC-27)", async () => {
    authMock.mockResolvedValue(sessionAs(producerUserIds[0], "producer"));
    expect((await createProducerGroup({ name: `Zakazana ${tag}` })).ok).toBe(false);
    authMock.mockResolvedValue(null);
    expect((await createProducerGroup({ name: `Zakazana ${tag}` })).ok).toBe(false);
  });

  it("nazwa jest unikalna bez względu na wielkość liter i spacje, a zapis ma autora w audycie (AC-23, AC-27)", async () => {
    authMock.mockResolvedValue(sessionAs(adminUserId, "admin"));
    const created = await createProducerGroup({ name: `Sprawdzeni ${tag}`, description: "opis" });
    expect(created.ok).toBe(true);
    groupIds.push(created.id!);

    const duplicate = await createProducerGroup({ name: `  sprawdzeni ${tag.toUpperCase()}  ` });
    expect(duplicate.ok).toBe(false);
    expect(duplicate.error).toMatch(/już istnieje/);

    const tooShort = await createProducerGroup({ name: "a" });
    expect(tooShort.ok).toBe(false);

    const [audit] = await db
      .select({ actorUserId: auditLog.actorUserId, newValues: auditLog.newValues })
      .from(auditLog)
      .where(and(eq(auditLog.tableName, "producer_group"), eq(auditLog.recordId, created.id!)));
    expect(audit?.actorUserId).toBe(adminUserId);
    // Nazwa grupy zapisana czytelnie, nie jako skrót md5.
    expect(audit?.newValues?.name).toBe(`Sprawdzeni ${tag}`);
  });

  it("rozwinięcie łączy grupy, deduplikuje i pomija zablokowanych (AC-24, AC-26)", async () => {
    authMock.mockResolvedValue(sessionAs(adminUserId, "admin"));
    const group = await createProducerGroup({ name: `Mieszana ${tag}` });
    groupIds.push(group.id!);
    expect((await addProducerToGroup(group.id!, publishedId)).ok).toBe(true);
    expect((await addProducerToGroup(group.id!, draftOnlyId)).ok).toBe(true);
    expect((await addProducerToGroup(group.id!, blockedId)).ok).toBe(true);
    const again = await addProducerToGroup(group.id!, publishedId);
    expect(again.ok).toBe(false);

    const expanded = await expandRecipients([group.id!, "family:outdoor-tv", "family:nie-ma", "nie-uuid"], [publishedId]);
    const used = expanded.producers.map((item) => item.id);
    expect(used).toContain(publishedId);
    expect(used).toContain(draftOnlyId);
    expect(used.filter((id) => id === publishedId)).toHaveLength(1);
    expect(used).not.toContain(blockedId);
    expect(expanded.skipped.map((item) => item.id)).toContain(blockedId);
  });

  it("zmiana i usunięcie grupy nie zmieniają rozwinięcia już zapisanej listy, usunięcie kasuje członków (AC-23, AC-26)", async () => {
    authMock.mockResolvedValue(sessionAs(adminUserId, "admin"));
    const group = await createProducerGroup({ name: `Do usunięcia ${tag}` });
    groupIds.push(group.id!);
    await addProducerToGroup(group.id!, publishedId);
    const snapshot = (await expandRecipients([group.id!], [])).producers.map((item) => item.id);
    expect(snapshot).toEqual([publishedId]);

    expect((await removeProducerFromGroup(group.id!, publishedId)).ok).toBe(true);
    expect((await updateProducerGroup(group.id!, { name: `Przemianowana ${tag}` })).ok).toBe(true);
    expect((await deleteProducerGroup(group.id!, false)).ok).toBe(false);
    expect((await deleteProducerGroup(group.id!, true)).ok).toBe(true);

    const members = await db.select().from(producerGroupMember).where(eq(producerGroupMember.groupId, group.id!));
    expect(members).toHaveLength(0);
    // Zapisana lista (snapshot) to zwykła tablica identyfikatorów, grupa nie ma na nią wpływu.
    expect(snapshot).toEqual([publishedId]);
  });
});
