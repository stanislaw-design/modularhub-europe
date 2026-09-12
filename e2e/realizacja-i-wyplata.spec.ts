import { expect, test } from "@playwright/test";

const STORAGE_KEY = "producent:weryfikacja-firmy:zlozone";

test.describe("/pl/producer realizacja i wypłata (scope feature 16)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/pl/producer/fulfillments");
    await page.evaluate((key) => window.localStorage.removeItem(key), STORAGE_KEY);
  });

  // "Masz już zamówienie w realizacji?" na anonimowej stronie głównej
  // producenta zniknęło w spec 0032 (AC-10): strona główna dostała realny
  // CTA rejestracji/logowania, a link do realizacji przeniósł się do panelu
  // zalogowanego producenta (app/[locale]/producer/panel/page.tsx), który
  // wymaga prawdziwej sesji — ten plik jej nie zakłada. Test usunięty jako
  // sprawdzający usuniętą ścieżkę, nie regresję.

  test("full happy path: list → in-progress axis (no button) → delivered axis → verification → confirmation persists on reload", async ({
    page,
  }) => {
    await page.reload();
    await expect(page.getByRole("heading", { level: 2, name: "Budman Familia 90" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "Steel House Alpine 104" })).toBeVisible();

    // In-progress order: 4-stage axis, no verification button yet.
    await page
      .locator("div", { has: page.getByRole("heading", { level: 2, name: "Budman Familia 90" }) })
      .getByRole("link", { name: "Zobacz oś statusu" })
      .first()
      .click();
    await expect(page).toHaveURL(/fulfillment\?project=prj-budman-familia-90/);
    await expect(page.getByText("Montaż", { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Weryfikacja firmy i wypłata" })).toHaveCount(0);

    // Delivered order: banner + verification button.
    await page.goto("/pl/producer/fulfillment?project=prj-steelhouse-alpine-104");
    await expect(page.getByText("Zamówienie odebrane")).toBeVisible();
    await page.getByRole("link", { name: "Weryfikacja firmy i wypłata" }).click();
    await expect(page).toHaveURL(/company-verification\?project=prj-steelhouse-alpine-104/);

    await expect(page.getByRole("heading", { name: "Wymagane dokumenty" })).toBeVisible();
    const submit = page.getByRole("button", { name: "Wyślij do weryfikacji" });
    await expect(submit).toBeDisabled();

    await page
      .locator('input[type="file"]')
      .first()
      .setInputFiles({ name: "odpis.pdf", mimeType: "application/pdf", buffer: Buffer.from("odpis") });
    // Dłuższy timeout niż domyślne 5s: pod `next dev` (kompilacja stron na
    // żądanie, jeden proces) hydracja tej strony bywa wolniejsza, gdy
    // uruchamia się zaraz po innym teście w tym samym workerze (spec 0036
    // /check verify wykazał to jako flaky, niezwiązane z żadną zmianą trasy).
    await expect(submit).toBeEnabled({ timeout: 15_000 });
    await submit.click();

    await expect(page.getByText("Dokumenty przesłane do weryfikacji.")).toBeVisible();

    await page.reload();
    await expect(page.getByText("Dokumenty przesłane do weryfikacji.")).toBeVisible();
  });

  test("soft redirects: verification for a non-delivered order, and the axis with no project param", async ({
    page,
  }) => {
    await page.goto("/pl/producer/company-verification?project=prj-budman-familia-90");
    await expect(page).toHaveURL("/pl/producer/fulfillment?project=prj-budman-familia-90");

    await page.goto("/pl/producer/fulfillment");
    await expect(page).toHaveURL("/pl/producer/fulfillments");
  });

  test("keyboard pass: one H1 on the verification screen, and submit is reachable and activatable by keyboard", async ({
    page,
  }) => {
    await page.goto("/pl/producer/company-verification?project=prj-steelhouse-alpine-104");
    await expect(page.locator("h1")).toHaveCount(1);

    await page
      .locator('input[type="file"]')
      .first()
      .setInputFiles({ name: "odpis.pdf", mimeType: "application/pdf", buffer: Buffer.from("odpis") });

    await page.getByRole("button", { name: "Wyślij do weryfikacji" }).focus();
    await page.keyboard.press("Enter");

    await expect(page.getByText("Dokumenty przesłane do weryfikacji.")).toBeVisible();
  });
});
