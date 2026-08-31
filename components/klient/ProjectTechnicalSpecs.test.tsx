import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { createMockProject } from "@/test/fixtures/project";
import { ProjectTechnicalSpecs } from "./ProjectTechnicalSpecs";

describe("ProjectTechnicalSpecs", () => {
  it("renders every populated field as a row (spec 0020 AC-1)", () => {
    const project = createMockProject({
      constructionSystem: "Prefabrykowany szkielet drewniany C24/KVH",
      windResistance: "Strefa wiatrowa 1-3 (do 30 m/s)",
      structuralWarrantyYears: 30,
    });
    render(<ProjectTechnicalSpecs project={project} />);

    expect(screen.getByText("Prefabrykowany szkielet drewniany C24/KVH")).toBeInTheDocument();
    expect(screen.getByText("Strefa wiatrowa 1-3 (do 30 m/s)")).toBeInTheDocument();
    expect(screen.getByText("30 lat")).toBeInTheDocument();
  });

  it("omits a row whose source field is an empty string, without a placeholder (spec 0020 AC-4)", () => {
    const project = createMockProject({ insulation: "", windowClass: "Klasa energetyczna A" });
    render(<ProjectTechnicalSpecs project={project} />);

    expect(screen.queryByText("Izolacyjność")).not.toBeInTheDocument();
    expect(screen.getByText("Klasa okien")).toBeInTheDocument();
    expect(screen.getByText("Klasa energetyczna A")).toBeInTheDocument();
  });

  it("trims whitespace-only values and treats them as absent", () => {
    const project = createMockProject({ ventilation: "   " });
    render(<ProjectTechnicalSpecs project={project} />);

    expect(screen.queryByText("Wentylacja")).not.toBeInTheDocument();
  });

  it("always renders the construction warranty row, since structuralWarrantyYears is a required number", () => {
    // structuralWarrantyYears cannot itself be "missing" under the current Project
    // type, so this row (and therefore the whole section) can never fully hide the
    // way the certifications/gallery sections can — see NOT_COVERED in the /test report.
    const project = createMockProject({ structuralWarrantyYears: 0 });
    render(<ProjectTechnicalSpecs project={project} />);

    expect(screen.getByText("0 lat")).toBeInTheDocument();
  });
});
