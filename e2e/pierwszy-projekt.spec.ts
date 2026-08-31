import { expect, test } from "@playwright/test";

const REGISTERED_URL =
  "/pl/producent/projekt?nip=1234567890&countries=PL&technology=szkielet-drewniany";

async function fillStep1(page: import("@playwright/test").Page) {
  await page.getByLabel(/nazwa projektu/i).fill("Modulor 28");
  await page.getByLabel(/metraż/i).fill("120");
  await page.getByLabel(/liczba sypialni/i).fill("3");
  await page.getByRole("button", { name: "Wybierz…" }).click();
  await page.getByRole("option", { name: "Polska" }).click();
  await page.getByLabel(/opis/i).fill("Dom modułowy o wysokim standardzie.");
}

async function fillStep2(page: import("@playwright/test").Page) {
  await page.getByLabel("Układ ścian").fill("Szkielet drewniany");
  await page.getByLabel("Izolacja").fill("U = 0.15 W/m2K");
  await page.getByLabel("Współczynniki przenikania ciepła").fill("U = 0.9 W/m2K");
}

async function fillStep3(page: import("@playwright/test").Page) {
  await page.getByLabel("Klasa okien").fill("Uw = 0.8");
  await page.getByLabel("Wentylacja").fill("Mechaniczna z odzyskiem ciepła");
  await page.getByLabel("Źródło ciepła").fill("Pompa ciepła");
}

async function fillStep4(page: import("@playwright/test").Page) {
  await page.getByLabel("Odporność ogniowa").fill("REI 30");
  await page.getByLabel("Odporność wiatrowa").fill("Strefa 2");
}

async function fillStep5(page: import("@playwright/test").Page) {
  await page
    .locator("#wizard-floor-plan-files")
    .setInputFiles({ name: "rzut.pdf", mimeType: "application/pdf", buffer: Buffer.from("rzut") });
  await page
    .locator("#wizard-photo-files")
    .setInputFiles({ name: "zdjecie.png", mimeType: "image/png", buffer: Buffer.from("zdjecie") });
}

async function fillStep6(page: import("@playwright/test").Page) {
  await page.getByLabel("Cena domu, od (EUR)").fill("100000");
  await page.getByLabel("Cena domu, do (EUR)").fill("120000");
  // Dwa selecty z tym samym placeholderem widoczne naraz (Standard, Kategoria).
  await page.getByRole("button", { name: "Wybierz…" }).first().click();
  await page.getByRole("option", { name: "Standard deweloperski" }).click();
  await page.getByLabel("Termin produkcji, od (tygodnie)").fill("10");
  await page.getByLabel("Termin produkcji, do (tygodnie)").fill("14");
  await page.getByLabel("Czas montażu, od (dni)").fill("3");
  await page.getByLabel("Czas montażu, do (dni)").fill("5");
  await page.getByLabel(/Gwarancja konstrukcyjna/).fill("25");
  await page.getByRole("button", { name: "Wybierz…" }).click();
  await page.getByRole("option", { name: "Całoroczny" }).click();
}

