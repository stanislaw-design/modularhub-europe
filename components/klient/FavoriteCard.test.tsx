import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { FavoriteListEntry } from "@/lib/data/projects";
import { createMockProject } from "@/test/fixtures/project";
import { FavoriteCard } from "./FavoriteCard";

// Same boundary mock as ResultCard.test.tsx: FavoriteButton imports
// toggleFavorite from lib/favorite-actions, which pulls in next-auth,
// unresolvable under plain Vitest/jsdom.
vi.mock("@/lib/favorite-actions", () => ({
  toggleFavorite: vi.fn(),
}));

function makeEntry(overrides: Parameters<typeof createMockProject>[0] = {}, available = true): FavoriteListEntry {
  return { project: createMockProject(overrides), available };
}

const noop = () => {};

describe("FavoriteCard", () => {
  // spec 0058 AC-6: resolveProductHref is called with project.slug, so a
  // favorited product that already has one links through it, not the id.
  it("links to the slug based address when the product has a slug (spec 0058 AC-6)", () => {
    const entry = makeEntry({ slug: "pomerania-40" });
    render(
      <FavoriteCard entry={entry} locale="pl" selected={false} selectionDisabled={false} onToggleSelect={noop} />
    );

    expect(screen.getByRole("link")).toHaveAttribute("href", "/pl/project/pomerania-40");
  });

  // AC-5's fallback carried into every href-building call site: a favorited
  // product without a slug yet (kreator still in progress) keeps linking by id.
  it("falls back to the id based address when the product has no slug yet", () => {
    const entry = makeEntry({ id: "prj-no-slug-yet", slug: null });
    render(
      <FavoriteCard entry={entry} locale="pl" selected={false} selectionDisabled={false} onToggleSelect={noop} />
    );

    expect(screen.getByRole("link")).toHaveAttribute("href", "/pl/project/prj-no-slug-yet");
  });

  it("shows the unavailable pill for a removed/unpublished favorite (spec 0024 AC-3)", () => {
    const entry = makeEntry({}, false);
    render(
      <FavoriteCard entry={entry} locale="pl" selected={false} selectionDisabled={false} onToggleSelect={noop} />
    );

    expect(screen.getByText("Produkt niedostępny")).toBeInTheDocument();
  });
});
