import { expect, test } from "@playwright/test";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { assertDevOrStagingDatabase } from "@/lib/db/dev-database-guard";
import { auditLog, client, producer, producerMember, projectQuote, projectRequest, sessions, users } from "@/lib/db/schema";

// Spec 0070 zadanie 16 (AC-18, AC-19): administrator zamyka zapytanie, klient je wznawia,
// zwycięski producent potwierdza wynik.
test.describe("spec 0070: zamknięcie, wznowienie i wynik producenta", () => {
  const producerUserId = crypto.randomUUID();
  const adminUserId = crypto.randomUUID();
  const clientUserId = crypto.randomUUID();
  const producerId = crypto.randomUUID();
  const clientId = crypto.randomUUID();
  const requestId = crypto.randomUUID();
  const producerToken = crypto.randomUUID();
  const adminToken = crypto.randomUUID();
  const clientToken = crypto.randomUUID();
  let quoteId = "";

  test.beforeAll(async () => {
    await assertDevOrStagingDatabase();
    await db.insert(users).values([
      { id: producerUserId, email: `e2e-wyn-prod-${producerUserId}@example.test`, phone: "+48000000971", role: "producer", emailVerified: new Date() },
      { id: adminUserId, email: `e2e-wyn-admin-${adminUserId}@example.test`, phone: "+48000000972", role: "admin", emailVerified: new Date() },
      { id: clientUserId, email: `e2e-wyn-client-${clientUserId}@example.test`, phone: "+48000000973", role: "client", emailVerified: new Date() },
    ]);
    await db.insert(producer).values({ id: producerId, userId: producerUserId, nip: `E72${producerId.slice(0, 8)}`, name: `E2E Wynik ${producerId.slice(0, 6)}`, countryCode: "PL", technology: "szkielet-drewniany" });
    await db.insert(producerMember).values({ producerId, userId: producerUserId });
    await db.insert(client).values({ id: clientId, userId: clientUserId, b2bVerificationStatus: "approved" });
    await db.insert(projectRequest).values({
      id: requestId,
      clientId,
      contactName: "E2E Wynik Investor",
      contactEmail: `e2e-wyn-investor-${requestId}@example.test`,
      countryCode: "PL",
      projectType: "resort",
      families: ["dom"],
      unitCount: 12,
      status: "open",
    });
    const [quote] = await db
      .insert(projectQuote)
      .values({ projectRequestId: requestId, producerId, totalPriceCents: 1000000, status: "active", publishedToClientAt: new Date() })
      .returning({ id: projectQuote.id });
    quoteId = quote.id;
    await db.insert(sessions).values([
      { sessionToken: producerToken, userId: producerUserId, expires: new Date(Date.now() + 3600_000) },
      { sessionToken: adminToken, userId: adminUserId, expires: new Date(Date.now() + 3600_000) },
      { sessionToken: clientToken, userId: clientUserId, expires: new Date(Date.now() + 3600_000) },
    ]);
  });

  test.afterAll(async () => {
    await db.update(projectRequest).set({ selectedQuoteId: null }).where(eq(projectRequest.id, requestId));
    await db.delete(projectQuote).where(eq(projectQuote.producerId, producerId));
    await db.delete(sessions).where(inArray(sessions.sessionToken, [producerToken, adminToken, clientToken]));
    await db.delete(projectRequest).where(eq(projectRequest.id, requestId));
    await db.delete(client).where(eq(client.id, clientId));
    await db.delete(producerMember).where(eq(producerMember.producerId, producerId));
    await db.delete(producer).where(eq(producer.id, producerId));
    await db.delete(auditLog).where(inArray(auditLog.actorUserId, [adminUserId, producerUserId, clientUserId]));
    await db.delete(users).where(inArray(users.id, [producerUserId, adminUserId, clientUserId]));
  });

  test("admin closes, client reopens, winner reports the outcome", async ({ page, context }) => {
    test.setTimeout(240_000);
    const as = async (token: string) => {
      await context.clearCookies();
      await context.addCookies([{ name: "authjs.session-token", value: token, url: "http://localhost:3000", httpOnly: true, sameSite: "Lax" as const }]);
    };
    const readRequest = async () => (await db.select().from(projectRequest).where(eq(projectRequest.id, requestId)))[0];

    // Administrator zamyka zapytanie z powodem "Brak ofert".
    await as(adminToken);
    await page.goto(`/pl/internal/large-orders/${requestId}?kind=request`);
    await page.getByRole("button", { name: "Zamknij zapytanie" }).click({ timeout: 90_000 });
    await page.getByLabel("Powód zamknięcia").selectOption("no_offers");
    await page.getByRole("button", { name: "Zamknij zapytanie" }).last().click();
    await expect.poll(async () => (await readRequest()).status, { timeout: 60_000 }).toBe("closed");
    expect((await readRequest()).closedReason).toBe("no_offers");

    // Klient widzi zamknięte zapytanie i je wznawia.
    await as(clientToken);
    await page.goto("/pl/panel/quotes");
    await page.getByRole("button", { name: "Wznów zapytanie" }).click({ timeout: 90_000 });
    await expect.poll(async () => (await readRequest()).status, { timeout: 60_000 }).not.toBe("closed");
    const reopened = await readRequest();
    expect(reopened.closedAt).toBeNull();
    expect(reopened.closedReason).toBeNull();
    expect(reopened.deadlineAt.getTime()).toBeGreaterThan(Date.now() + 13 * 86_400_000);

    // Po połączeniu stron zwycięski producent potwierdza wynik.
    await db.update(projectQuote).set({ status: "accepted", contactRevealedAt: new Date() }).where(eq(projectQuote.id, quoteId));
    await db.update(projectRequest).set({ status: "accepted", selectedQuoteId: quoteId }).where(eq(projectRequest.id, requestId));
    await as(producerToken);
    await page.goto("/pl/producer/panel/board-quotes");
    await page.getByRole("button", { name: "Podpisano umowę" }).click({ timeout: 90_000 });
    await expect(page.getByText("Wynik: Podpisano umowę")).toBeVisible({ timeout: 60_000 });
    const [quote] = await db.select().from(projectQuote).where(eq(projectQuote.id, quoteId));
    expect(quote.producerOutcome).toBe("signed");
  });
});
