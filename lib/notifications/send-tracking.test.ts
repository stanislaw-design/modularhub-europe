import { render } from "@react-email/render";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const trackEventMock = vi.hoisted(() => vi.fn());
const captureErrorMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/observability", () => ({ trackEvent: trackEventMock, captureError: captureErrorMock }));

const insertMock = vi.hoisted(() => vi.fn());
const setResendIdMock = vi.hoisted(() => vi.fn());
const deleteMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/analytics/email-message", () => ({
  insertEmailMessage: insertMock,
  setEmailMessageResendId: setResendIdMock,
  deleteEmailMessage: deleteMock,
}));

const consentMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/analytics/user-consent", () => ({ hasActiveEmailTrackingConsent: consentMock }));

import { sendNotificationEmail } from "./send";
import { renderTransactionalEmailText } from "./templates/text";
import { TransactionalEmail } from "./templates/TransactionalEmail";

const ORIGINAL_ENV = { ...process.env };
const TRACKING = { producerId: "11111111-1111-4111-8111-111111111111", recipientUserId: "user-1" };

function resendResponse(ok = true) {
  return vi.fn().mockResolvedValue({
    ok,
    status: ok ? 200 : 422,
    json: async () => ({ id: "resend-123" }),
  } as unknown as Response);
}

function sentBody(fetchMock: ReturnType<typeof vi.fn>) {
  return JSON.parse(fetchMock.mock.calls[0][1].body as string) as Record<string, unknown>;
}

