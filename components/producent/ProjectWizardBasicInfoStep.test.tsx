import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { UseFormReturn } from "react-hook-form";
import type { Country, ProjectDraft } from "@/lib/data/types";
import { createEmptyDraft } from "@/lib/producer-project-draft";

// recognizeRoomLayout ("use server" -> @/auth -> next-auth) doesn't resolve
// under Vitest/jsdom, same gap as ProjectWizardFilesStep.test.tsx.
vi.mock("@/lib/producer-room-layout-actions", () => ({
  recognizeRoomLayout: vi.fn(),
}));

import { recognizeRoomLayout } from "@/lib/producer-room-layout-actions";
import { ProjectWizardBasicInfoStep, type ProjectWizardBasicInfoStepFloorPlan } from "./ProjectWizardBasicInfoStep";
import { WizardFormHarness } from "./wizardFormTestUtils";

const countries: Country[] = [
  { code: "PL", name: "Polska" },
  { code: "DE", name: "Niemcy" },
  { code: "NL", name: "Holandia" },
];

function renderStep(
  defaultValues: ProjectDraft,
  showValidation: boolean,
  familyLocked = false,
  aiProps: { productId?: string | null; floorPlans?: ProjectWizardBasicInfoStepFloorPlan[] } = {},
) {
  let form!: UseFormReturn<ProjectDraft>;
  render(
    <WizardFormHarness defaultValues={defaultValues} onFormReady={(f) => (form = f)}>
      <ProjectWizardBasicInfoStep
        countries={countries}
        showValidation={showValidation}
        familyLocked={familyLocked}
        {...aiProps}
      />
    </WizardFormHarness>,
  );
  return () => form;
}

