import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { and, eq, gte, inArray, or } from "drizzle-orm";

const reminderMock = vi.hoisted(() => vi.fn().mockResolvedValue(true));
const teamDeadlineMock = vi.hoisted(() => vi.fn().mockResolvedValue(true));
const connectMock = vi.hoisted(() => vi.fn().mockResolvedValue("skipped"));
const pendingMock = vi.hoisted(() => vi.fn().mockResolvedValue([]));
const captureErrorMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/observability", () => ({ trackEvent: vi.fn(), captureError: captureErrorMock }));
vi.mock("@/lib/notifications/large-order-producer", () => ({ sendDeadlineReminderToProducer: reminderMock }));
vi.mock("@/lib/notifications/large-order-team", () => ({
  hasTeamRecipient: () => true,
  notifyTeamOfDeadlinePassed: teamDeadlineMock,
}));
// large-order-connection ciągnie maile i obserwowalność; tu liczy się tylko to, że zadanie
// czyszczące woła connectSelection dla zaległych wyborów.
vi.mock("@/lib/large-order-connection", () => ({ connectSelection: connectMock, getPendingSelections: pendingMock }));

import { db } from "@/lib/db/client";
import {
  bulkProductInquiry,
  producer,
  producerCapacityProfile,
  producerMember,
  product,
  projectNotificationLog,
  projectQuote,
  projectRequest,
  users,
} from "@/lib/db/schema";
import { claimNotification, runLargeOrderReminders } from "./large-order-reminders";

