import { expect, test } from "@playwright/test";
import de from "../messages/de.json";
import pl from "../messages/pl.json";

// Strona główna: SEO, kraje wg języka, filtr budżetu i brak pustych sekcji (spec 0073 AC-11).
// Używa dev DB z .env.local (reguła AGENTS.md o DATABASE_URL w procesie Playwright).
test.describe.configure({ timeout: 120_000 });

const LOCALES = [
  { locale: "pl", messages: pl, country: "Polska" },
  { locale: "de", messages: de, country: "Deutschland" },
] as const;

for (const { locale, messages, country } of LOCALES) {
  test.describe(`strona główna /${locale} (spec 0073)`, () => {
    test("SEO: jeden h1, tytuł, canonical i JSON-LD w języku strony (AC-11, AC-14)", async ({ page }) => {
      await page.goto(`/${locale}`);

      await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
      await expect(page).toHaveTitle(messages.HomePage.metaTitle);
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", new RegExp(`/${locale}$`));

      const jsonLd = page.locator('script[type="application/ld+json"]');
      await expect(jsonLd).toHaveCount(1);
      const data = JSON.parse((await jsonLd.textContent()) ?? "null");
      expect(data["@graph"].map((node: { "@type": string }) => node["@type"])).toEqual(["Organization", "WebSite"]);
      expect(data["@graph"][1].inLanguage).toBe(locale);

      // AC-15: obrazek do udostępniania
      await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", /\/images\/og\/home\.jpg$/);
      await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute("content", "summary_large_image");
    });

    test("wyszukiwarka: kraje w języku strony, budżet trafia do /results jako priceMax (AC-1, AC-2)", async ({
      page,
    }) => {
      await page.goto(`/${locale}`);

      await page.getByRole("button", { name: messages.SearchCard.whereAriaLabel }).click();
      await expect(page.getByRole("option", { name: country })).toBeVisible();
      await page.keyboard.press("Escape");

      await page.getByRole("button", { name: messages.SearchCard.budgetLabel, exact: true }).click();
      await page.getByRole("option", { name: messages.SearchCard.budget50to100k }).click();
      await page.getByRole("button", { name: messages.SearchCard.searchButton }).click();

      await expect(page).toHaveURL(new RegExp(`/${locale}/results\?.*priceMax=100000`));
    });

    test("żadna sekcja nie zostaje z pustym nagłówkiem (AC-9)", async ({ page }) => {
      await page.goto(`/${locale}`);

      const headings = page.locator("main h2");
      const count = await headings.count();
      for (let i = 0; i < count; i++) {
        expect((await headings.nth(i).textContent())?.trim().length ?? 0).toBeGreaterThan(0);
      }
    });
  });
}
