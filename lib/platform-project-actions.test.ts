import type { Session } from "next-auth";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

// Spec 0077 część A. Te same granice I/O co w lib/project-quote-actions.test.ts: auth, observability
// i maile są podmienione, baza to prawdziwa baza dev (wyzwalacze, indeksy i SQL partii są
// przedmiotem testów, więc nie da się ich zamockować).
const authMock = vi.hoisted(() => vi.fn<() => Promise<Session | null>>());
const trackEventMock = vi.hoisted(() => vi.fn());
const captureErrorMock = vi.hoisted(() => vi.fn());
const notifyNewProjectMock = vi.hoisted(() => vi.fn<() => Promise<void>>());
const sendSelectionDoneMock = vi.hoisted(() => vi.fn<() => Promise<boolean>>());
const notifyTeamNewQuoteMock = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
vi.mock("@/auth", () => ({ auth: authMock, signIn: vi.fn() }));
vi.mock("@/lib/observability", () => ({ trackEvent: trackEventMock, captureError: captureErrorMock }));
vi.mock("@/lib/notifications/large-order-producer", () => ({
  notifyProducersOfNewPlatformProject: notifyNewProjectMock,
  sendPlatformSelectionDoneToProducer: sendSelectionDoneMock,
  sendDeadlineReminderToProducer: vi.fn(),
  notifyProducersOfOtherSelected: vi.fn(),
  notifyProducersOfClosedRequest: vi.fn(),
  notifyProducersOfNewLargeOrder: vi.fn(),
}));
vi.mock("@/lib/notifications/large-order-team", () => ({
  notifyTeamOfNewQuote: notifyTeamNewQuoteMock,
  notifyTeamOfDeadlinePassed: vi.fn(),
  hasTeamRecipient: vi.fn(),
}));
vi.mock("@/lib/notifications/large-order-connection", () => ({
  notifyOfConnection: vi.fn(),
  notifyTeamOfPendingSelection: vi.fn(),
}));
vi.mock("@/lib/storage/private-r2-client", () => ({ uploadPrivateObject: vi.fn(), buildSignedDownloadUrl: vi.fn() }));

import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { getProducerMatchesForAdmin } from "@/lib/db/project-request-matching";
import {
  auditLog,
  client,
  producer,
  producerCapacityProfile,
  producerMember,
  projectNotificationLog,
  projectQuote,
  projectRequest,
  projectRequestProducerOverride,
  users,
} from "@/lib/db/schema";
import { isBulkRequestEmailLimitError } from "@/lib/project-request-specs";
import {
  createPlatformProject,
  finishPlatformSelection,
  selectPlatformQuote,
  withdrawProjectQuoteVariant,
} from "./platform-project-actions";
import { linkRequestsToClientOnLogin, submitProjectQuote } from "./project-quote-actions";

const QUOTE_BASE = {
  priceTaxMode: "net",
  scopeIncluded: "Dom w stanie deweloperskim, transport w cenie.",
  validUntil: new Date(Date.now() + 30 * 86_400_000).toISOString().slice(0, 10),
  totalPriceEur: 100000,
} as const;

function sessionAs(userId: string, role: "admin" | "producer" | "client"): Session {
  return {
    user: { id: userId, role, phone: "+48000000000", name: null, email: null, image: null },
    expires: new Date(Date.now() + 3600_000).toISOString(),
  } as Session;
}

