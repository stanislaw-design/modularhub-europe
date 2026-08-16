import { expect, test } from "@playwright/test";

test.describe("/pl/producent registration", () => {
  test("filling NIP, a country, and a technology then submitting shows the confirmation summary", async ({
    page,
  }) => {
    await page.goto("/pl/producent");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Zostań producentem ModularHub Europe"
    );

    const submit = page.getByRole("button", { name: "Zarejestruj się" });
    await expect(submit).toBeDisabled();

    await page.getByLabel(/nip/i).fill("123-456-78-90");
    await page.getByRole("checkbox", { name: "Polska" }).check();
    await page.getByRole("checkbox", { name: "Niemcy" }).check();
    await page.getByRole("button", { name: "Wybierz technologię" }).click();
    await page.getByRole("option", { name: "Szkielet drewniany" }).click();
    await expect(submit).toBeEnabled();

    await submit.click();

    await expect(page).toHaveURL(
      "/pl/producent/projekt?nip=1234567890&countries=PL%2CDE&technology=szkielet-drewniany"
    );
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Pierwszy projekt");
    await expect(page.getByText("1234567890")).toBeVisible();
    await expect(page.getByText("Polska, Niemcy")).toBeVisible();
    await expect(page.getByText("Szkielet drewniany")).toBeVisible();
  });

  test("redirects back to the registration form when the NIP is missing 10 digits", async ({ page }) => {
    await page.goto("/pl/producent/projekt?nip=123&countries=PL&technology=szkielet-drewniany");
    await expect(page).toHaveURL("/pl/producent");
  });

  test("redirects back to the registration form when the technology is unknown", async ({ page }) => {
    await page.goto(
      "/pl/producent/projekt?nip=1234567890&countries=PL&technology=nieznana-technologia"
    );
    await expect(page).toHaveURL("/pl/producent");
  });

  test("redirects back to the registration form when the query params are missing entirely", async ({
    page,
  }) => {
    await page.goto("/pl/producent/projekt");
    await expect(page).toHaveURL("/pl/producent");
  });

  test("cleans a duplicate and an unknown country code and still renders the confirmation for the valid remainder", async ({
    page,
  }) => {
    await page.goto(
      "/pl/producent/projekt?nip=1234567890&countries=PL,PL,XX&technology=szkielet-drewniany"
    );
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Pierwszy projekt");
    await expect(page.getByText("Polska")).toBeVisible();
  });

  test("the 'Wróć do rejestracji' link returns to the empty registration form", async ({ page }) => {
    await page.goto(
      "/pl/producent/projekt?nip=1234567890&countries=PL&technology=szkielet-drewniany"
    );

    await page.getByRole("link", { name: "Wróć do rejestracji" }).click();

    await expect(page).toHaveURL("/pl/producent");
    await expect(page.getByLabel(/nip/i)).toHaveValue("");
  });

  test("keyboard pass: one H1 and visible focus rings across the NIP field, a country checkbox, and submit", async ({
    page,
  }) => {
    await page.goto("/pl/producent");

    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.getByLabel(/nip/i)).toHaveClass(/focus-ring/);
    await expect(page.getByRole("checkbox", { name: "Polska" })).toHaveClass(/focus-ring/);
    await expect(page.getByRole("button", { name: "Zarejestruj się" })).toHaveClass(/focus-ring/);
  });
});