describe("sendNotificationEmail: dziennik maili do producentów (spec 0079)", () => {
  beforeEach(() => {
    process.env.RESEND_API_KEY = "test-key";
    process.env.NEXT_PUBLIC_SITE_URL = "https://modularhubeurope.pl";
    insertMock.mockReset().mockResolvedValue(undefined);
    setResendIdMock.mockReset().mockResolvedValue(undefined);
    deleteMock.mockReset().mockResolvedValue(undefined);
    consentMock.mockReset().mockResolvedValue(false);
    trackEventMock.mockClear();
    captureErrorMock.mockClear();
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    vi.unstubAllGlobals();
  });

  const producerMail = {
    to: "producer@example.test",
    subject: "Nowe zapytanie",
    html: '<a href="https://modularhubeurope.pl/pl/producer/panel/board/1">Otwórz</a>',
    text: "Otwórz: https://modularhubeurope.pl/pl/producer/panel/board/1",
    emailType: "large_order_producer_new_request" as const,
    entityId: "request-1",
    distinctId: TRACKING.producerId,
    tracking: TRACKING,
  };

  it("inserts the row before sending, tags the mail, adds UTM and stores the Resend id (AC-13)", async () => {
    const fetchMock = resendResponse();
    vi.stubGlobal("fetch", fetchMock);
    insertMock.mockImplementation(async () => {
      expect(fetchMock).not.toHaveBeenCalled();
    });

    expect(await sendNotificationEmail(producerMail)).toBe(true);

    const inserted = insertMock.mock.calls[0][0];
    expect(inserted).toMatchObject({
      emailType: "large_order_producer_new_request",
      entityId: "request-1",
      producerId: TRACKING.producerId,
      recipientUserId: "user-1",
      tracked: false,
    });
    expect(inserted).not.toHaveProperty("email");
    expect(inserted).not.toHaveProperty("to");

    const body = sentBody(fetchMock);
    expect(body.tags).toEqual([{ name: "message_id", value: inserted.id }]);
    expect(body.html).toContain("utm_source=email&amp;utm_medium=producer_mail&amp;utm_campaign=large_order_producer_new_request");
    expect(body.text).toContain("utm_campaign=large_order_producer_new_request");
    expect(setResendIdMock).toHaveBeenCalledWith(inserted.id, "resend-123");
    expect(deleteMock).not.toHaveBeenCalled();
  });

  it("deletes the row when Resend rejects the mail", async () => {
    vi.stubGlobal("fetch", resendResponse(false));
    expect(await sendNotificationEmail(producerMail)).toBe(false);
    expect(deleteMock).toHaveBeenCalledWith(insertMock.mock.calls[0][0].id);
    expect(setResendIdMock).not.toHaveBeenCalled();
  });

  it("deletes the row when the network call throws", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    expect(await sendNotificationEmail(producerMail)).toBe(false);
    expect(deleteMock).toHaveBeenCalledTimes(1);
  });

  it("still sends, untagged, when the insert fails, and reports to Sentry (AC-16)", async () => {
    const fetchMock = resendResponse();
    vi.stubGlobal("fetch", fetchMock);
    insertMock.mockRejectedValue(new Error("db down"));

    expect(await sendNotificationEmail(producerMail)).toBe(true);

    const body = sentBody(fetchMock);
    expect(body).not.toHaveProperty("tags");
    expect(body.html).toContain("utm_source=email");
    expect(captureErrorMock).toHaveBeenCalledWith(expect.any(Error), { path: "notifications:send:log-insert" });
    expect(setResendIdMock).not.toHaveBeenCalled();
  });

  it("does not fail the send when storing the Resend id fails (AC-16)", async () => {
    vi.stubGlobal("fetch", resendResponse());
    setResendIdMock.mockRejectedValue(new Error("db down"));

    expect(await sendNotificationEmail(producerMail)).toBe(true);
    expect(captureErrorMock).toHaveBeenCalledWith(expect.any(Error), { path: "notifications:send:log-resend-id" });
  });

  it("does not log or tag when RESEND_API_KEY is missing (nothing is sent)", async () => {
    delete process.env.RESEND_API_KEY;
    expect(await sendNotificationEmail(producerMail)).toBe(false);
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("ignores tracking for a type outside TRACKED_EMAIL_TYPES", async () => {
    const fetchMock = resendResponse();
    vi.stubGlobal("fetch", fetchMock);
    await sendNotificationEmail({ ...producerMail, emailType: "large_order_client_connected" });
    expect(insertMock).not.toHaveBeenCalled();
    expect(sentBody(fetchMock)).not.toHaveProperty("tags");
  });
});

// Spec 0079 AC-13: login_link i mail do klienta przechodzą przez sendNotificationEmail() bez zmian
// co do bajta: ta sama treść HTML i tekst, brak tagów, brak dotknięcia dziennika.
describe("sendNotificationEmail: maile bez śledzenia są bez zmian co do bajta (AC-13)", () => {
  beforeEach(() => {
    process.env.RESEND_API_KEY = "test-key";
    process.env.NEXT_PUBLIC_SITE_URL = "https://modularhubeurope.pl";
    insertMock.mockReset();
  });
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    vi.unstubAllGlobals();
  });

  const cases = [
    {
      name: "login_link",
      emailType: "login_link" as const,
      content: {
        preview: "Zaloguj się",
        heading: "Zaloguj się",
        body: "Kliknij, aby się zalogować.",
        ctaLabel: "Zaloguj",
        ctaHref: "https://modularhubeurope.pl/api/auth/callback/resend?token=abc&email=x%40y.pl",
      },
    },
    {
      name: "client mail (new_inquiry_confirmation)",
      emailType: "new_inquiry_confirmation" as const,
      content: {
        preview: "Dziękujemy za zapytanie",
        heading: "Dziękujemy za zapytanie",
        body: "Odezwiemy się wkrótce.",
        ctaLabel: "Zobacz zapytanie",
        ctaHref: "https://modularhubeurope.pl/pl/panel/inquiries/1",
        reference: "AB12CD34",
      },
    },
  ];

  for (const scenario of cases) {
    it(`${scenario.name}: HTML and text reach Resend unchanged, no tags, no UTM`, async () => {
      const html = await render(TransactionalEmail(scenario.content));
      const text = renderTransactionalEmailText(scenario.content);
      const fetchMock = resendResponse();
      vi.stubGlobal("fetch", fetchMock);

      await sendNotificationEmail({
        to: "someone@example.test",
        subject: scenario.content.heading,
        html,
        text,
        emailType: scenario.emailType,
        entityId: "e-1",
        distinctId: "e-1",
        // Nawet gdy ktoś błędnie poda tracking, typ spoza listy go ignoruje.
        tracking: TRACKING,
      });

      const body = sentBody(fetchMock);
      expect(body.html).toBe(html);
      expect(body.text).toBe(text);
      expect(body).not.toHaveProperty("tags");
      expect(insertMock).not.toHaveBeenCalled();
      expect(String(body.html)).not.toContain("utm_source");
      expect({ html: body.html, text: body.text }).toMatchSnapshot();
    });
  }
});

