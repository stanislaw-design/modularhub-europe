import { expect, test } from "@playwright/test";

test.describe("/pl/project/[id]", () => {
  test("renders sections in the specced order and links from the results list (AC-1, AC-2, AC-3)", async ({
    page,
  }) => {
    // First navigation of the run can hit Next dev's cold on-demand compile for
    // this route; a generous timeout here avoids depending on some earlier test
    // in the file having already warmed the server.
    await page.goto("/pl/results", { timeout: 60_000 });
    await page.getByRole("link", { name: "Zobacz szczegóły projektu Modulor Family 90" }).click();

    await expect(page).toHaveURL(/\/pl\/project\/prj-modulor-family-90$/);
    await expect(page.getByRole("heading", { level: 1, name: "Modulor Family 90" })).toBeVisible();

    const headingOrder = await page.getByRole("heading", { level: 2 }).allTextContents();
    expect(headingOrder).toEqual([
      "Efektywność energetyczna",
      "Warunki komercyjne",
      "Producent",
    ]);

    await expect(page.getByRole("link", { name: "Wyślij zapytanie" }).first()).toHaveAttribute(
      "href",
      "/pl/inquiry?projects=prj-modulor-family-90"
    );
    // "Dodaj do shortlisty"/"Sprawdź działkę pod ten projekt" used to also
    // close the page as a button row; that row is gone (redundant with the
    // mobile sticky bar's icon buttons, and desktop already has "Porównaj z
    // innym domem" in the hero card), so there's nothing left to assert here
    // at this (desktop) viewport.
  });

  test("hides sections with no source data, without an empty placeholder (AC-4)", async ({ page }) => {
    await page.goto("/pl/project/prj-modulor-compact-56");

    await expect(page.getByRole("heading", { name: "Certyfikaty" })).toHaveCount(0);
    await expect(page.getByText("Kwalifikuje się do zgłoszenia uproszczonego")).toHaveCount(0);
    await expect(page.getByText("Nie kwalifikuje się do zgłoszenia uproszczonego")).toHaveCount(0);
  });

  test("shows Wycena indywidualna instead of a price range when priceOnRequest is true (AC-5)", async ({
    page,
  }) => {
    await page.goto("/pl/project/prj-baltyk-loft-120");

    await expect(page.getByText("Wycena indywidualna")).toBeVisible();
    await expect(page.getByText(/\d{3}\s?000.*€/)).toHaveCount(0);
  });

  test("returns Next.js's standard 404 for an unknown project id (AC-6)", async ({ page }) => {
    const response = await page.goto("/pl/project/nieistniejace-id");
    expect(response?.status()).toBe(404);
    await expect(page.getByText("404")).toBeVisible();
  });

  test("shows the legal compliance panel only with a known ?country= and hides it otherwise (AC-7)", async ({
    page,
  }) => {
    await page.goto("/pl/project/prj-modulor-family-90?country=DE");
    await expect(page.getByRole("heading", { name: "Zgodność prawna w Niemcy" })).toBeVisible();
    await expect(page.getByText("Wymaga dodatkowych dokumentów")).toBeVisible();

    await page.goto("/pl/project/prj-modulor-family-90");
    await expect(page.getByText(/Zgodność prawna w/)).toHaveCount(0);
  });

  test("gives two different projects distinct metadata, canonical and JSON-LD (AC-9)", async ({ page }) => {
    await page.goto("/pl/project/prj-modulor-family-90");
    const titleA = await page.title();
    const canonicalA = await page.locator('link[rel="canonical"]').getAttribute("href");
    const ldA = await page.locator('script[type="application/ld+json"]').textContent();

    await page.goto("/pl/project/prj-baltyk-loft-120");
    const titleB = await page.title();
    const canonicalB = await page.locator('link[rel="canonical"]').getAttribute("href");
    const ldB = await page.locator('script[type="application/ld+json"]').textContent();

    expect(titleA).not.toBe(titleB);
    expect(canonicalA).not.toBe(canonicalB);
    expect(ldA).not.toBe(ldB);

    const parsedA = JSON.parse(ldA ?? "{}");
    expect(parsedA["@type"]).toBe("Product");
    expect(parsedA.offers.lowPrice).toBeGreaterThan(0);

    const parsedB = JSON.parse(ldB ?? "{}");
    // prj-baltyk-loft-120 has priceOnRequest: true, so JSON-LD must not claim a fixed price.
    expect(parsedB.offers).toBeUndefined();
  });
});
