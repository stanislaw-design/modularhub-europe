import { describe, expect, it, vi } from "vitest";

const sendNotificationEmailMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/notifications/send", () => ({ sendNotificationEmail: sendNotificationEmailMock }));

import { sendLoginLinkEmail } from "./login";

describe("sendLoginLinkEmail", () => {
  it("renders the branded template and sends with throwOnFailure: true, identifier as entityId/distinctId", async () => {
    sendNotificationEmailMock.mockResolvedValue(true);

    await sendLoginLinkEmail({ identifier: "user@example.test", url: "https://modularhub.eu/pl/api/auth/callback/resend?token=abc" });

    expect(sendNotificationEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "user@example.test",
        emailType: "login_link",
        entityId: "user@example.test",
        distinctId: "user@example.test",
        throwOnFailure: true,
      }),
    );
    const call = sendNotificationEmailMock.mock.calls[0][0];
    expect(call.html).toContain("https://modularhub.eu/pl/api/auth/callback/resend?token=abc");
    // idea 1 (design feedback): every notification email now ships a plain
    // text fallback alongside the HTML, not just spec 0048's case emails.
    expect(call.text).toContain("https://modularhub.eu/pl/api/auth/callback/resend?token=abc");
    expect(call.text).not.toMatch(/<[a-z]/i);
  });

  // AC-10: login is not best effort. sendVerificationRequest (auth.ts) relies
  // on this rejecting so Auth.js shows its own error screen.
  it("propagates a send failure instead of swallowing it", async () => {
    sendNotificationEmailMock.mockRejectedValue(new Error("Resend responded 500"));

    await expect(
      sendLoginLinkEmail({ identifier: "user@example.test", url: "https://modularhub.eu/pl/api/auth/callback/resend?token=abc" }),
    ).rejects.toThrow("Resend responded 500");
  });
});
