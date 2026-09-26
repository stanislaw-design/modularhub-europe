import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { createMockProject } from "@/test/fixtures/project";
import { ProjectLogistics } from "./ProjectLogistics";

// minPlotWidthM/transportDimensions/craneRequirements usunięte ze strony
// (spec 0049 AC-3): tylko externalDimensions i foundationOptions zostają.
describe("ProjectLogistics", () => {
  it("renders nothing when no logistics field and no client requirement is filled (spec 0054 AC-5, AC-8)", async () => {
    const project = createMockProject({ externalDimensions: "", foundationOptions: "", clientRequirements: [] });
    const result = await ProjectLogistics({ project });
    expect(result).toBeNull();
  });

  it("renders only the field that is filled, no placeholder for the missing one (spec 0054 AC-5)", async () => {
    const project = createMockProject({
      externalDimensions: "13,5 × 4,2 × 3,8 m",
      foundationOptions: "",
    });
    render(await ProjectLogistics({ project }));

    expect(screen.getByRole("heading", { name: "Działka i dostawa" })).toBeInTheDocument();
    expect(screen.getByText("13,5 × 4,2 × 3,8 m")).toBeInTheDocument();
    expect(screen.queryByText("Wymagania fundamentu")).not.toBeInTheDocument();
    expect(screen.queryByText("Do uzupełnienia")).not.toBeInTheDocument();
  });

  it("shows foundation options when present", async () => {
    const project = createMockProject({
      externalDimensions: "",
      foundationOptions: "Płyta fundamentowa grzewcza",
    });
    render(await ProjectLogistics({ project }));
    expect(screen.getByText("Płyta fundamentowa grzewcza")).toBeInTheDocument();
  });
});