// Spec 0070 AC-17, AC-25 na prawdziwej bazie dev: maile są mockowane na granicy, dziennik
// wysyłek i wybór adresatów działają naprawdę. Zadanie przegląda wszystkie zapytania bazy,
// więc asercje filtrują wywołania do producentów i zapytań z fixture, a dziennik sprząta
// wszystko, co powstało w trakcie testu.
describe.skipIf(!process.env.DATABASE_URL)("lib/large-order-reminders: real DB (spec 0070 AC-17, AC-25)", () => {
  const startedAt = new Date();
  const hours = (count: number) => new Date(Date.now() + count * 3_600_000);

  const plain = { userId: crypto.randomUUID(), producerId: crypto.randomUUID() };
  const quoted = { userId: crypto.randomUUID(), producerId: crypto.randomUUID() };
  const producerIds = [plain.producerId, quoted.producerId];
  const requestIds = {
    threeDays: crypto.randomUUID(),
    oneDay: crypto.randomUUID(),
    expired: crypto.randomUUID(),
    selected: crypto.randomUUID(),
  };
  const inquiryId = crypto.randomUUID();
  const productId = crypto.randomUUID();
  const allRequestIds = Object.values(requestIds);
  let selectedQuoteId = "";

  const ours = (call: unknown[]) => producerIds.includes((call[0] as { producerId: string }).producerId);

  beforeAll(async () => {
    await db.insert(users).values(
      [plain, quoted].map((item, index) => ({
        id: item.userId,
        email: `rem-${item.userId}@example.test`,
        phone: `+4800000030${index}`,
        role: "producer" as const,
      })),
    );
    await db.insert(producer).values(
      [plain, quoted].map((item, index) => ({
        id: item.producerId,
        userId: item.userId,
        nip: `REM${index}${item.producerId.slice(0, 6)}`,
        name: `REM producer ${index}`,
        countryCode: "PL",
        technology: "szkielet-drewniany" as const,
      })),
    );
    await db.insert(producerMember).values([plain, quoted].map((item) => ({ producerId: item.producerId, userId: item.userId })));
    await db.insert(producerCapacityProfile).values(
      producerIds.map((id) => ({
        producerId: id,
        volumeVerificationStatus: "approved" as const,
        unitsPerMonth: 5,
        completionStandardsSupported: ["deweloperski" as const],
      })),
    );
    await db.insert(product).values([
      ...producerIds.map((id) => ({ producerId: id, family: "dom" as const, status: "published" as const, name: "REM product" })),
      { id: productId, producerId: plain.producerId, family: "dom" as const, status: "published" as const, name: "REM inquiry product" },
    ]);

    const base = {
      contactName: "REM Investor",
      countryCode: "PL",
      projectType: "resort" as const,
      families: ["dom" as const],
      status: "open" as const,
      unitCount: 12,
    };
    await db.insert(projectRequest).values([
      { ...base, id: requestIds.threeDays, contactEmail: `rem-a-${requestIds.threeDays}@example.test`, deadlineAt: hours(48) },
      { ...base, id: requestIds.oneDay, contactEmail: `rem-b-${requestIds.oneDay}@example.test`, deadlineAt: hours(10) },
      { ...base, id: requestIds.expired, contactEmail: `rem-c-${requestIds.expired}@example.test`, deadlineAt: hours(-1) },
      { ...base, id: requestIds.selected, contactEmail: `rem-d-${requestIds.selected}@example.test`, deadlineAt: hours(48) },
    ]);
    // Producent z aktywną ofertą na pierwsze zapytanie nie dostaje przypomnienia (AC-25).
    await db.insert(projectQuote).values({ projectRequestId: requestIds.threeDays, producerId: quoted.producerId, totalPriceCents: 100000 });
    // Zapytanie z wyborem klienta jest pomijane: przypomnienia nie mają już sensu.
    const [chosen] = await db
      .insert(projectQuote)
      .values({ projectRequestId: requestIds.selected, producerId: quoted.producerId, totalPriceCents: 100000 })
      .returning({ id: projectQuote.id });
    selectedQuoteId = chosen.id;
    await db.update(projectRequest).set({ selectedQuoteId }).where(eq(projectRequest.id, requestIds.selected));

    await db.insert(bulkProductInquiry).values({
      id: inquiryId,
      productId,
      contactName: "REM Investor",
      contactEmail: `rem-e-${inquiryId}@example.test`,
      unitCount: 5,
      deliveryCountryCode: "PL",
      deadlineAt: hours(48),
    });
  });

  beforeEach(async () => {
    // Każdy test zaczyna z pustym dziennikiem, bo wpis z poprzedniego testu blokowałby wysyłkę.
    await db.delete(projectNotificationLog).where(gte(projectNotificationLog.sentAt, startedAt));
    reminderMock.mockClear();
    teamDeadlineMock.mockClear();
    connectMock.mockClear();
    pendingMock.mockReset().mockResolvedValue([]);
    captureErrorMock.mockClear();
  });

  afterAll(async () => {
    await db.delete(projectNotificationLog).where(gte(projectNotificationLog.sentAt, startedAt));
    await db.update(projectRequest).set({ selectedQuoteId: null }).where(eq(projectRequest.id, requestIds.selected));
    await db.delete(projectQuote).where(inArray(projectQuote.producerId, producerIds));
    await db.delete(bulkProductInquiry).where(eq(bulkProductInquiry.id, inquiryId));
    await db.delete(projectRequest).where(inArray(projectRequest.id, allRequestIds));
    await db.delete(product).where(inArray(product.producerId, producerIds));
    await db.delete(producerCapacityProfile).where(inArray(producerCapacityProfile.producerId, producerIds));
    await db.delete(producerMember).where(inArray(producerMember.producerId, producerIds));
    await db.delete(producer).where(inArray(producer.id, producerIds));
    await db.delete(users).where(inArray(users.id, [plain.userId, quoted.userId]));
  });

  it("claims a notification only once for the same target, producer and kind (AC-25)", async () => {
    const kind = `reminder_3d:test-${crypto.randomUUID()}`;
    expect(await claimNotification("request", requestIds.threeDays, plain.producerId, kind)).toBe(true);
    expect(await claimNotification("request", requestIds.threeDays, plain.producerId, kind)).toBe(false);
    // Inny producent albo inny rodzaj to nowy wpis.
    expect(await claimNotification("request", requestIds.threeDays, quoted.producerId, kind)).toBe(true);
    expect(await claimNotification("request", requestIds.threeDays, plain.producerId, `${kind}x`)).toBe(true);
  });

  it("claims a team notification without a producer only once (NULL producer does not escape the unique index)", async () => {
    const kind = `deadline_team:test-${crypto.randomUUID()}`;
    expect(await claimNotification("request", requestIds.threeDays, null, kind)).toBe(true);
    expect(await claimNotification("request", requestIds.threeDays, null, kind)).toBe(false);
  });

  it("sends one reminder per producer without an offer, even when the job runs twice (AC-25)", async () => {
    const first = await runLargeOrderReminders();
    const second = await runLargeOrderReminders();

    const forThreeDays = reminderMock.mock.calls.filter((call) => ours(call) && call[0].id === requestIds.threeDays);
    expect(forThreeDays).toHaveLength(1);
    expect(forThreeDays[0][0]).toMatchObject({ kind: "request", producerId: plain.producerId, threshold: "3d" });
    expect(first.remindersClaimed).toBeGreaterThanOrEqual(1);
    expect(second.errors).toBe(0);

    // Producent z aktywną ofertą nie dostaje przypomnienia o tym zapytaniu.
    expect(forThreeDays.some((call) => call[0].producerId === quoted.producerId)).toBe(false);
  });

  it("uses the 1 day threshold within the last day and skips requests with a client choice", async () => {
    await runLargeOrderReminders();

    const oneDay = reminderMock.mock.calls.filter((call) => ours(call) && call[0].id === requestIds.oneDay);
    expect(oneDay.map((call) => call[0].threshold)).toEqual(expect.arrayContaining(["1d"]));
    expect(oneDay.every((call) => call[0].threshold === "1d")).toBe(true);

    expect(reminderMock.mock.calls.some((call) => call[0].id === requestIds.selected)).toBe(false);
  });

  it("reminds the owner of the product for a product inquiry", async () => {
    await runLargeOrderReminders();
    const forInquiry = reminderMock.mock.calls.filter((call) => call[0].id === inquiryId);
    expect(forInquiry).toHaveLength(1);
    expect(forInquiry[0][0]).toMatchObject({ kind: "product", producerId: plain.producerId });
  });

  it("alerts the team once after the deadline, also with no offers (AC-25)", async () => {
    await runLargeOrderReminders();
    await runLargeOrderReminders();

    const alerts = teamDeadlineMock.mock.calls.filter((call) => call[0].id === requestIds.expired);
    expect(alerts).toHaveLength(1);
    expect(alerts[0][0]).toMatchObject({ kind: "request", activeQuoteCount: 0, unitCount: 12, countryCode: "PL" });
    // Zapytanie przed terminem nie dostaje alertu zespołu.
    expect(teamDeadlineMock.mock.calls.some((call) => call[0].id === requestIds.oneDay)).toBe(false);
  });

  it("calls connectSelection for every pending selection and counts connected ones (AC-17)", async () => {
    pendingMock.mockResolvedValue([
      { kind: "request", id: requestIds.selected },
      { kind: "product", id: inquiryId },
    ]);
    connectMock.mockResolvedValueOnce("connected").mockResolvedValueOnce("pending_b2b");

    const run = await runLargeOrderReminders();

    expect(connectMock).toHaveBeenCalledTimes(2);
    expect(connectMock).toHaveBeenCalledWith("request", requestIds.selected);
    expect(run.selectionsChecked).toBe(2);
    expect(run.selectionsConnected).toBe(1);
  });

  it("one failing connection does not stop the others and is reported (AC-25)", async () => {
    pendingMock.mockResolvedValue([
      { kind: "request", id: requestIds.selected },
      { kind: "product", id: inquiryId },
    ]);
    connectMock.mockRejectedValueOnce(new Error("boom")).mockResolvedValueOnce("connected");

    const run = await runLargeOrderReminders();

    expect(connectMock).toHaveBeenCalledTimes(2);
    expect(run.errors).toBe(1);
    expect(run.selectionsConnected).toBe(1);
    expect(captureErrorMock).toHaveBeenCalled();
  });

  it("logged rows exist for both parents after a run", async () => {
    await runLargeOrderReminders();
    const rows = await db
      .select({ kind: projectNotificationLog.kind })
      .from(projectNotificationLog)
      .where(
        and(
          gte(projectNotificationLog.sentAt, startedAt),
          or(
            eq(projectNotificationLog.projectRequestId, requestIds.threeDays),
            eq(projectNotificationLog.bulkProductInquiryId, inquiryId),
          ),
        ),
      );
    expect(rows.some((row) => row.kind.startsWith("reminder_3d:"))).toBe(true);
  });
});
