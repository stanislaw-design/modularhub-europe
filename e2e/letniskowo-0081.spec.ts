import { expect, test } from "@playwright/test";
import pl from "../messages/pl.json";

// Spec 0081 AC-8, AC-9, AC-12: stylistyka wnętrza i opcje na stronie produktu przechodzą do linku zapytania.
// Dane Letniskowo (Bali) są w bazie deweloperskiej po `npm run import:letniskowo`. Formularza nie wysyłamy,
// żeby test nie tworzył spraw ani maili.
test.describe.configure({ timeout: 120_000 });

test("Bali: wybór stylistyki i opcji trafia do linku zapytania, kafelki nie idą przez /_next/image", async ({ page }) => {
  const imageRequests: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/_next/image")) imageRequests.push(request.url());
  });

  await page.goto("/pl/project/bali");
  const section = page.locator("#wnetrze");
  await expect(section.getByRole("heading", { level: 2, name: pl.KlientProjektPage.interiorStyles.heading })).toBeVisible();
  // Bez wyboru: podgląd pierwszej stylistyki, nic nie jest uznane za wybór (AC-8).
  await expect(section.getByText(pl.KlientProjektPage.interiorStyles.previewNote)).toBeVisible();

  await section.getByRole("link", { name: "Calm Stone" }).click();
  await expect(page).toHaveURL(/stylistyka=[0-9a-f-]{36}/);
  await expect(section.getByText(pl.KlientProjektPage.interiorStyles.chosenLabel, { exact: true })).toBeVisible();
  await expect(section.getByText("Sonoma Oak".toUpperCase(), { exact: false }).first()).toBeVisible();

  // Kafelki to zwykłe <img> z R2 (AC-9): żadnego żądania /_next/image dla próbników.
  const swatchSources = await section.locator("dl img").evaluateAll((images) => images.map((image) => (image as HTMLImageElement).src));
  expect(swatchSources.length).toBeGreaterThan(0);
  for (const src of swatchSources) expect(src).not.toContain("/_next/image");
  expect(imageRequests.filter((url) => url.includes("style-swatches"))).toEqual([]);

  // Link "zapytanie" niesie wariant, opcje i stylistykę (AC-12).
  const href = await page.getByRole("link", { name: pl.KlientProjektPage.sendInquiry }).first().getAttribute("href");
  expect(href).toMatch(/\/pl\/inquiry\?projects=/);
  expect(href).toContain("wariant=");
  expect(href).toContain("stylistyka=");
});

test("nieznana stylistyka w adresie jest ignorowana bez błędu (AC-8)", async ({ page }) => {
  const response = await page.goto("/pl/project/bali?stylistyka=nie-ma-takiej");
  expect(response?.status()).toBe(200);
  await expect(page.locator("#wnetrze")).toBeVisible();
  await expect(page.locator("#wnetrze").getByText(pl.KlientProjektPage.interiorStyles.previewNote)).toBeVisible();
});

test("produkt innego producenta nie ma sekcji stylistyk ani treści producenta (AC-10)", async ({ page }) => {
  await page.goto("/pl/project/framedev-6");
  await expect(page.locator("#wnetrze")).toHaveCount(0);
  await expect(page.locator("#wspolpraca")).toHaveCount(0);
  await expect(page.locator("#zastosowania")).toHaveCount(0);
});
