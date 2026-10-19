import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { formatPriceEur } from "@/lib/format-price";
import { createMockProject } from "@/test/fixtures/project";
import { PopularHomeCard } from "./PopularHomeCard";

const project = createMockProject({ name: "Modulor Family 90" });

describe("PopularHomeCard", () => {
  it("links to the href it is given (spec 0020 AC-2)", async () => {
    render(await PopularHomeCard({ project, countryName: "Polska", href: "/pl/project/prj-modulor-family-90", locale: "pl" }));
    expect(screen.getByRole("link")).toHaveAttribute("href", "/pl/project/prj-modulor-family-90");
  });

  it("shows the project's starting price when priceOnRequest is not set", async () => {
    render(await PopularHomeCard({ project, countryName: "Polska", href: "/x", locale: "pl" }));
    expect(screen.getByText(`od ${formatPriceEur(project.priceMin, "pl")}`.replace(/\s/g, " "))).toBeInTheDocument();
  });

  it("shows Wycena indywidualna instead of a price when priceOnRequest is true (spec 0020 AC-5)", async () => {
    const onRequestProject = createMockProject({ priceOnRequest: true });
    render(await PopularHomeCard({ project: onRequestProject, countryName: "Polska", href: "/x", locale: "pl" }));
    expect(screen.getByText("Wycena indywidualna")).toBeInTheDocument();
    expect(screen.queryByText(/118\s?000/)).not.toBeInTheDocument();
    expect(screen.queryByText(/\/ m²/)).not.toBeInTheDocument();
  });

  it("shows the project name, producer, country and the key facts", async () => {
    render(await PopularHomeCard({ project, countryName: "Polska", href: "/x", locale: "pl" }));
    expect(screen.getByRole("heading", { name: "Modulor Family 90" })).toBeInTheDocument();
    expect(screen.getByText(/Modulor Systems Sp\. z o\.o\./)).toBeInTheDocument();
    expect(screen.getByText(/Polska/)).toBeInTheDocument();
    expect(screen.getByText("90 m²")).toBeInTheDocument();
    expect(screen.getByText("3 sypialnie")).toBeInTheDocument();
    expect(screen.getByText("2 łazienki")).toBeInTheDocument();
    expect(screen.getByText("1 kondygnacja")).toBeInTheDocument();
  });

  it("shows the completion standard and the price per m² of the default variant", async () => {
    render(await PopularHomeCard({ project, countryName: "Polska", href: "/x", locale: "pl" }));
    const perM2 = formatPriceEur(Math.round(118000 / 90), "pl");
    expect(screen.getByText(new RegExp(`Standard deweloperski · ok\\. ${perM2.replace(/\s/g, "\\s")} / m²`))).toBeInTheDocument();
  });

  it("falls back to the room count when the source has no bedrooms", async () => {
    const noBedrooms = createMockProject({ bedrooms: null, rooms: 5 });
    render(await PopularHomeCard({ project: noBedrooms, countryName: "Polska", href: "/x", locale: "pl" }));
    expect(screen.getByText("5 pokoi")).toBeInTheDocument();
    expect(screen.queryByText(/sypialni/)).not.toBeInTheDocument();
  });

  it("omits facts the source data has none of (e.g. Steel House import gap)", async () => {
    const gappy = createMockProject({ bedrooms: null, rooms: 0, bathrooms: null, storeys: null });
    render(await PopularHomeCard({ project: gappy, countryName: "Polska", href: "/x", locale: "pl" }));
    expect(screen.getByText("90 m²")).toBeInTheDocument();
    expect(screen.queryByText(/pokoi|sypialni|łazien|kondygnac/)).not.toBeInTheDocument();
  });

  it("renders the lead variant with a call to action", async () => {
    render(await PopularHomeCard({ project, countryName: "Polska", href: "/x", locale: "pl", variant: "lead" }));
    expect(screen.getByRole("heading", { name: "Modulor Family 90" })).toBeInTheDocument();
    expect(screen.getByText("Zobacz projekt")).toBeInTheDocument();
    expect(screen.getByText("Standard deweloperski")).toBeInTheDocument();
  });
});
