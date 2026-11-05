import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { InteriorStyle, ProducerContentItem } from "@/lib/db/queries";
import { ProducerCollaborationSteps, ProducerCommercialUses } from "./ProducerContentSections";
import { ProjectInteriorStyles } from "./ProjectInteriorStyles";

const styles: InteriorStyle[] = [
  {
    id: "s1",
    name: "Almond Aura",
    sourceName: "Almond Aura",
    description: "Ciepłe beże.",
    images: [{ id: "i1", url: "https://pub-x.r2.dev/style-images/a-kitchen.jpg", alt: null }],
    materials: [
      { id: "m1", zone: "flooring", name: "LINOLEUM", code: "M34", swatchUrl: "https://pub-x.r2.dev/style-swatches/linoleum-m34.webp" },
      { id: "m2", zone: "walls_ceilings", name: "White MDF", code: "RAL 9016", swatchUrl: null },
    ],
  },
  { id: "s2", name: "Calm Stone", sourceName: "Calm Stone", description: null, images: [], materials: [] },
];

const baseProps = {
  styles,
  hrefFor: (id: string) => `/pl/project/bali?stylistyka=${id}`,
  heading: "Wykończenie wnętrza",
  intro: "Wybierz stylistykę.",
  previewNote: "To podgląd.",
  chosenLabel: "Wybrana",
  materialsHeading: "Materiały",
  ariaLabel: "Stylistyki wnętrza",
  zoneLabels: { flooring: "Podłoga", walls_ceilings: "Ściany i sufity" },
  imageLabels: ["Kuchnia", "Sypialnia", "Łazienka"] as [string, string, string],
};

describe("ProjectInteriorStyles", () => {
  it("bez wyboru pokazuje podgląd pierwszej stylistyki, ale nie uznaje jej za wybór (AC-8)", () => {
    render(<ProjectInteriorStyles {...baseProps} activeStyleId="s1" chosenStyleId={null} />);
    expect(screen.getByText("To podgląd.")).toBeInTheDocument();
    expect(screen.queryByText("Wybrana")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Almond Aura" })).toHaveAttribute("aria-current", "true");
  });

  it("wybrana stylistyka dostaje znacznik i znika notka o podglądzie", () => {
    render(<ProjectInteriorStyles {...baseProps} activeStyleId="s1" chosenStyleId="s1" />);
    expect(screen.getByText("Wybrana")).toBeInTheDocument();
    expect(screen.queryByText("To podgląd.")).not.toBeInTheDocument();
  });

  it("grupuje materiały w strefy, a kafelki to zwykłe <img> z R2, bez next/image (AC-9)", () => {
    const { container } = render(<ProjectInteriorStyles {...baseProps} activeStyleId="s1" chosenStyleId={null} />);
    const flooring = screen.getByText("Podłoga").closest("div")!;
    expect(within(flooring).getByText("LINOLEUM")).toBeInTheDocument();
    expect(within(flooring).getByText("M34")).toBeInTheDocument();
    const swatch = container.querySelector('dl img') as HTMLImageElement;
    expect(swatch.getAttribute("src")).toBe("https://pub-x.r2.dev/style-swatches/linoleum-m34.webp");
    expect(swatch.getAttribute("src")).not.toContain("/_next/image");
  });

  it("renderuje tylko materiały aktualnie otwartej stylistyki (AC-9)", () => {
    render(<ProjectInteriorStyles {...baseProps} activeStyleId="s2" chosenStyleId={null} />);
    expect(screen.queryByText("LINOLEUM")).not.toBeInTheDocument();
  });

  it("nieznane id aktywnej stylistyki spada na pierwszą, bez błędu (AC-8)", () => {
    render(<ProjectInteriorStyles {...baseProps} activeStyleId="obce" chosenStyleId={null} />);
    expect(screen.getByRole("heading", { name: "Almond Aura" })).toBeInTheDocument();
  });

  it("bez stylistyk nic nie renderuje", () => {
    const { container } = render(<ProjectInteriorStyles {...baseProps} styles={[]} activeStyleId="" chosenStyleId={null} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe("ProducerContentSections (AC-11)", () => {
  const items: ProducerContentItem[] = [
    { id: "a", title: "Analiza potrzeb", body: "Zaczynamy od analizy." },
    { id: "b", title: "Produkcja", body: null },
  ];

  it("renderuje kroki w kolejności i numeruje je", () => {
    render(<ProducerCollaborationSteps items={items} heading="Sposób współpracy" />);
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getByText("Analiza potrzeb")).toBeInTheDocument();
  });

  it("sekcja bez treści w ogóle się nie renderuje", () => {
    const { container: steps } = render(<ProducerCollaborationSteps items={[]} heading="Sposób współpracy" />);
    expect(steps).toBeEmptyDOMElement();
    const { container: uses } = render(<ProducerCommercialUses items={[]} heading="Zastosowania" />);
    expect(uses).toBeEmptyDOMElement();
  });

  it("zastosowania pokazują przekazany przycisk zapytania hurtowego", () => {
    render(
      <ProducerCommercialUses items={items} heading="Zastosowania">
        <button type="button">Zapytanie hurtowe</button>
      </ProducerCommercialUses>,
    );
    expect(screen.getByRole("button", { name: "Zapytanie hurtowe" })).toBeInTheDocument();
  });
});
