import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { resolveAsyncTree } from "@/test/resolve-async-tree";
import type { Producer } from "@/lib/data/types";
import { ProducerShowcase } from "./ProducerShowcase";

describe("ProducerShowcase (spec 0073)", () => {
  it("renders nothing for an empty list (AC-9)", async () => {
    const { container } = render(await resolveAsyncTree(<ProducerShowcase producers={[]} locale="pl" />));
    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByRole("heading")).not.toBeInTheDocument();
  });
});

const baseProducer: Producer = {
  id: "p",
  name: "P",
  countryCode: "PL",
  rating: 0,
  reviewCount: 0,
  modelsCount: 5,
  sizeRangeM2Min: 30,
  sizeRangeM2Max: 120,
  deliveryCountries: ["PL", "DE"],
  featuredPhotoUrl: "https://picsum.photos/400/300",
  verified: true,
  completedProjectsCount: 0,
  showroomVisitAvailable: null,
};

describe("ProducerShowcase selection", () => {
  it("lists only verified producers, most delivered homes first", async () => {
    render(
      await resolveAsyncTree(
        <ProducerShowcase
          locale="pl"
          producers={[
            { ...baseProducer, id: "a", name: "Mało", completedProjectsCount: 1 },
            { ...baseProducer, id: "b", name: "Niezweryfikowany", verified: false, completedProjectsCount: 50 },
            { ...baseProducer, id: "c", name: "Dużo", completedProjectsCount: 12 },
          ]}
        />,
      ),
    );

    expect(screen.queryByText("Niezweryfikowany")).not.toBeInTheDocument();
    const names = screen
      .getAllByRole("link")
      .filter((link) => link.getAttribute("href")?.includes("/producers/"))
      .map((link) => link.textContent ?? "");
    expect(names[0]).toContain("Dużo");
    expect(names[1]).toContain("Mało");
  });

  it("hides the delivery line when a producer has no delivery countries", async () => {
    render(
      await resolveAsyncTree(
        <ProducerShowcase locale="pl" producers={[{ ...baseProducer, deliveryCountries: [] }]} />,
      ),
    );

    expect(screen.queryByText(/Dostawa/)).not.toBeInTheDocument();
  });

  it("links the show-all button to the full producer list", async () => {
    render(await resolveAsyncTree(<ProducerShowcase locale="de" producers={[baseProducer]} />));

    expect(screen.getByRole("link", { name: /Alle Hersteller|Zobacz wszystkich/ })).toHaveAttribute(
      "href",
      "/de/producers",
    );
  });
});
