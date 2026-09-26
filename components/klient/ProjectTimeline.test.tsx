import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProjectTimeline } from "./ProjectTimeline";

describe("ProjectTimeline", () => {
  it("renders nothing when there are no stages at all (spec 0054 AC-6, AC-8)", async () => {
    const result = await ProjectTimeline({ stages: [] });
    expect(result).toBeNull();
  });

  it("renders only the stages present in the data, in chronological order, none of the missing ones (spec 0054 AC-6)", async () => {
    render(
      await ProjectTimeline({
        stages: [{ stageKey: "produkcja", durationMinDays: 84, durationMaxDays: 112 }],
      }),
    );

    expect(screen.getByRole("heading", { name: "Harmonogram realizacji" })).toBeInTheDocument();
    expect(screen.getByText("Produkcja")).toBeInTheDocument();
    expect(screen.getByText("84–112 dni")).toBeInTheDocument();
    expect(screen.queryByText("Montaż")).not.toBeInTheDocument();
    expect(screen.queryByText("Formalności")).not.toBeInTheDocument();
    expect(screen.queryByText("Do uzupełnienia")).not.toBeInTheDocument();
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