describe("ProjectWizardBasicInfoStep", () => {
  it("renders the five fields, all marked required", () => {
    renderStep(createEmptyDraft(), false);

    expect(screen.getByLabelText(/nazwa projektu/i)).toBeRequired();
    expect(screen.getByLabelText(/metraż/i)).toBeRequired();
    expect(screen.getByLabelText(/liczba sypialni/i)).toBeRequired();
    expect(screen.getByLabelText("Opis *")).toBeRequired();
    // Rodzina i Kraj produkcji są oba selecty z placeholderem "Wybierz…" (spec 0022 AC-6).
    expect(screen.getAllByRole("button", { name: "Wybierz…" })).toHaveLength(2);
  });

  it("shows no inline errors on an empty draft while showValidation is false", () => {
    renderStep(createEmptyDraft(), false);

    expect(screen.queryByText("Podaj nazwę projektu.")).not.toBeInTheDocument();
    expect(screen.queryByText("Wybierz kraj produkcji.")).not.toBeInTheDocument();
  });

  it("shows an inline error under every empty required field once showValidation is true", () => {
    renderStep(createEmptyDraft(), true);

    expect(screen.getByText("Podaj nazwę projektu.")).toBeInTheDocument();
    expect(screen.getByText(/podaj metraż od 20 do 500/i)).toBeInTheDocument();
    expect(screen.getByText(/podaj liczbę sypialni od 0 do 10/i)).toBeInTheDocument();
    expect(screen.getByText("Wybierz kraj produkcji.")).toBeInTheDocument();
    expect(screen.getByText("Podaj opis projektu.")).toBeInTheDocument();
  });

  it("flags a floor area outside 20 to 500 as invalid even when the field is non-empty", () => {
    renderStep({ ...createEmptyDraft(), floorAreaM2: 501 }, true);

    expect(screen.getByText(/podaj metraż od 20 do 500/i)).toBeInTheDocument();
  });

  it("does not show the floor area or bedrooms error once they hold a valid in-range value", () => {
    renderStep({ ...createEmptyDraft(), floorAreaM2: 120, bedrooms: 3 }, true);

    expect(screen.queryByText(/podaj metraż/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/podaj liczbę sypialni/i)).not.toBeInTheDocument();
  });

  it("updates the form's name value as the field changes", async () => {
    const user = userEvent.setup();
    const getForm = renderStep(createEmptyDraft(), false);

    await user.type(screen.getByLabelText(/nazwa projektu/i), "M");

    expect(getForm().getValues("name")).toBe("M");
  });

  it("updates the form's floorAreaM2 with a number as digits are typed", async () => {
    const user = userEvent.setup();
    const getForm = renderStep(createEmptyDraft(), false);

    await user.type(screen.getByLabelText(/metraż/i), "8");

    expect(getForm().getValues("floorAreaM2")).toBe(8);
  });

  it("lists every given country as a selectable option and updates the form with its code", async () => {
    const user = userEvent.setup();
    const getForm = renderStep(createEmptyDraft(), false);

    // Rodzina (pierwszy select w DOM) i Kraj produkcji (drugi) mają oba placeholder
    // "Wybierz…" na pustym draft (spec 0022 AC-6) — Kraj jest drugi w kolejności.
    await user.click(screen.getAllByRole("button", { name: "Wybierz…" })[1]);
    expect(screen.getByRole("option", { name: "Polska" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Niemcy" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Holandia" })).toBeInTheDocument();

    await user.click(screen.getByRole("option", { name: "Niemcy" }));

    expect(getForm().getValues("countryOfProduction")).toBe("DE");
  });

  describe("room layout recognition (spec 0050 AC-4 to AC-12)", () => {
    it("does not render the recognition section when floorPlans is not provided (edit wizard, AC-41)", () => {
      renderStep(createEmptyDraft(), false);
      expect(screen.queryByText("Rozpoznaj układ pomieszczeń z rzutów")).not.toBeInTheDocument();
    });

    it("shows a hint instead of the picker when no floor plans are uploaded yet", () => {
      renderStep(createEmptyDraft(), false, false, { productId: "p1", floorPlans: [] });
      expect(screen.getByText("Rozpoznaj układ pomieszczeń z rzutów")).toBeInTheDocument();
      expect(screen.getByText(/Wgraj rzuty w kroku/)).toBeInTheDocument();
    });

    it("shows a hint instead of the picker when the product does not exist yet (productId null)", () => {
      renderStep(createEmptyDraft(), false, false, {
        productId: null,
        floorPlans: [{ id: "f1", filename: "rzut.jpg" }],
      });
      expect(screen.getByText(/Wgraj rzuty w kroku/)).toBeInTheDocument();
    });

    it("lists every floor plan as a checkbox, pre-selecting up to five", async () => {
      const floorPlans = Array.from({ length: 6 }, (_, i) => ({ id: `f${i}`, filename: `rzut-${i}.jpg` }));
      renderStep(createEmptyDraft(), false, false, { productId: "p1", floorPlans });

      for (const plan of floorPlans) {
        expect(screen.getByLabelText(plan.filename)).toBeInTheDocument();
      }
      expect(screen.getByLabelText("rzut-0.jpg")).toBeChecked();
      expect(screen.getByLabelText("rzut-4.jpg")).toBeChecked();
      expect(screen.getByLabelText("rzut-5.jpg")).not.toBeChecked();
      expect(screen.getByLabelText("rzut-5.jpg")).toBeDisabled();
    });

    it("calls recognizeRoomLayout with the productId and selected ids, then appends new rooms on success", async () => {
      const user = userEvent.setup();
      vi.mocked(recognizeRoomLayout).mockResolvedValue({
        ok: true,
        rooms: [{ name: "Salon", areaM2: 28, floorLevel: "parter", confidence: "high" }],
      });
      const floorPlans = [{ id: "f1", filename: "rzut.jpg" }];
      const getForm = renderStep(createEmptyDraft(), false, false, { productId: "p1", floorPlans });

      await user.click(screen.getByRole("button", { name: "Rozpoznaj pomieszczenia" }));

      expect(recognizeRoomLayout).toHaveBeenCalledWith("p1", ["f1"]);
      await screen.findByDisplayValue("Salon");
      await screen.findByText("wysoka pewność");
      expect(getForm().getValues("roomLayout")).toHaveLength(1);
      expect(getForm().getValues("roomLayout.0.floorLevel")).toBe("parter");
    });

    it("shows an error and leaves the form untouched when recognition fails", async () => {
      const user = userEvent.setup();
      vi.mocked(recognizeRoomLayout).mockResolvedValue({ ok: false, error: "Rozpoznawanie nie powiodło się." });
      const floorPlans = [{ id: "f1", filename: "rzut.jpg" }];
      const getForm = renderStep(createEmptyDraft(), false, false, { productId: "p1", floorPlans });

      await user.click(screen.getByRole("button", { name: "Rozpoznaj pomieszczenia" }));

      expect(await screen.findByRole("alert")).toHaveTextContent("Rozpoznawanie nie powiodło się.");
      expect(getForm().getValues("roomLayout")).toHaveLength(0);
    });

    it("flags an already existing room as needs-check instead of overwriting it when the recognized floor level differs", async () => {
      const user = userEvent.setup();
      vi.mocked(recognizeRoomLayout).mockResolvedValue({
        ok: true,
        rooms: [{ name: "Salon", areaM2: 28, floorLevel: "pietro", confidence: "high" }],
      });
      const floorPlans = [{ id: "f1", filename: "rzut.jpg" }];
      const existing = {
        ...createEmptyDraft(),
        roomLayout: [{ id: "r1", name: "Salon", areaM2: 28, function: "Dzienna", floorLevel: "parter" as const }],
      };
      const getForm = renderStep(existing, false, false, { productId: "p1", floorPlans });

      await user.click(screen.getByRole("button", { name: "Rozpoznaj pomieszczenia" }));

      await screen.findByText("do sprawdzenia");
      expect(getForm().getValues("roomLayout")).toHaveLength(1); // not duplicated
      expect(getForm().getValues("roomLayout.0.floorLevel")).toBe("parter"); // not silently overwritten
    });
  });
});
