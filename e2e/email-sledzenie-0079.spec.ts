import { createHash } from "node:crypto";
import { expect, test } from "@playwright/test";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { assertDevOrStagingDatabase } from "@/lib/db/dev-database-guard";
import {
  accounts,
  emailEvent,
  emailMessage,
  pendingRegistration,
  producer,
  producerMember,
  sessions,
  userConsent,
  users,
  verificationTokens,
} from "@/lib/db/schema";
import { grantEmailTrackingConsent, withdrawEmailTrackingConsent } from "@/lib/analytics/user-consent";
import { signClickTarget } from "@/lib/notifications/email-tracking-links";

// Spec 0079 etap 3 (AC-18 do AC-22): zgoda producenta i śledzenie otwarć i kliknięć w mailach.
// Dane i sesje wstawiane prosto do bazy dev, jak w innych specyfikacjach. Wymaga EMAIL_TRACKING_SECRET
// i AUTH_SECRET w procesie Playwright, więc uruchamiać przez:
//   node --env-file=.env.local node_modules/@playwright/test/cli.js test e2e/email-sledzenie-0079.spec.ts
// Rejestracja przez formularz wysłałaby prawdziwy mail logowania, więc tu sprawdzamy wygląd pola, a zapis
// zgody przy tworzeniu konta przechodzi przez prawdziwy callback linku logowania z wstawionym tokenem.
const BASE = "http://localhost:3000";
const cookie = (value: string) => ({ name: "authjs.session-token", value, url: BASE, httpOnly: true, sameSite: "Lax" as const });

test.describe("spec 0079 etap 3: pole zgody w rejestracji producenta (AC-18)", () => {
  for (const locale of ["pl", "en", "nl", "de"]) {
    test(`the consent checkbox is unchecked, optional and separate in ${locale}`, async ({ page }) => {
      test.setTimeout(120_000);
      await page.goto(`/${locale}/registration?role=producer`);

      const checkbox = page.locator("#producer-reg-email-tracking");
      await expect(checkbox).toBeVisible({ timeout: 60_000 });
      await expect(checkbox).not.toBeChecked();
      await expect(checkbox).not.toHaveAttribute("required", /.*/);
      await expect(checkbox).toHaveAttribute("name", "emailTrackingConsent");
      await expect(page.getByRole("checkbox")).toHaveCount(1);
    });
  }
});

test.describe("spec 0079 etap 3: zgoda zapisana przy tworzeniu konta (AC-18)", () => {
  const withConsentEmail = `e2e-0079-reg-${crypto.randomUUID()}@example.test`;
  const withoutConsentEmail = `e2e-0079-noreg-${crypto.randomUUID()}@example.test`;
  const emails = [withConsentEmail, withoutConsentEmail];

  test.afterAll(async () => {
    const created = await db.select({ id: users.id }).from(users).where(inArray(users.email, emails));
    const ids = created.map((row) => row.id);
    if (ids.length > 0) {
      await db.delete(userConsent).where(inArray(userConsent.userId, ids));
      await db.delete(producerMember).where(inArray(producerMember.userId, ids));
      await db.delete(producer).where(inArray(producer.userId, ids));
      await db.delete(sessions).where(inArray(sessions.userId, ids));
      await db.delete(accounts).where(inArray(accounts.userId, ids));
      await db.delete(users).where(inArray(users.id, ids));
    }
    await db.delete(pendingRegistration).where(inArray(pendingRegistration.email, emails));
    await db.delete(verificationTokens).where(inArray(verificationTokens.identifier, emails));
  });

  async function signInThroughMagicLink(page: import("@playwright/test").Page, email: string, payload: Record<string, unknown>) {
    await db.insert(pendingRegistration).values({ email, role: "producer", payload: payload as never });
    const raw = `e2e${crypto.randomUUID()}`;
    const hashed = createHash("sha256").update(`${raw}${process.env.AUTH_SECRET}`).digest("hex");
    await db.insert(verificationTokens).values({ identifier: email, token: hashed, expires: new Date(Date.now() + 600_000) });
    const callback = encodeURIComponent(`${BASE}/pl/producer/panel/settings`);
    await page.goto(`/api/auth/callback/resend?token=${raw}&email=${encodeURIComponent(email)}&callbackUrl=${callback}`);
  }

  const basePayload = { name: "E2E Rejestracja", phone: "+48500600700", countryCode: "PL", productionScale: "do-10" };

  test("a ticked box becomes one active user_consent row with the text version", async ({ page }) => {
    test.setTimeout(120_000);
    await signInThroughMagicLink(page, withConsentEmail, {
      ...basePayload,
      nip: `E79${Date.now()}`.slice(0, 12),
      emailTrackingConsentVersion: "draft-1",
    });
    await expect(page.getByText("Zgoda jest udzielona.")).toBeVisible({ timeout: 60_000 });

    const [user] = await db.select({ id: users.id }).from(users).where(eq(users.email, withConsentEmail));
    const rows = await db.select().from(userConsent).where(eq(userConsent.userId, user.id));
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ kind: "producer_email_tracking", textVersion: "draft-1", withdrawnAt: null });
  });

  test("an unticked box still creates the account and no consent row", async ({ page }) => {
    test.setTimeout(120_000);
    await signInThroughMagicLink(page, withoutConsentEmail, { ...basePayload, nip: `E78${Date.now()}`.slice(0, 12) });
    await expect(page.getByText("Zgoda nie jest udzielona.")).toBeVisible({ timeout: 60_000 });

    const [user] = await db.select({ id: users.id }).from(users).where(eq(users.email, withoutConsentEmail));
    expect(user).toBeDefined();
    expect(await db.select().from(userConsent).where(eq(userConsent.userId, user.id))).toHaveLength(0);
  });
});

