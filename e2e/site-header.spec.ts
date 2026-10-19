import { expect, test } from "@playwright/test";

test.describe("SiteHeader mobile hamburger and menu (spec 0030)", () => {
  test("hamburger stays fully inside the viewport at 320-428px and opens the grouped menu (AC-1, AC-2, AC-3)", async ({
    page,
  }) => {
    // Jedno ładowanie, potem tylko zmiana szerokości: pięć pełnych ładowań
    // strony głównej w trybie dev nie mieści się w limicie czasu testu.
    await page.goto("/pl");
    for (const width of [320, 360, 375, 414, 428]) {
      await page.setViewportSize({ width, height: 700 });

      const hamburger = page.getByRole("button", { name: "Otwórz menu" });
      await expect(hamburger).toBeVisible();
      const box = await hamburger.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(width);
      expect(box!.width).toBeGreaterThanOrEqual(44);
      expect(box!.height).toBeGreaterThanOrEqual(44);
    }

    await page.getByRole("button", { name: "Otwórz menu" }).click();
    await expect(page.getByRole("navigation", { name: "Nawigacja" })).toBeVisible();
    await expect(page.getByRole("group", { name: "Konto" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Producenci", exact: true })).toHaveCount(0);
    // spec 0072 AC-2
    const headings = page.getByRole("navigation", { name: "Nawigacja" }).getByRole("heading", { level: 2 });
    await expect(headings).toHaveText(["Katalog", "Zamówienia", "Platforma", "Dla producentów"]);
  });

  test("Domy modułowe link in the menu opens the houses results (spec 0072 AC-3)", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 700 });
    await page.goto("/pl");

    await page.getByRole("button", { name: "Otwórz menu" }).click();
    await page
      .getByRole("navigation", { name: "Nawigacja" })
      .getByRole("link", { name: "Domy modułowe" })
      .click();

    await expect(page).toHaveURL(/\/pl\/results\?family=dom$/);
  });

  test("Sauny link opens /pl/sauna and is marked as the current page (spec 0072 AC-3, AC-8)", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 700 });
    await page.goto("/pl");

    await page.getByRole("button", { name: "Otwórz menu" }).click();
    await page.getByRole("navigation", { name: "Nawigacja" }).getByRole("link", { name: "Sauny" }).click();
    await expect(page).toHaveURL(/\/pl\/sauna$/);

    await page.getByRole("button", { name: "Otwórz menu" }).click();
    const nav = page.getByRole("navigation", { name: "Nawigacja" });
    await expect(nav.getByRole("link", { name: "Sauny" })).toHaveAttribute("aria-current", "page");
    await expect(nav.getByRole("link", { name: "Domy modułowe" })).not.toHaveAttribute("aria-current", "page");
  });

  test("Kontakt link opens the contact page with one h1 and no form (spec 0072 AC-4, AC-9)", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 700 });
    await page.goto("/pl");

    await page.getByRole("button", { name: "Otwórz menu" }).click();
    await page.getByRole("navigation", { name: "Nawigacja" }).getByRole("link", { name: "Kontakt" }).click();

    await expect(page).toHaveURL(/\/pl\/contact$/);
    await expect(page.getByRole("heading", { level: 1, name: "Kontakt" })).toHaveCount(1);
    await expect(page.locator("form")).toHaveCount(0);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    expect(overflow).toBe(false);
  });

  test("the contact page is available in all four languages (spec 0072 AC-9, AC-11)", async ({ page }) => {
    const headings = { pl: "Kontakt", en: "Contact", de: "Kontakt", nl: "Contact" };
    for (const [locale, heading] of Object.entries(headings)) {
      await page.goto(`/${locale}/contact`, { waitUntil: "domcontentloaded" });
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(heading);
    }
  });

  test("FAQ anchor exists on the home page (spec 0072 AC-4)", async ({ page }) => {
    await page.goto("/pl");
    await expect(page.locator("section#faq")).toHaveCount(1);
  });

  test("every menu link has a 44px touch target at 320px (spec 0072 AC-12)", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 700 });
    await page.goto("/pl");

    await page.getByRole("button", { name: "Otwórz menu" }).click();
    const links = page.getByRole("navigation", { name: "Nawigacja" }).getByRole("link");
    const count = await links.count();
    expect(count).toBeGreaterThan(0);
    for (let i = 0; i < count; i++) {
      const box = await links.nth(i).boundingBox();
      expect(box!.height).toBeGreaterThanOrEqual(44);
    }
  });
});
