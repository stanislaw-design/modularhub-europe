import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import type { ProductOptionGroup } from "@/lib/db/queries";
import { ProjectOptionsConfigurator } from "./ProjectOptionsConfigurator";

const option = (id: string, label: string, isDefault = false) => ({
  id,
  label,
  sourceLabel: label,
  priceCents: isDefault ? 0 : 10000,
  priceOnRequest: false,
  isDefault,
  imageUrl: null,
});

const group = (n: number): ProductOptionGroup => ({
  id: `g${n}`,
  name: `Grupa ${n}`,
  sourceName: `Grupa ${n}`,
  selectionType: "single",
  options: [option(`g${n}-a`, `Standard ${n}`, true), option(`g${n}-b`, `Opcja ${n}B`), option(`g${n}-c`, `Opcja ${n}C`)],
});

const props = {
  hrefFor: (g: string, o: string) => `?g=${g}&o=${o}`,
  heading: "Opcje",
  ariaLabel: "Opcje",
  includedLabel: "w cenie",
  priceOnRequestLabel: "na zapytanie",
  showMoreLabel: "Pokaż więcej opcji ({count})",
  showLessLabel: "Pokaż mniej opcji",
};
const defaults = (n: number) => Array.from({ length: n }, (_, i) => `g${i + 1}-a`);

describe("jeden przycisk odsłaniający pozostałe grupy opcji", () => {
  it("dwie pierwsze grupy są widoczne, reszta pojawia się po jednym kliknięciu", async () => {
    render(<ProjectOptionsConfigurator {...props} groups={[group(1), group(2), group(3), group(4)]} selectedOptionIds={defaults(4)} />);
    expect(screen.getByText("Opcja 2B")).toBeVisible();
    expect(screen.getByText("Opcja 3B")).not.toBeVisible();
    expect(screen.getByText("Opcja 4B")).not.toBeVisible();
    // Jeden przycisk na całą listę, nie po jednym na grupę.
    expect(screen.getAllByRole("button")).toHaveLength(1);

    const toggle = screen.getByRole("button", { name: "Pokaż więcej opcji (2)" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    await userEvent.click(toggle);
    expect(screen.getByText("Opcja 3B")).toBeVisible();
    expect(screen.getByText("Opcja 4B")).toBeVisible();
    expect(screen.getByRole("button", { name: "Pokaż mniej opcji" })).toHaveAttribute("aria-expanded", "true");
  });

  it("lista otwiera się sama, gdy w ukrytej grupie jest wybór klienta", () => {
    render(<ProjectOptionsConfigurator {...props} groups={[group(1), group(2), group(3)]} selectedOptionIds={["g1-a", "g2-a", "g3-b"]} />);
    expect(screen.getByText("Opcja 3B")).toBeVisible();
    expect(screen.getByRole("button", { name: "Pokaż mniej opcji" })).toBeInTheDocument();
  });

  it("przy dwóch grupach lub mniej nie ma przycisku", () => {
    render(<ProjectOptionsConfigurator {...props} groups={[group(1), group(2)]} selectedOptionIds={defaults(2)} />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("bez etykiet wszystkie grupy są widoczne (zgodność wsteczna)", () => {
    render(
      <ProjectOptionsConfigurator {...props} showMoreLabel={undefined} showLessLabel={undefined} groups={[group(1), group(2), group(3)]} selectedOptionIds={defaults(3)} />,
    );
    expect(screen.getByText("Opcja 3B")).toBeVisible();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
