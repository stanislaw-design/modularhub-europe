import { and, eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/observability/errors", () => ({ captureError: vi.fn() }));
vi.mock("@/lib/observability", () => ({ captureError: vi.fn() }));

import { db } from "@/lib/db/client";
import { crmContact, crmEntry, crmPartner, crmTask, crmThread, users } from "@/lib/db/schema";
import {
  archivePartner,
  closeThread,
  createContact,
  createEntry,
  createPartner,
  createQuickEntry,
  createTask,
  createThread,
  deleteEntry,
  reopenThread,
  restorePartner,
  setTaskStatus,
  updateEntry,
} from "./mutations";
import { getPartnerCard, getTodayView, getThreadCard } from "./queries";

// Testy na bazie deweloperskiej (vitest.setup.ts pilnuje, że to nie produkcja). Każdy test
// sprząta po sobie przez znacznik w nazwie firmy.
const MARK = `crm-test-${crypto.randomUUID().slice(0, 8)}`;

describe.skipIf(!process.env.DATABASE_URL)("notatnik rozmów: funkcje domenowe (spec 0080)", () => {
  const adminA = crypto.randomUUID();
  const adminB = crypto.randomUUID();
  const actor = { userId: adminA };
  const partnerIds: string[] = [];

  async function newPartner(suffix: string) {
    const result = await createPartner(actor, { name: `${MARK} ${suffix}`, kind: "producent", tags: [] });
    if (!result.ok) throw new Error(result.error);
    partnerIds.push(result.id);
    return result.id;
  }

  beforeAll(async () => {
    await db.insert(users).values([
      { id: adminA, email: `${MARK}-a@example.test`, phone: "+48000000081", role: "admin", name: "Admin A" },
      { id: adminB, email: `${MARK}-b@example.test`, phone: "+48000000082", role: "admin", name: "Admin B" },
    ]);
  });

  afterAll(async () => {
    const all = await db.select({ id: crmPartner.id }).from(crmPartner).where(inArray(crmPartner.createdBy, [adminA, adminB]));
    const ids = all.map((row) => row.id);
    if (ids.length) {
      await db.delete(crmTask).where(inArray(crmTask.partnerId, ids));
      await db.delete(crmEntry).where(inArray(crmEntry.partnerId, ids));
      await db.delete(crmThread).where(inArray(crmThread.partnerId, ids));
      await db.delete(crmContact).where(inArray(crmContact.partnerId, ids));
      await db.delete(crmPartner).where(inArray(crmPartner.id, ids));
    }
    await db.delete(users).where(inArray(users.id, [adminA, adminB]));
  });

  it("szablon rfq tworzy trzy zadania, a status sprawy przechodzi przez wszystkie stany (AC-9, AC-11)", async () => {
    const partnerId = await newPartner("rfq");
    const created = await createThread(actor, partnerId, { title: "Wycena łóżek", ownerUserId: adminA, templateKey: "rfq", link: null });
    expect(created.ok && created.createdTasks).toBe(3);
    if (!created.ok) return;

    let card = await getThreadCard(created.id);
    expect(card?.thread.status).toBe("waiting_us");
    const byTitle = Object.fromEntries(card!.tasks.map((task) => [task.title, task]));

    await setTaskStatus(actor, byTitle["Wysłać zapytanie"].id, "done");
    await setTaskStatus(actor, byTitle["Sprawdzić odpowiedź i wrócić z pytaniami"].id, "done");
    card = await getThreadCard(created.id);
    expect(card?.thread.status).toBe("waiting_them");

    await setTaskStatus(actor, byTitle["Odpowiedź z wyceną"].id, "done");
    card = await getThreadCard(created.id);
    expect(card?.thread.status).toBe("open");
  });

  it("właściciel sprawy musi być aktywnym administratorem", async () => {
    const partnerId = await newPartner("owner");
    const result = await createThread(actor, partnerId, { title: "X", ownerUserId: "nie-ma-takiego", templateKey: null, link: null });
    expect(result.ok).toBe(false);
  });

  it("zamknięcie sprawy wymaga decyzji, potem atomowo zamyka i rozstrzyga (AC-12)", async () => {
    const partnerId = await newPartner("close");
    const thread = await createThread(actor, partnerId, { title: "Umowa", ownerUserId: adminA, templateKey: "terms", link: null });
    if (!thread.ok) throw new Error(thread.error);
    const tasks = (await getThreadCard(thread.id))!.tasks;

    const rejected = await closeThread(actor, thread.id, { [tasks[0].id]: "done" });
    expect(rejected.ok).toBe(false);
    expect((await getThreadCard(thread.id))!.thread.closedAt).toBeNull();
    expect((await getThreadCard(thread.id))!.tasks.every((task) => task.status === "open")).toBe(true);

    const decisions = Object.fromEntries(tasks.map((task, index) => [task.id, index === 0 ? "done" : "cancelled"] as const));
    expect((await closeThread(actor, thread.id, decisions)).ok).toBe(true);
    const closed = await getThreadCard(thread.id);
    expect(closed!.thread.status).toBe("closed");
    expect(closed!.tasks.filter((task) => task.status === "open")).toHaveLength(0);
    expect(closed!.tasks.filter((task) => task.status === "cancelled")).toHaveLength(2);

    // AC-22: w zamkniętej sprawie nie powstanie zadanie ani nie otworzy się stare.
    const blockedCreate = await createTask(actor, partnerId, {
      title: "Nowe",
      note: null,
      dueDate: null,
      assignee: { kind: "user", userId: adminA },
      threadId: thread.id,
      link: null,
    });
    expect(blockedCreate.ok).toBe(false);
    expect((await setTaskStatus(actor, tasks[1].id, "open")).ok).toBe(false);

    // Ponowne otwarcie nie przywraca anulowanych zadań.
    expect((await reopenThread(actor, thread.id)).ok).toBe(true);
    const reopened = await getThreadCard(thread.id);
    expect(reopened!.thread.status).toBe("open");
    expect(reopened!.tasks.filter((task) => task.status === "cancelled")).toHaveLength(2);
  });

  it("szybki wpis zapisuje firmę, sprawę z szablonem, wpis i zadania naraz (AC-17)", async () => {
    const result = await createQuickEntry(actor, {
      partner: { create: { name: `${MARK} quick`, kind: "dostawca", tags: ["łóżka"] } },
      thread: { create: { title: "Wycena", ownerUserId: adminA, templateKey: "rfq" } },
      entry: { direction: "outbound", channel: "phone", body: "Rozmowa o cenie" },
      tasks: [
        { title: "Zadzwonić we wtorek", dueDate: "2026-11-10", assignee: { kind: "user", userId: adminB } },
        { title: "Czekamy na wycenę", assignee: { kind: "external" } },
      ],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    partnerIds.push(result.partnerId);
    const card = await getPartnerCard(result.partnerId);
    expect(card?.entries).toHaveLength(1);
    expect(card?.threads).toHaveLength(1);
    expect(card?.tasks).toHaveLength(5); // 3 z szablonu + 2 następne
    expect(card?.entries[0].source).toBe("web");
  });

  it("szybki wpis, w którym ostatni krok łamie ograniczenie bazy, nie zostawia niczego (AC-17)", async () => {
    const other = await newPartner("other");
    const foreignContact = await createContact(actor, other, { name: "Obca osoba" });
    if (!foreignContact.ok) throw new Error(foreignContact.error);

    const name = `${MARK} atomic`;
    const result = await createQuickEntry(actor, {
      partner: { create: { name, kind: "klient", tags: [] } },
      thread: { create: { title: "Atomowa", ownerUserId: adminA } },
      entry: { direction: "internal", channel: "other", body: "Notatka" },
      // Osoba kontaktowa innej firmy: odrzuci ją klucz złożony w bazie, nie Zod.
      tasks: [{ title: "Zadanie", assignee: { kind: "external", contactId: foreignContact.id } }],
    });
    expect(result.ok).toBe(false);
    const leftovers = await db.select({ id: crmPartner.id }).from(crmPartner).where(eq(crmPartner.name, name));
    expect(leftovers).toHaveLength(0);
  });

  it("wpis z sprawą obcej firmy odrzuca baza (klucz złożony) (AC-13)", async () => {
    const a = await newPartner("fk-a");
    const b = await newPartner("fk-b");
    const thread = await createThread(actor, b, { title: "Cudza", ownerUserId: adminA, templateKey: null, link: null });
    if (!thread.ok) throw new Error(thread.error);
    await expect(
      db.insert(crmEntry).values({
        partnerId: a,
        threadId: thread.id,
        authorUserId: adminA,
        occurredAt: new Date(),
        direction: "internal",
        channel: "other",
        body: "x",
      }),
    ).rejects.toThrow();
    // Ta sama próba przez funkcję domenową kończy się czytelnym błędem.
    const viaDomain = await createEntry(actor, a, { threadId: thread.id, direction: "internal", channel: "other", body: "x" });
    expect(viaDomain.ok).toBe(false);
  });

  it("wpis: autor z parametru, źródło bot, adnotacja edytowano, miękkie usunięcie (AC-13, AC-21)", async () => {
    const partnerId = await newPartner("entry");
    const created = await createEntry({ userId: adminB, source: "bot" }, partnerId, {
      direction: "inbound",
      channel: "whatsapp",
      body: "Wiadomość",
      occurredAtLocal: "2026-07-15T00:30",
    });
    if (!created.ok) throw new Error(created.error);
    let card = await getPartnerCard(partnerId);
    expect(card?.entries[0]).toMatchObject({ authorUserId: adminB, source: "bot", editedAt: null });
    expect(card?.entries[0].occurredAt.toISOString()).toBe("2026-07-14T22:30:00.000Z");

    await updateEntry(actor, created.id, { direction: "inbound", channel: "whatsapp", body: "Poprawione" });
    card = await getPartnerCard(partnerId);
    expect(card?.entries[0].editedAt).not.toBeNull();

    await deleteEntry(actor, created.id);
    expect((await getPartnerCard(partnerId))?.entries).toHaveLength(0);
  });

  it("archiwizacja jest zablokowana przy otwartym zadaniu, potem działa i da się przywrócić (AC-8)", async () => {
    const partnerId = await newPartner("archive");
    await createTask(actor, partnerId, { title: "Otwarte", note: null, dueDate: null, assignee: { kind: "user", userId: adminA }, threadId: null, link: null });
    const blocked = await archivePartner(actor, partnerId);
    expect(blocked.ok).toBe(false);
    expect(!blocked.ok && blocked.error).toContain("otwarte zadania");

    const [task] = await db.select({ id: crmTask.id }).from(crmTask).where(and(eq(crmTask.partnerId, partnerId)));
    await setTaskStatus(actor, task.id, "cancelled");
    expect((await archivePartner(actor, partnerId)).ok).toBe(true);
    expect((await restorePartner(actor, partnerId)).ok).toBe(true);
  });

  it("duplikat nazwy daje ostrzeżenie, ale zapis przechodzi (AC-5)", async () => {
    await newPartner("Podobna Firma Sp");
    const second = await createPartner(actor, { name: `${MARK} podobna firma sp`, kind: "inny", tags: [] });
    expect(second.ok).toBe(true);
    if (second.ok) {
      partnerIds.push(second.id);
      expect(second.similar.length).toBeGreaterThan(0);
    }
  });

  it("Najbliższe: zadanie administratora z terminem jest w pierwszej sekcji, zewnętrzne osobno (AC-15)", async () => {
    const partnerId = await newPartner("today");
    const thread = await createThread(actor, partnerId, { title: "Dziś", ownerUserId: adminA, templateKey: null, link: null });
    if (!thread.ok) throw new Error(thread.error);
    const { today } = await getTodayView(adminA, "all");
    await createTask(actor, partnerId, { title: "Moje dziś", note: null, dueDate: today, assignee: { kind: "user", userId: adminA }, threadId: thread.id, link: null });
    await createTask(actor, partnerId, { title: "Ich z terminem", note: null, dueDate: today, assignee: { kind: "external", contactId: null }, threadId: thread.id, link: null });

    const mine = await getTodayView(adminA, "mine");
    expect(mine.view.toDo.map((t) => t.title)).toContain("Moje dziś");
    expect(mine.view.waitingThem.map((t) => t.title)).toContain("Ich z terminem");
    const theirs = await getTodayView(adminB, "mine");
    expect(theirs.view.toDo.map((t) => t.title)).not.toContain("Moje dziś");
  });
});
