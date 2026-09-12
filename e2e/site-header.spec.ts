import { expect, test } from "@playwright/test";

test.describe("SiteHeader mobile hamburger and menu (spec 0030)", () => {
  test("hamburger stays fully inside the viewport at 320-428px and opens the two-group menu (AC-1, AC-2, AC-3)", async ({
    page,
  }) => {
    for (const width of [320, 360, 375, 414, 428]) {
      await page.setViewportSize({ width, height: 700 });
      await page.goto("/pl");

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
    await expect(page.getByRole("link", { name: "Producenci" })).toHaveCount(0);
  });

  test("Projekty link in the menu navigates to /results (AC-3)", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 700 });
    await page.goto("/pl");

    await page.getByRole("button", { name: "Otwórz menu" }).click();
    await page.getByRole("navigation", { name: "Nawigacja" }).getByRole("link", { name: "Projekty" }).click();

    await expect(page).toHaveURL(/\/pl\/results$/);
  });
});
