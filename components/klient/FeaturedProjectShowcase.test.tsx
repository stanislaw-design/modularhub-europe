import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FeaturedProjectShowcase } from "./FeaturedProjectShowcase";

describe("FeaturedProjectShowcase", () => {
  it("shows the project heading and the production status", async () => {
    render(await FeaturedProjectShowcase({ locale: "pl" }));

    expect(
      screen.getByRole("heading", { level: 2, name: "Succes Resorts – 49 nowoczesnych domków rekreacyjnych" })
    ).toBeInTheDocument();
    expect(screen.getByText("W produkcji")).toBeInTheDocument();
  });

  it("lists the project facts", async () => {
    render(await FeaturedProjectShowcase({ locale: "pl" }));

    expect(screen.getByText("BUDMAN HOUSE")).toBeInTheDocument();
    expect(screen.getByText("Voorgewel Chalet")).toBeInTheDocument();
    expect(screen.getByText("2 459,8 m²")).toBeInTheDocument();
    expect(screen.getByText("Produkcja w toku")).toBeInTheDocument();
  });

  it("links the investor CTA to the project request form and the producer CTA to registration", async () => {
    render(await FeaturedProjectShowcase({ locale: "en" }));

    expect(screen.getByRole("link", { name: /zleć podobny projekt/i })).toHaveAttribute("href", "/en/project-request");
    expect(screen.getByRole("link", { name: /realizuj takie projekty/i })).toHaveAttribute("href", "/en/producer/registration");
  });
});
