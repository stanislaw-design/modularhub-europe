import { expect, test } from "@playwright/test";

const DARK_BG = "rgb(17, 19, 24)";
// The v5-surface tier (cards/panels), one shade lighter than the page background above.
const DARK_SURFACE_BG = "rgb(24, 28, 36)";
const LIGHT_BG = "rgb(255, 255, 255)";

async function mainBackground(page: import("@playwright/test").Page) {
  return page.locator("#main-content").evaluate((el) => getComputedStyle(el).backgroundColor);
}

async function backgroundOf(locator: import("@playwright/test").Locator) {
  return locator.evaluate((el) => getComputedStyle(el).backgroundColor);
}

test.describe("Tryb ciemny flow klienta (spec 0043)", () => {
  test("otwiera się od razu w ciemnym motywie, gdy system preferuje ciemny i nie ma zapisanego wyboru (AC-3)", async ({
    page,
  }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/pl");

    await expect.poll(() => mainBackground(page)).toBe(DARK_BG);
    await expect(page.getByRole("button", { name: "Przełącz na jasny motyw" })).toBeVisible();
  });

  test("kliknięcie przełącznika w SiteHeader natychmiast zmienia motyw bez przeładowania (AC-2, AC-5)", async ({
    page,
  }) => {
    await page.goto("/pl/results");
    await expect(page.getByRole("button", { name: "Przełącz na ciemny motyw" })).toBeVisible();
    expect(await mainBackground(page)).toBe(LIGHT_BG);

    await page.getByRole("button", { name: "Przełącz na ciemny motyw" }).click();

    await expect(page.getByRole("button", { name: "Przełącz na jasny motyw" })).toBeVisible();
    // The color crossfade (app/globals.css) means the background doesn't snap
    // instantly, so poll rather than asserting the very next frame.
    await expect.poll(() => mainBackground(page)).toBe(DARK_BG);
  });

  test("jawny wybór przetrwa twarde przeładowanie i zmianę trasy, bez błysku złego motywu (AC-4)", async ({ page }) => {
    await page.goto("/pl");
    await page.getByRole("button", { name: "Przełącz na ciemny motyw" }).click();
    await expect(page.getByRole("button", { name: "Przełącz na jasny motyw" })).toBeVisible();

    // waitUntil: "commit" resolves as soon as the server response lands, before
    // hydration — the dark background must already be correct at that point
    // (the whole point of reading the cookie in the server component), not
    // something JS paints in afterwards.
    await page.goto("/pl", { waitUntil: "commit" });
    expect(await mainBackground(page)).toBe(DARK_BG);

    await page.goto("/pl/results", { waitUntil: "commit" });
    expect(await mainBackground(page)).toBe(DARK_BG);
  });

  test("mobilne menu SiteHeader (portalowany Headless UI Dialog) też jest ciemne, nie tylko strona pod spodem (AC-1, regresja z /check verify)", async ({
    page,
  }) => {
    // Headless UI's Dialog portals its panel to the end of document.body,
    // outside ThemeProvider's own wrapper div — a real bug this exact test
    // caught (2026-09-17), fixed by ThemeProvider mirroring theme-klient/
    // dark/light onto document.body too (components/ui/ThemeProvider.tsx).
    await page.goto("/pl/results");
    await page.getByRole("button", { name: "Przełącz na ciemny motyw" }).click();
    await expect(page.getByRole("button", { name: "Przełącz na jasny motyw" })).toBeVisible();
    await page.setViewportSize({ width: 375, height: 800 });

    await page.getByRole("button", { name: "Otwórz menu" }).click();
    const panel = page.locator('[role="dialog"] div[class*="bg-brand-v5-surface"]').first();

    await expect.poll(() => backgroundOf(panel)).toBe(DARK_SURFACE_BG);
  });

  test("mobilny arkusz filtrów ResultsFilterBar (też portalowany Dialog) jest ciemny (AC-1, regresja z /check verify)", async ({
    page,
  }) => {
    await page.goto("/pl/results");
    await page.getByRole("button", { name: "Przełącz na ciemny motyw" }).click();
    await expect(page.getByRole("button", { name: "Przełącz na jasny motyw" })).toBeVisible();
    await page.setViewportSize({ width: 375, height: 800 });

    const filterButton = page.getByRole("button", { name: "Filtruj" });
    await filterButton.waitFor({ state: "visible" });
    await filterButton.click();
    const panel = page.locator('[role="dialog"] div[class*="bg-brand-v5-surface"]').first();

    await expect.poll(() => backgroundOf(panel)).toBe(DARK_SURFACE_BG);
  });

  test("flow producenta pozostaje jasny nawet gdy system preferuje ciemny i cookie motywu jest ustawione na dark (AC-11)", async ({
    page,
    context,
  }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/pl/producer/export-readiness");
    await context.addCookies([{ name: "theme", value: "dark", url: page.url() }]);
    await page.reload();

    expect(await mainBackground(page)).toBe(LIGHT_BG);
    await expect(page.getByRole("button", { name: "Przełącz na jasny motyw" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Przełącz na ciemny motyw" })).toHaveCount(0);
  });
});