// Spec 0079 etap 3 (AC-13, AC-16, AC-20): wariant śledzony tylko dla odbiorcy z aktywną zgodą.
describe("sendNotificationEmail: wariant śledzony za zgodą (spec 0079 etap 3)", () => {
  beforeEach(() => {
    process.env.RESEND_API_KEY = "test-key";
    process.env.NEXT_PUBLIC_SITE_URL = "https://modularhubeurope.pl";
    process.env.EMAIL_TRACKING_SECRET = "test-secret";
    insertMock.mockReset().mockResolvedValue(undefined);
    setResendIdMock.mockReset().mockResolvedValue(undefined);
    deleteMock.mockReset().mockResolvedValue(undefined);
    consentMock.mockReset().mockResolvedValue(true);
    captureErrorMock.mockClear();
  });
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    vi.unstubAllGlobals();
  });

  const producerMail = {
    to: "producer@example.test",
    subject: "Nowe zapytanie",
    html: '<html><body><a href="https://modularhubeurope.pl/pl/producer/panel/board/1">Otwórz</a> <a href="https://example.org/x">Obcy</a> <a href="mailto:a@b.pl">Mail</a></body></html>',
    text: "Otwórz: https://modularhubeurope.pl/pl/producer/panel/board/1",
    emailType: "large_order_producer_new_request" as const,
    entityId: "request-1",
    distinctId: TRACKING.producerId,
    tracking: TRACKING,
  };

  it("adds the pixel and rewrites own links for a consenting recipient, tracked = true (AC-13, AC-20)", async () => {
    const fetchMock = resendResponse();
    vi.stubGlobal("fetch", fetchMock);

    expect(await sendNotificationEmail(producerMail)).toBe(true);

    expect(consentMock).toHaveBeenCalledWith("user-1");
    const inserted = insertMock.mock.calls[0][0];
    expect(inserted.tracked).toBe(true);
    const body = sentBody(fetchMock);
    const html = String(body.html);
    expect(html).toContain(`<img src="https://modularhubeurope.pl/api/email/o/${inserted.id}"`);
    expect(html.indexOf("/api/email/o/")).toBeLessThan(html.indexOf("</body>"));
    expect(html).toContain(`href="https://modularhubeurope.pl/api/email/c/${inserted.id}?u=`);
    expect(html).toMatch(/&amp;s=[0-9a-f]{64}"/);
    // UTM jest w adresie docelowym (zakodowanym w u).
    expect(decodeURIComponent(html)).toContain("utm_campaign=large_order_producer_new_request");
    // Obce linki i mailto zostają, część tekstowa nie jest przepisywana.
    expect(html).toContain('href="https://example.org/x"');
    expect(html).toContain('href="mailto:a@b.pl"');
    expect(String(body.text)).not.toContain("/api/email/");
    expect(String(body.text)).toContain("utm_campaign=large_order_producer_new_request");
    expect(body.tags).toEqual([{ name: "message_id", value: inserted.id }]);
  });

  it("sends the same content as before stage 3 to a recipient without consent (AC-13, AC-20)", async () => {
    consentMock.mockResolvedValue(false);
    const fetchMock = resendResponse();
    vi.stubGlobal("fetch", fetchMock);

    await sendNotificationEmail(producerMail);

    expect(insertMock.mock.calls[0][0].tracked).toBe(false);
    const html = String(sentBody(fetchMock).html);
    expect(html).not.toContain("/api/email/");
    expect(html).toContain("utm_source=email");
  });

  it("does not check consent without a recipient user id, and stays untracked", async () => {
    const fetchMock = resendResponse();
    vi.stubGlobal("fetch", fetchMock);
    await sendNotificationEmail({ ...producerMail, tracking: { producerId: TRACKING.producerId, recipientUserId: null } });
    expect(consentMock).not.toHaveBeenCalled();
    expect(insertMock.mock.calls[0][0].tracked).toBe(false);
    expect(String(sentBody(fetchMock).html)).not.toContain("/api/email/");
  });

  it("falls back to the untracked variant and reports to Sentry when the consent check fails (AC-16)", async () => {
    consentMock.mockRejectedValue(new Error("db down"));
    const fetchMock = resendResponse();
    vi.stubGlobal("fetch", fetchMock);

    expect(await sendNotificationEmail(producerMail)).toBe(true);

    expect(captureErrorMock).toHaveBeenCalledWith(expect.any(Error), { path: "notifications:send:consent-check" });
    expect(insertMock.mock.calls[0][0].tracked).toBe(false);
    expect(String(sentBody(fetchMock).html)).not.toContain("/api/email/");
  });

  it("falls back to the untracked variant when rewriting links fails, e.g. no secret (AC-16)", async () => {
    delete process.env.EMAIL_TRACKING_SECRET;
    const fetchMock = resendResponse();
    vi.stubGlobal("fetch", fetchMock);

    expect(await sendNotificationEmail(producerMail)).toBe(true);

    expect(captureErrorMock).toHaveBeenCalledWith(expect.any(Error), { path: "notifications:send:rewrite-links" });
    expect(insertMock.mock.calls[0][0].tracked).toBe(false);
    const html = String(sentBody(fetchMock).html);
    expect(html).not.toContain("/api/email/");
    expect(html).toContain("utm_source=email");
  });

  it("drops the pixel and rewritten links when the log insert fails, since nothing could record them (AC-16)", async () => {
    insertMock.mockRejectedValue(new Error("db down"));
    const fetchMock = resendResponse();
    vi.stubGlobal("fetch", fetchMock);

    expect(await sendNotificationEmail(producerMail)).toBe(true);

    const body = sentBody(fetchMock);
    expect(body).not.toHaveProperty("tags");
    expect(String(body.html)).not.toContain("/api/email/");
  });

  it("never checks consent for a type outside TRACKED_EMAIL_TYPES (login_link stays byte identical)", async () => {
    const fetchMock = resendResponse();
    vi.stubGlobal("fetch", fetchMock);
    await sendNotificationEmail({ ...producerMail, emailType: "login_link" });
    expect(consentMock).not.toHaveBeenCalled();
    expect(sentBody(fetchMock).html).toBe(producerMail.html);
  });
});
