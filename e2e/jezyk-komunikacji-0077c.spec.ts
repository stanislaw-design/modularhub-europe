import { expect, test, type Page } from "@playwright/test";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { assertDevOrStagingDatabase } from "@/lib/db/dev-database-guard";
import { auditLog, producer, producerMember, sessions, users } from "@/lib/db/schema";

// Spec 0077 część C (AC-29, AC-33): producent i admin zmieniają język komunikacji producenta.
// Nie zakłada żadnego zapytania ani projektu, więc nie wysyła żadnych maili.
test.describe("spec 0077 C: język komunikacji producenta", () => {
  const ids = { admin: crypto.randomUUID(), pa: crypto.randomUUID(), pb: crypto.randomUUID() };
  const producerIds = { pa: crypto.randomUUID(), pb: crypto.randomUUID() };
  const tokens = { admin: crypto.randomUUID(), pa: crypto.randomUUID() };
  const tag = ids.admin.slice(0, 6);

  test.beforeAll(async () => {
    await assertDevOrStagingDatabase();
    await db.insert(users).values([
      { id: ids.admin, email: `e2e-0077c-admin-${tag}@example.test`, phone: "+48000000861", role: "admin", emailVerified: new Date() },
      { id: ids.pa, email: `e2e-0077c-pa-${tag}@example.test`, phone: "+48000000862", role: "producer", emailVerified: new Date() },
      { id: ids.pb, email: `e2e-0077c-pb-${tag}@example.test`, phone: "+48000000863", role: "producer", emailVerified: new Date() },
    ]);
    await db.insert(producer).values([
      { id: producerIds.pa, userId: ids.pa, nip: `E7CA${tag}00`, name: `E2E C A ${tag}`, countryCode: "PL", technology: "szkielet-drewniany" },
      { id: producerIds.pb, userId: ids.pb, nip: `E7CB${tag}00`, name: `E2E C B ${tag}`, countryCode: "PL", technology: "szkielet-drewniany" },
    ]);
    await db.insert(producerMember).values([
      { producerId: producerIds.pa, userId: ids.pa },
      { producerId: producerIds.pb, userId: ids.pb },
    ]);
    await db.insert(sessions).values([
      { sessionToken: tokens.admin, userId: ids.admin, expires: new Date(Date.now() + 3600_000) },
      { sessionToken: tokens.pa, userId: ids.pa, expires: new Date(Date.now() + 3600_000) },
    ]);
  });

  test.afterAll(async () => {
    await db.delete(sessions).where(inArray(sessions.sessionToken, Object.values(tokens)));
    await db.delete(auditLog).where(inArray(auditLog.actorUserId, Object.values(ids)));
    await db.delete(producerMember).where(inArray(producerMember.producerId, Object.values(producerIds)));
    await db.delete(producer).where(inArray(producer.id, Object.values(producerIds)));
    await db.delete(users).where(inArray(users.id, Object.values(ids)));
  });

  async function as(page: Page, key: keyof typeof tokens) {
    await page.context().clearCookies();
    await page.context().addCookies([
      { name: "authjs.session-token", value: tokens[key], url: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000", httpOnly: true, sameSite: "Lax" as const },
    ]);
  }

  async function savedLocale(producerId: string) {
    const [row] = await db.select({ locale: producer.communicationLocale }).from(producer).where(eq(producer.id, producerId));
    return row.locale;
  }

  test("producent zmienia swój język, a interfejs panelu zostaje polski (AC-29, AC-33)", async ({ page }) => {
    await as(page, "pa");
    await page.goto("/pl/producer/panel/settings");
    await expect(page.getByRole("heading", { name: "Język komunikacji" })).toBeVisible({ timeout: 120_000 });
    expect(await savedLocale(producerIds.pa)).toBe("pl");

    await page.getByRole("button", { name: "Polski" }).click();
    await page.getByRole("option", { name: "Deutsch" }).click();
    await page.getByRole("button", { name: "Zapisz zmiany" }).last().click();

    await expect(page.getByText("Zapisano.")).toBeVisible();
    await page.reload();
    await expect(page.getByRole("button", { name: "Deutsch" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Język komunikacji" })).toBeVisible();
    expect(page.url()).toContain("/pl/");
    expect(await savedLocale(producerIds.pa)).toBe("de");
  });

  test("admin zmienia język innego producenta na jego karcie (AC-29)", async ({ page }) => {
    await as(page, "admin");
    await page.goto(`/pl/internal/producers/${producerIds.pb}`);
    await expect(page.getByRole("heading", { name: "Język komunikacji" })).toBeVisible({ timeout: 120_000 });

    await page.getByRole("button", { name: "Polski" }).click();
    await page.getByRole("option", { name: "Nederlands" }).click();
    await page.getByRole("button", { name: "Zapisz język" }).click();

    await expect(page.getByText("Zapisano.")).toBeVisible();
    expect(await savedLocale(producerIds.pb)).toBe("nl");
  });

  test("producent nie wchodzi na kartę producenta w panelu admina (AC-29)", async ({ page }) => {
    await as(page, "pa");
    await page.goto(`/pl/internal/producers/${producerIds.pb}`);

    expect(page.url()).not.toContain("/internal/");
    await expect(page.getByRole("heading", { name: "Język komunikacji" })).toHaveCount(0);
  });
});
