import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Country } from "@/lib/data/types";
import { ProjectWizard } from "./ProjectWizard";

const push = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
}));

const countries: Country[] = [
  { code: "PL", name: "Polska" },
  { code: "DE", name: "Niemcy" },
  { code: "NL", name: "Holandia" },
];

function draftKey(nip: string) {
  return `producent:${nip}:projekt-szkic`;
}

async function fillStep1(user: ReturnType<typeof userEvent.setup>, name = "Modulor 28") {
  await user.type(screen.getByLabelText(/nazwa projektu/i), name);
  await user.type(screen.getByLabelText(/metraż/i), "120");
  await user.type(screen.getByLabelText(/liczba sypialni/i), "3");
  await user.click(screen.getByRole("button", { name: "Wybierz…" }));
  await user.click(screen.getByRole("option", { name: "Polska" }));
  await user.type(screen.getByLabelText(/opis/i), "Opis projektu");
}

async function fillStep2(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/Układ ścian/), "Szkielet");
  await user.type(screen.getByLabelText(/Izolacja/), "U = 0.15");
  await user.type(screen.getByLabelText(/Współczynniki przenikania ciepła/), "U = 0.9");
}

async function fillStep3(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/Klasa okien/), "Uw = 0.8");
  await user.type(screen.getByLabelText(/Wentylacja/), "Mechaniczna");
  await user.type(screen.getByLabelText(/Źródło ciepła/), "Pompa ciepła");
}

async function fillStep4(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/Odporność ogniowa/), "REI 30");
  await user.type(screen.getByLabelText(/Odporność wiatrowa/), "Strefa 2");
}

async function fillStep5(user: ReturnType<typeof userEvent.setup>) {
  const floorPlanInput = document.getElementById("wizard-floor-plan-files") as HTMLInputElement;
  await user.upload(floorPlanInput, new File(["x"], "rzut.pdf"));
  const photoInput = document.getElementById("wizard-photo-files") as HTMLInputElement;
  await user.upload(photoInput, new File(["x"], "zdjecie.png"));
}

async function goToSummary(user: ReturnType<typeof userEvent.setup>) {
  await fillStep1(user);
  await user.click(screen.getByRole("button", { name: "Dalej" }));
  await fillStep2(user);
  await user.click(screen.getByRole("button", { name: "Dalej" }));
  await fillStep3(user);
  await user.click(screen.getByRole("button", { name: "Dalej" }));
  await fillStep4(user);
  await user.click(screen.getByRole("button", { name: "Dalej" }));
  await fillStep5(user);
  await user.click(screen.getByRole("button", { name: "Dalej" }));
}

beforeEach(() => {
  window.localStorage.clear();
});

afterEach(() => {
  push.mockClear();
});

