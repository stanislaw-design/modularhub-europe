import { expect, test } from "@playwright/test";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { assertDevOrStagingDatabase } from "@/lib/db/dev-database-guard";
import {
  auditLog,
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

// Spec 0070 zadania 9 i 10 (AC-9, AC-11, AC-12): oferta w nowym formacie, blokada po
// terminie i przedłużenie terminu przez administratora, w prawdziwej przeglądarce.
test.describe("spec 0070: format oferty i termin", () => {
  const producerUserId = crypto.randomUUID();
  const adminUserId = crypto.randomUUID();
  const producerId = crypto.randomUUID();
  const requestId = crypto.randomUUID();
  const producerToken = crypto.randomUUID();
  const adminToken = crypto.randomUUID();

  test.beforeAll(async () => {
    await assertDevOrStagingDatabase();
    await db.insert(users).values([
      { id: producerUserId, email: `e2e-0070-prod-${producerUserId}@example.test`, phone: "+48000000971", role: "producer", emailVerified: new Date() },
      { id: adminUserId, email: `e2e-0070-admin-${adminUserId}@example.test`, phone: "+48000000972", role: "admin", emailVerified: new Date() },
    ]);
    await db.insert(producer).values({ id: producerId, userId: producerUserId, nip: `E70${producerId.slice(0, 8)}`, name: "E2E 0070 Producer", countryCode: "PL", technology: "szkielet-drewniany" });
    await db.insert(producerMember).values({ producerId, userId: producerUserId });
    await db.insert(producerCapacityProfile).values({ producerId, volumeVerificationStatus: "approved" });
    await db.insert(producerDeliveryCountry).values({ producerId, countryCode: "PL" });
    await db.insert(product).values({ producerId, family: "dom", status: "published", name: "E2E 0070 match product" });
    await db.insert(projectRequest).values({
      id: requestId,
      contactName: "E2E 0070 Investor",
      contactEmail: `e2e-0070-investor-${requestId}@example.test`,
      countryCode: "PL",
      projectType: "resort",
      families: ["dom"],
      unitCount: 12,
      status: "open",
    });
    await db.insert(sessions).values([
      { sessionToken: producerToken, userId: producerUserId, expires: new Date(Date.now() + 3600_000) },
      { sessionToken: adminToken, userId: adminUserId, expires: new Date(Date.now() + 3600_000) },
    ]);
  });

  test.afterAll(async () => {
    await db.delete(projectQuote).where(eq(projectQuote.producerId, producerId));
    await db.delete(sessions).where(inArray(sessions.sessionToken, [producerToken, adminToken]));
    await db.delete(projectRequest).where(eq(projectRequest.id, requestId));
    await db.delete(product).where(eq(product.producerId, producerId));
    await db.delete(producerDeliveryCountry).where(eq(producerDeliveryCountry.producerId, producerId));
    await db.delete(producerCapacityProfile).where(eq(producerCapacityProfile.producerId, producerId));
    await db.delete(producerMember).where(eq(producerMember.producerId, producerId));
    await db.delete(producer).where(eq(producer.id, producerId));
    await db.delete(auditLog).where(inArray(auditLog.actorUserId, [adminUserId, producerUserId]));
    await db.delete(users).where(inArray(users.id, [producerUserId, adminUserId]));
  });

  test("producer quotes in the new format, is blocked after the deadline and quotes again after an admin extension", async ({ page, context }) => {
    test.setTimeout(150_000);
    const cookie = (value: string) => ({ name: "authjs.session-token", value, url: "http://localhost:3000", httpOnly: true, sameSite: "Lax" as const });
    await context.addCookies([cookie(producerToken)]);
    await page.goto(`/pl/producer/panel/board/${requestId}`);
    await expect(page.locator("#quote-total-price")).toBeVisible({ timeout: 60_000 });

    // AC-11: data ważności z przeszłości jest odrzucona przez serwer.
    await page.locator("#quote-total-price").fill("900000");
    await page.locator("#quote-scope-included").fill("Dom w stanie deweloperskim");
    await page.locator("#quote-valid-until").fill("2020-01-01");
    await page.getByRole("button", { name: "Wyślij wycenę" }).click();
    await expect(page.getByText("Ważność oferty musi być datą w przyszłości.")).toBeVisible({ timeout: 15_000 });

    // AC-11: pełny format.
    await page.getByLabel("Brutto").check();
    await page.locator("#quote-vat-rate").fill("23");
    await page.getByLabel("Transport: Kwota").check();
    await page.locator("#quote-logistics-transport-amount").fill("15000");
    await page.getByLabel("Montaż: Widełki").check();
    await page.locator("#quote-logistics-assembly-amount").fill("20000");
    await page.locator("#quote-logistics-assembly-max").fill("30000");
    await page.locator("#quote-valid-until").fill("2099-12-31");
    await page.locator("#quote-payment-plan").fill("30/60/10");
    await page.getByRole("button", { name: "Wyślij wycenę" }).click();
    await expect(page.getByText("Wycena wysłana.")).toBeVisible({ timeout: 15_000 });

    const [quote] = await db.select().from(projectQuote).where(eq(projectQuote.producerId, producerId));
    expect(quote).toMatchObject({ priceTaxMode: "gross", paymentPlan: "30/60/10", validUntil: "2099-12-31", status: "active" });
    expect(quote.logistics).toEqual({
      transport: { mode: "amount", amountCents: 1500000 },
      assembly: { mode: "range", amountCents: 2000000, maxAmountCents: 3000000 },
      crane: { mode: "tbd" },
    });

    // AC-12: po terminie formularz znika.
    await db.update(projectRequest).set({ deadlineAt: new Date(Date.now() - 60_000) }).where(eq(projectRequest.id, requestId));
    await page.goto(`/pl/producer/panel/board/${requestId}`);
    await expect(page.getByText("Termin składania ofert minął")).toBeVisible({ timeout: 30_000 });
    await expect(page.locator("#quote-total-price")).toHaveCount(0);

    // AC-9: administrator przedłuża termin, zmiana trafia do audytu.
    await context.clearCookies();
    await context.addCookies([cookie(adminToken)]);
    await page.goto(`/pl/internal/large-orders/${requestId}`);
    await page.getByRole("button", { name: "Zmień termin" }).click();
    const next = new Date(Date.now() + 5 * 86_400_000);
    const local = new Date(next.getTime() - next.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
    await page.getByLabel("Nowy termin ofert").fill(local);
    await page.getByRole("button", { name: "Zapisz termin" }).click();
    await expect(page.getByRole("button", { name: "Zmień termin" })).toBeVisible({ timeout: 15_000 });
    const [after] = await db.select({ d: projectRequest.deadlineAt }).from(projectRequest).where(eq(projectRequest.id, requestId));
    expect(Math.abs(after.d.getTime() - new Date(local).getTime())).toBeLessThan(60_000);
    const audit = await db.select().from(auditLog).where(eq(auditLog.recordId, requestId));
    expect(audit.some((row) => row.actorUserId === adminUserId && row.tableName === "project_request")).toBe(true);

    // AC-12: po przedłużeniu producent składa poprawioną ofertę, poprzednia jest zastąpiona.
    await context.clearCookies();
    await context.addCookies([cookie(producerToken)]);
    await page.goto(`/pl/producer/panel/board/${requestId}`);
    await page.locator("#quote-total-price").fill("880000");
    await page.locator("#quote-scope-included").fill("Dom w stanie deweloperskim v2");
    await page.locator("#quote-valid-until").fill("2099-12-31");
    await page.getByRole("button", { name: "Wyślij poprawioną wycenę" }).click();
    await expect(page.getByText("Wycena wysłana.")).toBeVisible({ timeout: 15_000 });
    const rows = await db.select({ s: projectQuote.status }).from(projectQuote).where(eq(projectQuote.producerId, producerId));
    expect(rows.map((row) => row.s).sort()).toEqual(["active", "superseded"]);
  });
});
