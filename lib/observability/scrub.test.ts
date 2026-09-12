import { describe, expect, it } from "vitest";
import { scrubProperties, scrubSentryEvent } from "./scrub";

describe("scrubProperties", () => {
  it("drops email, name, phone, address, payment, and document keys (AC-1)", () => {
    const scrubbed = scrubProperties({
      email: "a@b.com",
      name: "Jan Kowalski",
      firstName: "Jan",
      phone: "+48123456789",
      address: "ul. Testowa 1",
      cardNumber: "4111111111111111",
      iban: "PL00000000000000000000000000",
      document: "contract.pdf",
      productId: "prod_1",
      status: "open",
    });

    expect(scrubbed).toEqual({ productId: "prod_1", status: "open" });
  });

  it("keeps unrelated properties untouched", () => {
    const scrubbed = scrubProperties({ orderStage: "produkcja", amount: 100 });
    expect(scrubbed).toEqual({ orderStage: "produkcja", amount: 100 });
  });
});

describe("scrubSentryEvent", () => {
  it("keeps only the user id, dropping any other user property", () => {
    const event = scrubSentryEvent({
      user: { id: "user_1", email: "a@b.com" },
    });
    expect(event.user).toEqual({ id: "user_1" });
  });

  it("clears the user entirely when there is no id", () => {
    const event = scrubSentryEvent({ user: { email: "a@b.com" } });
    expect(event.user).toBeNull();
  });

  it("strips request cookies, body, and auth-bearing headers", () => {
    const event = scrubSentryEvent({
      request: {
        cookies: { session: "abc" },
        data: { password: "secret" },
        headers: { Authorization: "Bearer token", "user-agent": "vitest" },
      },
    });
    expect(event.request).toEqual({ headers: { "user-agent": "vitest" } });
  });

  it("scrubs forbidden keys out of the extra bag (AC-1)", () => {
    const event = scrubSentryEvent({ extra: { email: "a@b.com", path: "/pl" } });
    expect(event.extra).toEqual({ path: "/pl" });
  });
});
