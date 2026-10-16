import { expect, test } from "@playwright/test";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { assertDevOrStagingDatabase } from "@/lib/db/dev-database-guard";
import { auditLog, pendingRegistration, projectRequest, sessions, users } from "@/lib/db/schema";

// Spec 0070 zadanie 15 (AC-20): doradca składa zapytanie w imieniu klienta.
test.describe("spec 0070: zapytanie składane przez doradcę", () => {
  const adminUserId = crypto.randomUUID();
  const clientUserId = crypto.randomUUID();
  const adminToken = crypto.randomUUID();
  const clientToken = crypto.randomUUID();
  const investorEmail = `e2e-onbehalf-${crypto.randomUUID()}@example.test`;

  test.beforeAll(async () => {
    await assertDevOrStagingDatabase();
    await db.insert(users).values([
      { id: adminUserId, email: `e2e-onbehalf-admin-${adminUserId}@example.test`, phone: "+48000000991", role: "admin", emailVerified: new Date() },
      { id: clientUserId, email: `e2e-onbehalf-client-${clientUserId}@example.test`, phone: "+48000000992", role: "client", emailVerified: new Date() },
    ]);
    await db.insert(sessions).values([
      { sessionToken: adminToken, userId: adminUserId, expires: new Date(Date.now() + 3600_000) },
      { sessionToken: clientToken, userId: clientUserId, expires: new Date(Date.now() + 3600_000) },
    ]);
  });

  test.afterAll(async () => {
    await db.delete(projectRequest).where(eq(projectRequest.contactEmail, investorEmail));
    await db.delete(pendingRegistration).where(eq(pendingRegistration.email, investorEmail));
    await db.delete(sessions).where(inArray(sessions.sessionToken, [adminToken, clientToken]));
    await db.delete(auditLog).where(inArray(auditLog.actorUserId, [adminUserId, clientUserId]));
    await db.delete(users).where(inArray(users.id, [adminUserId, clientUserId]));
  });

  test("admin only, explicit language required, saves with staff marker and consent", async ({ page, context }) => {
    test.setTimeout(180_000);
    const as = async (token: string) => {
      await context.clearCookies();
      await context.addCookies([{ name: "authjs.session-token", value: token, url: "http://localhost:3000", httpOnly: true, sameSite: "Lax" as const }]);
    };

    // Klient nie wejdzie na ekran doradcy.
    await as(clientToken);
    await page.goto("/pl/internal/large-orders/new");
    await expect(page).not.toHaveURL(/internal\/large-orders\/new/, { timeout: 60_000 });

    await as(adminToken);
    await page.goto("/pl/internal/large-orders");
    await page.getByRole("link", { name: "Złóż zapytanie w imieniu klienta" }).click();
    await expect(page.getByRole("heading", { name: "Złóż zapytanie w imieniu klienta" })).toBeVisible({ timeout: 60_000 });

    await page.getByLabel("Imię i nazwisko").fill("E2E Inwestor");
    await page.getByLabel("Adres e mail").fill(investorEmail);
    await page.getByLabel("Zgoda klienta (kiedy i jak ją wyraził)").fill("Zgoda ustna, rozmowa telefoniczna");
    await page.locator('select[name="countryCode"]').selectOption("DE");
    await page.getByLabel("Liczba domów (od 3)").fill("6");
    await page.locator('select[name="projectType"]').selectOption("resort");
    await page.getByRole("checkbox", { name: "Dom", exact: true }).check();

    // Bez wybranego języka klienta zapis jest odrzucony i nic nie powstaje.
    await page.getByRole("button", { name: "Złóż zapytanie w imieniu klienta" }).click();
    await expect(page.getByText("Wybierz język klienta.")).toBeVisible();
    expect(await db.select().from(projectRequest).where(eq(projectRequest.contactEmail, investorEmail))).toHaveLength(0);

    await page.locator('select[name="clientLocale"]').selectOption("de");
    await page.getByRole("button", { name: "Złóż zapytanie w imieniu klienta" }).click();
    // Spec 0070 AC-34: po zapisie jest krok "Pliki", szczegóły otwiera dopiero przycisk.
    await expect(page.getByRole("heading", { name: "Pliki do zapytania" })).toBeVisible({ timeout: 60_000 });
    await page.getByRole("button", { name: "Przejdź do szczegółów zapytania" }).click();
    await expect(page).toHaveURL(/internal\/large-orders\/[0-9a-f-]{36}\?kind=request/, { timeout: 60_000 });

    const [row] = await db.select().from(projectRequest).where(eq(projectRequest.contactEmail, investorEmail));
    expect(row.createdByStaffUserId).toBe(adminUserId);
    expect(row.staffConsentNote).toBe("Zgoda ustna, rozmowa telefoniczna");
    expect(row.contactLocale).toBe("de");
    expect(row.clientId).toBeNull();
    expect(row.unitCount).toBe(6);
    const [pending] = await db.select().from(pendingRegistration).where(eq(pendingRegistration.email, investorEmail));
    expect(pending?.role).toBe("client");
  });
});
