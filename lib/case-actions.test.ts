import type { Session } from "next-auth";
import { beforeEach, describe, expect, it, vi } from "vitest";

// @/auth and @/lib/observability pull in next/server / "server-only", which
// don't resolve under plain Vitest/jsdom — same boundary problem
// lib/offer-actions.test.ts already works around. after() also needs
// mocking for the same reason (throws "called outside a request scope"
// without a real Next.js request context): queue the deferred task and
// drain it explicitly instead of racing it.
const authMock = vi.hoisted(() => vi.fn<() => Promise<Session | null>>());
const trackEventMock = vi.hoisted(() => vi.fn());
const captureErrorMock = vi.hoisted(() => vi.fn());
vi.mock("@/auth", () => ({ auth: authMock }));
vi.mock("@/lib/observability", () => ({ trackEvent: trackEventMock, captureError: captureErrorMock }));

const afterQueue = vi.hoisted(() => [] as Array<() => unknown>);
const afterMock = vi.hoisted(() => vi.fn((task: () => unknown) => afterQueue.push(task)));
vi.mock("next/server", () => ({ after: afterMock }));

const createAdvisoryCaseMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/cases/create", () => ({ createAdvisoryCase: createAdvisoryCaseMock }));

const notifyAdvisorOfNewCaseMock = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const notifyMessageRecipientMock = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
vi.mock("@/lib/cases/notify", () => ({
  notifyAdvisorOfNewCase: notifyAdvisorOfNewCaseMock,
  notifyMessageRecipient: notifyMessageRecipientMock,
}));

const notifyClientOfNewCaseMock = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
vi.mock("@/lib/notifications/new-inquiry", () => ({ notifyClientOfNewCase: notifyClientOfNewCaseMock }));

const getCountriesMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/data/countries", () => ({ getCountries: getCountriesMock }));

const getPublishedProductIdsMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/data/projects", () => ({ getPublishedProductIds: getPublishedProductIdsMock }));

const getClientIdForUserMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/db/queries", () => ({ getClientIdForUser: getClientIdForUserMock }));

import { submitAdvisoryInquiry } from "./case-actions";

function sessionAs(userId: string, role: "admin" | "producer" | "client"): Session {
  return {
    user: { id: userId, role, phone: "+48000000000", name: "Test Client", email: "client@example.test", image: null },
    expires: new Date(Date.now() + 3600_000).toISOString(),
  } as Session;
}

const PROJECT_ID = crypto.randomUUID();

async function drainAfterQueue() {
  const tasks = afterQueue.splice(0, afterQueue.length);
  for (const task of tasks) await task();
}

function validInput() {
  return {
    projectIds: [PROJECT_ID],
    plot: { street: "Testowa 1", postalCode: "00-001", city: "Warszawa", countryCode: "pl" },
    idempotencyKey: "idempotency-key-1",
    locale: "pl",
  };
}

describe("submitAdvisoryInquiry", () => {
  beforeEach(() => {
    authMock.mockReset();
    trackEventMock.mockClear();
    captureErrorMock.mockClear();
    afterMock.mockClear();
    afterQueue.length = 0;
    createAdvisoryCaseMock.mockReset();
    notifyAdvisorOfNewCaseMock.mockClear();
    notifyClientOfNewCaseMock.mockClear();
    getCountriesMock.mockReset().mockResolvedValue([{ code: "PL", name: "Polska" }]);
    getPublishedProductIdsMock.mockReset().mockResolvedValue(new Set([PROJECT_ID]));
    getClientIdForUserMock.mockReset().mockResolvedValue("client-1");
  });

  it("rejects with no session, creates nothing", async () => {
    authMock.mockResolvedValue(null);

    const result = await submitAdvisoryInquiry(validInput());

    expect(result.ok).toBe(false);
    expect(createAdvisoryCaseMock).not.toHaveBeenCalled();
  });

  // spec 0051 AC-1: a newly created case queues both the advisor alert
  // (spec 0048, pre-existing) and the client's own confirmation e mail.
  it("queues both notifyAdvisorOfNewCase and notifyClientOfNewCase when a new case is created", async () => {
    authMock.mockResolvedValue(sessionAs("user-1", "client"));
    createAdvisoryCaseMock.mockResolvedValue({ inquiryId: "inquiry-1", channelId: "channel-1", created: true });

    const result = await submitAdvisoryInquiry(validInput());

    expect(result.ok).toBe(true);
    expect(trackEventMock).toHaveBeenCalledWith("case_created", expect.objectContaining({ countryCode: "PL" }), "user-1");
    expect(afterMock).toHaveBeenCalledTimes(2);
    await drainAfterQueue();
    expect(notifyAdvisorOfNewCaseMock).toHaveBeenCalledWith("inquiry-1");
    expect(notifyClientOfNewCaseMock).toHaveBeenCalledWith("inquiry-1");
  });

  // AC-3 (spec 0023): the idempotent replay path (created: false) must not
  // re-fire either notification — the case already existed.
  it("does not queue either notification when the case already existed (idempotent replay)", async () => {
    authMock.mockResolvedValue(sessionAs("user-1", "client"));
    createAdvisoryCaseMock.mockResolvedValue({ inquiryId: "inquiry-1", channelId: "channel-1", created: false });

    const result = await submitAdvisoryInquiry(validInput());

    expect(result.ok).toBe(true);
    expect(afterMock).not.toHaveBeenCalled();
    expect(trackEventMock).not.toHaveBeenCalled();
  });
});
