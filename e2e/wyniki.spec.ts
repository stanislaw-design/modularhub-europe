import { expect, test } from "@playwright/test";

test.describe("/pl/results", () => {
  // Counts/names below are read off the live catalog (Neon, real producer data), not a
  // fixed fixture — they drift as producers add products. Verified against the DB with
  // getProjects()/sortResults() (the same functions the page calls) on 2026-09-05; a
  // future catalog change means only these literals need a refresh, not the assertions'
  // shape.
  test("shows all 24 projects, unnamed country, and the choose-country hint when no params are given (AC-1, AC-3, AC-9)", async ({
    page,
  }) => {
    await page.goto("/pl/results");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("24 domy");
    await expect(page.getByText(/wybierz kraj w pasku wyżej/i)).toBeVisible();
    await expect(page.locator("article")).toHaveCount(24);
  });

  test("filters by country and size range, showing the DE/50-100 matches sorted featured-first then by price (AC-1, AC-2, AC-4, AC-7, AC-12)", async ({
    page,
  }) => {
    await page.goto("/pl/results?country=DE&sizeMin=50&sizeMax=100");

    await expect(page.getByRole("heading", { level: 1 })).toContainText("dopuszczonych w Niemczech");

    const cardNames = await page.locator("article h3").allTextContents();
    // Featured project first (Cocomodule CH-72), then every non-featured match by
    // ascending priceMin (default sort, spec 0026 Decision).
    expect(cardNames).toEqual([
      "Cocomodule CH-72",
      "Mary antresola",
      "Dom Pani Darii",
      "KA220 SZ",
      "Malutki DR-S",
      "Modulor Compact 56",
      "Cocomodule CH-90",
      "Modulor Family 90",
      "Karpaty Ridge 72",
    ]);

    // Cocomodule CH-90, Modulor Family 90 and Karpaty Ridge 72 are "conditional" in DE
    // and must show the badge.
    const badgedCards = page.locator("article", { has: page.getByText("Wymaga dodatkowych dokumentów") });
    await expect(badgedCards).toHaveCount(3);
  });

  test("ignores an invalid country while still applying a valid sizeMin (AC-5, AC-6)", async ({ page }) => {
    await page.goto("/pl/results?country=FR&sizeMin=50");
    // FR is invalid so no country filter applies; sizeMin=50 drops the six houses under 50 m²
    // (including Baltyk Studio 38, 38 m²).
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("18 domów");
    await expect(page.getByText("Baltyk Studio 38")).toHaveCount(0);
  });

  test("drops both size values when the range is reversed, showing all projects (AC-6)", async ({ page }) => {
    await page.goto("/pl/results?sizeMin=150&sizeMax=50");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("24 domy");
  });

  test("shows the empty state with a clear-filters action when nothing matches (AC-10)", async ({ page }) => {
    await page.goto("/pl/results?country=NL&sizeMin=200");
    await expect(page.locator("article")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: /brak domów/i })).toBeVisible();
    const clearLink = page.getByRole("link", { name: /wyczyść filtry/i });
    await expect(clearLink).toBeVisible();
    await expect(clearLink).toHaveAttribute("href", "/pl/results");
  });

  test("updates the URL and results when the filter bar is used (AC-11)", async ({ page }) => {
    await page.goto("/pl/results");
    await page.getByRole("button", { name: "Kraj docelowy" }).click();
    await page.getByRole("option", { name: "Niemcy" }).click();
    await page.getByRole("button", { name: "Szukaj" }).click();

    await expect(page).toHaveURL(/country=DE/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("dopuszczonych w Niemczech");
  });

  // Rebuilt as real, connected chips (spec 0026 AC-7): the "fully disabled" placeholder
  // bar (spec 0004 AC-13) is gone, replaced by CategoryFilterBar wired to real data.
  test("CategoryFilterBar chips are real enabled links that toggle the URL and preserve other filters (spec 0026 AC-7, AC-10)", async ({
    page,
  }) => {
    await page.goto("/pl/results?sort=size-desc");

    const heatPumpChip = page.getByRole("link", { name: "Pompa ciepła" });
    await expect(heatPumpChip).toBeEnabled();
    await expect(page.getByRole("link", { name: "Filtry" })).toHaveCount(0);

    await heatPumpChip.click();
    await expect(page).toHaveURL(/heatSource=pompa-ciepla/);
    await expect(page).toHaveURL(/sort=size-desc/);

    // Clicking the now-active chip again clears just that filter (toggle), keeping sort.
    await page.getByRole("link", { name: "Pompa ciepła" }).click();
    await expect(page).not.toHaveURL(/heatSource/);
    await expect(page).toHaveURL(/sort=size-desc/);
  });

  test("the keyword field and sort segment update the URL together when Szukaj is clicked (spec 0026 AC-5, AC-9)", async ({
    page,
  }) => {
    await page.goto("/pl/results");

    await page.getByLabel("Słowo kluczowe").fill("Baltyk");
    await page.getByRole("button", { name: "Sortowanie wyników" }).click();
    await page.getByRole("option", { name: "Cena: rosnąco" }).click();
    await page.getByRole("button", { name: "Szukaj" }).click();

    await expect(page).toHaveURL(/q=Baltyk/);
    await expect(page).toHaveURL(/sort=price-asc/);
  });

  test("keyboard pass: exactly one H1 and visible focus rings on interactive elements (AC-14)", async ({
    page,
  }) => {
    await page.goto("/pl/results");
    await expect(page.locator("h1")).toHaveCount(1);

    await page.keyboard.press("Tab");
    const skipLink = page.getByRole("link", { name: /przejdź do treści/i });
    await expect(skipLink).toBeFocused();
    await expect(skipLink).toHaveCSS("box-shadow", /.+/);

    const searchButton = page.getByRole("button", { name: "Szukaj" });
    await expect(searchButton).toHaveClass(/focus-ring/);
  });

  test("the home page's search card sends country and the selected size range to results (regression, spec 0014 AC-3/AC-4, replaces the old FeaturedHomes-card assertion)", async ({
    page,
  }) => {
    await page.goto("/pl");

    await page.getByRole("button", { name: "W czym mogę pomóc?" }).click();
    await page.getByRole("button", { name: "Kraj docelowy" }).click();
    await page.getByRole("option", { name: "Niemcy" }).click();
    await page.getByRole("button", { name: "Powierzchnia" }).click();
    await page.getByRole("option", { name: "50–100 m²" }).click();
    await page.getByRole("button", { name: "Szukaj domów" }).click();

    await expect(page).toHaveURL(/\/pl\/results\?/);
    const url = new URL(page.url());
    expect(url.searchParams.get("country")).toBe("DE");
    expect(url.searchParams.get("sizeMin")).toBe("50");
    expect(url.searchParams.get("sizeMax")).toBe("100");
  });

  test("the home page's search card leaves sizeMin/sizeMax off the URL when Powierzchnia stays on Dowolna (regression, spec 0014 AC-4 edge case)", async ({
    page,
  }) => {
    await page.goto("/pl");

    await page.getByRole("button", { name: "W czym mogę pomóc?" }).click();
    await page.getByRole("button", { name: "Kraj docelowy" }).click();
    await page.getByRole("option", { name: "Polska" }).click();
    await page.getByRole("button", { name: "Szukaj domów" }).click();

    await expect(page).toHaveURL(/\/pl\/results\?/);
    const url = new URL(page.url());
    expect(url.searchParams.get("country")).toBe("PL");
    expect(url.searchParams.has("sizeMin")).toBe(false);
    expect(url.searchParams.has("sizeMax")).toBe(false);
  });
});
