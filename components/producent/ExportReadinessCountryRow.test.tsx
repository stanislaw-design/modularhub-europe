import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import type { ExportReadinessCountryStatus } from "@/lib/data/types";
import { ExportReadinessCountryRow } from "./ExportReadinessCountryRow";

const approvedEntry: ExportReadinessCountryStatus = {
  countryCode: "PL",
  status: "approved",
  reason: "Zgodne z warunkami technicznymi obowiązującymi w Polsce.",
  gaps: [],
};

const blockedEntry: ExportReadinessCountryStatus = {
  countryCode: "NL",
  status: "blocked",
  reason: "Współczynnik przenikania ciepła nie spełnia wymagań.",
  gaps: [],
};

const conditionalEntry: ExportReadinessCountryStatus = {
  countryCode: "DE",
  status: "conditional",
  reason: "Większość wymagań spełniona, brakuje kilku dokumentów.",
  gaps: ["Obliczenia statyczne dla strefy śniegowej 2.", "Deklaracja właściwości użytkowych (DoP)."],
};

beforeEach(() => {
  window.localStorage.clear();
});

describe("ExportReadinessCountryRow", () => {
  it("shows status and reason with no expand control for an approved country (AC-4)", () => {
    render(<ExportReadinessCountryRow locale="pl" projectName={null} countryName="Polska" entry={approvedEntry} />);

    expect(screen.getByText("Polska")).toBeInTheDocument();
    expect(screen.getByText("Dopuszczone")).toBeInTheDocument();
    expect(screen.getByText(approvedEntry.reason)).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("shows status and reason with no expand control for a blocked country (AC-4)", () => {
    render(<ExportReadinessCountryRow locale="pl" projectName={null} countryName="Holandia" entry={blockedEntry} />);

    expect(screen.getByText("Niedopuszczone")).toBeInTheDocument();
    expect(screen.getByText(blockedEntry.reason)).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("is collapsed by default for a conditional country, with no gap list visible (AC-5)", () => {
    render(<ExportReadinessCountryRow locale="pl" projectName={null} countryName="Niemcy" entry={conditionalEntry} />);

    const trigger = screen.getByRole("button", { name: /Niemcy/ });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("region")).not.toBeInTheDocument();
  });

  it("clicking the trigger reveals at least two named gaps (AC-5)", async () => {
    const user = userEvent.setup();
    render(<ExportReadinessCountryRow locale="pl" projectName={null} countryName="Niemcy" entry={conditionalEntry} />);

    await user.click(screen.getByRole("button", { name: /Niemcy/ }));

    expect(screen.getByRole("region")).toBeInTheDocument();
    for (const gap of conditionalEntry.gaps) {
      expect(screen.getByText(gap)).toBeInTheDocument();
    }
    expect(conditionalEntry.gaps.length).toBeGreaterThanOrEqual(2);
  });

  it("wires aria-expanded/aria-controls to the content region and toggles via keyboard (AC-8)", async () => {
    const user = userEvent.setup();
    render(<ExportReadinessCountryRow locale="pl" projectName={null} countryName="Niemcy" entry={conditionalEntry} />);

    const trigger = screen.getByRole("button", { name: /Niemcy/ });
    trigger.focus();
    await user.keyboard("{Enter}");

    expect(trigger).toHaveAttribute("aria-expanded", "true");
    const region = screen.getByRole("region");
    expect(trigger.getAttribute("aria-controls")).toBe(region.id);
  });

  it("moves focus to the expanded content, matching the PlotAnalysisRow pattern (AC-8)", async () => {
    const user = userEvent.setup();
    render(<ExportReadinessCountryRow locale="pl" projectName={null} countryName="Niemcy" entry={conditionalEntry} />);

    await user.click(screen.getByRole("button", { name: /Niemcy/ }));

    expect(screen.getByRole("region")).toHaveFocus();
  });

  it("collapses again on a second click, hiding the gap list", async () => {
    const user = userEvent.setup();
    render(<ExportReadinessCountryRow locale="pl" projectName={null} countryName="Niemcy" entry={conditionalEntry} />);

    const trigger = screen.getByRole("button", { name: /Niemcy/ });
    await user.click(trigger);
    await user.click(trigger);

    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("region")).not.toBeInTheDocument();
  });

  it("shows a 'Domknij luki' link to the gap closure screen with kraj in the expanded conditional row (AC-1)", async () => {
    const user = userEvent.setup();
    render(<ExportReadinessCountryRow locale="pl" projectName={null} countryName="Niemcy" entry={conditionalEntry} />);

    await user.click(screen.getByRole("button", { name: /Niemcy/ }));

    const link = screen.getByRole("link", { name: "Domknij luki" });
    expect(link).toHaveAttribute("href", "/pl/producer/gap-closure?kraj=DE");
  });

  it("carries the project name through to the gap closure link when present (AC-1)", async () => {
    const user = userEvent.setup();
    render(
      <ExportReadinessCountryRow locale="pl" projectName="Modulor 28" countryName="Niemcy" entry={conditionalEntry} />
    );

    await user.click(screen.getByRole("button", { name: /Niemcy/ }));

    const link = screen.getByRole("link", { name: "Domknij luki" });
    expect(link).toHaveAttribute("href", "/pl/producer/gap-closure?kraj=DE&nazwa=Modulor%2028");
  });

  it("never shows the 'Domknij luki' link for an approved or blocked row", () => {
    render(<ExportReadinessCountryRow locale="pl" projectName={null} countryName="Polska" entry={approvedEntry} />);

    expect(screen.queryByRole("link", { name: "Domknij luki" })).not.toBeInTheDocument();
  });

  it("renders a country resolved via localStorage as approved, with no accordion (AC-8)", () => {
    window.localStorage.setItem("producent:domykanie-luk:rozwiazane", JSON.stringify(["DE"]));

    render(<ExportReadinessCountryRow locale="pl" projectName={null} countryName="Niemcy" entry={conditionalEntry} />);

    expect(screen.getByText("Dopuszczone")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByText(conditionalEntry.reason)).not.toBeInTheDocument();
  });
});
