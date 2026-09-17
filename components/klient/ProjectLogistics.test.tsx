import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { createMockProject } from "@/test/fixtures/project";
import { ProjectLogistics } from "./ProjectLogistics";

describe("ProjectLogistics", () => {
  it("renders a placeholder for every field when nothing is filled (data gap, not a hidden section)", async () => {
    const project = createMockProject({ externalDimensions: "", foundationOptions: "" });
    render(await ProjectLogistics({ project }));

    expect(screen.getByRole("heading", { name: "Działka i dostawa" })).toBeInTheDocument();
    expect(screen.getAllByText("Do uzupełnienia").length).toBeGreaterThan(0);
  });

  it("renders real values where filled and a placeholder for the fields still missing", async () => {
    const project = createMockProject({
      externalDimensions: "",
      foundationOptions: "",
      transportDimensions: "13,5 × 4,2 × 3,8 m",
    });
    render(await ProjectLogistics({ project }));

    expect(screen.getByRole("heading", { name: "Działka i dostawa" })).toBeInTheDocument();
    expect(screen.getByText("13,5 × 4,2 × 3,8 m")).toBeInTheDocument();
    expect(screen.getByText("Wymagania fundamentu")).toBeInTheDocument();
    expect(screen.getByText("Minimalna szerokość działki")).toBeInTheDocument();
    expect(screen.getAllByText("Do uzupełnienia").length).toBeGreaterThan(0);
  });

  it("shows the minimum plot width as the headline metric when present", async () => {
    const project = createMockProject({ minPlotWidthM: 6.5 });
    render(await ProjectLogistics({ project }));
    expect(screen.getByText("6.5 m")).toBeInTheDocument();
    expect(screen.getByText("Minimalna szerokość działki")).toBeInTheDocument();
  });

  it("shows crane requirements when present", async () => {
    const project = createMockProject({
      externalDimensions: "",
      foundationOptions: "",
      craneRequirements: "Dźwig 25t przy dojeździe węższym niż 3,5 m",
    });
    render(await ProjectLogistics({ project }));
    expect(screen.getByText("Dźwig 25t przy dojeździe węższym niż 3,5 m")).toBeInTheDocument();
  });
});