test.describe("spec 0079 etap 3: przełącznik zgody w ustawieniach (AC-19)", () => {
  const userId = crypto.randomUUID();
  const producerId = crypto.randomUUID();
  const token = crypto.randomUUID();

  test.beforeAll(async () => {
    assertDevOrStagingDatabase();
    await db.insert(users).values({ id: userId, email: `e2e-0079-set-${userId}@example.test`, phone: "+48000000811", role: "producer", emailVerified: new Date() });
    await db.insert(producer).values({ id: producerId, userId, nip: `E77${producerId.slice(0, 8)}`, name: "E2E Zgoda", countryCode: "PL", technology: "szkielet-drewniany" });
    await db.insert(producerMember).values({ producerId, userId });
    await db.insert(sessions).values({ sessionToken: token, userId, expires: new Date(Date.now() + 3600_000) });
  });

  test.afterAll(async () => {
    await db.delete(userConsent).where(eq(userConsent.userId, userId));
    await db.delete(sessions).where(eq(sessions.sessionToken, token));
    await db.delete(producerMember).where(eq(producerMember.producerId, producerId));
    await db.delete(producer).where(eq(producer.id, producerId));
    await db.delete(users).where(eq(users.id, userId));
  });

  test("granting, withdrawing and granting again keeps history: the withdrawn row stays and a new one is added", async ({ page, context }) => {
    test.setTimeout(180_000);
    await context.addCookies([cookie(token)]);
    await page.goto("/pl/producer/panel/settings");

    await expect(page.getByText("Zgoda nie jest udzielona.")).toBeVisible({ timeout: 90_000 });
    await page.getByRole("button", { name: "Wyrażam zgodę" }).click();
    await expect(page.getByText("Zgoda jest udzielona.")).toBeVisible();

    await page.getByRole("button", { name: "Wycofaj zgodę" }).click();
    await expect(page.getByText("Zgoda nie jest udzielona.")).toBeVisible();
    const afterWithdraw = await db.select().from(userConsent).where(eq(userConsent.userId, userId));
    expect(afterWithdraw).toHaveLength(1);
    expect(afterWithdraw[0].withdrawnAt).not.toBeNull();

    await page.getByRole("button", { name: "Wyrażam zgodę" }).click();
    await expect(page.getByText("Zgoda jest udzielona.")).toBeVisible();
    const rows = await db.select().from(userConsent).where(eq(userConsent.userId, userId));
    expect(rows.map((row) => row.withdrawnAt !== null).sort()).toEqual([false, true]);
  });
});

