import { describe, expect, it } from "vitest";
import { parseResendEvent } from "./resend-webhook";

const ID = "6f1c3a52-0d7e-4c55-9b8e-1f2a3b4c5d6e";

describe("parseResendEvent (spec 0079 AC-14)", () => {
  it("reads delivered, bounced and complained with the message_id tag (object form)", () => {
    for (const [type, event] of [
      ["email.delivered", "delivered"],
      ["email.bounced", "bounced"],
      ["email.complained", "complained"],
    ] as const) {
      const parsed = parseResendEvent({
        type,
        created_at: "2026-11-02T10:00:00.000Z",
        data: { email_id: "r-1", tags: { message_id: ID } },
      });
      expect(parsed).toEqual({ messageId: ID, event, occurredAt: new Date("2026-11-02T10:00:00.000Z") });
    }
  });

  it("reads the tag from the array form too", () => {
    const parsed = parseResendEvent({
      type: "email.delivered",
      data: { tags: [{ name: "message_id", value: ID }] },
    });
    expect(parsed?.messageId).toBe(ID);
    expect(parsed?.occurredAt).toBeInstanceOf(Date);
  });

  it("ignores events without the message_id tag (login_link and the rest)", () => {
    expect(parseResendEvent({ type: "email.delivered", data: { email_id: "r-1" } })).toBeNull();
    expect(parseResendEvent({ type: "email.delivered", data: { tags: { category: "x" } } })).toBeNull();
  });

  it("ignores a tag that is not a uuid and event types we do not store", () => {
    expect(parseResendEvent({ type: "email.delivered", data: { tags: { message_id: "abc'; drop" } } })).toBeNull();
    expect(parseResendEvent({ type: "email.sent", data: { tags: { message_id: ID } } })).toBeNull();
    expect(parseResendEvent(null)).toBeNull();
    expect(parseResendEvent("text")).toBeNull();
  });
});
