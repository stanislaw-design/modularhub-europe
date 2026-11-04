import { inArray, sql } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const captureErrorMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/observability/errors", () => ({ captureError: captureErrorMock }));
vi.mock("@/lib/observability", () => ({ captureError: captureErrorMock }));

import { db } from "@/lib/db/client";
import { crmPartner, crmTask, users } from "@/lib/db/schema";
import { groupDigestTasks, runConversationsDigest } from "./digest";
import { createPartner, createTask } from "./mutations";
import { addDaysToDate } from "./time";
import { getWarsawToday, type TodayTask } from "./queries";

function task(overrides: Partial<TodayTask>): TodayTask {
  return {
    id: crypto.randomUUID(),
    partnerId: "p",
    threadId: null,
    threadTitle: null,
    title: "Zadanie",
    note: null,
    dueDate: "2026-11-04",
    assigneeKind: "user",
    assigneeUserId: "u1",
    externalContactId: null,
    externalContactName: null,
    status: "open",
    createdBy: "u1",
    linkKind: null,
    linkId: null,
    partnerName: "Firma",
    threadOwnerUserId: null,
    ownerUserId: "u1",
    responsibleLabel: "Anna",
    responsibleActive: true,
    ...overrides,
  };
}

describe("groupDigestTasks (AC-19)", () => {
  const today = "2026-11-04";

  it("dzieli na zaległe i na dziś, grupuje według osoby i pomija przyszłe", () => {
    const { groups, noDueDateCount } = groupDigestTasks(
      [
        task({ title: "stare", dueDate: "2026-11-01" }),
        task({ title: "dziś", dueDate: today }),
        task({ title: "jutro", dueDate: "2026-11-05" }),
        task({ title: "bez terminu", dueDate: null }),
        task({ title: "cudze", ownerUserId: "u2", responsibleLabel: "Jan", assigneeKind: "external", assigneeUserId: null }),
      ],
      today,
    );
    expect(groups.map((group) => group.ownerLabel)).toEqual(["Anna", "Jan"]);
    expect(groups[0].overdue.map((line) => line.title)).toEqual(["stare"]);
    expect(groups[0].dueToday.map((line) => line.title)).toEqual(["dziś"]);
    expect(groups[1].dueToday[0].external).toBe(true);
    expect(noDueDateCount).toBe(1);
  });

  it("bez zadań zaległych i na dziś nie ma grup, więc mail nie wyjdzie", () => {
    const { groups, noDueDateCount } = groupDigestTasks([task({ dueDate: "2026-12-01" }), task({ dueDate: null })], today);
    expect(groups).toEqual([]);
    expect(noDueDateCount).toBe(1);
  });
});

// Testy na bazie deweloperskiej. Nadawca jest podmieniony, więc żaden mail nie wychodzi.
describe.skipIf(!process.env.DATABASE_URL)("runConversationsDigest (AC-19)", () => {
  const MARK = `crm-digest-${crypto.randomUUID().slice(0, 8)}`;
  const admin = crypto.randomUUID();
  const actor = { userId: admin };
  const originalKey = process.env.RESEND_API_KEY;

  async function clearToday() {
    await db.execute(sql`DELETE FROM "crm_digest_log" WHERE "digest_date" = (now() AT TIME ZONE 'Europe/Warsaw')::date`);
  }

  beforeAll(async () => {
    await db.insert(users).values({ id: admin, email: `${MARK}@example.test`, phone: "+48000000091", role: "admin", name: "Admin Digest" });
    const partner = await createPartner(actor, { name: `${MARK} firma`, kind: "producent", tags: [] });
    if (!partner.ok) throw new Error(partner.error);
    const yesterday = addDaysToDate(await getWarsawToday(), -1);
    const created = await createTask(actor, partner.id, {
      title: "Zaległe zadanie testowe",
      dueDate: yesterday,
      assignee: { kind: "user", userId: admin },
      link: null,
    });
    if (!created.ok) throw new Error(created.error);
  });

  beforeEach(async () => {
    captureErrorMock.mockClear();
    process.env.RESEND_API_KEY = "test-key";
    await clearToday();
  });

  afterAll(async () => {
    if (originalKey === undefined) delete process.env.RESEND_API_KEY;
    else process.env.RESEND_API_KEY = originalKey;
    await clearToday();
    const partners = await db.select({ id: crmPartner.id }).from(crmPartner).where(inArray(crmPartner.createdBy, [admin]));
    const ids = partners.map((row) => row.id);
    if (ids.length) {
      await db.delete(crmTask).where(inArray(crmTask.partnerId, ids));
      await db.delete(crmPartner).where(inArray(crmPartner.id, ids));
    }
    await db.delete(users).where(inArray(users.id, [admin]));
  });

  it("bez RESEND_API_KEY pomija wysyłkę i nie zajmuje dnia", async () => {
    delete process.env.RESEND_API_KEY;
    const send = vi.fn().mockResolvedValue(true);
    expect(await runConversationsDigest({ send })).toEqual({ status: "skipped", reason: "no_resend_key" });
    expect(send).not.toHaveBeenCalled();
    const rows = await db.execute(sql`SELECT 1 FROM "crm_digest_log" WHERE "digest_date" = (now() AT TIME ZONE 'Europe/Warsaw')::date`);
    expect(rows.rows).toHaveLength(0);
  });

  it("nieudana wysyłka zwalnia dzień, udana go zajmuje, a drugi przebieg nic nie wysyła", async () => {
    const failing = vi.fn().mockResolvedValue(false);
    const failed = await runConversationsDigest({ send: failing });
    expect(failed.status).toBe("failed");
    expect(captureErrorMock).toHaveBeenCalled();
    const afterFail = await db.execute(sql`SELECT 1 FROM "crm_digest_log" WHERE "digest_date" = (now() AT TIME ZONE 'Europe/Warsaw')::date`);
    expect(afterFail.rows).toHaveLength(0);

    const ok = vi.fn().mockResolvedValue(true);
    const sent = await runConversationsDigest({ send: ok });
    expect(sent.status).toBe("sent");
    expect(ok).toHaveBeenCalledTimes(1);
    const input = ok.mock.calls[0][0];
    expect(input.to).toContain(`${MARK}@example.test`);
    expect(JSON.stringify(input.groups)).toContain("Zaległe zadanie testowe");
    const logged = await db.execute<{ sent_at: string | null; recipient_count: number }>(
      sql`SELECT "sent_at", "recipient_count" FROM "crm_digest_log" WHERE "digest_date" = (now() AT TIME ZONE 'Europe/Warsaw')::date`,
    );
    expect(logged.rows[0].sent_at).not.toBeNull();
    expect(logged.rows[0].recipient_count).toBe(input.to.length);

    const again = vi.fn().mockResolvedValue(true);
    expect(await runConversationsDigest({ send: again })).toEqual({ status: "skipped", reason: "already_claimed" });
    expect(again).not.toHaveBeenCalled();
  });

  it("wyjątek z nadawcy też zwalnia dzień i idzie do captureError", async () => {
    const throwing = vi.fn().mockRejectedValue(new Error("boom"));
    expect((await runConversationsDigest({ send: throwing })).status).toBe("failed");
    expect(captureErrorMock).toHaveBeenCalled();
    const rows = await db.execute(sql`SELECT 1 FROM "crm_digest_log" WHERE "digest_date" = (now() AT TIME ZONE 'Europe/Warsaw')::date`);
    expect(rows.rows).toHaveLength(0);
  });
});
