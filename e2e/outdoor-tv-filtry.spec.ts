import { expect, test } from "@playwright/test";

// Spec 0071. Dev ma 6 produktow MirageVision (Silver, Gold, Platinum, 3 szafy), ale liczby
// nie sa sprawdzane na sztywno poza relacjami: filtr zawęza, szafy znikaja przy "przeznaczeniu".
test.describe("/pl/results?family=outdoor-tv (spec 0071)", () => {
  test("shows chips instead of country, size and sort fields (AC-1)", async ({ page }) => {
    await page.goto("/pl/results?family=outdoor-tv");

    await expect(page.getByRole("link", { name: "Na ścianę" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Pełne słońce" })).toBeVisible();
    await expect(page.getByText(/^(Kraj|Metraż od|Sortuj)$/)).toHaveCount(0);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Outdoor TV");
  });

  test("narrows with chips, writes the URL and toggles off again (AC-2, AC-7, AC-13)", async ({ page }) => {
    await page.goto("/pl/results?family=outdoor-tv");
    const all = await page.locator("article").count();

    await page.getByRole("link", { name: "Na ścianę", exact: true }).click();
    await expect(page).toHaveURL(/mounting=na-sciane/);
    await page.getByRole("link", { name: "Pełne słońce" }).click();
    await expect(page).toHaveURL(/purpose=pelne-slonce/);
    await expect(page.getByRole("link", { name: "Pełne słońce" })).toHaveAttribute("aria-current", "true");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("1 produkt Outdoor TV");

    await page.getByRole("link", { name: "Pełne słońce" }).click();
    await expect(page).not.toHaveURL(/purpose=/);
    await expect(page).toHaveURL(/mounting=na-sciane/);
    expect(await page.locator("article").count()).toBeLessThanOrEqual(all);
  });

  test("the purpose filter hides cabinets and dead params hide nothing (AC-4, AC-5)", async ({ page }) => {
    await page.goto("/pl/results?family=outdoor-tv");
    const all = await page.locator("article").count();

    await page.goto("/pl/results?family=outdoor-tv&country=PL&sizeMin=60&priceMax=50000&sort=price-asc");
    expect(await page.locator("article").count()).toBe(all);

    await page.goto("/pl/results?family=outdoor-tv&purpose=cien");
    expect(await page.locator("article").count()).toBeLessThan(all);
    await expect(page.locator("article", { hasText: "Lift" })).toHaveCount(0);
  });

  test("ignores invalid values and shows the empty state with a clear link (AC-3, AC-13)", async ({ page }) => {
    const bad = await page.goto("/pl/results?family=outdoor-tv&mounting=xyz&purpose=abc");
    expect(bad?.status()).toBe(200);
    expect(await page.locator("article").count()).toBeGreaterThan(0);

    await page.goto("/pl/results?family=outdoor-tv&q=zzzzqqxx");
    await expect(page.getByRole("link", { name: "Wyczyść filtry" }).first()).toHaveAttribute(
      "href",
      "/pl/results?family=outdoor-tv",
    );
  });

  test("the other families keep the old search bar (AC-1)", async ({ page }) => {
    await page.goto("/pl/results?family=spa-modulowe");
    await expect(page.locator("#results-search-q")).toBeAttached();
    await expect(page.locator("#outdoor-tv-search-q")).toHaveCount(0);
  });
});
