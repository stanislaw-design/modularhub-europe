import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next/navigation")>();
  return { ...actual, useRouter: () => ({ refresh: vi.fn() }) };
});
vi.mock("@/lib/producer-product-actions", () => ({ deleteProducerProduct: vi.fn() }));

import { ProducerProductList, type ProducerProductListItem } from "./ProducerProductList";

const base: ProducerProductListItem = {
  id: "p1",
  name: "Dom Kompletny",
  family: "dom",
  status: "published",
  createdAt: new Date("2026-10-01T10:00:00Z"),
  missing: [],
};

// Spec 0074 AC-10: kolumna "Kompletność", pierwszy brak, przycisk "Uzupełnij".
describe("ProducerProductList", () => {
  it("shows a complete product with an Edit button and no missing label", () => {
    render(<ProducerProductList locale="pl" products={[base]} />);

    const row = screen.getByRole("row", { name: /Dom Kompletny/ });
    expect(within(row).getByText("Kompletny")).toBeInTheDocument();
    expect(within(row).getByRole("link", { name: "Edytuj" }).getAttribute("href")).toBe(
      "/pl/producer/panel/products/p1/edit",
    );
  });

  it("shows only the first missing item and a Complete button for an incomplete product", () => {
    render(
      <ProducerProductList
        locale="pl"
        products={[{ ...base, id: "p2", name: "Dom Bez Zdjęć", missing: ["photo", "price"] }]}
      />,
    );

    const row = screen.getByRole("row", { name: /Dom Bez Zdjęć/ });
    expect(within(row).getByText("Brak zdjęć")).toBeInTheDocument();
    expect(within(row).queryByText("Brak ceny")).not.toBeInTheDocument();
    expect(within(row).getByRole("link", { name: "Uzupełnij" })).toBeInTheDocument();
  });

  it("explains a draft as finish and publish", () => {
    render(<ProducerProductList locale="pl" products={[{ ...base, status: "draft", missing: ["draft"] }]} />);
    expect(screen.getByText("Dokończ i opublikuj")).toBeInTheDocument();
  });

  it("offers adding a product from the empty state and from the header", () => {
    render(<ProducerProductList locale="pl" products={[]} />);
    expect(screen.getAllByRole("link", { name: /Dodaj/ }).length).toBeGreaterThanOrEqual(2);
  });
});