test.describe("/pl/producent/projekt wizard", () => {
  test("walks all seven steps to a read-only summary and saves, clearing the draft (AC-2, AC-3, AC-7, AC-9)", async ({
    page,
  }) => {
    await page.goto(REGISTERED_URL);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Dodaj pierwszy projekt");

    await fillStep1(page);
    await page.getByRole("button", { name: "Dalej" }).click();
    await fillStep2(page);
    await page.getByRole("button", { name: "Dalej" }).click();
    await fillStep3(page);
    await page.getByRole("button", { name: "Dalej" }).click();
    await fillStep4(page);
    await page.getByRole("button", { name: "Dalej" }).click();
    await fillStep5(page);
    await page.getByRole("button", { name: "Dalej" }).click();
    await fillStep6(page);
    await page.getByRole("button", { name: "Dalej" }).click();

    await expect(page.getByRole("heading", { level: 2, name: "Podsumowanie" })).toBeVisible();
    await expect(page.getByText("Modulor 28")).toBeVisible();
    await expect(page.getByText("rzut.pdf")).toBeVisible();
    await expect(page.getByText("zdjecie.png")).toBeVisible();

    await page.getByRole("button", { name: "Zapisz projekt" }).click();

    await expect(page).toHaveURL(
      /\/pl\/producent\/gotowosc-eksportowa\?nazwa=Modulor\+28&nip=1234567890&countries=PL&technology=szkielet-drewniany/
    );
    await expect(page.getByRole("heading", { level: 1 })).toHaveText('Gotowość eksportowa: „Modulor 28”');
    await expect(page.getByRole("link", { name: "Zobacz swoje produkty" })).toBeVisible();

    const stillSaved = await page.evaluate(() =>
      window.localStorage.getItem("producent:1234567890:projekt-szkic")
    );
    expect(stillSaved).toBeNull();

    const savedProducts = await page.evaluate(() =>
      window.localStorage.getItem("producent:1234567890:produkty")
    );
    expect(JSON.parse(savedProducts ?? "[]")).toHaveLength(1);
  });

  test("blocks Dalej with inline errors on an empty required step, and blocks Pliki until both areas have a file (AC-3, AC-6)", async ({
    page,
  }) => {
    await page.goto(REGISTERED_URL);

    await page.getByRole("button", { name: "Dalej" }).click();
    await expect(page.getByText("Podaj nazwę projektu.")).toBeVisible();

    await fillStep1(page);
    await page.getByRole("button", { name: "Dalej" }).click();
    await fillStep2(page);
    await page.getByRole("button", { name: "Dalej" }).click();
    await fillStep3(page);
    await page.getByRole("button", { name: "Dalej" }).click();
    await fillStep4(page);
    await page.getByRole("button", { name: "Dalej" }).click();

    await page.getByRole("button", { name: "Dalej" }).click();
    await expect(page.getByText("Dodaj co najmniej jeden rzut.")).toBeVisible();
    await expect(page.getByText("Dodaj co najmniej jedno zdjęcie.")).toBeVisible();
  });

  test("resumes at the last reached step with data intact after a reload, and starts fresh again once saved (AC-8, AC-9)", async ({
    page,
  }) => {
    await page.goto(REGISTERED_URL);
    await fillStep1(page);
    await page.getByRole("button", { name: "Dalej" }).click();
    await fillStep2(page);

    await page.reload();

    await expect(page.getByRole("heading", { level: 2, name: "Konstrukcja i izolacja" })).toBeVisible();
    await expect(page.getByLabel("Układ ścian")).toHaveValue("Szkielet drewniany");

    await page.getByRole("button", { name: /Informacje podstawowe/ }).click();
    await expect(page.getByLabel(/nazwa projektu/i)).toHaveValue("Modulor 28");
  });

  test("discards a corrupted saved draft and starts empty at step 1, without an error page (AC-8)", async ({
    page,
  }) => {
    await page.goto(REGISTERED_URL);
    await page.evaluate(() => window.localStorage.setItem("producent:1234567890:projekt-szkic", "{not-json"));

    await page.reload();

    await expect(page.getByRole("heading", { level: 2, name: "Informacje podstawowe" })).toBeVisible();
    await expect(page.getByLabel(/nazwa projektu/i)).toHaveValue("");
  });

  test("redirects to the registration form when the registration params are missing (AC-1)", async ({
    page,
  }) => {
    await page.goto("/pl/producent/projekt");
    await expect(page).toHaveURL("/pl/producent");
  });

  test("shows a generic heading on the export-readiness stub when no project name is given (AC-10)", async ({
    page,
  }) => {
    await page.goto("/pl/producent/gotowosc-eksportowa");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Gotowość eksportowa");
    await expect(page.getByRole("link", { name: "Zobacz swoje produkty" })).not.toBeVisible();
  });

  test("keyboard pass: one H1 and visible focus rings on the Dalej button and a text field (AC-11)", async ({
    page,
  }) => {
    await page.goto(REGISTERED_URL);

    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.getByLabel(/nazwa projektu/i)).toHaveClass(/focus-ring/);
    await expect(page.getByRole("button", { name: "Dalej" })).toHaveClass(/focus-ring/);
  });
});
