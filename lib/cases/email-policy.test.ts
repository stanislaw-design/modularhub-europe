import { describe, expect, it } from "vitest";
import { shouldEmailForMessage } from "./email-policy";

const NOW = new Date("2026-09-21T12:00:00.000Z");
const ago = (ms: number) => new Date(NOW.getTime() - ms);

describe("shouldEmailForMessage (AC-10)", () => {
  it("wysyła, gdy odbiorca nigdy nie dostał e maila i nie jest aktywny", () => {
    expect(shouldEmailForMessage({ now: NOW, lastEmailAt: null, lastSeenAt: null })).toBe(true);
  });

  it("nie wysyła do odbiorcy aktywnego w ciągu 90 sekund", () => {
    expect(shouldEmailForMessage({ now: NOW, lastEmailAt: null, lastSeenAt: ago(89_000) })).toBe(false);
    expect(shouldEmailForMessage({ now: NOW, lastEmailAt: null, lastSeenAt: ago(91_000) })).toBe(true);
  });

  it("nie wysyła drugiego e maila w oknie 10 minut", () => {
    expect(shouldEmailForMessage({ now: NOW, lastEmailAt: ago(9 * 60_000), lastSeenAt: null })).toBe(false);
    expect(shouldEmailForMessage({ now: NOW, lastEmailAt: ago(10 * 60_000), lastSeenAt: null })).toBe(true);
  });

  it("sześć wiadomości w 2 minuty daje najwyżej jeden e mail", () => {
    let lastEmailAt: Date | null = null;
    let sent = 0;
    for (let i = 0; i < 6; i += 1) {
      const now = new Date(NOW.getTime() + i * 20_000);
      if (shouldEmailForMessage({ now, lastEmailAt, lastSeenAt: null })) {
        sent += 1;
        lastEmailAt = now;
      }
    }
    expect(sent).toBe(1);
  });
});
