import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { ProjectVariant } from "@/lib/data/types";
import { ProjectVariantPicker } from "./ProjectVariantPicker";

const standardLabel = {
  "surowy-zamkniety": "Stan surowy zamknięty",
  deweloperski: "Standard deweloperski",
  "pod-klucz": "Pod klucz",
} as const;

function makeVariant(overrides: Partial<ProjectVariant>): ProjectVariant {
  return {
    id: "v1",
    completionStandard: "deweloperski",
    currency: "EUR",
    priceOnRequest: false,
    isDefault: false,
    costLineItems: [],
    timelineStages: [],
    ...overrides,
  };
}

describe("ProjectVariantPicker", () => {
  it("still renders a single variant as one selectable tab (always shows the full picker)", () => {
    render(
      <ProjectVariantPicker
        variants={[makeVariant({ id: "v1", isDefault: true })]}
        selectedVariantId="v1"
        hrefFor={(standard) => `?wariant=${standard}`}
        standardLabel={standardLabel}
        ariaLabel="Standard wykończenia"
      />,
    );
    expect(screen.getByRole("link", { name: "Standard deweloperski" })).toBeInTheDocument();
  });

  it("renders nothing with zero variants", () => {
    const { container } = render(
      <ProjectVariantPicker
        variants={[]}
        selectedVariantId=""
        hrefFor={(standard) => `?wariant=${standard}`}
        standardLabel={standardLabel}
        ariaLabel="Standard wykończenia"
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders one link per variant, marking the selected one as current", () => {
    render(
      <ProjectVariantPicker
        variants={[
          makeVariant({ id: "v1", completionStandard: "surowy-zamkniety" }),
          makeVariant({ id: "v2", completionStandard: "deweloperski", isDefault: true }),
        ]}
        selectedVariantId="v2"
        hrefFor={(standard) => `?wariant=${standard}`}
        standardLabel={standardLabel}
        ariaLabel="Standard wykończenia"
      />,
    );

    const rawLink = screen.getByRole("link", { name: "Stan surowy zamknięty" });
    const activeLink = screen.getByRole("link", { name: "Standard deweloperski" });
    expect(rawLink).toHaveAttribute("href", "?wariant=surowy-zamkniety");
    expect(activeLink).toHaveAttribute("href", "?wariant=deweloperski");
    expect(activeLink).toHaveAttribute("aria-current", "true");
    expect(rawLink).not.toHaveAttribute("aria-current");
  });

  it("renders a placeholder variant as a disabled, non-navigable tab", () => {
    render(
      <ProjectVariantPicker
        variants={[
          makeVariant({ id: "v1", completionStandard: "deweloperski", isDefault: true }),
          makeVariant({ id: "placeholder-pod-klucz", completionStandard: "pod-klucz", isPlaceholder: true }),
        ]}
        selectedVariantId="v1"
        hrefFor={(standard) => `?wariant=${standard}`}
        standardLabel={standardLabel}
        ariaLabel="Standard wykończenia"
      />,
    );

    expect(screen.queryByRole("link", { name: "Pod klucz" })).not.toBeInTheDocument();
    const disabledTab = screen.getByText("Pod klucz");
    expect(disabledTab).toHaveAttribute("aria-disabled", "true");
    expect(disabledTab.tagName).not.toBe("A");
  });

  it("prefers the producer's own variant label over the standard label", () => {
    render(
      <ProjectVariantPicker
        variants={[
          makeVariant({ id: "v1", variantLabel: "Comfort" }),
          makeVariant({ id: "v2", completionStandard: "pod-klucz" }),
        ]}
        selectedVariantId="v1"
        hrefFor={(standard) => `?wariant=${standard}`}
        standardLabel={standardLabel}
        ariaLabel="Standard wykończenia"
      />,
    );
    expect(screen.getByRole("link", { name: "Comfort" })).toBeInTheDocument();
  });
});