describe("ProjectWizard", () => {
  it("renders exactly one H1 and all six steps in the progress indicator (AC-2, AC-11)", () => {
    render(<ProjectWizard locale="pl" nip="1234567890" countries={countries} />);

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    const progress = screen.getByRole("list", { name: "Postęp kreatora" });
    for (const label of [
      "Informacje podstawowe",
      "Konstrukcja i izolacja",
      "Instalacje i okna",
      "Odporność",
      "Pliki",
      "Podsumowanie",
    ]) {
      expect(within(progress).getByText(label)).toBeInTheDocument();
    }
  });

  it("blocks Dalej and shows inline validation when step 1 is submitted empty (AC-3, AC-4)", async () => {
    const user = userEvent.setup();
    render(<ProjectWizard locale="pl" nip="1234567890" countries={countries} />);

    await user.click(screen.getByRole("button", { name: "Dalej" }));

    expect(screen.getByText("Podaj nazwę projektu.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Informacje podstawowe" })).toBeInTheDocument();
  });

  it("never makes an unreached step clickable on the progress indicator (AC-3)", async () => {
    const user = userEvent.setup();
    render(<ProjectWizard locale="pl" nip="1234567890" countries={countries} />);

    const stepTwo = screen.getByRole("button", { name: /Konstrukcja i izolacja/ });
    expect(stepTwo).toBeDisabled();

    await user.click(stepTwo);
    expect(screen.getByRole("heading", { level: 2, name: "Informacje podstawowe" })).toBeInTheDocument();
  });

  it("advances once step 1 is valid, and Wstecz returns with the data retained (AC-3, AC-8)", async () => {
    const user = userEvent.setup();
    render(<ProjectWizard locale="pl" nip="1234567890" countries={countries} />);

    await fillStep1(user);
    await user.click(screen.getByRole("button", { name: "Dalej" }));
    expect(screen.getByRole("heading", { level: 2, name: "Konstrukcja i izolacja" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Wstecz" }));

    expect(screen.getByRole("heading", { level: 2, name: "Informacje podstawowe" })).toBeInTheDocument();
    expect(screen.getByLabelText(/nazwa projektu/i)).toHaveValue("Modulor 28");
  });

  it("lets a click on an already reached step jump straight to it (AC-3)", async () => {
    const user = userEvent.setup();
    render(<ProjectWizard locale="pl" nip="1234567890" countries={countries} />);

    await fillStep1(user);
    await user.click(screen.getByRole("button", { name: "Dalej" }));
    await fillStep2(user);
    await user.click(screen.getByRole("button", { name: "Dalej" }));

    await user.click(screen.getByRole("button", { name: /Informacje podstawowe/ }));

    expect(screen.getByRole("heading", { level: 2, name: "Informacje podstawowe" })).toBeInTheDocument();
    expect(screen.getByLabelText(/nazwa projektu/i)).toHaveValue("Modulor 28");
  });

  it("blocks the Pliki step until both upload areas have at least one file (AC-6)", async () => {
    const user = userEvent.setup();
    render(<ProjectWizard locale="pl" nip="1234567890" countries={countries} />);

    await fillStep1(user);
    await user.click(screen.getByRole("button", { name: "Dalej" }));
    await fillStep2(user);
    await user.click(screen.getByRole("button", { name: "Dalej" }));
    await fillStep3(user);
    await user.click(screen.getByRole("button", { name: "Dalej" }));
    await fillStep4(user);
    await user.click(screen.getByRole("button", { name: "Dalej" }));

    await user.click(screen.getByRole("button", { name: "Dalej" }));
    expect(screen.getByText("Dodaj co najmniej jeden rzut.")).toBeInTheDocument();
    expect(screen.getByText("Dodaj co najmniej jedno zdjęcie.")).toBeInTheDocument();
  });

  it("reaches a read-only Podsumowanie with every entered value after all six steps (AC-7)", async () => {
    const user = userEvent.setup();
    render(<ProjectWizard locale="pl" nip="1234567890" countries={countries} />);

    await goToSummary(user);

    expect(screen.getByRole("heading", { level: 2, name: "Podsumowanie" })).toBeInTheDocument();
    expect(screen.getByText("Modulor 28")).toBeInTheDocument();
    expect(screen.getByText("rzut.pdf")).toBeInTheDocument();
    expect(screen.getByText("zdjecie.png")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Zapisz projekt" })).toBeInTheDocument();
  });

  it("resumes at the last saved step with the saved data, without asking (AC-8)", () => {
    window.localStorage.setItem(
      draftKey("1234567890"),
      JSON.stringify({
        draft: {
          name: "Karpaty Compact",
          floorAreaM2: 85,
          bedrooms: 2,
          countryOfProduction: "PL",
          description: "Opis",
          wallBuildUp: "",
          insulation: "",
          heatTransferCoefficients: "",
          windowClass: "",
          ventilation: "",
          heatSource: "",
          fireResistance: "",
          windResistance: "",
          floorPlanFiles: [],
          photoFiles: [],
        },
        step: 1,
      })
    );

    render(<ProjectWizard locale="pl" nip="1234567890" countries={countries} />);

    expect(screen.getByRole("heading", { level: 2, name: "Konstrukcja i izolacja" })).toBeInTheDocument();
  });

  it("starts fresh at step 1 without throwing when the saved state is corrupted (AC-8)", () => {
    window.localStorage.setItem(draftKey("1234567890"), "{not-json");

    expect(() =>
      render(<ProjectWizard locale="pl" nip="1234567890" countries={countries} />)
    ).not.toThrow();
    expect(screen.getByRole("heading", { level: 2, name: "Informacje podstawowe" })).toBeInTheDocument();
    expect(screen.getByLabelText(/nazwa projektu/i)).toHaveValue("");
  });

  it("keeps two producers' drafts isolated by NIP (AC-8)", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<ProjectWizard locale="pl" nip="1111111111" countries={countries} />);
    await fillStep1(user, "Dom Producenta A");
    unmount();

    render(<ProjectWizard locale="pl" nip="2222222222" countries={countries} />);

    expect(screen.getByLabelText(/nazwa projektu/i)).toHaveValue("");
  });

  it("clears the saved state and navigates to the export-readiness stub with the project name on save (AC-9)", async () => {
    const user = userEvent.setup();
    render(<ProjectWizard locale="pl" nip="1234567890" countries={countries} />);

    await goToSummary(user);
    await user.click(screen.getByRole("button", { name: "Zapisz projekt" }));

    expect(push).toHaveBeenCalledWith("/pl/producent/gotowosc-eksportowa?nazwa=Modulor+28");
    expect(window.localStorage.getItem(draftKey("1234567890"))).toBeNull();
  });

  it("gives the current step's progress marker aria-current='step' (AC-11)", () => {
    render(<ProjectWizard locale="pl" nip="1234567890" countries={countries} />);

    const progress = screen.getByRole("list", { name: "Postęp kreatora" });
    const current = within(progress).getByText("Informacje podstawowe").closest("li");
    expect(current).toHaveAttribute("aria-current", "step");
  });
});
