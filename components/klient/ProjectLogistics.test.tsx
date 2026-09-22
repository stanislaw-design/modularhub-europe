import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { createMockProject } from "@/test/fixtures/project";
import { ProjectLogistics } from "./ProjectLogistics";

// minPlotWidthM/transportDimensions/craneRequirements usunięte ze strony
// (spec 0049 AC-3): tylko externalDimensions i foundationOptions zostają.
describe("ProjectLogistics", () => {
  it("renders a placeholder for every field when nothing is filled (data gap, not a hidden section)", async () => {
    const project = createMockProject({ externalDimensions: "", foundationOptions: "" });
    render(await ProjectLogistics({ project }));

    expect(screen.getByRole("heading", { name: "Działka i dostawa" })).toBeInTheDocument();
    expect(screen.getAllByText("Do uzupełnienia").length).toBe(2);
  });

  it("renders real values where filled and a placeholder for the field still missing", async () => {
    const project = createMockProject({
      externalDimensions: "13,5 × 4,2 × 3,8 m",
      foundationOptions: "",
    });
    render(await ProjectLogistics({ project }));

    expect(screen.getByRole("heading", { name: "Działka i dostawa" })).toBeInTheDocument();
    expect(screen.getByText("13,5 × 4,2 × 3,8 m")).toBeInTheDocument();
    expect(screen.getByText("Wymagania fundamentu")).toBeInTheDocument();
    expect(screen.getAllByText("Do uzupełnienia").length).toBe(1);
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
