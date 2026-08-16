import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ProducerRealizacjePage from "./page";

describe("ProducerRealizacjePage (feature 16)", () => {
  it("wires the fulfillment orders and projects through to one card per order", async () => {
    const element = await ProducerRealizacjePage({ params: Promise.resolve({ locale: "pl" }) });
    render(element);

    expect(screen.getByRole("heading", { level: 1, name: "Realizacje" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Modulor Family 90" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Karpaty Alpine 104" })).toBeInTheDocument();
  });
});
