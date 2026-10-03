import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ProjectStickyPriceBar } from "./ProjectStickyPriceBar";

type FakeEntry = { isIntersecting: boolean };
type FakeCallback = (entries: FakeEntry[]) => void;

// Stub swapped in per test (vitest.setup.ts has a no-op one for every other
// test) so we can fire the callback ourselves and assert the resulting state,
// the same way jsdom would if it actually tracked layout/scrolling.
describe("ProjectStickyPriceBar (follow-up 2026-10-02: desktop floating CTA)", () => {
  let fireIntersection: FakeCallback;
  const OriginalIntersectionObserver = globalThis.IntersectionObserver;

  beforeEach(() => {
    class FakeIntersectionObserver {
      constructor(callback: FakeCallback) {
        fireIntersection = callback;
      }
      observe() {}
      unobserve() {}
      disconnect() {}
      takeRecords() {
        return [];
      }
    }
    globalThis.IntersectionObserver = FakeIntersectionObserver as unknown as typeof IntersectionObserver;
  });

  afterEach(() => {
    globalThis.IntersectionObserver = OriginalIntersectionObserver;
  });

  it("starts with the floating bar hidden, shows it once the observed card leaves view, and hides it again once it's back", () => {
    render(
      <ProjectStickyPriceBar floatingBar={<button>Wyślij zapytanie</button>}>
        <div>Karta ceny</div>
      </ProjectStickyPriceBar>,
    );

    const bar = screen.getByRole("button", { name: "Wyślij zapytanie", hidden: true }).closest('[aria-hidden]');
    if (!bar) throw new Error("floating bar wrapper not found");

    expect(bar).toHaveAttribute("aria-hidden", "true");

    act(() => fireIntersection([{ isIntersecting: false }]));
    expect(bar).toHaveAttribute("aria-hidden", "false");

    act(() => fireIntersection([{ isIntersecting: true }]));
    expect(bar).toHaveAttribute("aria-hidden", "true");
  });

  it("always renders the observed children, regardless of the floating bar's visibility", () => {
    render(
      <ProjectStickyPriceBar floatingBar={<button>Wyślij zapytanie</button>}>
        <div>Karta ceny</div>
      </ProjectStickyPriceBar>,
    );

    expect(screen.getByText("Karta ceny")).toBeInTheDocument();
  });
});
