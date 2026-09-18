import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Producer, ProjectDocument } from "@/lib/data/types";
import { ProducerRealizationsSection } from "./ProducerRealizationsSection";

function makeProducer(overrides: Partial<Producer> = {}): Producer {
  return {
    id: "prod-1",
    name: "Steel House",
    countryCode: "PL",
    rating: 4.7,
    reviewCount: 121,
    modelsCount: 27,
    sizeRangeM2Min: 15.9,
    sizeRangeM2Max: 55.2,
    deliveryCountries: ["PL", "DE"],
    featuredPhotoUrl: "/cover.webp",
    completedProjectsCount: 143,
    verified: true,
    showroomVisitAvailable: null,
    ...overrides,
  };
}

const baseProps = {
  projectName: "Steel House Loft 120",
  selectedVariantId: "variant-1",
};

describe("ProducerRealizationsSection", () => {
  it("shows the producer's identity and key stats in one header", async () => {
    render(await ProducerRealizationsSection({ producer: makeProducer(), documents: [], ...baseProps }));

    expect(screen.getByText("Steel House")).toBeInTheDocument();
    expect(screen.getByText("143 zrealizowanych projektów")).toBeInTheDocument();
    expect(screen.getByText("27 modeli w ofercie")).toBeInTheDocument();
    expect(screen.getByText("Zweryfikowany przez ModularHub")).toBeInTheDocument();
  });

  it("shows the placeholder when this project has no real realization photos yet", async () => {
    render(await ProducerRealizationsSection({ producer: makeProducer(), documents: [], ...baseProps }));

    expect(
      screen.getByText("Prawdziwe zdjęcia zrealizowanych domów tego projektu, do uzupełnienia przez producenta"),
    ).toBeInTheDocument();
  });

  it("shows real photos matching the selected variant instead of the placeholder", async () => {
    const documents: ProjectDocument[] = [
      { url: "/real.webp", purpose: "product_realization_photo", productVariantId: "variant-1" },
    ];
    render(await ProducerRealizationsSection({ producer: makeProducer(), documents, ...baseProps }));

    expect(screen.getByRole("img", { name: /realizacji Steel House Loft 120/ })).toBeInTheDocument();
    expect(
      screen.queryByText("Prawdziwe zdjęcia zrealizowanych domów tego projektu, do uzupełnienia przez producenta"),
    ).not.toBeInTheDocument();
  });

  it("hides a realization photo scoped to a different variant", async () => {
    const documents: ProjectDocument[] = [
      { url: "/real.webp", purpose: "product_realization_photo", productVariantId: "variant-other" },
    ];
    render(await ProducerRealizationsSection({ producer: makeProducer(), documents, ...baseProps }));

    expect(
      screen.getByText("Prawdziwe zdjęcia zrealizowanych domów tego projektu, do uzupełnienia przez producenta"),
    ).toBeInTheDocument();
  });

  it.each([
    [true, "Możliwe odwiedziny osobiste"],
    [false, "Bez możliwości odwiedzin osobistych"],
    [null, "Odwiedziny osobiste do potwierdzenia z producentem"],
  ] as const)("shows showroomVisitAvailable=%s as its own distinguishable state", async (value, expectedText) => {
    render(
      await ProducerRealizationsSection({
        producer: makeProducer({ showroomVisitAvailable: value }),
        documents: [],
        ...baseProps,
      }),
    );
    expect(screen.getByText(expectedText)).toBeInTheDocument();
  });
});
