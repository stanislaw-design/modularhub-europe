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
  // Spec 0082 AC-7: kraj jest opcjonalny, bez domyślnej wartości z języka.
  it("leaves Gdzie unselected in every locale, and Szukaj works without a country (spec 0082 AC-7)", () => {
    render(<SearchCard locale="pl" countries={countries} />);

    expect(screen.getByText("Gdzie budujesz?")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Kraj docelowy" })).toHaveTextContent("Dowolny kraj");
    expect(screen.getByRole("button", { name: /szukaj/i })).toBeEnabled();
  });

  it("navigates to /results without a country param when Gdzie was not touched (spec 0082 AC-7)", async () => {
    const user = userEvent.setup();
    render(<SearchCard locale="pl" countries={countries} />);

    await user.click(screen.getByRole("button", { name: /szukaj/i }));

    expect(push).toHaveBeenCalledWith("/pl/results");
  });

  // spec 0073 AC-2: Budżet naprawdę filtruje, zakresy zgodne z PRICE_THRESHOLDS.
  it("adds priceMin and priceMax to /results for a chosen budget range (spec 0073 AC-2)", async () => {
    const user = userEvent.setup();
    push.mockClear();
    render(<SearchCard locale="pl" countries={countries} />);

    await user.click(screen.getByRole("button", { name: "Budżet" }));
    await user.click(screen.getByRole("option", { name: "50K–100K €" }));
    await user.click(screen.getByRole("button", { name: /szukaj/i }));

    expect(push).toHaveBeenCalledWith("/pl/results?priceMin=50000&priceMax=100000");
  });

  it("adds only priceMin for the open ended range and nothing for 'any' (spec 0073 AC-2)", async () => {
    const user = userEvent.setup();
    push.mockClear();
    render(<SearchCard locale="pl" countries={countries} />);

    await user.click(screen.getByRole("button", { name: "Budżet" }));
    await user.click(screen.getByRole("option", { name: "powyżej 250K €" }));
    await user.click(screen.getByRole("button", { name: /szukaj/i }));
    expect(push).toHaveBeenLastCalledWith("/pl/results?priceMin=250000");

    await user.click(screen.getByRole("button", { name: "Budżet" }));
    await user.click(screen.getByRole("option", { name: "Dowolny budżet" }));
    await user.click(screen.getByRole("button", { name: /szukaj/i }));
    expect(push).toHaveBeenLastCalledWith("/pl/results");
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
    expect(screen.getByRole("link", { name: "Sauny" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Kontenery" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Outdoor TV" })).toBeInTheDocument();
  });

  it("links each subcategory straight to /wyniki with no Szukaj step and no country required (spec 0060 AC-2)", async () => {
    const user = userEvent.setup();
    render(<SearchCard locale="pl" countries={countries} />);

    await user.click(screen.getByRole("tab", { name: "Więcej niż dom" }));

    // findBy* waits out the Domy panel's collapse before the links panel
    // mounts (AnimatePresence mode="wait", spec 0060 follow-up crossfade).
    expect(await screen.findByRole("link", { name: "Sauny" })).toHaveAttribute("href", "/pl/sauna");
    expect(screen.getByRole("link", { name: "Kontenery" })).toHaveAttribute(
      "href",
      "/pl/results?family=kontenery-modulowe",
    );
    expect(screen.getByRole("link", { name: "Outdoor TV" })).toHaveAttribute(
      "href",
      "/pl/results?family=outdoor-tv",
    );
  });

  it("renders the families in FAMILY_GROUPS['wiecej-niz-dom'] as links, not a list hardcoded separately in SearchCard, with the spa family shown as the one explicit Sauny exception (spec 0060 AC-4, spec 0068 AC-6)", async () => {
    const user = userEvent.setup();
    render(<SearchCard locale="pl" countries={countries} />);

    await user.click(screen.getByRole("tab", { name: "Więcej niż dom" }));

    const links = await screen.findAllByRole("link");
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      ...FAMILY_GROUPS["wiecej-niz-dom"].map((family) =>
        family === "spa-modulowe" ? "/pl/sauna" : `/pl/results?family=${family}`,
      ),
    ]);
  });

  it("links Sauny to the /sauna category page, not /results (spec 0068 AC-6)", async () => {
    const user = userEvent.setup();
    render(<SearchCard locale="pl" countries={countries} />);

    await user.click(screen.getByRole("tab", { name: "Więcej niż dom" }));

    expect(await screen.findByRole("link", { name: "Sauny" })).toHaveAttribute("href", "/pl/sauna");
  });
});
