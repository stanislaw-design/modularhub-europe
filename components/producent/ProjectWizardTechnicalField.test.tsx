import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ProjectWizardTechnicalField } from "./ProjectWizardTechnicalField";

describe("ProjectWizardTechnicalField", () => {
  it("always shows the label as required and the hint text", () => {
    render(
      <ProjectWizardTechnicalField
        id="wizard-wall-build-up"
        label="Układ ścian"
        hint="Warstwy ściany od zewnątrz do wewnątrz"
        value=""
        invalid={false}
        errorMessage="Opisz układ ścian."
        onChange={vi.fn()}
      />
    );

    expect(screen.getByLabelText(/Układ ścian/)).toBeRequired();
    expect(screen.getByText("Warstwy ściany od zewnątrz do wewnątrz")).toBeInTheDocument();
  });

  it("shows no error message and points aria-describedby only at the hint while valid", () => {
    render(
      <ProjectWizardTechnicalField
        id="wizard-wall-build-up"
        label="Układ ścian"
        hint="Podpowiedź"
        value="Szkielet"
        invalid={false}
        errorMessage="Opisz układ ścian."
        onChange={vi.fn()}
      />
    );

    expect(screen.queryByText("Opisz układ ścian.")).not.toBeInTheDocument();
    expect(screen.getByLabelText(/Układ ścian/)).toHaveAttribute(
      "aria-describedby",
      "wizard-wall-build-up-hint"
    );
  });

  it("shows the error message and links it via aria-describedby alongside the hint when invalid", () => {
    render(
      <ProjectWizardTechnicalField
        id="wizard-wall-build-up"
        label="Układ ścian"
        hint="Podpowiedź"
        value=""
        invalid
        errorMessage="Opisz układ ścian."
        onChange={vi.fn()}
      />
    );

    expect(screen.getByText("Opisz układ ścian.")).toBeInTheDocument();
    expect(screen.getByLabelText(/Układ ścian/)).toHaveAttribute(
      "aria-describedby",
      "wizard-wall-build-up-hint wizard-wall-build-up-error"
    );
  });

  it("calls onChange with the new value as the user types", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <ProjectWizardTechnicalField
        id="wizard-wall-build-up"
        label="Układ ścian"
        hint="Podpowiedź"
        value=""
        invalid={false}
        errorMessage="Opisz układ ścian."
        onChange={onChange}
      />
    );

    await user.type(screen.getByLabelText(/Układ ścian/), "S");

    expect(onChange).toHaveBeenCalledWith("S");
  });
});
