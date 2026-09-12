import { expect, test } from "@playwright/test";

test.describe("/pl/fulfillment", () => {
  test("redirects to results when the project param is missing (AC-1)", async ({ page }) => {
    await page.goto("/pl/fulfillment");
    await expect(page).toHaveURL("/pl/results");
  });

  test("redirects to results when the project id is unknown (AC-1)", async ({ page }) => {
    await page.goto("/pl/fulfillment?project=nieznane-id");
    await expect(page).toHaveURL("/pl/results");
  });

  test("known project with no accepted order redirects to the inquiries panel, not an error (AC-2)", async ({
    request,
  }) => {
    const response = await request.get("/pl/fulfillment?project=prj-baltyk-studio-38", {
      maxRedirects: 0,
    });

    expect(response.status()).toBe(307);
    expect(response.headers()["location"]).toBe("/pl/panel/inquiries");
  });

  test("shows the header and the 5-stage axis in fixed order, exactly one current stage (AC-3, AC-4)", async ({
    page,
  }) => {
    await page.goto("/pl/fulfillment?project=prj-modulor-family-90");

    await expect(page.locator("h1")).toHaveText(/Realizacja.*Modulor Family 90/);
    await expect(page.getByText(/Modulor Systems.*90 m²/)).toBeVisible();

    const labels = ["Produkcja", "Transport", "Montaż", "Odbiór", "Gwarancja"];
    const bodyText = await page.locator("main").innerText();
    const positions = labels.map((label) => bodyText.indexOf(label));
    expect(positions.every((position) => position >= 0)).toBe(true);
    expect(positions).toEqual([...positions].sort((a, b) => a - b));

    await expect(page.getByText("Aktualny etap")).toHaveCount(1);
    await expect(page.getByText("Ukończono")).toHaveCount(2);
    await expect(page.getByText("Nadchodzący")).toHaveCount(2);
  });

  test("shows the reached date and documents for completed/current stages, none for upcoming ones (AC-5, AC-6)", async ({
    page,
  }) => {
    await page.goto("/pl/fulfillment?project=prj-modulor-family-90");

    await expect(page.getByText("4 maj 2026")).toBeVisible();
    await expect(page.getByText("Harmonogram prac montażowych.pdf")).toBeVisible();

    const odbiorRow = page.getByText("Odbiór", { exact: true }).locator("xpath=ancestor::li[1]");
    await expect(odbiorRow.getByRole("link")).toHaveCount(0);
    await expect(odbiorRow).not.toContainText(/2026/);
  });

  test("shows a separate completion banner when the last stage (gwarancja) is current (AC-7)", async ({ page }) => {
    await page.goto("/pl/fulfillment?project=prj-karpaty-alpine-104");

    await expect(page.getByText("Zamówienie zrealizowane")).toBeVisible();
    await expect(page.getByText("Aktualny etap")).toBeVisible();
  });

  test("returns to the inquiries panel via the back link (AC-9)", async ({ page }) => {
    await page.goto("/pl/fulfillment?project=prj-modulor-family-90");

    const backLink = page.getByRole("link", { name: "Wróć do zapytań" });
    await expect(backLink).toHaveAttribute("href", "/pl/panel/inquiries");
  });

  test("keyboard pass: one H1, back link reachable and focus-visible (AC-10)", async ({ page }) => {
    await page.goto("/pl/fulfillment?project=prj-modulor-family-90");

    await expect(page.locator("h1")).toHaveCount(1);

    const backLink = page.getByRole("link", { name: "Wróć do zapytań" });
    await backLink.focus();
    await expect(backLink).toBeFocused();
    await expect(backLink).toHaveClass(/focus-ring/);
  });

  // The old "reached end to end from an accepted binding offer's 'Śledź
  // realizację' link (AC-8)" case was removed with the /oferta mock
  // it depended on (spec 0033 AC-16, Consequences): no link leads to
  // /fulfillment anymore until feature 16 designs its real entry point.
});
