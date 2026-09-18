import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { Producer } from "@/lib/data/types";
import { ProducerCard } from "./ProducerCard";

function makeProducer(overrides: Partial<Producer> = {}): Producer {
  return {
    id: "prod-1",
    name: "Budman House",
    countryCode: "PL",
    rating: 4.8,
    reviewCount: 134,
    modelsCount: 13,
    sizeRangeM2Min: 27.5,
    sizeRangeM2Max: 141.57,
    deliveryCountries: ["PL", "DE"],
    featuredPhotoUrl: "/cover.webp",
    completedProjectsCount: 42,
    verified: true,
    showroomVisitAvailable: null,
    ...overrides,
  };
}

describe("ProducerCard", () => {
  it("renders the producer's name and country without trust details by default", async () => {
    render(await ProducerCard({ producer: makeProducer() }));
    expect(screen.getByText("Budman House")).toBeInTheDocument();
    expect(screen.queryByText(/odwiedziny/i)).not.toBeInTheDocument();
  });

  it.each([
    [true, "Możliwe odwiedziny osobiste"],
    [false, "Bez możliwości odwiedzin osobistych"],
    [null, "Odwiedziny osobiste do potwierdzenia z producentem"],
  ] as const)(
    "shows showroomVisitAvailable=%s as its own distinguishable state (spec 0042 AC-9)",
    async (value, expectedText) => {
      render(await ProducerCard({ producer: makeProducer({ showroomVisitAvailable: value }), showTrustDetails: true }));
      expect(screen.getByText(expectedText)).toBeInTheDocument();
    },
  );

  it("shows the showroom note only when visits are available", async () => {
    render(
      await ProducerCard({
        producer: makeProducer({ showroomVisitAvailable: true, showroomVisitNote: "Umów wizytę telefonicznie." }),
        showTrustDetails: true,
      }),
    );
    expect(screen.getByText("Umów wizytę telefonicznie.")).toBeInTheDocument();
  });

  it("hides the showroom note when visits are unavailable, even if a note is set", async () => {
    render(
      await ProducerCard({
        producer: makeProducer({ showroomVisitAvailable: false, showroomVisitNote: "Stray note" }),
        showTrustDetails: true,
      }),
    );
    expect(screen.queryByText("Stray note")).not.toBeInTheDocument();
  });

  it("shows the response time line only when filled (spec 0042 AC-10)", async () => {
    const { rerender } = render(
      await ProducerCard({ producer: makeProducer({ inquiryResponseTimeLabel: undefined }), showTrustDetails: true }),
    );
    expect(screen.queryByText(/Odpowiada w ciągu/)).not.toBeInTheDocument();

    rerender(
      await ProducerCard({
        producer: makeProducer({ inquiryResponseTimeLabel: "2 dni robocze" }),
        showTrustDetails: true,
      }),
    );
    expect(screen.getByText("Odpowiada w ciągu 2 dni robocze")).toBeInTheDocument();
  });

  it("never shows trust details when showTrustDetails is false, regardless of data (spec 0042 Follow-up)", async () => {
    render(
      await ProducerCard({
        producer: makeProducer({ showroomVisitAvailable: true, inquiryResponseTimeLabel: "1 dzień" }),
        showTrustDetails: false,
      }),
    );
    expect(screen.queryByText("Możliwe odwiedziny osobiste")).not.toBeInTheDocument();
    expect(screen.queryByText(/Odpowiada w ciągu/)).not.toBeInTheDocument();
  });
});
