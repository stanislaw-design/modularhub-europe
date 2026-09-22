import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { createMockProject } from "@/test/fixtures/project";
import { resolveAsyncTree } from "@/test/resolve-async-tree";
import { ProjectTechnicalSpecs } from "./ProjectTechnicalSpecs";

describe("ProjectTechnicalSpecs", () => {
  it("renders every populated field as a row (spec 0020 AC-1)", async () => {
    const project = createMockProject({
      constructionSystem: "Prefabrykowany szkielet drewniany C24/KVH",
      foundationOptions: "Płyta fundamentowa grzewcza",
      structuralWarrantyYears: 30,
    });
    render(await resolveAsyncTree(<ProjectTechnicalSpecs project={project} />));

    expect(screen.getByText("Prefabrykowany szkielet drewniany C24/KVH")).toBeInTheDocument();
    expect(screen.getByText("Płyta fundamentowa grzewcza")).toBeInTheDocument();
    expect(screen.getByText("30 lat")).toBeInTheDocument();
  });

  // insulation/windowClass/wallBuildUp/fireResistance/windResistance usunięte
  // z tej strony (spec 0049 AC-3); mechanizm "puste pole nie renderuje
  // wiersza" (spec 0020 AC-4) sprawdzany teraz na polach, które zostają.
  it("omits a row whose source field is an empty string, without a placeholder (spec 0020 AC-4)", async () => {
    const project = createMockProject({ roofType: "", foundationOptions: "Płyta fundamentowa" });
    render(await resolveAsyncTree(<ProjectTechnicalSpecs project={project} />));

    expect(screen.queryByText("Jaki jest kąt nachylenia dachu?")).not.toBeInTheDocument();
    expect(screen.getByText("Na czym stanie dom?")).toBeInTheDocument();
    expect(screen.getByText("Płyta fundamentowa")).toBeInTheDocument();
  });

  it("trims whitespace-only values and treats them as absent", async () => {
    const project = createMockProject({ ventilation: "   " });
    render(await resolveAsyncTree(<ProjectTechnicalSpecs project={project} />));

    expect(screen.queryByText("Czy latem będzie duszno?")).not.toBeInTheDocument();
  });

  it("always renders the construction warranty row, since structuralWarrantyYears is a required number", async () => {
    // structuralWarrantyYears cannot itself be "missing" under the current Project
    // type, so this row (and therefore the whole section) can never fully hide the
    // way the certifications/gallery sections can — see NOT_COVERED in the /test report.
    const project = createMockProject({ structuralWarrantyYears: 0 });
    render(await resolveAsyncTree(<ProjectTechnicalSpecs project={project} />));

    expect(screen.getByText("0 lat")).toBeInTheDocument();
  });
});
