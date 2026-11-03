import { beforeEach, describe, expect, it, vi } from "vitest";

const authMock = vi.hoisted(() => vi.fn());
const grantMock = vi.hoisted(() => vi.fn());
const withdrawMock = vi.hoisted(() => vi.fn());
vi.mock("@/auth", () => ({ auth: authMock }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/observability/errors", () => ({ captureError: vi.fn() }));
vi.mock("@/lib/analytics/user-consent", () => ({
  grantEmailTrackingConsent: grantMock,
  withdrawEmailTrackingConsent: withdrawMock,
}));

import { setProducerEmailTrackingConsent } from "./producer-email-tracking-actions";

// Spec 0079 AC-19: tylko własna zgoda, odmowa bez sesji i dla innej roli.
describe("setProducerEmailTrackingConsent", () => {
  beforeEach(() => {
    authMock.mockReset().mockResolvedValue({ user: { id: "user-1", role: "producer" } });
    grantMock.mockReset().mockResolvedValue(undefined);
    withdrawMock.mockReset().mockResolvedValue(undefined);
  });

  it("grants and withdraws for the session user only", async () => {
    expect(await setProducerEmailTrackingConsent(true)).toEqual({ ok: true });
    expect(grantMock).toHaveBeenCalledWith("user-1");
    expect(await setProducerEmailTrackingConsent(false)).toEqual({ ok: true });
    expect(withdrawMock).toHaveBeenCalledWith("user-1");
  });

  it("refuses without a session and for a non producer role", async () => {
    authMock.mockResolvedValue(null);
    expect((await setProducerEmailTrackingConsent(true)).ok).toBe(false);
    authMock.mockResolvedValue({ user: { id: "user-2", role: "client" } });
    expect((await setProducerEmailTrackingConsent(true)).ok).toBe(false);
    authMock.mockResolvedValue({ user: { id: "user-3", role: "admin" } });
    expect((await setProducerEmailTrackingConsent(false)).ok).toBe(false);
    expect(grantMock).not.toHaveBeenCalled();
    expect(withdrawMock).not.toHaveBeenCalled();
  });

  it("reports a save error without throwing", async () => {
    grantMock.mockRejectedValue(new Error("db down"));
    expect((await setProducerEmailTrackingConsent(true)).ok).toBe(false);
  });
});
