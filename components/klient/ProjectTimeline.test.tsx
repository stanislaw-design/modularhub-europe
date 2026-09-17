import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProjectTimeline } from "./ProjectTimeline";

describe("ProjectTimeline", () => {
  it("renders all five stages with a placeholder when there are no stages at all", async () => {
    render(await ProjectTimeline({ stages: [] }));
    expect(screen.getByRole("heading", { name: "Harmonogram realizacji" })).toBeInTheDocument();
    expect(screen.getByText("Formalności")).toBeInTheDocument();
    expect(screen.getByText("Montaż")).toBeInTheDocument();
    expect(screen.getAllByText("Do uzupełnienia").length).toBe(5);
  });

  it("renders a stage missing from the data with a placeholder, not as absent (data gap override)", async () => {
    render(
      await ProjectTimeline({
        stages: [{ stageKey: "produkcja", durationMinDays: 84, durationMaxDays: 112 }],
      }),
    );

    expect(screen.getByRole("heading", { name: "Harmonogram realizacji" })).toBeInTheDocument();
    expect(screen.getByText("Produkcja")).toBeInTheDocument();
    expect(screen.getByText("84–112 dni")).toBeInTheDocument();
    expect(screen.getByText("Montaż")).toBeInTheDocument();
    expect(screen.getByText("Formalności")).toBeInTheDocument();
    expect(screen.getAllByText("Do uzupełnienia").length).toBe(4);
  });

  it("shows a single day count when min and max match, a range otherwise", async () => {
    render(
      await ProjectTimeline({
        stages: [
          { stageKey: "montaz", durationMinDays: 3, durationMaxDays: 3 },
          { stageKey: "produkcja", durationMinDays: 84, durationMaxDays: 112 },
        ],
      }),
    );

    expect(screen.getByText("3 dni")).toBeInTheDocument();
    expect(screen.getByText("84–112 dni")).toBeInTheDocument();
  });

  it("shows starts-from and responsible party only when filled", async () => {
    render(
      await ProjectTimeline({
        stages: [
          {
            stageKey: "formalnosci",
            startsFromLabel: "od podpisania umowy",
            responsibleParty: "Producent",
          },
        ],
      }),
    );

    expect(screen.getByText("Start: od podpisania umowy")).toBeInTheDocument();
    expect(screen.getByText("Odpowiada: Producent")).toBeInTheDocument();
  });
});
