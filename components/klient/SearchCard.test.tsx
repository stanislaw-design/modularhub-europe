import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { Country } from "@/lib/data/types";
import { FAMILY_GROUPS } from "@/lib/product-family-groups";
import { SearchCard } from "./SearchCard";

// jsdom has no matchMedia (same gap noted in CategoryShowcase.test.tsx): motion/react's
// useReducedMotion (SearchSegment, the category tab indicator) calls it unconditionally,
// so every test here needs a working stub rather than a per-call guard.
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

describe("SearchCard", () => {
  it("pre-fills Gdzie from the active locale (pl -> Polska), so Szukaj is usable without picking a country first", () => {
    render(<SearchCard locale="pl" countries={countries} />);

    expect(screen.getByRole("button", { name: "Kraj docelowy" })).toHaveTextContent("Polska");
    expect(screen.getByRole("button", { name: /szukaj/i })).toBeEnabled();
  });

  it("pre-fills Gdzie from a non-default locale too (de -> Niemcy)", () => {
    render(<SearchCard locale="de" countries={countries} />);

    expect(screen.getByRole("button", { name: "Kraj docelowy" })).toHaveTextContent("Niemcy");
  });

  it("leaves Gdzie unselected when the locale has no matching country (en)", () => {
    render(<SearchCard locale="en" countries={countries} />);

    expect(screen.getByRole("button", { name: "Kraj docelowy" })).toHaveTextContent("Kraj, region lub miasto");
    expect(screen.getByRole("button", { name: /szukaj/i })).toBeDisabled();
  });

  it("navigates using the locale-prefilled country when Szukaj is clicked without touching Gdzie", async () => {
    const user = userEvent.setup();
    render(<SearchCard locale="pl" countries={countries} />);

    await user.click(screen.getByRole("button", { name: /szukaj/i }));

    expect(push).toHaveBeenCalledWith("/pl/results?country=PL");
  });

  it("renders exactly two family tabs, Domy and Więcej niż dom, not the old three (spec 0035 AC-1)", () => {
    render(<SearchCard locale="pl" countries={countries} />);

    const tabs = screen.getAllByRole("tab");
    expect(tabs.map((tab) => tab.textContent)).toEqual(["Domy", "Więcej niż dom"]);
  });

  it("selects Domy by default", () => {
    render(<SearchCard locale="pl" countries={countries} />);

    expect(screen.getByRole("tab", { name: "Domy" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Więcej niż dom" })).toHaveAttribute("aria-selected", "false");
  });

  it("omits family from the URL when Domy (the default) is active on search (AC-1)", async () => {
    const user = userEvent.setup();
    render(<SearchCard locale="pl" countries={countries} />);

    await user.click(screen.getByRole("button", { name: "Kraj docelowy" }));
    await user.click(screen.getByRole("option", { name: "Polska" }));
    await user.click(screen.getByRole("button", { name: /szukaj/i }));

    expect(push).toHaveBeenCalledWith("/pl/results?country=PL");
  });

  it("keeps Budżet, Powierzchnia and Szukaj on the Domy tab, unchanged from before spec 0060 (AC-3)", () => {
    render(<SearchCard locale="pl" countries={countries} />);

    expect(screen.getByRole("button", { name: "Budżet" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Powierzchnia" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /szukaj/i })).toBeInTheDocument();
  });

  it("replaces Gdzie/Budżet/Powierzchnia/Szukaj with subcategory links when Więcej niż dom is active (spec 0060 AC-1)", async () => {
    const user = userEvent.setup();
    render(<SearchCard locale="pl" countries={countries} />);

    await user.click(screen.getByRole("tab", { name: "Więcej niż dom" }));

    // The outgoing Domy panel stays mounted (and queryable) for the length of
    // its AnimatePresence exit fade (spec 0060 follow-up: smoother crossfade
    // between tabs) — wait it out instead of asserting the instant it's removed.
    await waitFor(() => {
      expect(screen.queryByRole("button", { name: "Kraj docelowy" })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Budżet" })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "Powierzchnia" })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /szukaj/i })).not.toBeInTheDocument();
    });
    expect(screen.getByRole("link", { name: "Spa modułowe" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Kontenery" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Outdoor TV" })).toBeInTheDocument();
  });

  it("links each subcategory straight to /wyniki with no Szukaj step and no country required (spec 0060 AC-2)", async () => {
    const user = userEvent.setup();
    render(<SearchCard locale="pl" countries={countries} />);

    await user.click(screen.getByRole("tab", { name: "Więcej niż dom" }));

    // findBy* waits out the Domy panel's collapse before the links panel
    // mounts (AnimatePresence mode="wait", spec 0060 follow-up crossfade).
    expect(await screen.findByRole("link", { name: "Spa modułowe" })).toHaveAttribute(
      "href",
      "/pl/results?family=spa-modulowe",
    );
    expect(screen.getByRole("link", { name: "Kontenery" })).toHaveAttribute(
      "href",
      "/pl/results?family=kontenery-modulowe",
    );
    expect(screen.getByRole("link", { name: "Outdoor TV" })).toHaveAttribute(
      "href",
      "/pl/results?family=outdoor-tv",
    );
  });

  it("renders exactly the families in FAMILY_GROUPS['wiecej-niz-dom'] as links, not a list hardcoded separately in SearchCard (spec 0060 AC-4)", async () => {
    const user = userEvent.setup();
    render(<SearchCard locale="pl" countries={countries} />);

    await user.click(screen.getByRole("tab", { name: "Więcej niż dom" }));

    const links = await screen.findAllByRole("link");
    expect(links.map((link) => link.getAttribute("href"))).toEqual(
      FAMILY_GROUPS["wiecej-niz-dom"].map((family) => `/pl/results?family=${family}`),
    );
  });
});
