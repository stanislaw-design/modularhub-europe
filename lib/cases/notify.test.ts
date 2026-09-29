import { describe, expect, it, vi } from "vitest";

// spec 0051 AC-7 refaktor: sendCaseEmail nie robi już własnego fetch do
// Resend, tylko deleguje do wspólnego sendera. Ten test jest regresją: treść
// i odbiorca przekazane dalej muszą zostać identyczne z tym, co dostał
// wcześniej surowy fetch w tym pliku.
const sendNotificationEmailMock = vi.hoisted(() => vi.fn().mockResolvedValue(true));
vi.mock("@/lib/notifications/send", () => ({ sendNotificationEmail: sendNotificationEmailMock }));
vi.mock("@/lib/observability", () => ({ captureError: vi.fn() }));

import { sendCaseEmail } from "./notify";

describe("sendCaseEmail", () => {
  it("delegates to the shared sender with the same to/subject/text, tagged as case_new_case_alert", async () => {
    const sent = await sendCaseEmail({
      to: "advisor@example.test",
      subject: "Nowa sprawa",
      text: "Treść\n\nhttps://modularhub.eu/pl/internal/cases/abc",
      emailType: "case_new_case_alert",
      inquiryId: "inquiry-1",
      distinctId: "inquiry-1",
    });

    expect(sent).toBe(true);
    expect(sendNotificationEmailMock).toHaveBeenCalledWith({
      to: "advisor@example.test",
      subject: "Nowa sprawa",
      text: "Treść\n\nhttps://modularhub.eu/pl/internal/cases/abc",
      emailType: "case_new_case_alert",
      entityId: "inquiry-1",
      distinctId: "inquiry-1",
    });
  });

  it("passes case_new_message through for the message-notification path, with the recipient's user id as distinctId", async () => {
    await sendCaseEmail({
      to: "client@example.test",
      subject: "Nowa wiadomość",
      text: "Treść\n\nhttps://modularhub.eu/pl/panel/inquiries/abc",
      emailType: "case_new_message",
      inquiryId: "inquiry-1",
      distinctId: "user-42",
    });

    expect(sendNotificationEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({ emailType: "case_new_message", entityId: "inquiry-1", distinctId: "user-42" }),
    );
  });

  it("never sets html: the case-email content stays plain text, unchanged by the refactor", async () => {
    await sendCaseEmail({
      to: "advisor@example.test",
      subject: "Nowa sprawa",
      text: "Treść",
      emailType: "case_new_case_alert",
      inquiryId: "inquiry-1",
      distinctId: "inquiry-1",
    });

    const call = sendNotificationEmailMock.mock.calls.at(-1)?.[0];
    expect(call).not.toHaveProperty("html");
  });
});
