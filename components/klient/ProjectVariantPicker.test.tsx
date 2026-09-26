import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ProjectVariant } from "@/lib/data/types";
import { ProjectVariantPicker } from "./ProjectVariantPicker";

// ProjectVariantSelect (mobile <lg branch, always mounted in jsdom regardless
// of the Tailwind breakpoint classes) calls useRouter() itself — same mock
// pattern as ShortlistActionBar.test.tsx.
vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useRouter: () => ({ push: vi.fn() }),
}));

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
  it("renders a single variant as a visible, non-clickable current tab (spec 0054 AC-3)", () => {
    render(
      <ProjectVariantPicker
        variants={[makeVariant({ id: "v1", isDefault: true })]}
        selectedVariantId="v1"
        hrefFor={(standard) => `?wariant=${standard}`}
        standardLabel={standardLabel}
        ariaLabel="Standard wykończenia"
      />,
    );
    expect(screen.queryByRole("link", { name: "Standard deweloperski" })).not.toBeInTheDocument();
    const nav = within(screen.getByRole("navigation", { name: "Standard wykończenia" }));
    const currentTab = nav.getByText("Standard deweloperski");
    expect(currentTab).toHaveAttribute("aria-current", "true");
    expect(currentTab.tagName).not.toBe("A");
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

  it("renders exactly two tabs for a project with two real variants (spec 0054 AC-2)", () => {
    render(
      <ProjectVariantPicker
        variants={[
          makeVariant({ id: "v1", completionStandard: "deweloperski", isDefault: true }),
          makeVariant({ id: "v2", completionStandard: "surowy-zamkniety" }),
        ]}
        selectedVariantId="v1"
        hrefFor={(standard) => `?wariant=${standard}`}
        standardLabel={standardLabel}
        ariaLabel="Standard wykończenia"
      />,
    );

    expect(screen.getAllByRole("link")).toHaveLength(2);
    expect(screen.queryByText("Pod klucz")).not.toBeInTheDocument();
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
