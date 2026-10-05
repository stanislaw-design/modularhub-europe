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
const findExistingAdvisoryCaseMock = vi.hoisted(() => vi.fn());
const IdempotencyConflictErrorMock = vi.hoisted(() => class extends Error {});
vi.mock("@/lib/cases/create", () => ({
  createAdvisoryCase: createAdvisoryCaseMock,
  findExistingAdvisoryCase: findExistingAdvisoryCaseMock,
  IdempotencyConflictError: IdempotencyConflictErrorMock,
}));

const isGuestRateLimitedMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/cases/guest", () => ({ isGuestRateLimited: isGuestRateLimitedMock }));

const notifyGuestOfNewCaseMock = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
vi.mock("@/lib/notifications/guest-inquiry", () => ({ notifyGuestOfNewCase: notifyGuestOfNewCaseMock }));

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
    findExistingAdvisoryCaseMock.mockReset().mockResolvedValue(null);
    isGuestRateLimitedMock.mockReset().mockResolvedValue(false);
    notifyGuestOfNewCaseMock.mockClear();
    notifyAdvisorOfNewCaseMock.mockClear();
    notifyClientOfNewCaseMock.mockClear();
    getCountriesMock.mockReset().mockResolvedValue([{ code: "PL", name: "Polska" }]);
    getPublishedProductIdsMock.mockReset().mockResolvedValue(new Set([PROJECT_ID]));
    getClientIdForUserMock.mockReset().mockResolvedValue("client-1");
  });

  // spec 0066 AC-1/AC-2: no session means a guest, who must supply contact data.
  it("rejects a guest without contact data, creates nothing", async () => {
    authMock.mockResolvedValue(null);

    const result = await submitAdvisoryInquiry(validInput());

    expect(result).toMatchObject({ ok: false, error: "invalid" });
    expect(createAdvisoryCaseMock).not.toHaveBeenCalled();
  });

  it("rejects a producer or admin session", async () => {
    authMock.mockResolvedValue(sessionAs("user-2", "producer"));

    const result = await submitAdvisoryInquiry(validInput());

    expect(result).toMatchObject({ ok: false, error: "auth" });
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
    findExistingAdvisoryCaseMock.mockResolvedValue({ inquiryId: "inquiry-1", channelId: "channel-1" });

    const result = await submitAdvisoryInquiry(validInput());

    expect(result.ok).toBe(true);
    expect(createAdvisoryCaseMock).not.toHaveBeenCalled();
    expect(afterMock).not.toHaveBeenCalled();
    expect(trackEventMock).not.toHaveBeenCalled();
  });

  // spec 0066 AC-14: the logged in client keeps today's flow, contact verified now.
  it("marks the contact verified for a logged in client", async () => {
    authMock.mockResolvedValue(sessionAs("user-1", "client"));
    createAdvisoryCaseMock.mockResolvedValue({ inquiryId: "inquiry-1", channelId: "channel-1", created: true });

    const result = await submitAdvisoryInquiry(validInput());

    expect(result).toMatchObject({ ok: true, guest: false });
    const arg = createAdvisoryCaseMock.mock.calls[0][0];
    expect(arg.clientId).toBe("client-1");
    expect(arg.contactEmailVerifiedAt).toBeInstanceOf(Date);
  });
});

