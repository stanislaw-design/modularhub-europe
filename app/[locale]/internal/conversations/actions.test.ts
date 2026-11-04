import { eq, inArray, like } from "drizzle-orm";
import type { Session } from "next-auth";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/observability/errors", () => ({ captureError: vi.fn() }));
vi.mock("@/lib/observability", () => ({ captureError: vi.fn() }));
const authMock = vi.hoisted(() => vi.fn<() => Promise<Session | null>>());
vi.mock("@/auth", () => ({ auth: authMock }));

import { db } from "@/lib/db/client";
import { crmEntry, crmPartner, crmTask, crmThread, users } from "@/lib/db/schema";
import * as actions from "./actions";
import { GET as downloadAttachment } from "./attachments/[id]/route";

// Spec 0080 AC-1, AC-21: każda akcja serwerowa i route handler załącznika są dostępne tylko dla
// aktywnego administratora. Test na bazie deweloperskiej: podmieniona jest wyłącznie sesja, funkcje
// domenowe i baza są prawdziwe, więc "niczego nie zapisuje" sprawdzamy w tabelach.
const MARK = `crm-gate-${crypto.randomUUID().slice(0, 8)}`;

describe.skipIf(!process.env.DATABASE_URL)("bramka roli admin na akcjach notatnika rozmów (AC-1)", () => {
  const activeAdmin = crypto.randomUUID();
  const revokedAdmin = crypto.randomUUID();
  const clientUser = crypto.randomUUID();
  const producerUser = crypto.randomUUID();
  const allIds = [activeAdmin, revokedAdmin, clientUser, producerUser];

  const sessionFor = (id: string, role: "admin" | "client" | "producer"): Session =>
    ({ user: { id, role, email: `${id}@example.test` }, expires: new Date(Date.now() + 3600_000).toISOString() }) as Session;

  const denied = { ok: false, error: "Musisz być zalogowany jako administrator." };
  const actionNames = Object.keys(actions).filter((key) => typeof (actions as Record<string, unknown>)[key] === "function");

  async function rowsWithMark() {
    return db.select({ id: crmPartner.id }).from(crmPartner).where(like(crmPartner.name, `${MARK}%`));
  }

  beforeAll(async () => {
    await db.insert(users).values([
      { id: activeAdmin, email: `${MARK}-admin@example.test`, phone: "+48000000071", role: "admin", name: "Admin Aktywny" },
      // Rola w sesji wciąż "admin", ale konto jest już zablokowane (AC-1: rola cofnięta, sesja jeszcze nie wygasła).
      { id: revokedAdmin, email: `${MARK}-revoked@example.test`, phone: "+48000000072", role: "admin", name: "Admin Cofnięty", blockedAt: new Date() },
      { id: clientUser, email: `${MARK}-client@example.test`, phone: "+48000000073", role: "client" },
      { id: producerUser, email: `${MARK}-producer@example.test`, phone: "+48000000074", role: "producer" },
    ]);
  });

  beforeEach(() => authMock.mockReset());

  afterAll(async () => {
    const partners = await rowsWithMark();
    const ids = partners.map((row) => row.id);
    if (ids.length) {
      await db.delete(crmTask).where(inArray(crmTask.partnerId, ids));
      await db.delete(crmEntry).where(inArray(crmEntry.partnerId, ids));
      await db.delete(crmThread).where(inArray(crmThread.partnerId, ids));
      await db.delete(crmPartner).where(inArray(crmPartner.id, ids));
    }
    await db.delete(users).where(inArray(users.id, allIds));
  });

  it("test obejmuje wszystkie akcje z pliku actions.ts", () => {
    expect(actionNames.length).toBeGreaterThanOrEqual(26);
    expect(actionNames).toEqual(expect.arrayContaining(["createPartnerAction", "createQuickEntryAction", "confirmEntryAttachmentAction", "searchPlatformRecordsAction"]));
  });

  const callers: [string, () => Session | null][] = [
    ["brak sesji", () => null],
    ["konto klienta", () => sessionFor(clientUser, "client")],
    ["konto producenta", () => sessionFor(producerUser, "producer")],
    ["administrator z cofniętym dostępem", () => sessionFor(revokedAdmin, "admin")],
  ];

  for (const [label, session] of callers) {
    it(`${label}: każda akcja odmawia i niczego nie zapisuje`, async () => {
      authMock.mockResolvedValue(session());
      const fn = actions as unknown as Record<string, (...args: unknown[]) => Promise<unknown>>;
      for (const name of actionNames) {
        // Ten sam zestaw argumentów dla wszystkich: bramka musi zadziałać, zanim ktokolwiek je odczyta.
        expect(await fn[name](crypto.randomUUID(), crypto.randomUUID(), crypto.randomUUID()), name).toEqual(denied);
      }

      const created = await actions.createPartnerAction({ name: `${MARK} ${label}`, kind: "producent", tags: [] });
      expect(created).toEqual(denied);
      const quick = await actions.createQuickEntryAction({
        partner: { create: { name: `${MARK} szybki ${label}`, kind: "producent", tags: [] } },
        thread: null,
        entry: { direction: "outbound", channel: "phone", body: "Nie powinno się zapisać" },
        tasks: [],
      });
      expect(quick).toEqual(denied);
      expect(await rowsWithMark()).toHaveLength(0);
    });
  }

  it("aktywny administrator przechodzi bramkę i zapis powstaje (kontrola, że test coś rozróżnia)", async () => {
    authMock.mockResolvedValue(sessionFor(activeAdmin, "admin"));
    const created = await actions.createPartnerAction({ name: `${MARK} dozwolone`, kind: "producent", tags: [] });
    expect(created.ok).toBe(true);
    expect(await rowsWithMark()).toHaveLength(1);
    const [row] = await db.select({ createdBy: crmPartner.createdBy }).from(crmPartner).where(eq(crmPartner.name, `${MARK} dozwolone`));
    // Autor pochodzi z sesji, nie z formularza (AC-21).
    expect(row.createdBy).toBe(activeAdmin);
  });

  describe("pobranie załącznika (route handler)", () => {
    const call = () =>
      downloadAttachment(new Request("http://localhost/pl/internal/conversations/attachments/x"), {
        params: Promise.resolve({ locale: "pl", id: crypto.randomUUID() }),
      });

    it("brak sesji to 401, konto klienta, producenta i cofnięty administrator to 403", async () => {
      authMock.mockResolvedValue(null);
      expect((await call()).status).toBe(401);
      for (const [, session] of callers.slice(1)) {
        authMock.mockResolvedValue(session());
        const response = await call();
        expect(response.status).toBe(403);
        expect(response.headers.get("Cache-Control")).toBe("no-store");
        expect(response.headers.get("Location")).toBeNull();
      }
    });

    it("aktywny administrator dla nieistniejącego załącznika dostaje 404, nie przekierowanie", async () => {
      authMock.mockResolvedValue(sessionFor(activeAdmin, "admin"));
      const response = await call();
      expect(response.status).toBe(404);
      expect(response.headers.get("Location")).toBeNull();
    });
  });
});
