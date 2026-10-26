import { expect, test } from "@playwright/test";
import pl from "../messages/pl.json";

// Spec 0076 AC-6, AC-7, AC-11: lista realizacji, wpis i przycisk "Zleć podobny projekt".
test.describe.configure({ timeout: 120_000 });

test("lista, wpis i przejście do formularza dużego projektu", async ({ page }) => {
  await page.goto("/pl/modularprojects");
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(pl.ModularProjectsPage.heading);

  const card = page.getByRole("link", { name: /CocoLeisure/ });
  await expect(card).toHaveAttribute("href", "/pl/modularprojects/cocoleisure");
  await card.click();

  await expect(page).toHaveURL(/\/pl\/modularprojects\/cocoleisure$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
  for (const name of Object.values(pl.ModularProjectPage.groups)) {
    await expect(page.getByRole("heading", { level: 2, name })).toBeVisible();
  }
  const jsonLd = JSON.parse((await page.locator('script[type="application/ld+json"]').textContent()) ?? "null");
  expect(jsonLd["@type"]).toBe("Article");

  await page.getByRole("link", { name: pl.ModularProjectPage.investorCta }).click();
  await expect(page).toHaveURL(/\/pl\/project-request$/);
});

test("nieznany wpis daje 404", async ({ page }) => {
  const response = await page.goto("/pl/modularprojects/nie-ma-takiego");
  expect(response?.status()).toBe(404);
});

test("wpis w języku angielskim ma tytuł po angielsku i hreflang", async ({ page }) => {
  await page.goto("/en/modularprojects/cocoleisure");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("CocoLeisure – 49 modern holiday cabins");
  await expect(page.locator('link[rel="alternate"][hreflang="de"]')).toHaveAttribute("href", /\/de\/modularprojects\/cocoleisure$/);
});