describe("submitAdvisoryInquiry as a guest (spec 0066)", () => {
  const guestInput = () => ({
    ...validInput(),
    contact: { name: "Gość", email: "Gosc@Example.TEST", phone: "+48123456789" },
  });

  beforeEach(() => {
    authMock.mockReset().mockResolvedValue(null);
    createAdvisoryCaseMock.mockReset().mockResolvedValue({ inquiryId: "inquiry-g", channelId: "channel-g", created: true });
    findExistingAdvisoryCaseMock.mockReset().mockResolvedValue(null);
    isGuestRateLimitedMock.mockReset().mockResolvedValue(false);
    afterQueue.length = 0;
    afterMock.mockClear();
    trackEventMock.mockClear();
    captureErrorMock.mockClear();
    notifyGuestOfNewCaseMock.mockClear();
    notifyClientOfNewCaseMock.mockClear();
    getCountriesMock.mockReset().mockResolvedValue([{ code: "PL", name: "Polska" }]);
    getPublishedProductIdsMock.mockReset().mockResolvedValue(new Set([PROJECT_ID]));
    getClientIdForUserMock.mockReset();
  });

  // AC-3: guest case has no client_id, lowercased email, unverified contact.
  it("creates a case with no client, lowercase email and unverified contact", async () => {
    const result = await submitAdvisoryInquiry(guestInput());

    expect(result).toMatchObject({ ok: true, inquiryId: "inquiry-g", guest: true });
    const arg = createAdvisoryCaseMock.mock.calls[0][0];
    expect(arg.clientId).toBeNull();
    expect(arg.contact.email).toBe("gosc@example.test");
    expect(arg.contactEmailVerifiedAt).toBeNull();
    expect(getClientIdForUserMock).not.toHaveBeenCalled();
  });

  // AC-7, AC-16: guest gets the guest mail, not the panel link mail; analytics use the case id.
  it("queues the guest mail instead of the client mail and tracks by inquiry id", async () => {
    await submitAdvisoryInquiry(guestInput());

    await drainAfterQueue();
    expect(notifyGuestOfNewCaseMock).toHaveBeenCalledWith("inquiry-g");
    expect(notifyClientOfNewCaseMock).not.toHaveBeenCalled();
    expect(trackEventMock).toHaveBeenCalledWith("case_created", expect.objectContaining({ guest: true }), "inquiry-g");
  });

  // AC-4
  it("returns the existing case on a replay without counting it against the limit", async () => {
    findExistingAdvisoryCaseMock.mockResolvedValue({ inquiryId: "inquiry-old", channelId: "channel-old" });
    isGuestRateLimitedMock.mockResolvedValue(true);

    const result = await submitAdvisoryInquiry(guestInput());

    expect(result).toMatchObject({ ok: true, inquiryId: "inquiry-old", guest: true });
    expect(createAdvisoryCaseMock).not.toHaveBeenCalled();
  });

  it("answers invalid when the key belongs to another requester", async () => {
    findExistingAdvisoryCaseMock.mockRejectedValue(new IdempotencyConflictErrorMock());

    const result = await submitAdvisoryInquiry(guestInput());

    expect(result).toMatchObject({ ok: false, error: "invalid" });
    expect(createAdvisoryCaseMock).not.toHaveBeenCalled();
  });

  // AC-5
  it("answers rate_limited and saves nothing over the limit", async () => {
    isGuestRateLimitedMock.mockResolvedValue(true);

    const result = await submitAdvisoryInquiry(guestInput());

    expect(result).toMatchObject({ ok: false, error: "rate_limited" });
    expect(createAdvisoryCaseMock).not.toHaveBeenCalled();
  });

  it("looks like a success but saves and sends nothing when the honeypot is filled", async () => {
    const result = await submitAdvisoryInquiry({ ...guestInput(), website: "http://spam.example" });

    expect(result).toMatchObject({ ok: true, guest: true });
    expect(createAdvisoryCaseMock).not.toHaveBeenCalled();
    expect(afterMock).not.toHaveBeenCalled();
  });

  it("rejects an invalid guest email", async () => {
    const result = await submitAdvisoryInquiry({
      ...guestInput(),
      contact: { name: "A", email: "nie-email", phone: "+48123456789" },
    });

    expect(result).toMatchObject({ ok: false, error: "invalid" });
  });

  it("reports a generic error when the write fails", async () => {
    createAdvisoryCaseMock.mockRejectedValue(new Error("db down"));

    const result = await submitAdvisoryInquiry(guestInput());

    expect(result).toMatchObject({ ok: false, error: "generic" });
    expect(captureErrorMock).toHaveBeenCalled();
  });
});
