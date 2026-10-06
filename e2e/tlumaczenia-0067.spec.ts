import { expect, test } from "@playwright/test";

// Spec 0067 AC-1, AC-2, AC-7, AC-11: na stronach produktu w en/de/nl teksty z
// danych (opcje konfiguratora, opis producenta) są w języku strony, a polska
// strona zostaje po polsku. Dane: sauna Kora Relax 550 po backfillu tłumaczeń.
const SAUNA = "relax-550";

test.describe("tłumaczenia danych produktu (spec 0067)", () => {
  test("en: option groups, options and producer description are English, no Polish source (AC-1, AC-2, AC-11)", async ({
    page,
  }) => {
    await page.goto(`/en/sauna/${SAUNA}`);
    const body = page.locator("body");

    await expect(body).toContainText("Wood stain colour");
    await expect(body).toContainText("Anthracite");
    await expect(body).toContainText("Polish manufacturer of outdoor saunas");
    await expect(body).not.toContainText("Kolor impregnacji drewna");
    await expect(body).not.toContainText("Polski producent saun");
  });

  test("de: option group and producer description are German (AC-1, AC-2)", async ({ page }) => {
    await page.goto(`/de/sauna/${SAUNA}`);
    const body = page.locator("body");

    await expect(body).toContainText("Farbton der Holzimprägnierung");
    await expect(body).toContainText("Polnischer Hersteller von Außensaunen");
    await expect(body).not.toContainText("Kolor impregnacji drewna");
  });

  test("nl: option group is Dutch (AC-1)", async ({ page }) => {
    await page.goto(`/nl/sauna/${SAUNA}`);

    await expect(page.locator("body")).toContainText("Kleur van de houtimpregnatie");
    await expect(page.locator("body")).not.toContainText("Kolor impregnacji drewna");
  });

  test("pl: the Polish page keeps the Polish source texts (AC-7)", async ({ page }) => {
    await page.goto(`/pl/sauna/${SAUNA}`);

    await expect(page.locator("body")).toContainText("Kolor impregnacji drewna");
    await expect(page.locator("body")).toContainText("Polski producent saun zewnętrznych");
    await expect(page.locator("body")).not.toContainText("Wood stain colour");
  });
});
