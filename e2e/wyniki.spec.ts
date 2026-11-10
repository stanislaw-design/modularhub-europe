import { expect, test } from "@playwright/test";

test.describe("/pl/results", () => {
  // Counts/names below are read off the live catalog (Neon, real producer data), not a
  // fixed fixture — they drift as producers add products. Verified against the DB with
  // getProjects()/sortResults() (the same functions the page calls) on 2026-09-05; a
  // future catalog change means only these literals need a refresh, not the assertions'
  // shape.
  test("shows a hint that says nothing about law or country when no params are given (AC-1, AC-3, spec 0082 AC-8)", async ({
    page,
  }) => {
    await page.goto("/pl/results");
    await expect(page.getByText(/zawęź listę według metrażu/i)).toBeVisible();
    await expect(page.getByText(/wybierz kraj w filtrach|dopuszczone prawnie/i)).toHaveCount(0);
    expect(await page.locator("article").count()).toBeGreaterThan(0);
  });

  // Spec 0082 AC-3, AC-5: kraj w adresie to tylko podpowiedź, nie zawęża wyników i nie pokazuje ocen.
  test("country in the URL never changes the list and shows no compliance text (spec 0082 AC-3, AC-5)", async ({
    page,
  }) => {
    await page.goto("/pl/results");
    const withoutCountry = await page.locator("article h3").allTextContents();
    expect(withoutCountry.length).toBeGreaterThan(0);

    for (const country of ["DE", "BE", "XX"]) {
      await page.goto(`/pl/results?country=${country}`);
      expect(await page.locator("article h3").allTextContents()).toEqual(withoutCountry);
      await expect(page.getByText(/dopuszczone prawnie/i)).toHaveCount(0);
      await expect(page.getByText("Wymaga dodatkowych dokumentów")).toHaveCount(0);
    }
  });

  test("ignores an invalid country while still applying a valid sizeMin (AC-5, AC-6)", async ({ page }) => {
    await page.goto("/pl/results?sizeMin=50");
    const expected = await page.getByRole("heading", { level: 1 }).textContent();
    await page.goto("/pl/results?country=XX&sizeMin=50");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(expected ?? "");
    await expect(page.getByText("Baltyk Studio 38")).toHaveCount(0);
  });

  test("drops both size values when the range is reversed, showing all projects (AC-6)", async ({ page }) => {
    await page.goto("/pl/results");
    const all = await page.getByRole("heading", { level: 1 }).textContent();
    await page.goto("/pl/results?sizeMin=150&sizeMax=50");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(all ?? "");
  });

  test("shows the empty state with a clear-filters action when nothing matches (AC-10)", async ({ page }) => {
    await page.goto("/pl/results?sizeMin=200&priceMax=50000");
    await expect(page.locator("article")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: /brak domów/i })).toBeVisible();
    const clearLink = page.getByRole("link", { name: /wyczyść filtry/i });
    await expect(clearLink).toBeVisible();
    await expect(clearLink).toHaveAttribute("href", "/pl/results");
  });

  test("the filter bar has no country field and keeps the country from the URL when another filter changes (spec 0082 AC-8)", async ({
    page,
  }) => {
    await page.goto("/pl/results?country=DE");
    await expect(page.getByRole("button", { name: "Kraj docelowy" })).toHaveCount(0);

    await page.getByRole("button", { name: "Szukaj" }).click();
    await expect(page).toHaveURL(/country=DE/);
  });

  // Rebuilt as real, connected chips (spec 0026 AC-7): the "fully disabled" placeholder
  // bar (spec 0004 AC-13) is gone, replaced by CategoryFilterBar wired to real data.
  test("CategoryFilterBar chips are real enabled links that toggle the URL and preserve other filters (spec 0026 AC-7, AC-10)", async ({
    page,
  }) => {
    await page.goto("/pl/results?sort=size-desc");

    const singleStoreyChip = page.getByRole("link", { name: "Parterowy" });
    await expect(singleStoreyChip).toBeEnabled();
    await expect(page.getByRole("link", { name: "Filtry" })).toHaveCount(0);

    await singleStoreyChip.click();
    await expect(page).toHaveURL(/storeys=parterowy/);
    await expect(page).toHaveURL(/sort=size-desc/);

    // Clicking the now-active chip again clears just that filter (toggle), keeping sort.
    await page.getByRole("link", { name: "Parterowy" }).click();
    await expect(page).not.toHaveURL(/storeys/);
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

    await page.getByRole("button", { name: "Kraj docelowy" }).click();
    await page.getByRole("option", { name: "Belgia" }).click();
    await page.getByRole("button", { name: "Szukaj domów" }).click();

    await expect(page).toHaveURL(/\/pl\/results\?/);
    const url = new URL(page.url());
    expect(url.searchParams.get("country")).toBe("BE");
    expect(url.searchParams.has("sizeMin")).toBe(false);
    expect(url.searchParams.has("sizeMax")).toBe(false);
  });
});
