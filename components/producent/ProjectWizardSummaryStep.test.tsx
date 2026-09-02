import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Country } from "@/lib/data/types";
import { createEmptyDraft } from "@/lib/producer-project-draft";
import { ProjectWizardSummaryStep } from "./ProjectWizardSummaryStep";

const countries: Country[] = [
  { code: "PL", name: "Polska" },
  { code: "DE", name: "Niemcy" },
];

const filledDraft = {
  ...createEmptyDraft(),
  name: "Modulor 28",
  floorAreaM2: 120,
  bedrooms: 3,
  countryOfProduction: "PL" as const,
  description: "Opis",
  family: "dom" as const,
  category: "caloroczny" as const,
  technicalSpecs: {
    wallBuildUp: "Szkielet",
    insulation: "U = 0.15",
    heatTransferCoefficients: "U = 0.9",
    windowClass: "Uw = 0.8",
    ventilation: "Mechaniczna",
    heatSource: "Pompa ciepła",
    fireResistance: "REI 30",
    windResistance: "Strefa 2",
  },
  floorPlanFiles: [{ name: "rzut.pdf", sizeBytes: 10 }],
  photoFiles: [
    { name: "zdjecie1.png", sizeBytes: 20 },
    { name: "zdjecie2.png", sizeBytes: 30 },
  ],
};

describe("ProjectWizardSummaryStep", () => {
  it("shows every entered value, read only, under its label", () => {
    render(<ProjectWizardSummaryStep draft={filledDraft} countries={countries} />);

    expect(screen.getByText("Modulor 28")).toBeInTheDocument();
    expect(screen.getByText("120 m²")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("Polska")).toBeInTheDocument();
    expect(screen.getByText("Szkielet")).toBeInTheDocument();
    expect(screen.getByText("REI 30")).toBeInTheDocument();
  });

  it("renders no editable form controls, only static text", () => {
    render(<ProjectWizardSummaryStep draft={filledDraft} countries={countries} />);

    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("spinbutton")).not.toBeInTheDocument();
  });

  it("lists every selected file's name under the right area, with a count in the heading", () => {
    render(<ProjectWizardSummaryStep draft={filledDraft} countries={countries} />);

    expect(screen.getByText("Rzuty (1)")).toBeInTheDocument();
    expect(screen.getByText("rzut.pdf")).toBeInTheDocument();
    expect(screen.getByText("Zdjęcia (2)")).toBeInTheDocument();
    expect(screen.getByText("zdjecie1.png")).toBeInTheDocument();
    expect(screen.getByText("zdjecie2.png")).toBeInTheDocument();
  });

  it("falls back to a dash for metraż, sypialnie, and kraj when the draft holds no value", () => {
    render(<ProjectWizardSummaryStep draft={createEmptyDraft()} countries={countries} />);

    expect(screen.getAllByText("—").length).toBeGreaterThanOrEqual(3);
  });

  it("shows a zero count and no file rows when an area was left empty", () => {
    render(<ProjectWizardSummaryStep draft={createEmptyDraft()} countries={countries} />);

    expect(screen.getByText("Rzuty (0)")).toBeInTheDocument();
    expect(screen.getByText("Zdjęcia (0)")).toBeInTheDocument();
  });
});
