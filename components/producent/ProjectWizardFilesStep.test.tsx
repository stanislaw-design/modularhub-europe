import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { createEmptyDraft } from "@/lib/producer-project-draft";
import { ProjectWizardFilesStep } from "./ProjectWizardFilesStep";

function makeFile(name: string): File {
  return new File(["x"], name);
}

describe("ProjectWizardFilesStep", () => {
  it("renders both upload areas, Rzuty and Zdjęcia, each required", () => {
    render(<ProjectWizardFilesStep draft={createEmptyDraft()} showValidation={false} onChange={vi.fn()} />);

    expect(document.querySelector("label[for='wizard-floor-plan-files']")).toHaveTextContent("*");
    expect(document.querySelector("label[for='wizard-photo-files']")).toHaveTextContent("*");
  });

  it("shows no error while both areas are empty and showValidation is false", () => {
    render(<ProjectWizardFilesStep draft={createEmptyDraft()} showValidation={false} onChange={vi.fn()} />);

    expect(screen.queryByText(/dodaj co najmniej/i)).not.toBeInTheDocument();
  });

  it("shows both empty-area errors once showValidation is true", () => {
    render(<ProjectWizardFilesStep draft={createEmptyDraft()} showValidation onChange={vi.fn()} />);

    expect(screen.getByText("Dodaj co najmniej jeden rzut.")).toBeInTheDocument();
    expect(screen.getByText("Dodaj co najmniej jedno zdjęcie.")).toBeInTheDocument();
  });

  it("clears only the rzuty error once a floor plan file is present, leaving the zdjęcia error", () => {
    render(
      <ProjectWizardFilesStep
        draft={{ ...createEmptyDraft(), floorPlanFiles: [{ name: "rzut.pdf", sizeBytes: 10 }] }}
        showValidation
        onChange={vi.fn()}
      />
    );

    expect(screen.queryByText("Dodaj co najmniej jeden rzut.")).not.toBeInTheDocument();
    expect(screen.getByText("Dodaj co najmniej jedno zdjęcie.")).toBeInTheDocument();
  });

  it("calls onChange with the updated floorPlanFiles when a file is picked in the Rzuty area", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ProjectWizardFilesStep draft={createEmptyDraft()} showValidation={false} onChange={onChange} />);

    const input = document.getElementById("wizard-floor-plan-files") as HTMLInputElement;
    await user.upload(input, makeFile("rzut.pdf"));

    expect(onChange).toHaveBeenCalledWith({ floorPlanFiles: [{ name: "rzut.pdf", sizeBytes: 1 }] });
  });

  it("calls onChange with the updated photoFiles when a file is picked in the Zdjęcia area", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ProjectWizardFilesStep draft={createEmptyDraft()} showValidation={false} onChange={onChange} />);

    const input = document.getElementById("wizard-photo-files") as HTMLInputElement;
    await user.upload(input, makeFile("zdjecie.png"));

    expect(onChange).toHaveBeenCalledWith({ photoFiles: [{ name: "zdjecie.png", sizeBytes: 1 }] });
  });
});
