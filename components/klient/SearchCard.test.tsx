import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { Country } from "@/lib/data/types";
import { SearchCard } from "./SearchCard";

// jsdom has no matchMedia (same gap noted in CategoryShowcase.test.tsx): motion/react's
// useReducedMotion (SearchSegment) and WordRotate (the collapsed-teaser hint) both call
// it unconditionally, so every test here needs a working stub rather than a per-call guard.
window.matchMedia ??= ((query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: () => {},
  removeListener: () => {},
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: () => false,
})) as unknown as typeof window.matchMedia;

const push = vi.fn();
vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useRouter: () => ({ push }),
}));

const countries: Country[] = [
  { code: "PL", name: "Polska" },
  { code: "DE", name: "Niemcy" },
];

// The card starts collapsed to a single teaser button (spec 0015 AC-3); every
// test below needs the real form expanded first to reach the tabs/fields.
async function expandCard(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("button", { name: /w czym mogę pomóc/i }));
}

describe("SearchCard", () => {
  it("renders exactly two family tabs, Domy and Więcej niż dom, not the old three (spec 0035 AC-1)", async () => {
    const user = userEvent.setup();
    render(<SearchCard locale="pl" countries={countries} />);
    await expandCard(user);

    const tabs = screen.getAllByRole("tab");
    expect(tabs.map((tab) => tab.textContent)).toEqual(["Domy", "Więcej niż dom"]);
  });

  it("selects Domy by default", async () => {
    const user = userEvent.setup();
    render(<SearchCard locale="pl" countries={countries} />);
    await expandCard(user);

    expect(screen.getByRole("tab", { name: "Domy" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Więcej niż dom" })).toHaveAttribute("aria-selected", "false");
  });

  it("navigates to /wyniki with family=wiecej-niz-dom when that tab is active on search (AC-2)", async () => {
    const user = userEvent.setup();
    render(<SearchCard locale="pl" countries={countries} />);
    await expandCard(user);

    await user.click(screen.getByRole("tab", { name: "Więcej niż dom" }));
    await user.click(screen.getByRole("button", { name: "Kraj docelowy" }));
    await user.click(screen.getByRole("option", { name: "Polska" }));
    await user.click(screen.getByRole("button", { name: /szukaj/i }));

    expect(push).toHaveBeenCalledWith("/pl/klient/wyniki?country=PL&family=wiecej-niz-dom");
  });

  it("omits family from the URL when Domy (the default) is active on search (AC-1)", async () => {
    const user = userEvent.setup();
    render(<SearchCard locale="pl" countries={countries} />);
    await expandCard(user);

    await user.click(screen.getByRole("button", { name: "Kraj docelowy" }));
    await user.click(screen.getByRole("option", { name: "Polska" }));
    await user.click(screen.getByRole("button", { name: /szukaj/i }));

    expect(push).toHaveBeenCalledWith("/pl/klient/wyniki?country=PL");
  });

  it("keeps Budżet and Powierzchnia unchanged regardless of the active family tab (AC-5)", async () => {
    const user = userEvent.setup();
    render(<SearchCard locale="pl" countries={countries} />);
    await expandCard(user);

    await user.click(screen.getByRole("tab", { name: "Więcej niż dom" }));

    expect(screen.getByRole("button", { name: "Budżet" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Powierzchnia" })).toBeInTheDocument();
  });
});