describe.skipIf(!process.env.DATABASE_URL)("lib/platform-project-actions: real DB (spec 0077 część A)", () => {
  const adminId = crypto.randomUUID();
  const clientUserId = crypto.randomUUID();
  const clientId = crypto.randomUUID();
  // A i B: bez profilu wolumenowego (projekt własny ma je przyjmować), C: bez wyjątku include, V: zatwierdzony wolumenowo.
  const producerA = { userId: crypto.randomUUID(), id: crypto.randomUUID() };
  const producerB = { userId: crypto.randomUUID(), id: crypto.randomUUID() };
  const producerC = { userId: crypto.randomUUID(), id: crypto.randomUUID() };
  const producerV = { userId: crypto.randomUUID(), id: crypto.randomUUID() };
  const allProducers = [producerA, producerB, producerC, producerV];
  const allUserIds = [adminId, clientUserId, ...allProducers.map((item) => item.userId)];
  const allProducerIds = allProducers.map((item) => item.id);
  const clientEmail = `psa-client-${clientId}@example.test`;
  const createdRequestIds: string[] = [];
  const limitEmail = `psa-limit-${crypto.randomUUID()}@example.test`;

  beforeAll(async () => {
    await db.insert(users).values([
      { id: adminId, email: `psa-admin-${adminId}@example.test`, phone: "+48000000100", role: "admin" },
      { id: clientUserId, email: clientEmail, phone: "+48000000101", role: "client" },
      ...allProducers.map((item, index) => ({
        id: item.userId,
        email: `psa-producer-${item.userId}@example.test`,
        phone: `+4800000011${index}`,
        role: "producer" as const,
      })),
    ]);
    await db.insert(client).values({ id: clientId, userId: clientUserId });
    await db.insert(producer).values(
      allProducers.map((item, index) => ({
        id: item.id,
        userId: item.userId,
        nip: `PSA${index}${item.id.slice(0, 7)}`,
        name: `Platform Test Producer ${"ABCV"[index]}`,
        countryCode: "PL",
        technology: "szkielet-drewniany" as const,
      })),
    );
    await db.insert(producerMember).values(allProducers.map((item) => ({ producerId: item.id, userId: item.userId })));
    await db.insert(producerCapacityProfile).values({ producerId: producerV.id, volumeVerificationStatus: "approved" });
  });

  beforeEach(() => {
    process.env.PLATFORM_CONTACT_NAME = "ModularHub Test";
    process.env.PLATFORM_CONTACT_EMAIL = " Kontakt@Example.TEST ";
    process.env.PLATFORM_CONTACT_PHONE = "+48 111 222 333";
    authMock.mockResolvedValue(sessionAs(adminId, "admin"));
    sendSelectionDoneMock.mockResolvedValue(true);
  });

  async function cleanupRequests(ids: string[]) {
    if (ids.length === 0) return;
    await db.update(projectRequest).set({ selectedQuoteId: null, platformMarkedQuoteId: null }).where(inArray(projectRequest.id, ids));
    await db.delete(projectNotificationLog).where(inArray(projectNotificationLog.projectRequestId, ids));
    await db.delete(projectQuote).where(inArray(projectQuote.projectRequestId, ids));
    await db.delete(projectRequestProducerOverride).where(inArray(projectRequestProducerOverride.projectRequestId, ids));
    await db.delete(projectRequest).where(inArray(projectRequest.id, ids));
  }

  afterEach(async () => {
    authMock.mockReset();
    trackEventMock.mockClear();
    captureErrorMock.mockClear();
    notifyNewProjectMock.mockReset();
    sendSelectionDoneMock.mockReset();
    notifyTeamNewQuoteMock.mockClear();
    await cleanupRequests(createdRequestIds.splice(0));
  });

  afterAll(async () => {
    await db.delete(projectRequest).where(eq(projectRequest.contactEmail, limitEmail));
    await db.delete(producerCapacityProfile).where(inArray(producerCapacityProfile.producerId, allProducerIds));
    await db.delete(producerMember).where(inArray(producerMember.producerId, allProducerIds));
    await db.delete(producer).where(inArray(producer.id, allProducerIds));
    await db.delete(client).where(eq(client.id, clientId));
    await db.delete(auditLog).where(inArray(auditLog.actorUserId, allUserIds));
    await db.delete(users).where(inArray(users.id, allUserIds));
  });

  const baseProject: Omit<Parameters<typeof createPlatformProject>[0], "producerIds"> = {
    title: "Osiedle testowe ModularHub",
    countryCode: "PL",
    projectType: "resort",
    families: ["dom"],
    unitCount: 1,
  };

  async function createProject(producerIds: string[], overrides: Record<string, unknown> = {}): Promise<string> {
    const result = await createPlatformProject({ ...baseProject, producerIds, ...overrides } as Parameters<typeof createPlatformProject>[0]);
    expect(result.ok, result.error).toBe(true);
    createdRequestIds.push(result.id!);
    return result.id!;
  }

  async function submitVariant(producerUserId: string, requestId: string, label: string | undefined, price = 100000) {
    authMock.mockResolvedValue(sessionAs(producerUserId, "producer"));
    return submitProjectQuote({ ...QUOTE_BASE, totalPriceEur: price, projectRequestId: requestId, ...(label === undefined ? {} : { variantLabel: label }) });
  }

  async function activeQuotes(requestId: string, producerId?: string) {
    return db
      .select()
      .from(projectQuote)
      .where(
        and(
          eq(projectQuote.projectRequestId, requestId),
          eq(projectQuote.status, "active"),
          producerId ? eq(projectQuote.producerId, producerId) : undefined,
        ),
      );
  }

  describe("createPlatformProject (AC-1 do AC-8)", () => {
    it("odrzuca użytkownika bez roli admin i nic nie zapisuje", async () => {
      authMock.mockResolvedValue(sessionAs(clientUserId, "client"));
      const result = await createPlatformProject({ ...baseProject, producerIds: [producerA.id] } as Parameters<typeof createPlatformProject>[0]);
      expect(result.ok).toBe(false);
      const rows = await db.select().from(projectRequest).where(eq(projectRequest.title, baseProject.title));
      expect(rows).toHaveLength(0);
    });

    it("zapisuje projekt własny z kontaktem z konfiguracji, wyjątkami include i bez klienta (AC-3, AC-7)", async () => {
      const id = await createProject([producerA.id, producerB.id, producerA.id]);

      const [row] = await db.select().from(projectRequest).where(eq(projectRequest.id, id));
      expect(row.isPlatformOwned).toBe(true);
      expect(row.title).toBe(baseProject.title);
      expect(row.clientId).toBeNull();
      expect(row.staffConsentNote).toBeNull();
      expect(row.createdByStaffUserId).toBe(adminId);
      expect(row.unitCount).toBe(1);
      expect(row.contactName).toBe("ModularHub Test");
      expect(row.contactEmail).toBe("kontakt@example.test");
      expect(row.contactPhone).toBe("+48 111 222 333");
      const days = (row.deadlineAt.getTime() - Date.now()) / 86_400_000;
      expect(days).toBeGreaterThan(13);
      expect(days).toBeLessThan(15);

      const overrides = await db.select().from(projectRequestProducerOverride).where(eq(projectRequestProducerOverride.projectRequestId, id));
      expect(overrides.map((item) => item.producerId).sort()).toEqual([producerA.id, producerB.id].sort());
      expect(overrides.every((item) => item.mode === "include")).toBe(true);
      expect(notifyNewProjectMock).toHaveBeenCalledWith({ id });
    });

    it("blokuje zapis, gdy brakuje konfiguracji kontaktu (AC-4)", async () => {
      delete process.env.PLATFORM_CONTACT_PHONE;
      const result = await createPlatformProject({ ...baseProject, producerIds: [producerA.id] } as Parameters<typeof createPlatformProject>[0]);
      expect(result.ok).toBe(false);
      expect(result.error).toMatch(/PLATFORM_CONTACT_PHONE/);
      const rows = await db.select().from(projectRequest).where(eq(projectRequest.title, baseProject.title));
      expect(rows).toHaveLength(0);
    });

    it("waliduje nazwę, termin i odbiorców (AC-2, AC-3, AC-7)", async () => {
      const base = { ...baseProject, producerIds: [producerA.id] };
      const run = (patch: Record<string, unknown>) => createPlatformProject({ ...base, ...patch } as Parameters<typeof createPlatformProject>[0]);
      expect((await run({ title: "ab" })).ok).toBe(false);
      expect((await run({ unitCount: 0 })).ok).toBe(false);
      expect((await run({ unitCount: 10001 })).ok).toBe(false);
      expect((await run({ producerIds: [] })).ok).toBe(false);
      const tooFar = new Date(Date.now() + 120 * 86_400_000).toISOString().slice(0, 10);
      expect((await run({ deadlineDate: tooFar })).ok).toBe(false);
      expect((await run({ deadlineDate: "2020-01-01" })).ok).toBe(false);
      const rows = await db.select().from(projectRequest).where(eq(projectRequest.title, baseProject.title));
      expect(rows).toHaveLength(0);
    });

    it("pozwala założyć więcej niż trzy aktywne projekty własne i nie rusza limitu klientów (AC-5)", async () => {
      for (let index = 0; index < 4; index += 1) await createProject([producerA.id]);
      // Ten sam adres (zespołu) nie liczy się do limitu zwykłych klientów.
      const rows = [1, 2, 3].map(() => ({
        contactName: "Klient limitu",
        contactEmail: limitEmail,
        countryCode: "PL",
        projectType: "resort" as const,
        families: ["dom" as const],
        unitCount: 5,
      }));
      for (const row of rows) await db.insert(projectRequest).values(row);
      let limitError: unknown;
      try {
        await db.insert(projectRequest).values(rows[0]);
      } catch (error) {
        limitError = error;
      }
      expect(isBulkRequestEmailLimitError(limitError)).toBe(true);
    });

    it("zachowuje próg trzech domów dla zapytań klientów (AC-2)", async () => {
      await expect(
        db.insert(projectRequest).values({
          contactName: "Klient",
          contactEmail: `psa-two-${crypto.randomUUID()}@example.test`,
          countryCode: "PL",
          projectType: "resort",
          families: ["dom"],
          unitCount: 2,
        }),
      ).rejects.toThrow();
    });
  });

  describe("dopasowanie i oferty z wariantami (AC-9 do AC-14, AC-44)", () => {
    it("producent bez profilu wolumenowego, ale z wyjątkiem include, składa wariant; bez include dostaje odmowę (AC-9)", async () => {
      const id = await createProject([producerA.id]);

      const ok = await submitVariant(producerA.userId, id, "Stan surowy");
      expect(ok.ok, ok.error).toBe(true);
      const [stored] = await activeQuotes(id, producerA.id);
      expect(stored.variantLabel).toBe("Stan surowy");

      const denied = await submitVariant(producerC.userId, id, "Pod klucz");
      expect(denied.ok).toBe(false);
      expect(await activeQuotes(id, producerC.id)).toHaveLength(0);

      const matches = await getProducerMatchesForAdmin(id);
      expect(matches.find((item) => item.producerId === producerA.id)?.matched).toBe(true);
      expect(matches.find((item) => item.producerId === producerC.id)?.matched ?? false).toBe(false);
    });

    it("wyjątek exclude wyłącza producenta, a nazwa wariantu jest obowiązkowa (AC-9, AC-11)", async () => {
      const id = await createProject([producerA.id, producerB.id]);
      await db.update(projectRequestProducerOverride).set({ mode: "exclude" }).where(and(eq(projectRequestProducerOverride.projectRequestId, id), eq(projectRequestProducerOverride.producerId, producerB.id)));

      expect((await submitVariant(producerB.userId, id, "Wariant")).ok).toBe(false);
      const missing = await submitVariant(producerA.userId, id, undefined);
      expect(missing.ok).toBe(false);
      expect(missing.error).toMatch(/nazwę wariantu/);
      expect((await submitVariant(producerA.userId, id, "   ")).ok).toBe(false);
      expect(await activeQuotes(id)).toHaveLength(0);
    });

    it("zapytanie klienta odrzuca etykietę wariantu i dalej ma jedną aktywną ofertę na producenta (AC-11, AC-13)", async () => {
      const [request] = await db
        .insert(projectRequest)
        .values({
          contactName: "Klient",
          contactEmail: `psa-client-req-${crypto.randomUUID()}@example.test`,
          countryCode: "PL",
          projectType: "resort",
          families: ["dom"],
          unitCount: 5,
        })
        .returning({ id: projectRequest.id });
      createdRequestIds.push(request.id);
      await db.insert(projectRequestProducerOverride).values({ projectRequestId: request.id, producerId: producerV.id, mode: "include", createdByUserId: adminId });

      const withLabel = await submitVariant(producerV.userId, request.id, "Wariant");
      expect(withLabel.ok).toBe(false);

      expect((await submitVariant(producerV.userId, request.id, undefined, 100000)).ok).toBe(true);
      expect((await submitVariant(producerV.userId, request.id, undefined, 90000)).ok).toBe(true);
      const active = await activeQuotes(request.id, producerV.id);
      expect(active).toHaveLength(1);
      expect(active[0].variantLabel).toBeNull();
      expect(active[0].totalPriceCents).toBe(9000000);
    });

    it("ta sama nazwa (bez względu na wielkość liter) zastępuje wersję, inna nazwa istnieje obok (AC-12)", async () => {
      const id = await createProject([producerA.id]);
      await submitVariant(producerA.userId, id, "Pod klucz", 100000);
      await submitVariant(producerA.userId, id, "Stan surowy", 70000);
      expect((await activeQuotes(id, producerA.id)).map((item) => item.variantLabel).sort()).toEqual(["Pod klucz", "Stan surowy"]);

      const replaced = await submitVariant(producerA.userId, id, "  pod KLUCZ ", 95000);
      expect(replaced.ok, replaced.error).toBe(true);
      const active = await activeQuotes(id, producerA.id);
      expect(active).toHaveLength(2);
      expect(active.find((item) => item.variantLabel?.trim().toLowerCase() === "pod klucz")?.totalPriceCents).toBe(9500000);
      const superseded = await db.select().from(projectQuote).where(and(eq(projectQuote.projectRequestId, id), eq(projectQuote.status, "superseded")));
      expect(superseded).toHaveLength(1);
    });

    it("szósty wariant jest odrzucany, także przy dwóch równoległych zapisach, a wycofanie zwalnia miejsce (AC-12, AC-44)", async () => {
      const id = await createProject([producerA.id]);
      for (const label of ["W1", "W2", "W3", "W4"]) {
        expect((await submitVariant(producerA.userId, id, label)).ok).toBe(true);
      }

      authMock.mockResolvedValue(sessionAs(producerA.userId, "producer"));
      const [first, second] = await Promise.all([
        submitProjectQuote({ ...QUOTE_BASE, projectRequestId: id, variantLabel: "W5" }),
        submitProjectQuote({ ...QUOTE_BASE, projectRequestId: id, variantLabel: "W6" }),
      ]);
      expect([first.ok, second.ok].filter(Boolean)).toHaveLength(1);
      const failed = first.ok ? second : first;
      expect(failed.error).toMatch(/pięć aktywnych wariantów/);
      expect(await activeQuotes(id, producerA.id)).toHaveLength(5);

      const [toWithdraw] = await activeQuotes(id, producerA.id);
      const withdrawn = await withdrawProjectQuoteVariant(toWithdraw.id);
      expect(withdrawn.ok, withdrawn.error).toBe(true);
      expect(await activeQuotes(id, producerA.id)).toHaveLength(4);
      expect((await submitVariant(producerA.userId, id, "W7")).ok).toBe(true);
    });

    it("producent wycofuje tylko własny wariant (AC-44)", async () => {
      const id = await createProject([producerA.id, producerB.id]);
      await submitVariant(producerA.userId, id, "Wariant A");
      const [quote] = await activeQuotes(id, producerA.id);

      authMock.mockResolvedValue(sessionAs(producerB.userId, "producer"));
      expect((await withdrawProjectQuoteVariant(quote.id)).ok).toBe(false);
      expect(await activeQuotes(id, producerA.id)).toHaveLength(1);
    });

    it("nie przyjmuje ofert po terminie (AC-14)", async () => {
      const id = await createProject([producerA.id]);
      await db.update(projectRequest).set({ deadlineAt: new Date(Date.now() - 60_000) }).where(eq(projectRequest.id, id));
      const result = await submitVariant(producerA.userId, id, "Spóźniony");
      expect(result.ok).toBe(false);
      expect(result.error).toMatch(/Termin/);
    });
  });

  describe("oznaczenie i zakończenie wyboru (AC-16 do AC-19, AC-45)", () => {
    it("oznaczenie nie zmienia statusów ani nie blokuje kolejnych ofert, tylko admin może je zapisać (AC-16)", async () => {
      const id = await createProject([producerA.id, producerB.id]);
      await submitVariant(producerA.userId, id, "Pod klucz");
      const [quote] = await activeQuotes(id, producerA.id);

      authMock.mockResolvedValue(sessionAs(producerA.userId, "producer"));
      expect((await selectPlatformQuote(id, quote.id)).ok).toBe(false);

      authMock.mockResolvedValue(sessionAs(adminId, "admin"));
      expect((await selectPlatformQuote(id, quote.id)).ok).toBe(true);
      const [row] = await db.select().from(projectRequest).where(eq(projectRequest.id, id));
      expect(row.platformMarkedQuoteId).toBe(quote.id);
      expect(row.selectedQuoteId).toBeNull();
      expect(row.status).toBe("quoted");

      expect((await submitVariant(producerB.userId, id, "Inny")).ok).toBe(true);
      const [other] = await activeQuotes(id, producerB.id);
      authMock.mockResolvedValue(sessionAs(adminId, "admin"));
      expect((await selectPlatformQuote(id, other.id)).ok).toBe(true);
      const [after] = await db.select().from(projectRequest).where(eq(projectRequest.id, id));
      expect(after.platformMarkedQuoteId).toBe(other.id);
    });

    it("zakończenie wymaga oznaczonej oferty i odrzuca nieaktualne oznaczenie (AC-17, AC-45)", async () => {
      const id = await createProject([producerA.id]);
      await submitVariant(producerA.userId, id, "Pod klucz");
      authMock.mockResolvedValue(sessionAs(adminId, "admin"));

      const noMark = await finishPlatformSelection(id, true);
      expect(noMark.ok).toBe(false);

      const [quote] = await activeQuotes(id, producerA.id);
      await selectPlatformQuote(id, quote.id);
      // Producent zastępuje oznaczony wariant nową wersją, więc oznaczenie wskazuje nieaktywną ofertę.
      await submitVariant(producerA.userId, id, "Pod klucz", 80000);
      authMock.mockResolvedValue(sessionAs(adminId, "admin"));
      const stale = await finishPlatformSelection(id, true);
      expect(stale.ok).toBe(false);
      expect(stale.error).toMatch(/nieaktualne/);
      const [row] = await db.select().from(projectRequest).where(eq(projectRequest.id, id));
      expect(row.status).toBe("quoted");
      expect(row.selectedQuoteId).toBeNull();
      expect(await activeQuotes(id, producerA.id)).toHaveLength(1);
    });

    it("kończy wybór: wybrana accepted, reszta rejected, jeden mail na producenta, idempotentnie (AC-17, AC-18)", async () => {
      const id = await createProject([producerA.id, producerB.id]);
      await submitVariant(producerA.userId, id, "Pod klucz", 100000);
      await submitVariant(producerA.userId, id, "Stan surowy", 70000);
      await submitVariant(producerB.userId, id, "Standard", 90000);
      const [winner] = (await activeQuotes(id, producerA.id)).filter((item) => item.variantLabel === "Pod klucz");

      authMock.mockResolvedValue(sessionAs(adminId, "admin"));
      expect((await selectPlatformQuote(id, winner.id)).ok).toBe(true);

      authMock.mockResolvedValue(sessionAs(clientUserId, "client"));
      expect((await finishPlatformSelection(id, true)).ok).toBe(false);

      authMock.mockResolvedValue(sessionAs(adminId, "admin"));
      expect((await finishPlatformSelection(id, false)).ok).toBe(false);
      const finished = await finishPlatformSelection(id, true);
      expect(finished.ok, finished.error).toBe(true);
      expect(finished.queuedProducers).toHaveLength(2);

      const [row] = await db.select().from(projectRequest).where(eq(projectRequest.id, id));
      expect(row.status).toBe("accepted");
      expect(row.selectedQuoteId).toBe(winner.id);
      expect(row.selectedAt).not.toBeNull();
      const quotes = await db.select().from(projectQuote).where(eq(projectQuote.projectRequestId, id));
      expect(quotes.filter((item) => item.status === "accepted").map((item) => item.id)).toEqual([winner.id]);
      expect(quotes.filter((item) => item.status === "active")).toHaveLength(0);
      expect(quotes.filter((item) => item.status === "rejected")).toHaveLength(2);
      expect(quotes.every((item) => item.contactRevealedAt === null)).toBe(true);
      // Jeden mail na producenta (A ma dwa warianty), dokładnie raz.
      expect(sendSelectionDoneMock).toHaveBeenCalledTimes(2);
      const log = await db.select().from(projectNotificationLog).where(and(eq(projectNotificationLog.projectRequestId, id), eq(projectNotificationLog.kind, "platform_selection_done")));
      expect(log).toHaveLength(2);

      // Drugie kliknięcie nic nie zmienia i nie wysyła maili ponownie.
      const again = await finishPlatformSelection(id, true);
      expect(again.ok).toBe(true);
      expect(again.alreadyFinished).toBe(true);
      expect(sendSelectionDoneMock).toHaveBeenCalledTimes(2);

      // Po zakończeniu nie ma nowych ofert, zmiany oznaczenia ani wycofania.
      const late = await submitVariant(producerB.userId, id, "Spóźniony");
      expect(late.ok).toBe(false);
      authMock.mockResolvedValue(sessionAs(adminId, "admin"));
      expect((await selectPlatformQuote(id, winner.id)).ok).toBe(false);
      authMock.mockResolvedValue(sessionAs(producerA.userId, "producer"));
      expect((await withdrawProjectQuoteVariant(winner.id)).ok).toBe(false);
    });
  });

  describe("ścieżka klienta (AC-6, AC-21)", () => {
    it("linkRequestsToClientOnLogin nie przypisuje projektu własnego do klienta", async () => {
      const id = await createProject([producerA.id]);
      await db.update(projectRequest).set({ contactEmail: clientEmail }).where(eq(projectRequest.id, id));
      await linkRequestsToClientOnLogin(clientEmail, clientId);
      const [row] = await db.select().from(projectRequest).where(eq(projectRequest.id, id));
      expect(row.clientId).toBeNull();
    });
  });
});
