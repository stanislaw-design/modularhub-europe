import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const captureErrorMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/observability", () => ({ captureError: captureErrorMock, trackEvent: vi.fn() }));
const signInMock = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
vi.mock("@/auth", () => ({ signIn: signInMock }));
const planMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/cases/guest", () => ({ getGuestLinkPlan: planMock }));

import { db } from "@/lib/db/client";
import { pendingRegistration, projectRequest } from "@/lib/db/schema";
import { requestPanelLoginLink } from "./panel-login-link-actions";

// Spec 0070 AC-39: link logujący dla gościa u limitu trzech zapytań. Odpowiedź jest zawsze
// taka sama, a link wychodzi tylko na adres, który ma aktywne duże zamówienie.
describe.skipIf(!process.env.DATABASE_URL)("lib/panel-login-link-actions: requestPanelLoginLink", () => {
  const email = `pll-${crypto.randomUUID()}@example.test`;

  beforeEach(() => {
    signInMock.mockClear();
    planMock.mockReset().mockResolvedValue({ send: true, stagePending: true });
  });

  afterEach(async () => {
    await db.delete(projectRequest).where(eq(projectRequest.contactEmail, email));
    await db.delete(pendingRegistration).where(eq(pendingRegistration.email, email));
  });

  async function insertRequest(status: "open" | "closed" = "open") {
    await db.insert(projectRequest).values({
      contactName: "Gość",
      contactEmail: email,
      countryCode: "PL",
      projectType: "resort",
      families: ["dom"],
      unitCount: 10,
      ...(status === "closed" ? { status: "closed" as const, closedAt: new Date(), closedReason: "client_cancelled" as const } : {}),
    });
  }

  it("sends a sign in link to the panel list for an address with an active request, staging the registration", async () => {
    await insertRequest();

    const result = await requestPanelLoginLink(email.toUpperCase(), "de");

    expect(result).toEqual({ ok: true });
    expect(signInMock).toHaveBeenCalledWith("resend", { email, redirect: false, redirectTo: "/de/panel/quotes" });
    const [pending] = await db.select().from(pendingRegistration).where(eq(pendingRegistration.email, email));
    expect(pending?.payload).toMatchObject({ name: "Gość" });
  });

  it("gives the same answer and sends nothing for an address without an active request", async () => {
    await insertRequest("closed");

    expect(await requestPanelLoginLink(email, "pl")).toEqual({ ok: true });
    expect(await requestPanelLoginLink(`nobody-${email}`, "pl")).toEqual({ ok: true });
    expect(signInMock).not.toHaveBeenCalled();
  });

  it("sends nothing when the link plan says no (existing producer account or too many active links)", async () => {
    await insertRequest();
    planMock.mockResolvedValue({ send: false, stagePending: false });

    expect(await requestPanelLoginLink(email, "pl")).toEqual({ ok: true });
    expect(signInMock).not.toHaveBeenCalled();
  });

  it("falls back to pl for an unknown language and still answers neutrally when sending fails", async () => {
    await insertRequest();
    signInMock.mockRejectedValueOnce(new Error("mail down"));

    expect(await requestPanelLoginLink(email, "xx")).toEqual({ ok: true });
    expect(signInMock).toHaveBeenCalledWith("resend", expect.objectContaining({ redirectTo: "/pl/panel/quotes" }));
    expect(captureErrorMock).toHaveBeenCalled();
  });
});
