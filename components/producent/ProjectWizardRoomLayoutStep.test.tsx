import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { UseFormReturn } from "react-hook-form";
import type { ProjectDraft } from "@/lib/data/types";
import { createEmptyDraft } from "@/lib/producer-project-draft";

// recognizeRoomLayout ("use server" -> @/auth -> next-auth) doesn't resolve
// under Vitest/jsdom, same gap as ProjectWizardFilesStep.test.tsx.
vi.mock("@/lib/producer-room-layout-actions", () => ({
  recognizeRoomLayout: vi.fn(),
}));

import { recognizeRoomLayout } from "@/lib/producer-room-layout-actions";
import {
  ProjectWizardRoomLayoutStep,
  type ProjectWizardRoomLayoutStepFloorPlan,
} from "./ProjectWizardRoomLayoutStep";
import { WizardFormHarness } from "./wizardFormTestUtils";

function renderStep(
  defaultValues: ProjectDraft,
  aiProps: { productId?: string | null; floorPlans?: ProjectWizardRoomLayoutStepFloorPlan[] } = {},
  showValidation = false,
) {
  let form!: UseFormReturn<ProjectDraft>;
  render(
    <WizardFormHarness defaultValues={defaultValues} onFormReady={(f) => (form = f)}>
      <ProjectWizardRoomLayoutStep {...aiProps} showValidation={showValidation} />
    </WizardFormHarness>,
  );
  return () => form;
}

describe("ProjectWizardRoomLayoutStep", () => {
  it("renders the empty hint and an add room button on an empty draft", () => {
    renderStep(createEmptyDraft());

    expect(screen.getByRole("heading", { level: 2, name: "Układ pomieszczeń" })).toBeInTheDocument();
    expect(screen.getByText("Nie dodano jeszcze żadnego pomieszczenia.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Dodaj pomieszczenie" })).toBeInTheDocument();
  });

  it("adds a room row when the add button is clicked", async () => {
    const user = userEvent.setup();
    const getForm = renderStep(createEmptyDraft());

    await user.click(screen.getByRole("button", { name: "Dodaj pomieszczenie" }));

    expect(getForm().getValues("roomLayout")).toHaveLength(1);
    expect(screen.getByLabelText(/nazwa pomieszczenia/i)).toBeInTheDocument();
  });

  describe("bedrooms/rooms/bathrooms count (moved here from ProjectWizardBasicInfoStep)", () => {
    it("renders the bedrooms, rooms and bathrooms fields, all marked required", () => {
      renderStep(createEmptyDraft());

      expect(screen.getByLabelText(/liczba sypialni/i)).toBeRequired();
      expect(screen.getByLabelText(/liczba pokoi/i)).toBeRequired();
      expect(screen.getByLabelText(/liczba łazienek/i)).toBeRequired();
    });

    it("shows no inline error on an empty draft while showValidation is false", () => {
      renderStep(createEmptyDraft());

      expect(screen.queryByText(/podaj liczbę sypialni/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/podaj liczbę pokoi/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/podaj liczbę łazienek/i)).not.toBeInTheDocument();
    });

    it("shows an inline error under each empty field once showValidation is true", () => {
      renderStep(createEmptyDraft(), {}, true);

      expect(screen.getByText(/podaj liczbę sypialni od 0 do 10/i)).toBeInTheDocument();
      expect(screen.getByText(/podaj liczbę pokoi od 1 do 15/i)).toBeInTheDocument();
      expect(screen.getByText(/podaj liczbę łazienek od 0 do 10/i)).toBeInTheDocument();
    });

    it("does not show the error once the fields hold a valid in-range value", () => {
      renderStep({ ...createEmptyDraft(), bedrooms: 3, rooms: 4, bathrooms: 2 }, {}, true);

      expect(screen.queryByText(/podaj liczbę sypialni/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/podaj liczbę pokoi/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/podaj liczbę łazienek/i)).not.toBeInTheDocument();
    });

    it("updates the form's bedrooms/rooms/bathrooms as digits are typed", async () => {
      const user = userEvent.setup();
      const getForm = renderStep(createEmptyDraft());

      await user.type(screen.getByLabelText(/liczba sypialni/i), "3");
      await user.type(screen.getByLabelText(/liczba pokoi/i), "4");
      await user.type(screen.getByLabelText(/liczba łazienek/i), "2");

      expect(getForm().getValues("bedrooms")).toBe(3);
      expect(getForm().getValues("rooms")).toBe(4);
      expect(getForm().getValues("bathrooms")).toBe(2);
    });
  });

  describe("room layout recognition (spec 0050 AC-4 to AC-12)", () => {
    it("does not render the recognition section when floorPlans is not provided", () => {
      renderStep(createEmptyDraft());
      expect(screen.queryByText("Rozpoznaj układ pomieszczeń z rzutów")).not.toBeInTheDocument();
    });

    it("shows a hint instead of the picker when no floor plans are uploaded yet", () => {
      renderStep(createEmptyDraft(), { productId: "p1", floorPlans: [] });
      expect(screen.getByText("Rozpoznaj układ pomieszczeń z rzutów")).toBeInTheDocument();
      expect(screen.getByText(/Wgraj rzuty w kroku/)).toBeInTheDocument();
    });

    it("shows a hint instead of the picker when the product does not exist yet (productId null)", () => {
      renderStep(createEmptyDraft(), {
        productId: null,
        floorPlans: [{ id: "f1", filename: "rzut.jpg" }],
      });
      expect(screen.getByText(/Wgraj rzuty w kroku/)).toBeInTheDocument();
    });

    it("lists every floor plan as a checkbox, pre-selecting up to five", async () => {
      const floorPlans = Array.from({ length: 6 }, (_, i) => ({ id: `f${i}`, filename: `rzut-${i}.jpg` }));
      renderStep(createEmptyDraft(), { productId: "p1", floorPlans });

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
      const getForm = renderStep(createEmptyDraft(), { productId: "p1", floorPlans });

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
      const getForm = renderStep(createEmptyDraft(), { productId: "p1", floorPlans });

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
        roomLayout: [{ id: "r1", name: "Salon", areaM2: 28, floorLevel: "parter" as const }],
      };
      const getForm = renderStep(existing, { productId: "p1", floorPlans });

      await user.click(screen.getByRole("button", { name: "Rozpoznaj pomieszczenia" }));

      await screen.findByText("do sprawdzenia");
      expect(getForm().getValues("roomLayout")).toHaveLength(1); // not duplicated
      expect(getForm().getValues("roomLayout.0.floorLevel")).toBe("parter"); // not silently overwritten
    });
  });
});
