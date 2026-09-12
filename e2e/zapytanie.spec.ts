import { expect, test } from "@playwright/test";

test.describe("/pl/inquiry", () => {
  test("selecting 2 homes on results and sending shows a template block per home, then returns to results (AC-1, AC-2, AC-4, AC-6, AC-7, AC-8)", async ({
    page,
  }) => {
    await page.goto("/pl/results?country=DE&sizeMin=50&sizeMax=100");

    const cards = page.locator("article");
    await cards.nth(0).getByRole("checkbox").check();
    await cards.nth(1).getByRole("checkbox").check();

    await expect(page.getByText("Zaznaczono: 2/3")).toBeVisible();
    await expect(page).toHaveURL(/country=DE&sizeMin=50&sizeMax=100$/);

    await page.getByRole("button", { name: "Wyślij zapytanie" }).click();
    await expect(page).toHaveURL(/\/pl\/inquiry\?projects=.+&country=DE&sizeMin=50&sizeMax=100/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Zapytanie o wybrane domy");

    await page.getByLabel(/imię i nazwisko/i).fill("Jan Kowalski");
    await page.getByLabel(/e-mail/i).fill("jan@example.com");
    await page.getByLabel(/telefon/i).fill("600123456");
    await page.getByRole("button", { name: "Wyślij zapytanie" }).click();

    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Zapytanie wysłane");
    await expect(page.getByText(/Wysłano/)).toHaveCount(2);
    // Same URL, no reload navigation happened for the submit itself.
    await expect(page).toHaveURL(/\/pl\/inquiry\?/);

    await page.getByRole("link", { name: "Wróć do wyników" }).click();
    await expect(page).toHaveURL("/pl/results?country=DE&sizeMin=50&sizeMax=100");
  });

  test("disables remaining checkboxes once 3 homes are selected, and unblocks on deselect (AC-3)", async ({
    page,
  }) => {
    await page.goto("/pl/results");
    const checkboxes = page.locator('article input[type="checkbox"]');

    await checkboxes.nth(0).check();
    await checkboxes.nth(1).check();
    await checkboxes.nth(2).check();
    await expect(page.getByText("Zaznaczono: 3/3")).toBeVisible();
    await expect(checkboxes.nth(3)).toBeDisabled();

    await checkboxes.nth(0).uncheck();
    await expect(checkboxes.nth(3)).toBeEnabled();
  });

  test("redirects back to results, keeping country/sizeMin/sizeMax, when projects is an unknown id (AC-5)", async ({
    page,
  }) => {
    await page.goto("/pl/inquiry?projects=unknown-id&country=DE&sizeMin=50");
    await expect(page).toHaveURL("/pl/results?country=DE&sizeMin=50");
  });

  test("cleans a mix of a duplicate and an unknown id and still renders the form for the valid remainder (AC-5)", async ({
    page,
  }) => {
    await page.goto(
      "/pl/inquiry?projects=prj-modulor-family-90,prj-modulor-family-90,prj-baltyk-loft-120,unknown-id"
    );
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Zapytanie o wybrane domy");
    await expect(page.getByText("Modulor Family 90")).toBeVisible();
    await expect(page.getByText("Baltyk Loft 120")).toBeVisible();
  });

  test("redirects to bare results when projects is missing entirely (AC-5)", async ({ page }) => {
    await page.goto("/pl/inquiry");
    await expect(page).toHaveURL("/pl/results");
  });

  test("keeps the submit button disabled until name, a valid email, and phone are filled (AC-6)", async ({
    page,
  }) => {
    await page.goto("/pl/inquiry?projects=prj-modulor-family-90");
    const submit = page.getByRole("button", { name: "Wyślij zapytanie" });
    await expect(submit).toBeDisabled();

    await page.getByLabel(/imię i nazwisko/i).fill("Jan Kowalski");
    await page.getByLabel(/telefon/i).fill("600123456");
    await page.getByLabel(/e-mail/i).fill("not-an-email");
    await expect(submit).toBeDisabled();

    await page.getByLabel(/e-mail/i).fill("jan@example.com");
    await expect(submit).toBeEnabled();
  });

  test("keyboard pass: one H1 and visible focus rings across checkbox, action bar, and form (AC-9)", async ({
    page,
  }) => {
    await page.goto("/pl/results?country=PL");
    await page.locator('article input[type="checkbox"]').first().check();

    const sendButton = page.getByRole("button", { name: "Wyślij zapytanie" });
    await expect(sendButton).toHaveClass(/focus-ring/);
    await sendButton.click();

    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.getByLabel(/imię i nazwisko/i)).toHaveClass(/focus-ring/);

    await page.getByLabel(/imię i nazwisko/i).fill("Jan Kowalski");
    await page.getByLabel(/e-mail/i).fill("jan@example.com");
    await page.getByLabel(/telefon/i).fill("600123456");
    await page.getByRole("button", { name: "Wyślij zapytanie" }).click();

    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.getByRole("link", { name: "Wróć do wyników" })).toHaveClass(/focus-ring/);
  });
});
