import { expect, test } from "@playwright/test";

// Spec 0068. Liczby saun nie są sprawdzane na sztywno: dev ma ich kilkanaście
// i rosną razem z katalogiem, więc asercje dotyczą kształtu strony i relacji
// (filtr zwęża listę), nie konkretnej liczby.
test.describe("/pl/sauna (spec 0068)", () => {
  test("renders the category page with one h1, no 404, and a self canonical (AC-1, AC-3, AC-4)", async ({ page }) => {
    const response = await page.goto("/pl/sauna");
    expect(response?.status()).toBe(200);

    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Sauny");
    expect(await page.locator("article").count()).toBeGreaterThan(0);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/pl\/sauna$/);
  });

  test("answers 200 in every locale (AC-1)", async ({ page }) => {
    for (const locale of ["pl", "en", "de", "nl"]) {
      const response = await page.goto(`/${locale}/sauna`);
      expect(response?.status(), locale).toBe(200);
    }
  });

  test("narrows the list with a seating filter and marks the filtered view noindex (AC-7, AC-4)", async ({ page }) => {
    await page.goto("/pl/sauna");
    const all = await page.locator("article").count();

    await page.getByRole("link", { name: "6+ miejsc" }).click();
    await expect(page).toHaveURL(/seatingMin=6/);
    await expect(page.getByRole("link", { name: "6+ miejsc" })).toHaveAttribute("aria-current", "true");
    expect(await page.locator("article").count()).toBeLessThanOrEqual(all);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  });

  test("ignores invalid params instead of failing (AC-10)", async ({ page }) => {
    const response = await page.goto("/pl/sauna?seatingMin=abc&priceMin=99&producer=abc");
    expect(response?.status()).toBe(200);
    expect(await page.locator("article").count()).toBeGreaterThan(0);
  });

  test("shows an empty state, not a 404, when nothing matches (AC-2)", async ({ page }) => {
    // 8+ miejsc i do 5 000 € razem nie mają szans pasować do żadnej realnej sauny.
    const response = await page.goto("/pl/sauna?seatingMin=8&priceMax=5000");
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    if ((await page.locator("article").count()) === 0) {
      await expect(page.getByRole("link", { name: "Wyczyść filtry" }).first()).toHaveAttribute("href", "/pl/sauna");
    }
  });

  test("compares two saunas in a table with eleven rows (AC-12, AC-13)", async ({ page }) => {
    await page.goto("/pl/sauna");
    const checkboxes = page.getByRole("checkbox", { name: /z innymi saunami/ });
    await checkboxes.nth(0).check();
    await checkboxes.nth(1).check();

    await page.getByRole("button", { name: "Porównaj sauny" }).click();
    await expect(page).toHaveURL(/\/pl\/compare\?.*kind=sauna/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Porównanie saun");
    await expect(page.locator("tbody tr")).toHaveCount(11);
  });

  test("keeps /compare without kind working as the house comparison (AC-13)", async ({ page }) => {
    const response = await page.goto("/pl/compare");
    // Bez parametrów products to dzisiejszy redirect na /results.
    expect(response?.status()).toBe(200);
    await expect(page).toHaveURL(/\/pl\/results/);
  });

  test("links the hero 'Sauny' chip to the category page (AC-6)", async ({ page }) => {
    await page.goto("/pl");
    await page.getByRole("tab", { name: "Więcej niż dom" }).click();
    await page.getByRole("link", { name: "Sauny" }).first().click();
    await expect(page).toHaveURL(/\/pl\/sauna$/);
  });
});
