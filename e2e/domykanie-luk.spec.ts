import { expect, test } from "@playwright/test";

const STORAGE_KEY = "producent:domykanie-luk:rozwiazane";

test.describe("/pl/producer/gap-closure (spec 0010)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/pl/producer/export-readiness");
    await page.evaluate((key) => window.localStorage.removeItem(key), STORAGE_KEY);
  });

  test("shows Domknij luki only on the conditional row, and never on approved/blocked rows (AC-1)", async ({
    page,
  }) => {
    await page.reload();

    await expect(page.getByText("Polska")).toBeVisible();
    await expect(page.getByText("Holandia")).toBeVisible();
    await expect(page.getByRole("link", { name: "Domknij luki" })).not.toBeVisible();

    await page.getByRole("button", { name: /Niemcy/ }).click();
    const link = page.getByRole("link", { name: "Domknij luki" });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute("href", "/pl/producer/gap-closure?kraj=DE");
  });

  test("redirects missing, unknown, and non-conditional kraj back to the map without an error (AC-3)", async ({
    page,
  }) => {
    await page.goto("/pl/producer/gap-closure");
    await expect(page).toHaveURL("/pl/producer/export-readiness");

    await page.goto("/pl/producer/gap-closure?kraj=XX");
    await expect(page).toHaveURL("/pl/producer/export-readiness");

    await page.goto("/pl/producer/gap-closure?kraj=PL&nazwa=Modulor%2028");
    await expect(page).toHaveURL("/pl/producer/export-readiness?nazwa=Modulor%2028");
  });

  test("uploading a document confirms without changing the map status (AC-2, AC-4, AC-5)", async ({ page }) => {
    await page.goto("/pl/producer/gap-closure?kraj=DE&nazwa=Modulor%2028");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText('Domknij luki: Niemcy — „Modulor 28”');

    const submit = page.getByRole("button", { name: "Wyślij" });
    await expect(submit).toBeDisabled();

    await page
      .locator('input[type="file"]')
      .first()
      .setInputFiles({ name: "dop.pdf", mimeType: "application/pdf", buffer: Buffer.from("dop") });
    await expect(submit).toBeEnabled();
    await submit.click();

    await expect(page.getByText("Dokumenty przesłane do weryfikacji.")).toBeVisible();
    await page.getByRole("link", { name: "Wróć do mapy gotowości eksportowej" }).click();

    await expect(page).toHaveURL(/export-readiness/);
    await expect(page.getByRole("button", { name: /Niemcy/ })).toContainText("Warunkowo dopuszczone");
  });

  test("buying the package announces the paying phase, then resolves the country everywhere (AC-6, AC-7, AC-8, AC-9, AC-11)", async ({
    page,
  }) => {
    await page.goto("/pl/producer/gap-closure?kraj=DE");
    await expect(page.getByText("149 €")).toBeVisible();

    await page.getByRole("button", { name: "Zapłać" }).click();
    const live = page.locator('[aria-live="polite"]');
    await expect(live).toContainText("Przetwarzanie płatności");

    await expect(page.getByText("Pakiet opłacony — kraj jest teraz dopuszczony.")).toBeVisible();

    const stored = await page.evaluate((key) => window.localStorage.getItem(key), STORAGE_KEY);
    expect(stored).toBe('["DE"]');

    await page.goto("/pl/producer/export-readiness");
    await expect(page.getByText("Niemcy")).toBeVisible();
    await expect(page.getByText("Luki domknięte poprzez zakup pakietu domykania luk")).toBeVisible();
    await expect(page.getByRole("button", { name: /Niemcy/ })).toHaveCount(0);

    await page.goto("/pl/producer/gap-closure?kraj=DE");
    await expect(page.getByText("Ten kraj jest już domknięty")).toBeVisible();
    await expect(page.getByRole("button", { name: "Zapłać" })).toHaveCount(0);
  });

  test("a blocked localStorage never breaks either path (AC-10)", async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, "localStorage", {
        value: {
          getItem() {
            throw new Error("blocked");
          },
          setItem() {
            throw new Error("blocked");
          },
          removeItem() {
            throw new Error("blocked");
          },
        },
        configurable: true,
      });
    });

    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));

    await page.goto("/pl/producer/gap-closure?kraj=DE");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Domknij luki: Niemcy");
    await expect(page.getByRole("button", { name: "Zapłać" })).toBeVisible();

    await page.getByRole("button", { name: "Zapłać" }).click();
    await expect(page.getByText("Pakiet opłacony — kraj jest teraz dopuszczony.")).toBeVisible();

    expect(errors).toEqual([]);
  });

  test("keyboard pass: one H1, and Zapłać is reachable and activatable by keyboard (AC-11)", async ({ page }) => {
    await page.goto("/pl/producer/gap-closure?kraj=DE");

    await expect(page.locator("h1")).toHaveCount(1);

    await page.getByRole("button", { name: "Zapłać" }).focus();
    await page.keyboard.press("Enter");

    await expect(page.getByText("Pakiet opłacony — kraj jest teraz dopuszczony.")).toBeVisible();
  });
});
