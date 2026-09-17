import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { createMockProject } from "@/test/fixtures/project";
import { PopularHomeCard } from "./PopularHomeCard";

const project = createMockProject({ name: "Modulor Family 90" });

describe("PopularHomeCard", () => {
  it("links to the href it is given (spec 0020 AC-2)", async () => {
    render(await PopularHomeCard({ project, countryName: "Polska", href: "/pl/project/prj-modulor-family-90" }));
    expect(screen.getByRole("link")).toHaveAttribute("href", "/pl/project/prj-modulor-family-90");
  });

  it("shows the project's starting price when priceOnRequest is not set", async () => {
    render(await PopularHomeCard({ project, countryName: "Polska", href: "/x" }));
    expect(screen.getByText(/od\s+118\s?000\s?€/)).toBeInTheDocument();
  });

  it("shows Wycena indywidualna instead of a price when priceOnRequest is true (spec 0020 AC-5)", async () => {
    const onRequestProject = createMockProject({ priceOnRequest: true });
    render(await PopularHomeCard({ project: onRequestProject, countryName: "Polska", href: "/x" }));
    expect(screen.getByText("Wycena indywidualna")).toBeInTheDocument();
    expect(screen.queryByText(/118\s?000/)).not.toBeInTheDocument();
  });

  it("shows the project name, floor area, room count and country", async () => {
    render(await PopularHomeCard({ project, countryName: "Polska", href: "/x" }));
    expect(screen.getByRole("heading", { name: "Modulor Family 90" })).toBeInTheDocument();
    expect(screen.getByText(/90 m² · 4 pokoi/)).toBeInTheDocument();
    expect(screen.getByText(/Polska/)).toBeInTheDocument();
  });

  it("omits the room count when the source data has none (e.g. Steel House import gap)", async () => {
    const noRoomsProject = createMockProject({ rooms: 0 });
    render(await PopularHomeCard({ project: noRoomsProject, countryName: "Polska", href: "/x" }));
    expect(screen.getByText(/^90 m² ·/)).toBeInTheDocument();
    expect(screen.queryByText(/pokoi/)).not.toBeInTheDocument();
  });
});
