import { expect, test } from "@playwright/test";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { assertDevOrStagingDatabase } from "@/lib/db/dev-database-guard";
import { emailMessage, producer, sessions, users } from "@/lib/db/schema";

// Spec 0079 etap 2 (AC-9, AC-10, AC-7): widok Maile i szczegół producenta w /internal/analytics
// na prawdziwych wierszach email_message. Sesje i dane wstawiane prosto do bazy dev, jak w
// specyfikacjach spec 0070. Uruchamiać przez:
//   node --env-file=.env.local node_modules/@playwright/test/cli.js test e2e/analityka-maile-0079.spec.ts
test.describe("spec 0079 etap 2: widok Maile", () => {
  const adminUserId = crypto.randomUUID();
  const producerUserId = crypto.randomUUID();
  const producerId = crypto.randomUUID();
  const adminToken = crypto.randomUUID();
  const producerToken = crypto.randomUUID();
  const messageIds = [crypto.randomUUID(), crypto.randomUUID(), crypto.randomUUID()];
  const producerName = `E2E Maile ${producerId.slice(0, 6)}`;

  test.beforeAll(async () => {
    assertDevOrStagingDatabase();
    await db.insert(users).values([
      { id: adminUserId, email: `e2e-mail-admin-${adminUserId}@example.test`, phone: "+48000000793", role: "admin", emailVerified: new Date() },
      { id: producerUserId, email: `e2e-mail-prod-${producerUserId}@example.test`, phone: "+48000000794", role: "producer", emailVerified: new Date() },
    ]);
    await db.insert(producer).values({
      id: producerId,
      userId: producerUserId,
      nip: `E79${producerId.slice(0, 7)}`,
      name: producerName,
      countryCode: "PL",
      technology: "szkielet-drewniany",
    });
    await db.insert(sessions).values([
      { sessionToken: adminToken, userId: adminUserId, expires: new Date(Date.now() + 3600_000) },
      { sessionToken: producerToken, userId: producerUserId, expires: new Date(Date.now() + 3600_000) },
    ]);
    // Dwa maile o tym samym zapytaniu (jeden dostarczony, jeden odbity) i jeden z skargą.
    await db.insert(emailMessage).values([
      { id: messageIds[0], emailType: "large_order_producer_new_request", entityId: "e2e-req-a", producerId, recipientUserId: producerUserId, deliveredAt: new Date() },
      { id: messageIds[1], emailType: "large_order_producer_new_request", entityId: "e2e-req-a", producerId, recipientUserId: producerUserId, bouncedAt: new Date() },
      { id: messageIds[2], emailType: "large_order_producer_reminder", entityId: "e2e-req-b", producerId, recipientUserId: producerUserId, complainedAt: new Date() },
    ]);
  });

  test.afterAll(async () => {
    await db.delete(emailMessage).where(inArray(emailMessage.id, messageIds));
    await db.delete(sessions).where(inArray(sessions.sessionToken, [adminToken, producerToken]));
    await db.delete(producer).where(eq(producer.id, producerId));
    await db.delete(users).where(inArray(users.id, [adminUserId, producerUserId]));
  });

  const cookie = (value: string) => ({ name: "authjs.session-token", value, url: "http://localhost:3000", httpOnly: true, sameSite: "Lax" as const });

  test("admin sees the Maile view with counts per mail type and producer, and the tracked columns and the sample caveat (AC-10)", async ({ page, context }) => {
    test.setTimeout(120_000);
    await context.addCookies([cookie(adminToken)]);
    await page.goto("/pl/internal/analytics?view=emails&range=7");

    await expect(page.getByRole("link", { name: "Maile", exact: true })).toHaveAttribute("aria-current", "page", { timeout: 60_000 });
    await expect(page.getByText(/Kliknięcia i otwarcia dotyczą tylko ich, więc to próbka, nie całość/)).toBeVisible();

    const producerRow = page.getByRole("row").filter({ hasText: producerName });
    // Wysłane 3, unikalne zapytania 2, dostarczone 1, odbite 1, skargi 1.
    await expect(producerRow.getByRole("cell")).toHaveText([producerName, "3", "2", "1", "1", "1", "0 (0%)", "0", "0"]);
    await expect(page.getByRole("columnheader", { name: "Unikalne kliknięcia" }).first()).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Otwarcia (ludzkie)" }).first()).toBeVisible();
  });

  test("a producer row opens the producer detail with the producer's own mail stats and a way back (AC-9)", async ({ page, context }) => {
    test.setTimeout(120_000);
    await context.addCookies([cookie(adminToken)]);
    await page.goto("/pl/internal/analytics?view=emails&range=30");

    await page.getByRole("link", { name: producerName }).click();
    await expect(page).toHaveURL(new RegExp(`view=producers.*producer=${producerId}`));

    await expect(page.getByText(producerName, { exact: true })).toBeVisible();
    await expect(page.getByText("Maile do tego producenta")).toBeVisible();
    await expect(page.getByText(/wysłane 3, dostarczone 1, odbite 1, skargi 1, śledzone 0 \(0%\)/)).toBeVisible();
    await expect(page.getByText("Przypomnienie o terminie")).toBeVisible();

    await page.getByRole("link", { name: /Wróć do rankingu producentów/ }).click();
    await expect(page).not.toHaveURL(/producer=/);
  });

  test("a producer parameter that is not a uuid falls back to the ranking without an error", async ({ page, context }) => {
    test.setTimeout(120_000);
    await context.addCookies([cookie(adminToken)]);
    const response = await page.goto("/pl/internal/analytics?view=producers&producer=nie-uuid");

    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { name: "Analityka" })).toBeVisible({ timeout: 60_000 });
    await expect(page.getByText("Maile do tego producenta")).toHaveCount(0);
  });

  test("no session goes to login, a producer account is sent away (AC-7)", async ({ page, context }) => {
    test.setTimeout(120_000);
    await page.goto("/pl/internal/analytics?view=emails");
    await expect(page).toHaveURL(/\/pl\/login\?callbackUrl=%2Fpl%2Finternal%2Fanalytics/, { timeout: 60_000 });

    await context.addCookies([cookie(producerToken)]);
    await page.goto("/pl/internal/analytics?view=emails");
    await expect(page).not.toHaveURL(/internal\/analytics/, { timeout: 60_000 });
    await expect(page.getByText("Według producenta")).toHaveCount(0);
  });
});
