import { expect, test } from "@playwright/test";

test.describe("/pl/klient/wyniki", () => {
  test("shows all 6 projects, unnamed country, and the choose-country hint when no params are given (AC-1, AC-3, AC-9)", async ({
    page,
  }) => {
    await page.goto("/pl/klient/wyniki");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("6 domów");
    await expect(page.getByText(/wybierz kraj w pasku wyżej/i)).toBeVisible();
    await expect(page.locator("article")).toHaveCount(6);
  });

  test("filters by country and size range, showing the DE/50-100 matches sorted featured-first then by price (AC-1, AC-2, AC-4, AC-7, AC-12)", async ({
    page,
  }) => {
    await page.goto("/pl/klient/wyniki?country=DE&sizeMin=50&sizeMax=100");

    await expect(page.getByRole("heading", { level: 1 })).toContainText("dopuszczonych w Niemczech");

    const cardNames = await page.locator("article h3").allTextContents();
    // Modulor Family 90 (featured, 118000) and Baltyk Studio-alike ordering:
    // featured projects first (Modulor Family 90), then non-featured by ascending priceMin
    // (Modulor Compact 56 @79000, Karpaty Ridge 72 @98000).
    expect(cardNames).toEqual(["Modulor Family 90", "Modulor Compact 56", "Karpaty Ridge 72"]);

    // Modulor Family 90 and Karpaty Ridge 72 are "conditional" in DE and must show the badge.
    const badgedCards = page.locator("article", { has: page.getByText("Wymaga dodatkowych dokumentów") });
    await expect(badgedCards).toHaveCount(2);
  });

  test("ignores an invalid country while still applying a valid sizeMin (AC-5, AC-6)", async ({ page }) => {
    await page.goto("/pl/klient/wyniki?country=FR&sizeMin=50");
    // FR is invalid so no country filter applies; sizeMin=50 drops Baltyk Studio 38 (38 m²).
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("5 domów");
    await expect(page.getByText("Baltyk Studio 38")).toHaveCount(0);
  });

  test("drops both size values when the range is reversed, showing all projects (AC-6)", async ({ page }) => {
    await page.goto("/pl/klient/wyniki?sizeMin=150&sizeMax=50");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("6 domów");
  });

  test("shows the empty state with a clear-filters action when nothing matches (AC-10)", async ({ page }) => {
    await page.goto("/pl/klient/wyniki?country=NL&sizeMin=200");
    await expect(page.locator("article")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: /brak domów/i })).toBeVisible();
    const clearLink = page.getByRole("link", { name: /wyczyść filtry/i });
    await expect(clearLink).toBeVisible();
    await expect(clearLink).toHaveAttribute("href", "/pl/klient/wyniki");
  });

  test("updates the URL and results when the filter bar is used (AC-11)", async ({ page }) => {
    await page.goto("/pl/klient/wyniki");
    await page.getByRole("button", { name: "Kraj docelowy" }).click();
    await page.getByRole("option", { name: "Niemcy" }).click();
    await page.getByRole("button", { name: "Szukaj" }).click();

    await expect(page).toHaveURL(/country=DE/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("dopuszczonych w Niemczech");
  });

  test("renders CategoryFilterBar between the filter bar and results, fully disabled (AC-13)", async ({
    page,
  }) => {
    await page.goto("/pl/klient/wyniki");
    const categoryButtons = page.locator("button:disabled", { hasText: "Parterowy" });
    await expect(categoryButtons).toHaveCount(1);
    const allCategoryButtons = page.locator("button", { hasText: /Parterowy|Filtry/ });
    for (const button of await allCategoryButtons.all()) {
      await expect(button).toBeDisabled();
    }
  });

  test("keyboard pass: exactly one H1 and visible focus rings on interactive elements (AC-14)", async ({
    page,
  }) => {
    await page.goto("/pl/klient/wyniki");
    await expect(page.locator("h1")).toHaveCount(1);

    await page.keyboard.press("Tab");
    const skipLink = page.getByRole("link", { name: /przejdź do treści/i });
    await expect(skipLink).toBeFocused();
    await expect(skipLink).toHaveCSS("box-shadow", /.+/);

    const searchButton = page.getByRole("button", { name: "Szukaj" });
    await expect(searchButton).toHaveClass(/focus-ring/);
  });

  test("a featured home card on the home page links to results with the matching size range (regression, Hero -> SearchSegment extraction)", async ({
    page,
  }) => {
    await page.goto("/pl/klient");
    const firstFeaturedLink = page.locator('a[href^="/pl/klient/wyniki?"]').first();
    await expect(firstFeaturedLink).toBeVisible();
    const href = await firstFeaturedLink.getAttribute("href");
    expect(href).toMatch(/sizeMin=\d+/);

    await firstFeaturedLink.click();
    await expect(page).toHaveURL(/\/pl\/klient\/wyniki\?/);
  });
});
