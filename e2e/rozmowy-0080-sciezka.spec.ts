import { expect, test } from "@playwright/test";
import { eq, inArray, like } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { assertDevOrStagingDatabase } from "@/lib/db/dev-database-guard";
import { crmEntry, crmPartner, crmTask, crmThread, sessions, users } from "@/lib/db/schema";

// Spec 0080 AC-4, AC-9, AC-10, AC-11, AC-13, AC-15: pełna ścieżka administratora przez prawdziwy
// interfejs: firma, sprawa, wpis w dzienniku, zadanie, odhaczenie zadania. Na bazie dev. Uruchamiać przez:
//   node --env-file=.env.local node_modules/@playwright/test/cli.js test e2e/rozmowy-0080-sciezka.spec.ts
test.describe("spec 0080: ścieżka firma, sprawa, wpis, zadanie", () => {
  const adminUserId = crypto.randomUUID();
  const adminToken = crypto.randomUUID();
  const mark = `E2E Sciezka ${adminUserId.slice(0, 6)}`;
  const partnerName = `${mark} Firma`;
  const threadTitle = `${mark} Wycena łóżek`;
  const entryBody = `${mark} Rozmowa telefoniczna o cenie`;
  const taskTitle = `${mark} Wysłać specyfikację`;

  test.beforeAll(async () => {
    assertDevOrStagingDatabase();
    await db.insert(users).values({
      id: adminUserId,
      email: `e2e-sciezka-${adminUserId}@example.test`,
      phone: "+48000000893",
      role: "admin",
      name: "E2E Admin Sciezka",
      emailVerified: new Date(),
    });
    await db.insert(sessions).values({ sessionToken: adminToken, userId: adminUserId, expires: new Date(Date.now() + 3600_000) });
  });

  test.afterAll(async () => {
    const partners = await db.select({ id: crmPartner.id }).from(crmPartner).where(like(crmPartner.name, `${mark}%`));
    const ids = partners.map((row) => row.id);
    if (ids.length) {
      await db.delete(crmTask).where(inArray(crmTask.partnerId, ids));
      await db.delete(crmEntry).where(inArray(crmEntry.partnerId, ids));
      await db.delete(crmThread).where(inArray(crmThread.partnerId, ids));
      await db.delete(crmPartner).where(inArray(crmPartner.id, ids));
    }
    await db.delete(sessions).where(eq(sessions.sessionToken, adminToken));
    await db.delete(users).where(eq(users.id, adminUserId));
  });

  test("administrator zakłada firmę, sprawę, wpis i zadanie, a status sprawy idzie za zadaniem", async ({ page, context }) => {
    test.setTimeout(240_000);
    page.setDefaultTimeout(120_000);
    await context.addCookies([{ name: "authjs.session-token", value: adminToken, url: "http://localhost:3000", httpOnly: true, sameSite: "Lax" }]);

    // 1. Firma (AC-4).
    await page.goto("/pl/internal/conversations/partners");
    await page.getByText("Nowa firma", { exact: true }).click();
    const partnerForm = page.getByRole("form", { name: "Nowa firma" });
    await partnerForm.getByLabel("Nazwa firmy").fill(partnerName);
    await partnerForm.getByRole("button", { name: /Utwórz firmę|Utwórz mimo to/ }).click();
    await page.waitForURL(/\/internal\/conversations\/partners\/[0-9a-f-]{36}$/);
    await expect(page.getByRole("heading", { name: partnerName })).toBeVisible();

    // 2. Sprawa bez szablonu (AC-9): nowa sprawa bez zadań ma status "Otwarta" (AC-11).
    await page.getByText("Nowa sprawa", { exact: true }).click();
    const threadForm = page.getByRole("form", { name: "Nowa sprawa" });
    await threadForm.getByLabel("Tytuł sprawy").fill(threadTitle);
    await threadForm.getByRole("button", { name: "Utwórz sprawę" }).click();
    await page.waitForURL(/\/internal\/conversations\/threads\/[0-9a-f-]{36}$/);
    await expect(page.getByRole("heading", { name: threadTitle })).toBeVisible();
    await expect(page.getByText("Otwarta", { exact: true }).first()).toBeVisible();

    // 3. Wpis w dzienniku sprawy (AC-13).
    const entryForm = page.getByRole("form", { name: "Nowy wpis w dzienniku" });
    await entryForm.getByLabel("Treść").fill(entryBody);
    await entryForm.getByRole("button", { name: "Dodaj wpis" }).click();
    await expect(page.getByText(entryBody)).toBeVisible();

    // 4. Zadanie po naszej stronie (AC-10): sprawa przechodzi na "Czekamy na nas" (AC-11).
    const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Warsaw" });
    await page.locator("summary:visible", { hasText: "Nowe zadanie" }).click();
    const taskForm = page.getByRole("form", { name: "Nowe zadanie" });
    await taskForm.getByLabel("Tytuł zadania").fill(taskTitle);
    await taskForm.getByLabel("Termin (opcjonalnie)").fill(today);
    await taskForm.getByRole("button", { name: "Dodaj zadanie" }).click();
    await expect(page.getByText(taskTitle)).toBeVisible();
    await expect(page.getByText("Czekamy na nas", { exact: true }).first()).toBeVisible();

    // 5. Ekran "Najbliższe" pokazuje zadanie (AC-15).
    await page.goto("/pl/internal/conversations");
    await expect(page.getByText(taskTitle)).toBeVisible();

    // 6. Odhaczenie zadania: sprawa wraca do "Otwarta" (AC-11).
    await page.goto(`/pl/internal/conversations/partners/${(await db.select({ id: crmPartner.id }).from(crmPartner).where(eq(crmPartner.name, partnerName)))[0].id}`);
    await page.getByLabel("Sprawy", { exact: true }).getByRole("link", { name: threadTitle }).click();
    await page.waitForURL(/\/internal\/conversations\/threads\//);
    await page.getByRole("button", { name: "Zrobione" }).click();
    await expect(page.getByText("Czekamy na nas", { exact: true })).toHaveCount(0);
    await expect(page.getByText("Otwarta", { exact: true }).first()).toBeVisible();

    // Stan końcowy w bazie: jedna firma, jedna sprawa, jeden wpis, jedno zrobione zadanie.
    const [partner] = await db.select({ id: crmPartner.id }).from(crmPartner).where(eq(crmPartner.name, partnerName));
    const tasks = await db.select({ status: crmTask.status, createdBy: crmTask.createdBy }).from(crmTask).where(eq(crmTask.partnerId, partner.id));
    expect(tasks).toEqual([{ status: "done", createdBy: adminUserId }]);
    const entries = await db.select({ author: crmEntry.authorUserId }).from(crmEntry).where(eq(crmEntry.partnerId, partner.id));
    expect(entries).toEqual([{ author: adminUserId }]);
  });
});
