import { expect, test } from "@playwright/test";

// Spec 0069 AC-1, AC-2, AC-4, AC-6, AC-9: wersja układu wnętrz wybrana opcją
// zmienia rzuty, pomieszczenia, metraż i opis. Dane: Logbar Bingo Perfeco A
// (cztery wersje układu, backfill zadania 7) i Logbar Lord (bez wersji układu).
const BINGO = "logbar-bingo-pietrowy-perfeco-a";
const LORD = "logbar-lord";

test.describe("wersje układu wnętrz (spec 0069)", () => {
  test("pl: wybór wersji 2 zmienia pomieszczenia, metraż, opis i rzuty (AC-1, AC-2, AC-4)", async ({ page }) => {
    await page.goto(`/pl/project/${BINGO}`);
    const layout = page.locator("#uklad");

    // Wersja podstawowa (opcja domyślna): pomieszczenia produktu, bez opisu wersji.
    await expect(layout).toContainText(/82[.,]09 m²/);
    await expect(layout).not.toContainText("Garderoba");

    await page.getByRole("radio", { name: /Wersja 2/ }).click();
    await expect(page).toHaveURL(/opcje=/);

    await expect(layout).toContainText(/91[.,]05 m²/);
    await expect(layout).toContainText("Trzy pokoje na poddaszu");
    await expect(page.locator("#uklad")).toContainText("Pomieszczenie techniczne");
    await expect(page.locator("#uklad")).toContainText("Garderoba");
  });

  test("pl: zakładka Rzut pokazuje podpisane rzuty wybranej wersji, a zmiana opcji ją zachowuje (AC-2)", async ({ page }) => {
    await page.goto(`/pl/project/${BINGO}?zakladka=rzut`);

    await expect(page.getByText("Wersja podstawowa · Parter")).toBeVisible();
    await expect(page.getByText("Wersja podstawowa · Piętro")).toBeVisible();

    await page.getByRole("radio", { name: /Wersja 2/ }).click();
    await expect(page).toHaveURL(/zakladka=rzut/);
    await expect(page.getByText("Wersja 2 · Parter")).toBeVisible();
    await expect(page.getByText("Wersja 2 · Piętro")).toBeVisible();
    await expect(page.getByText("Wersja podstawowa · Parter")).toHaveCount(0);
  });

  test("en: version name, description, rooms and floor names are English (AC-6)", async ({ page }) => {
    await page.goto(`/en/project/${BINGO}?zakladka=rzut`);
    await page.getByRole("radio", { name: /Version 2/ }).click();

    await expect(page.getByText("Version 2 · Ground floor")).toBeVisible();
    await expect(page.getByText("Version 2 · First floor")).toBeVisible();
    const layout = page.locator("#uklad");
    await expect(layout).toContainText("Three rooms upstairs");
    await expect(layout).toContainText("Walk-in wardrobe");
    await expect(layout).not.toContainText("Garderoba");
  });

  test("product without layout versions looks as before: neutral captions, no version description (AC-9)", async ({ page }) => {
    await page.goto(`/pl/project/${LORD}?zakladka=rzut`);

    await expect(page.getByText("Rzut 1", { exact: true })).toBeVisible();
    await expect(page.getByText("Rzut 2", { exact: true })).toBeVisible();
    await expect(page.locator("#uklad p").filter({ hasText: "Układ pomieszczeń jak w wersji" })).toHaveCount(0);
  });
});
