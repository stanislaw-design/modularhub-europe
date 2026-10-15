import { expect, test } from "@playwright/test";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { assertDevOrStagingDatabase } from "@/lib/db/dev-database-guard";
import {
  auditLog,
  client,
  producer,
  producerCapacityProfile,
  producerDeliveryCountry,
  producerMember,
  product,
  projectQuote,
  projectRequest,
  sessions,
  users,
} from "@/lib/db/schema";

// Spec 0070 zadanie 11 (AC-13, AC-14): bramka publikacji. Producent składa ofertę,
// klient jej nie widzi, administrator publikuje, klient widzi, producent nie może
// złożyć nowej wersji do cofnięcia publikacji.
test.describe("spec 0070: bramka publikacji", () => {
  const producerUserId = crypto.randomUUID();
  const adminUserId = crypto.randomUUID();
  const clientUserId = crypto.randomUUID();
  const producerId = crypto.randomUUID();
  const clientId = crypto.randomUUID();
  const requestId = crypto.randomUUID();
  const producerToken = crypto.randomUUID();
  const adminToken = crypto.randomUUID();
  const clientToken = crypto.randomUUID();
  const producerName = `E2E Publikacja ${producerId.slice(0, 6)}`;

  test.beforeAll(async () => {
    await assertDevOrStagingDatabase();
    await db.insert(users).values([
      { id: producerUserId, email: `e2e-pub-prod-${producerUserId}@example.test`, phone: "+48000000981", role: "producer", emailVerified: new Date() },
      { id: adminUserId, email: `e2e-pub-admin-${adminUserId}@example.test`, phone: "+48000000982", role: "admin", emailVerified: new Date() },
      { id: clientUserId, email: `e2e-pub-client-${clientUserId}@example.test`, phone: "+48000000983", role: "client", emailVerified: new Date() },
    ]);
    await db.insert(producer).values({ id: producerId, userId: producerUserId, nip: `E71${producerId.slice(0, 8)}`, name: producerName, countryCode: "PL", technology: "szkielet-drewniany" });
    await db.insert(producerMember).values({ producerId, userId: producerUserId });
    await db.insert(producerCapacityProfile).values({ producerId, volumeVerificationStatus: "approved" });
    await db.insert(producerDeliveryCountry).values({ producerId, countryCode: "PL" });
    await db.insert(product).values({ producerId, family: "dom", status: "published", name: "E2E publikacja match product" });
    await db.insert(client).values({ id: clientId, userId: clientUserId, b2bVerificationStatus: "approved" });
    await db.insert(projectRequest).values({
      id: requestId,
      clientId,
      contactName: "E2E Publikacja Investor",
      contactEmail: `e2e-pub-investor-${requestId}@example.test`,
      countryCode: "PL",
      projectType: "resort",
      families: ["dom"],
      unitCount: 12,
      status: "open",
    });
    await db.insert(sessions).values([
      { sessionToken: producerToken, userId: producerUserId, expires: new Date(Date.now() + 3600_000) },
      { sessionToken: adminToken, userId: adminUserId, expires: new Date(Date.now() + 3600_000) },
      { sessionToken: clientToken, userId: clientUserId, expires: new Date(Date.now() + 3600_000) },
    ]);
  });

  test.afterAll(async () => {
    await db.delete(projectQuote).where(eq(projectQuote.producerId, producerId));
    await db.delete(sessions).where(inArray(sessions.sessionToken, [producerToken, adminToken, clientToken]));
    await db.delete(projectRequest).where(eq(projectRequest.id, requestId));
    await db.delete(client).where(eq(client.id, clientId));
    await db.delete(product).where(eq(product.producerId, producerId));
    await db.delete(producerDeliveryCountry).where(eq(producerDeliveryCountry.producerId, producerId));
    await db.delete(producerCapacityProfile).where(eq(producerCapacityProfile.producerId, producerId));
    await db.delete(producerMember).where(eq(producerMember.producerId, producerId));
    await db.delete(producer).where(eq(producer.id, producerId));
    await db.delete(auditLog).where(inArray(auditLog.actorUserId, [adminUserId, producerUserId, clientUserId]));
    await db.delete(users).where(inArray(users.id, [producerUserId, adminUserId, clientUserId]));
  });

  test("hidden until published, locked while published, open again after withdrawal", async ({ page, context }) => {
    test.setTimeout(180_000);
    const cookie = (value: string) => ({ name: "authjs.session-token", value, url: "http://localhost:3000", httpOnly: true, sameSite: "Lax" as const });
    const as = async (token: string) => {
      await context.clearCookies();
      await context.addCookies([cookie(token)]);
    };

    // Producent składa ofertę.
    await as(producerToken);
    await page.goto(`/pl/producer/panel/board/${requestId}`);
    await expect(page.locator("#quote-total-price")).toBeVisible({ timeout: 60_000 });
    await page.locator("#quote-total-price").fill("900000");
    await page.locator("#quote-scope-included").fill("Dom w stanie deweloperskim");
    await page.locator("#quote-valid-until").fill("2099-12-31");
    await page.getByRole("button", { name: "Wyślij wycenę" }).click();
    await expect(page.getByText("Wycena wysłana.")).toBeVisible({ timeout: 15_000 });
    const [quote] = await db.select().from(projectQuote).where(eq(projectQuote.producerId, producerId));
    expect(quote.publishedToClientAt).toBeNull();

    // AC-13: klient nie widzi oferty.
    await as(clientToken);
    await page.goto("/pl/panel/quotes");
    await expect(page.getByText(producerName)).toHaveCount(0, { timeout: 60_000 });
    await expect(page.locator("main")).toBeVisible();

    // AC-14: administrator nie opublikuje bez potwierdzenia, potem publikuje.
    await as(adminToken);
    await page.goto(`/pl/internal/large-orders/${requestId}`);
    const publish = page.getByRole("button", { name: "Opublikuj podsumowanie" });
    await expect(publish).toBeDisabled({ timeout: 60_000 });
    await page.getByRole("checkbox").check();
    await publish.click();
    await expect(page.getByText("U klienta od")).toBeVisible({ timeout: 30_000 });
    const [published] = await db.select().from(projectQuote).where(eq(projectQuote.producerId, producerId));
    expect(published.publishedToClientAt).toBeInstanceOf(Date);
    const [request] = await db.select().from(projectRequest).where(eq(projectRequest.id, requestId));
    expect(request.status).toBe("published");
    expect(request.summaryPublishedAt).toBeInstanceOf(Date);

    // AC-13: klient widzi opublikowaną ofertę.
    await as(clientToken);
    await page.goto("/pl/panel/quotes");
    await expect(page.getByText(producerName).first()).toBeVisible({ timeout: 60_000 });

    // AC-14: producent nie składa nowej wersji opublikowanej oferty.
    await as(producerToken);
    await page.goto(`/pl/producer/panel/board/${requestId}`);
    await expect(page.getByText("Twoja oferta jest już opublikowana klientowi")).toBeVisible({ timeout: 60_000 });
    await expect(page.locator("#quote-total-price")).toHaveCount(0);

    // Cofnięcie publikacji odblokowuje producenta i ukrywa ofertę klientowi.
    await as(adminToken);
    await page.goto(`/pl/internal/large-orders/${requestId}`);
    await page.getByRole("button", { name: "Cofnij publikację" }).click();
    await expect(page.getByRole("button", { name: "Dodaj komentarz ModularHub" })).toBeVisible({ timeout: 30_000 });
    const [withdrawn] = await db.select().from(projectQuote).where(eq(projectQuote.producerId, producerId));
    expect(withdrawn.publishedToClientAt).toBeNull();

    await as(producerToken);
    await page.goto(`/pl/producer/panel/board/${requestId}`);
    await expect(page.locator("#quote-total-price")).toBeVisible({ timeout: 60_000 });
    await as(clientToken);
    await page.goto("/pl/panel/quotes");
    await expect(page.getByText(producerName)).toHaveCount(0, { timeout: 60_000 });
  });
});
