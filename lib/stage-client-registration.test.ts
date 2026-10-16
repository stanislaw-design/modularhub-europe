import { afterEach, describe, expect, it, vi } from "vitest";

const planMock = vi.hoisted(() => vi.fn());
const insertMock = vi.hoisted(() => vi.fn());
const captureErrorMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/cases/guest", () => ({ getGuestLinkPlan: planMock }));
vi.mock("@/lib/observability", () => ({ captureError: captureErrorMock }));
vi.mock("@/lib/db/client", () => ({
  db: {
    insert: () => ({
      values: (value: unknown) => ({
        onConflictDoNothing: async () => {
          insertMock(value);
        },
      }),
    }),
  },
}));

import { stageClientRegistration } from "./stage-client-registration";

// Spec 0070 AC-20, AC-23: klient bez konta zakłada konto pierwszym logowaniem, więc przed
// mailem z linkiem zapisujemy oczekującą rejestrację, ale tylko gdy plan tego wymaga.
describe("stageClientRegistration", () => {
  afterEach(() => {
    planMock.mockReset();
    insertMock.mockClear();
    captureErrorMock.mockClear();
  });

  it("stores a pending client registration when the plan asks for it", async () => {
    planMock.mockResolvedValue({ send: true, stagePending: true });

    await stageClientRegistration("klient@example.test", "Hans", "+48123");

    expect(insertMock).toHaveBeenCalledWith({
      email: "klient@example.test",
      role: "client",
      payload: { name: "Hans", phone: "+48123" },
    });
  });

  it("uses an empty phone when none is given", async () => {
    planMock.mockResolvedValue({ send: true, stagePending: true });

    await stageClientRegistration("klient@example.test", "Hans", undefined);

    expect(insertMock).toHaveBeenCalledWith(expect.objectContaining({ payload: { name: "Hans", phone: "" } }));
  });

  it("stores nothing for an existing account", async () => {
    planMock.mockResolvedValue({ send: true, stagePending: false });

    await stageClientRegistration("klient@example.test", "Hans", "+48123");

    expect(insertMock).not.toHaveBeenCalled();
  });

  it("never throws, a failure goes to Sentry", async () => {
    planMock.mockRejectedValue(new Error("db down"));

    await expect(stageClientRegistration("klient@example.test", "Hans", undefined)).resolves.toBeUndefined();
    expect(captureErrorMock).toHaveBeenCalledTimes(1);
  });
});
