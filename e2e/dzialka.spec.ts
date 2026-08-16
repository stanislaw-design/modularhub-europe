import { expect, test } from "@playwright/test";

test.describe("/pl/klient/dzialka", () => {
  test("redirects to results, keeping country/sizeMin/sizeMax, when projects is an unknown id (AC-1)", async ({
    page,
  }) => {
    await page.goto("/pl/klient/dzialka?projects=unknown-id&country=DE&sizeMin=50");
    await expect(page).toHaveURL("/pl/klient/wyniki?country=DE&sizeMin=50");
  });

  test("redirects to bare results when projects is missing entirely (AC-1)", async ({ page }) => {
    await page.goto("/pl/klient/dzialka");
    await expect(page).toHaveURL("/pl/klient/wyniki");
  });

  test("'Sprawdź działkę' on the confirmation screen opens the panel with the same projects, one row per home (AC-1, AC-2)", async ({
    page,
  }) => {
    await page.goto("/pl/klient/zapytanie?projects=prj-modulor-family-90,prj-baltyk-loft-120&country=DE&sizeMin=50");
    await page.getByLabel(/imię i nazwisko/i).fill("Jan Kowalski");
    await page.getByLabel(/e-mail/i).fill("jan@example.com");
    await page.getByLabel(/telefon/i).fill("600123456");
    await page.getByRole("button", { name: "Wyślij zapytanie" }).click();

    await page.getByRole("link", { name: "Sprawdź działkę" }).click();
    await expect(page).toHaveURL(/\/pl\/klient\/dzialka\?projects=.+&country=DE&sizeMin=50/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Panel działki");
    await expect(page.getByLabel(/adres działki/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /Modulor Family 90/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Baltyk Loft 120/ })).toBeVisible();
  });

  test("Zapłać stays disabled until address and a 100-100000 area are both valid, then pays through to an approved result with the offer link (AC-3, AC-4, AC-5, AC-6)", async ({
    page,
  }) => {
    await page.goto("/pl/klient/dzialka?projects=prj-modulor-family-90");
    await page.getByLabel(/adres działki/i).fill("Ul. Polna 5, Warszawa");

    await page.getByRole("button", { name: /Modulor Family 90/ }).click();
    await expect(page.getByText("149 €")).toBeVisible();

    const payButton = page.getByRole("button", { name: "Zapłać" });
    await expect(payButton).toBeDisabled();

    const areaInput = page.getByLabel(/metraż działki/i);
    await areaInput.fill("50");
    await expect(payButton).toBeDisabled();

    await areaInput.fill("250");
    await expect(payButton).toBeEnabled();

    await payButton.click();
    await expect(page.getByText("Przetwarzanie płatności…")).toBeVisible();

    await expect(page.getByText("Dopuszczone")).toBeVisible({ timeout: 3000 });
    await expect(page.getByText(/To nie jest opinia prawna/)).toBeVisible();

    const offerLink = page.getByRole("link", { name: "Przejdź do oferty wiążącej" });
    await expect(offerLink).toHaveAttribute(
      "href",
      `/pl/klient/oferta?project=prj-modulor-family-90&address=${encodeURIComponent("Ul. Polna 5, Warszawa")}`
    );
  });

  test("keeps the paid address snapshot in the offer link after the panel's address field is edited later (AC-4, AC-6)", async ({
    page,
  }) => {
    await page.goto("/pl/klient/dzialka?projects=prj-modulor-family-90");
    const addressInput = page.getByLabel(/adres działki/i);
    await addressInput.fill("Ul. Polna 5");

    await page.getByRole("button", { name: /Modulor Family 90/ }).click();
    await page.getByLabel(/metraż działki/i).fill("250");
    await page.getByRole("button", { name: "Zapłać" }).click();
    await expect(page.getByText("Dopuszczone")).toBeVisible({ timeout: 3000 });

    await addressInput.fill("Ul. Nowa 10");

    const offerLink = page.getByRole("link", { name: "Przejdź do oferty wiążącej" });
    await expect(offerLink).toHaveAttribute(
      "href",
      `/pl/klient/oferta?project=prj-modulor-family-90&address=${encodeURIComponent("Ul. Polna 5")}`
    );
  });

  test("a blocked result shows status and reason with no button onward, and does not affect the other row in the panel (AC-7, AC-8)", async ({
    page,
  }) => {
    await page.goto("/pl/klient/dzialka?projects=prj-karpaty-alpine-104,prj-modulor-family-90");
    await page.getByLabel(/adres działki/i).fill("Ul. Polna 5");

    await page.getByRole("button", { name: /Karpaty Alpine 104/ }).click();
    await page.getByRole("button", { name: /Modulor Family 90/ }).click();

    const areaInputs = page.getByLabel(/metraż działki/i);
    await areaInputs.nth(0).fill("300");
    await page.getByRole("button", { name: "Zapłać" }).first().click();

    await expect(page.getByText("Niedopuszczone")).toBeVisible({ timeout: 3000 });
    await expect(page.getByRole("link", { name: "Przejdź do oferty wiążącej" })).toHaveCount(0);

    // The second row (Modulor Family 90) is untouched: still idle, area empty, Zapłać disabled.
    await expect(page.getByLabel(/metraż działki/i)).toHaveValue("");
    await expect(page.getByRole("button", { name: "Zapłać" })).toBeDisabled();
  });

  test("reloading the page clears the address, area and paid results (AC-9)", async ({ page }) => {
    await page.goto("/pl/klient/dzialka?projects=prj-modulor-family-90");
    await page.getByLabel(/adres działki/i).fill("Ul. Polna 5");
    await page.getByRole("button", { name: /Modulor Family 90/ }).click();
    await page.getByLabel(/metraż działki/i).fill("250");

    await page.reload();

    await expect(page.getByLabel(/adres działki/i)).toHaveValue("");
    await expect(page.getByRole("button", { name: /Modulor Family 90/ })).toHaveAttribute(
      "aria-expanded",
      "false"
    );
  });

  test("keyboard pass: one H1, aria-expanded/controls on the row trigger, aria-live on the result area, visible focus rings (AC-10)", async ({
    page,
  }) => {
    await page.goto("/pl/klient/dzialka?projects=prj-modulor-family-90");

    await expect(page.locator("h1")).toHaveCount(1);

    const trigger = page.getByRole("button", { name: /Modulor Family 90/ });
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
    const controlsId = await trigger.getAttribute("aria-controls");
    expect(controlsId).toBeTruthy();

    await trigger.click();
    await expect(trigger).toHaveAttribute("aria-expanded", "true");
    await expect(page.locator(`#${controlsId}`)).toBeVisible();
    await expect(trigger).toHaveClass(/focus-ring/);

    await page.getByLabel(/adres działki/i).fill("Ul. Polna 5");
    await page.getByLabel(/metraż działki/i).fill("250");
    const payButton = page.getByRole("button", { name: "Zapłać" });
    await expect(payButton).toHaveClass(/focus-ring/);
    await payButton.click();

    await expect(page.locator('[aria-live="polite"]', { hasText: "Przetwarzanie płatności" })).toBeVisible();
    await expect(page.locator('[aria-live="polite"]').filter({ hasText: "Dopuszczone" })).toBeVisible({
      timeout: 3000,
    });
  });
});
