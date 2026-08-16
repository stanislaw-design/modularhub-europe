import { expect, test } from "@playwright/test";

test.describe("/pl/klient/oferta", () => {
  test("redirects to results when the project param is missing", async ({ page }) => {
    await page.goto("/pl/klient/oferta");
    await expect(page).toHaveURL("/pl/klient/wyniki");
  });

  test("redirects to results when the project id is unknown", async ({ page }) => {
    await page.goto("/pl/klient/oferta?project=unknown-id&address=Ul.%20Polna%205");
    await expect(page).toHaveURL("/pl/klient/wyniki");
  });

  test("redirects back to the plot dossier panel for this project when address is missing", async ({
    page,
  }) => {
    await page.goto("/pl/klient/oferta?project=prj-modulor-family-90");
    await expect(page).toHaveURL("/pl/klient/dzialka?projects=prj-modulor-family-90");
  });

  test("shows one final price and one accept button, with no carrier list, for a valid project and address", async ({
    page,
  }) => {
    await page.goto("/pl/klient/oferta?project=prj-modulor-family-90&address=Ul.%20Polna%205");

    await expect(page.locator("h1")).toHaveText(/Oferta wiążąca.*Modulor Family 90/);
    await expect(page.getByText("Ul. Polna 5")).toBeVisible();
    await expect(page.getByText("142 000 €")).toBeVisible();
    await expect(page.getByRole("combobox")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Zaakceptuj ofertę" })).toBeVisible();
  });

  test("accepting the offer replaces the button with a confirmation announced via aria-live", async ({
    page,
  }) => {
    await page.goto("/pl/klient/oferta?project=prj-modulor-family-90&address=Ul.%20Polna%205");

    const acceptButton = page.getByRole("button", { name: "Zaakceptuj ofertę" });
    await expect(acceptButton).toHaveClass(/focus-ring/);
    await acceptButton.click();

    await expect(acceptButton).toHaveCount(0);
    await expect(page.locator('[aria-live="polite"]', { hasText: "Zaakceptowano" })).toBeVisible();
  });

  test("is reached end to end from the plot dossier's offer link with the paid address snapshot intact", async ({
    page,
  }) => {
    await page.goto("/pl/klient/dzialka?projects=prj-modulor-family-90");
    await page.getByLabel(/adres działki/i).fill("Ul. Polna 5, Warszawa");
    await page.getByRole("button", { name: /Modulor Family 90/ }).click();
    await page.getByLabel(/metraż działki/i).fill("250");
    await page.getByRole("button", { name: "Zapłać" }).click();
    await expect(page.getByText("Dopuszczone")).toBeVisible({ timeout: 3000 });

    await page.getByRole("link", { name: "Przejdź do oferty wiążącej" }).click();

    await expect(page).toHaveURL(/\/pl\/klient\/oferta\?project=prj-modulor-family-90&address=/);
    await expect(page.locator("h1")).toHaveText(/Oferta wiążąca.*Modulor Family 90/);
    await expect(page.getByText("Ul. Polna 5, Warszawa")).toBeVisible();
  });

  test("returns to the plot dossier panel for this project via the back link", async ({ page }) => {
    await page.goto("/pl/klient/oferta?project=prj-modulor-family-90&address=Ul.%20Polna%205");

    const backLink = page.getByRole("link", { name: "Wróć do panelu działki" });
    await expect(backLink).toHaveAttribute("href", "/pl/klient/dzialka?projects=prj-modulor-family-90");
  });

  test("keyboard pass: one H1, accept button reachable and activatable by keyboard", async ({ page }) => {
    await page.goto("/pl/klient/oferta?project=prj-modulor-family-90&address=Ul.%20Polna%205");

    await expect(page.locator("h1")).toHaveCount(1);

    const acceptButton = page.getByRole("button", { name: "Zaakceptuj ofertę" });
    await acceptButton.focus();
    await expect(acceptButton).toBeFocused();
    await page.keyboard.press("Enter");

    await expect(page.locator('[aria-live="polite"]', { hasText: "Zaakceptowano" })).toBeVisible();
  });
});
