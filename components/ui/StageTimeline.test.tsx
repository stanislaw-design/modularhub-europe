import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { StageTimeline } from "./StageTimeline";
import type { StageTimelineItem } from "./StageTimeline";

const items: StageTimelineItem[] = [
  {
    key: "produkcja",
    label: "Produkcja",
    status: "completed",
    date: "4 maj 2026",
    documents: [{ name: "Protokół zejścia z linii produkcyjnej.pdf", type: "pdf" }],
  },
  {
    key: "transport",
    label: "Transport",
    status: "completed",
    date: "1 cze 2026",
    documents: [{ name: "List przewozowy CMR.pdf", type: "pdf" }],
  },
  {
    key: "montaz",
    label: "Montaż",
    status: "current",
    date: "8 cze 2026",
    documents: [{ name: "Harmonogram prac montażowych.pdf", type: "pdf" }],
  },
  { key: "odbior", label: "Odbiór", status: "upcoming" },
  { key: "gwarancja", label: "Gwarancja", status: "upcoming" },
];

describe("StageTimeline", () => {
  it("renders every stage label in the given order", () => {
    const { container } = render(<StageTimeline items={items} />);
    const text = container.textContent ?? "";
    const positions = items.map((item) => text.indexOf(item.label));

    expect(positions.every((position) => position >= 0)).toBe(true);
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
  });

  it("marks exactly one stage as the current step via aria-current, matching the item flagged current", () => {
    render(<StageTimeline items={items} />);
    const current = screen.getByRole("listitem", { current: "step" });
    expect(current).toHaveTextContent("Montaż");
  });

  it("shows a status label for every stage (Ukończono / Aktualny etap / Nadchodzący), not color alone", () => {
    render(<StageTimeline items={items} />);
    expect(screen.getAllByText("Ukończono")).toHaveLength(2);
    expect(screen.getAllByText("Aktualny etap")).toHaveLength(1);
    expect(screen.getAllByText("Nadchodzący")).toHaveLength(2);
  });

  it("pairs every status label with a visual icon marker, not text alone", () => {
    const { container } = render(<StageTimeline items={items} />);
    const markerIcons = container.querySelectorAll("ol > li > div > span > svg");
    expect(markerIcons).toHaveLength(items.length);
  });

  it("shows the reached date and documents only for stages that have them", () => {
    render(<StageTimeline items={items} />);

    const odbiorRow = screen.getByText("Odbiór").closest("li") as HTMLElement;
    expect(within(odbiorRow).queryByText(/2026/)).not.toBeInTheDocument();
    expect(within(odbiorRow).queryByRole("list")).not.toBeInTheDocument();

    const montazRow = screen.getByText("Montaż").closest("li") as HTMLElement;
    expect(within(montazRow).getByText("8 cze 2026")).toBeInTheDocument();
    expect(within(montazRow).getByText("Harmonogram prac montażowych.pdf")).toBeInTheDocument();
  });

  it("lists each document by name with an inert (mock) download affordance, never a real link or button", () => {
    render(<StageTimeline items={items} />);

    const produkcjaRow = screen.getByText("Produkcja").closest("li") as HTMLElement;
    const docItem = within(produkcjaRow)
      .getByText("Protokół zejścia z linii produkcyjnej.pdf")
      .closest("li") as HTMLElement;

    expect(within(docItem).queryByRole("link")).not.toBeInTheDocument();
    expect(within(docItem).queryByRole("button")).not.toBeInTheDocument();
  });

  it("renders no stages for an empty item list instead of throwing", () => {
    const { container } = render(<StageTimeline items={[]} />);
    expect(container.querySelectorAll("ol > li")).toHaveLength(0);
  });
});
