import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { HOUSE_AI_REVIEW_FIXTURES } from "@/lib/data/fixtures/house-ai-import";
import { HouseAiFieldReview } from "./HouseAiFieldReview";

describe("HouseAiFieldReview", () => {
  it("exposes conflict and confidence with text, and supports keyboard selection", async () => {
    const user = userEvent.setup();
    const field = HOUSE_AI_REVIEW_FIXTURES.review.fields[1];
    const onSelect = vi.fn();
    render(<HouseAiFieldReview field={field} decision={null} hasConflict onInspect={vi.fn()} onSelect={onSelect} onManualValue={vi.fn()} onReject={vi.fn()} />);

    expect(screen.getByText("Konflikt")).toBeInTheDocument();
    expect(screen.getByText("Średnia pewność")).toBeInTheDocument();
    const options = screen.getAllByRole("radio");
    options[0].focus();
    await user.keyboard("{ArrowDown}");
    expect(onSelect).toHaveBeenCalled();
  });

  it("shows the editable EUR price together with its source and ECB rate", () => {
    const field = HOUSE_AI_REVIEW_FIXTURES.review.fields.find((item) => item.fieldPath === "variants[].priceMinCents");
    expect(field).toBeDefined();
    render(<HouseAiFieldReview field={field!} decision={null} hasConflict={false} onInspect={vi.fn()} onSelect={vi.fn()} onManualValue={vi.fn()} onReject={vi.fn()} />);

    expect(screen.getByText(/207\s000,00\s€/)).toBeInTheDocument();
    expect(screen.getByText(/Źródło: 207\s000 EUR netto, kurs EBC 1/)).toBeInTheDocument();
  });

  it("uses the localized catalog label and does not expose the technical field path", () => {
    const source = HOUSE_AI_REVIEW_FIXTURES.review.fields[0];
    const field = {
      ...source,
      fieldPath: "technical.windowClass" as const,
      candidates: source.candidates.map((candidate) => ({ ...candidate, fieldPath: "technical.windowClass" as const })),
    };

    render(<HouseAiFieldReview field={field} decision={null} hasConflict={false} onInspect={vi.fn()} onSelect={vi.fn()} onManualValue={vi.fn()} onReject={vi.fn()} />);

    expect(screen.getByRole("heading", { name: "Klasa okien" })).toBeInTheDocument();
    expect(screen.queryByText("technical.windowClass")).not.toBeInTheDocument();
  });

  it("lets the producer type their own value when no proposal matches", async () => {
    const user = userEvent.setup();
    const source = HOUSE_AI_REVIEW_FIXTURES.review.fields[0];
    const field = { ...source, fieldPath: "technical.wallBuildUp" as const, candidates: source.candidates.map((candidate) => ({ ...candidate, fieldPath: "technical.wallBuildUp" as const })) };
    const onManualValue = vi.fn();
    render(<HouseAiFieldReview field={field} decision={null} hasConflict={false} onInspect={vi.fn()} onSelect={vi.fn()} onManualValue={onManualValue} onReject={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /Wpisz własną wartość/ }));
    await user.type(screen.getByLabelText("Wartość ręczna"), "Rama drewniana 45 cm");
    await user.click(screen.getByRole("button", { name: "Zapisz wartość" }));

    expect(onManualValue).toHaveBeenCalledWith("Rama drewniana 45 cm");
  });

  it("shows the previously saved manual value and lets the producer edit it again", () => {
    const source = HOUSE_AI_REVIEW_FIXTURES.review.fields[0];
    const field = { ...source, fieldPath: "technical.wallBuildUp" as const, candidates: source.candidates.map((candidate) => ({ ...candidate, fieldPath: "technical.wallBuildUp" as const })) };
    const decision = { fieldPath: "technical.wallBuildUp" as const, entityKey: null, parentEntityKey: null, selectedCandidateId: null, finalValue: "Rama drewniana 45 cm", decisionType: "manual" as const, version: 1 };

    render(<HouseAiFieldReview field={field} decision={decision} hasConflict={false} onInspect={vi.fn()} onSelect={vi.fn()} onManualValue={vi.fn()} onReject={vi.fn()} />);

    expect(screen.getByText("Rama drewniana 45 cm")).toBeInTheDocument();
    expect(screen.getAllByRole("radio").every((radio) => !(radio as HTMLInputElement).checked)).toBe(true);
  });

  it("marks a field as rejected when the producer says it is not needed", async () => {
    const user = userEvent.setup();
    const field = HOUSE_AI_REVIEW_FIXTURES.review.fields[0];
    const onReject = vi.fn();
    render(<HouseAiFieldReview field={field} decision={null} hasConflict={false} onInspect={vi.fn()} onSelect={vi.fn()} onManualValue={vi.fn()} onReject={onReject} />);

    await user.click(screen.getByRole("button", { name: /Niepotrzebne w tym projekcie/ }));
    expect(onReject).toHaveBeenCalledOnce();
  });

  it("shows a rejected badge once the field has a not_applicable decision", () => {
    const field = HOUSE_AI_REVIEW_FIXTURES.review.fields[0];
    const decision = { fieldPath: field.fieldPath, entityKey: null, parentEntityKey: null, selectedCandidateId: null, finalValue: null, decisionType: "not_applicable" as const, version: 1 };

    render(<HouseAiFieldReview field={field} decision={decision} hasConflict={false} onInspect={vi.fn()} onSelect={vi.fn()} onManualValue={vi.fn()} onReject={vi.fn()} />);

    expect(screen.getAllByText("Odrzucone").length).toBeGreaterThan(0);
  });
});
