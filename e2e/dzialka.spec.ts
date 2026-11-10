import { expect, test } from "@playwright/test";

// Spec 0082 AC-6: analiza działki jest wyłączona, adres zwraca 404 dla każdego.
test.describe("/pl/plot", () => {
  test("returns 404 with no parameters (AC-6)", async ({ page }) => {
    const response = await page.goto("/pl/plot");
    expect(response?.status()).toBe(404);
  });

  test("returns 404 with projects and country parameters (AC-6)", async ({ page }) => {
    const response = await page.goto("/pl/plot?projects=prj-modulor-family-90&country=DE&sizeMin=50");
    expect(response?.status()).toBe(404);
  });
});