test.describe("spec 0079 etap 3: pikselka i przekierowanie (AC-20 do AC-22)", () => {
  const userId = crypto.randomUUID();
  const producerId = crypto.randomUUID();
  const trackedId = crypto.randomUUID();
  const untrackedId = crypto.randomUUID();
  const targetA = `${BASE}/pl/producer/panel/board/1?utm_source=email`;
  const targetB = `${BASE}/pl/producer/panel/board/2?utm_source=email`;

  const clickUrl = (messageId: string, target: string, signature = signClickTarget(messageId, new URL(target).href)) =>
    `/api/email/c/${messageId}?u=${encodeURIComponent(new URL(target).href)}&s=${signature}`;
  const events = (messageId: string) => db.select().from(emailEvent).where(eq(emailEvent.messageId, messageId));
  const message = async (id: string) => (await db.select().from(emailMessage).where(eq(emailMessage.id, id)))[0];

  test.beforeAll(async () => {
    assertDevOrStagingDatabase();
    await db.insert(users).values({ id: userId, email: `e2e-0079-trk-${userId}@example.test`, phone: "+48000000812", role: "producer", emailVerified: new Date() });
    await db.insert(producer).values({ id: producerId, userId, nip: `E76${producerId.slice(0, 8)}`, name: "E2E Pikselka", countryCode: "PL", technology: "szkielet-drewniany" });
    await grantEmailTrackingConsent(userId);
    // Wysłane godzinę temu, żeby otwarcie nie wyglądało na automat z powodu świeżości.
    const sentAt = new Date(Date.now() - 3600_000);
    const common = { emailType: "large_order_producer_new_request", entityId: "e2e-trk", producerId, recipientUserId: userId, sentAt };
    await db.insert(emailMessage).values([
      { ...common, id: trackedId, tracked: true },
      { ...common, id: untrackedId, tracked: false },
    ]);
  });

  test.afterAll(async () => {
    await db.delete(emailMessage).where(eq(emailMessage.producerId, producerId));
    await db.delete(userConsent).where(eq(userConsent.userId, userId));
    await db.delete(producer).where(eq(producer.id, producerId));
    await db.delete(users).where(eq(users.id, userId));
  });

  test("a human open and click are counted once and the click redirects to the signed address (AC-20, AC-21)", async ({ request }) => {
    test.setTimeout(120_000);
    const pixel = await request.get(`/api/email/o/${trackedId}`, { timeout: 90_000 });
    expect(pixel.status()).toBe(200);
    expect(pixel.headers()["content-type"]).toBe("image/gif");
    expect(pixel.headers()["cache-control"]).toContain("no-store");

    const click = await request.get(clickUrl(trackedId, targetA), { maxRedirects: 0 });
    expect(click.status()).toBe(302);
    expect(click.headers()["location"]).toBe(new URL(targetA).href);

    const row = await message(trackedId);
    expect(row).toMatchObject({ openCount: 1, clickCount: 1 });
    expect(row.firstOpenedAt).not.toBeNull();
    expect(row.firstClickedAt).not.toBeNull();
  });

  test("a bad signature, a swapped address and a foreign host answer 400 and never redirect (AC-21)", async ({ request }) => {
    test.setTimeout(120_000);
    const good = signClickTarget(trackedId, new URL(targetA).href);
    const attempts = [
      clickUrl(trackedId, targetA, "0".repeat(64)),
      clickUrl(trackedId, `${BASE}/pl/internal`, good),
      clickUrl(trackedId, "https://evil.example/phish", signClickTarget(trackedId, "https://evil.example/phish")),
    ];
    for (const url of attempts) {
      const response = await request.get(url, { maxRedirects: 0 });
      expect(response.status()).toBe(400);
      expect(response.headers()["location"]).toBeUndefined();
    }
  });

  test("the pixel for an unknown id still returns the gif (AC-21)", async ({ request }) => {
    const response = await request.get(`/api/email/o/${crypto.randomUUID()}`);
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toBe("image/gif");
  });

  test("a mail that was not sent in the tracked variant records nothing (AC-20)", async ({ request }) => {
    await request.get(`/api/email/o/${untrackedId}`);
    expect(await events(untrackedId)).toHaveLength(0);
  });

  test("a HEAD request and a scanner clicking several links are marked automatic and do not move the counters (AC-22)", async ({ request }) => {
    test.setTimeout(120_000);
    const before = await message(trackedId);
    await request.head(`/api/email/o/${trackedId}`);
    // Kliknięcia sprzed kilku sekund z pierwszego testu są poza oknem skanera.
    await new Promise((resolve) => setTimeout(resolve, 6_000));
    await request.get(clickUrl(trackedId, targetA), { maxRedirects: 0 });
    const scanned = await request.get(clickUrl(trackedId, targetB), { maxRedirects: 0 });
    expect(scanned.status()).toBe(302);

    const after = await message(trackedId);
    expect(after.openCount).toBe(before.openCount);
    expect(after.clickCount).toBe(before.clickCount);
    const all = await events(trackedId);
    expect(all.filter((event) => event.likelyAutomatic).length).toBeGreaterThanOrEqual(3);
  });

  test("after the recipient withdraws consent nothing is recorded but the link still redirects (AC-20)", async ({ request }) => {
    test.setTimeout(120_000);
    await withdrawEmailTrackingConsent(userId);
    const before = (await events(trackedId)).length;

    await request.get(`/api/email/o/${trackedId}`);
    const click = await request.get(clickUrl(trackedId, targetA), { maxRedirects: 0 });

    expect(click.status()).toBe(302);
    expect((await events(trackedId)).length).toBe(before);
  });
});
