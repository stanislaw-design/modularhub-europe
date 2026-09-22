import { describe, expect, it } from "vitest";
import { encodeCursor, nextPollDelay, parseCursor } from "./poll";

describe("nextPollDelay (AC-6)", () => {
  it("5 s w aktywnej karcie, 30 s w tle", () => {
    expect(nextPollDelay({ visible: true, failures: 0 })).toBe(5_000);
    expect(nextPollDelay({ visible: false, failures: 0 })).toBe(30_000);
  });

  it("po błędach rośnie i nie przekracza 60 s", () => {
    expect(nextPollDelay({ visible: true, failures: 1 })).toBe(10_000);
    expect(nextPollDelay({ visible: true, failures: 2 })).toBe(20_000);
    expect(nextPollDelay({ visible: true, failures: 10 })).toBe(60_000);
    expect(nextPollDelay({ visible: false, failures: 1 })).toBe(60_000);
  });
});

describe("kursor", () => {
  const id = "0b6e4f5e-7d84-4b6b-9c3f-1a2b3c4d5e6f";

  it("koduje i odczytuje kursor", () => {
    const cursor = encodeCursor("2026-09-21T12:00:00.123456Z", id);
    expect(parseCursor(cursor)).toEqual({ createdAt: "2026-09-21T12:00:00.123456Z", id });
  });

  it("odrzuca śmieci i brak", () => {
    expect(parseCursor(null)).toBeNull();
    expect(parseCursor("x|y")).toBeNull();
    expect(parseCursor(`'; drop table message; --|${id}`)).toBeNull();
  });
});
