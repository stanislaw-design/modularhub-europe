import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { FulfillmentOrder, Project } from "@/lib/data/types";
import { createMockProject } from "@/test/fixtures/project";
import { ProducerFulfillmentList } from "./ProducerFulfillmentList";

function makeProject(overrides: Partial<Project> = {}): Project {
  return createMockProject({ coverImageUrl: "/images/houses/golden-hour/modulor-family-90.webp", ...overrides });
}

function makeOrder(overrides: Partial<FulfillmentOrder> = {}): FulfillmentOrder {
  return {
    projectId: "prj-modulor-family-90",
    currentStage: "montaz",
    stages: [
      { name: "produkcja", reachedAt: "2026-05-04", documents: [] },
      { name: "transport", reachedAt: "2026-06-01", documents: [] },
      { name: "montaz", reachedAt: "2026-06-08", documents: [] },
      { name: "odbior", reachedAt: null, documents: [] },
      { name: "gwarancja", reachedAt: null, documents: [] },
    ],
    ...overrides,
  };
}

describe("ProducerFulfillmentList", () => {
  it("shows an empty state message when there are no orders", () => {
    render(<ProducerFulfillmentList locale="pl" orders={[]} projects={[]} />);

    expect(screen.getByText(/Brak realizacji/)).toBeInTheDocument();
  });

  it("renders one card per order with project name, producer, and floor area", () => {
    render(
      <ProducerFulfillmentList locale="pl" orders={[makeOrder()]} projects={[makeProject()]} />
    );

    expect(screen.getByRole("heading", { level: 2, name: "Modulor Family 90" })).toBeInTheDocument();
    expect(screen.getByText(/Modulor Systems Sp\. z o\.o\. · 90 m²/)).toBeInTheDocument();
  });

  it("shows the current stage label, not the delivered badge, for an order still before odbiór", () => {
    render(
      <ProducerFulfillmentList locale="pl" orders={[makeOrder({ currentStage: "montaz" })]} projects={[makeProject()]} />
    );

    expect(screen.getByText("Aktualny etap: Montaż")).toBeInTheDocument();
    expect(screen.queryByText("Gotowe do weryfikacji firmy")).not.toBeInTheDocument();
  });

  it("shows the delivered badge once the order reached odbiór or later", () => {
    render(
      <ProducerFulfillmentList locale="pl" orders={[makeOrder({ currentStage: "odbior" })]} projects={[makeProject()]} />
    );

    expect(screen.getByText("Gotowe do weryfikacji firmy")).toBeInTheDocument();
    expect(screen.queryByText(/Aktualny etap/)).not.toBeInTheDocument();
  });

  it("still shows the delivered badge for an order on the final gwarancja stage", () => {
    render(
      <ProducerFulfillmentList locale="pl" orders={[makeOrder({ currentStage: "gwarancja" })]} projects={[makeProject()]} />
    );

    expect(screen.getByText("Gotowe do weryfikacji firmy")).toBeInTheDocument();
  });

  it("links each card to the realizacja axis for that project, locale-prefixed", () => {
    render(
      <ProducerFulfillmentList locale="pl" orders={[makeOrder()]} projects={[makeProject()]} />
    );

    expect(screen.getByRole("link", { name: "Zobacz oś statusu" })).toHaveAttribute(
      "href",
      "/pl/producent/realizacja?project=prj-modulor-family-90"
    );
  });

  it("skips an order whose project cannot be found, without throwing", () => {
    render(
      <ProducerFulfillmentList locale="pl" orders={[makeOrder({ projectId: "does-not-exist" })]} projects={[makeProject()]} />
    );

    expect(screen.queryByRole("heading", { level: 2 })).not.toBeInTheDocument();
  });

  it("renders one card per order when there are several", () => {
    render(
      <ProducerFulfillmentList
        locale="pl"
        orders={[
          makeOrder({ projectId: "prj-modulor-family-90", currentStage: "montaz" }),
          makeOrder({ projectId: "prj-baltyk-loft-120", currentStage: "produkcja" }),
        ]}
        projects={[
          makeProject(),
          makeProject({ id: "prj-baltyk-loft-120", name: "Baltyk Loft 120", producerName: "Baltyk Modular Sp. z o.o.", floorAreaM2: 120 }),
        ]}
      />
    );

    expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(2);
  });
});
