import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "@/components/ui";
import { ProducerPanelSidebar } from "./ProducerPanelSidebar";

let mockPathname = "/pl/producer/panel";

vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  usePathname: () => mockPathname,
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/lib/i18n/navigation", () => ({
  usePathname: () => "/producer/panel",
  useRouter: () => ({ replace: vi.fn() }),
}));

vi.mock("@/lib/auth-session-actions", () => ({
  signOutAction: async () => {},
}));

function renderSidebar(counts?: { inquiries: number; board: number }) {
  return render(
    <ThemeProvider initialTheme="light" scopeClassName="theme-producer">
      <ProducerPanelSidebar locale="pl" counts={counts} />
    </ThemeProvider>
  );
}

// Zwraca pozycje menu desktopowego (pierwsza z dwóch kopii: stały panel i szuflada).
function desktopNav() {
  return within(screen.getAllByRole("navigation", { name: "Panel producenta" })[0]);
}

beforeEach(() => {
  mockPathname = "/pl/producer/panel";
});

// spec 0074 AC-1: pięć pozycji w trzech grupach z nagłówkami.
describe("ProducerPanelSidebar structure (spec 0074 AC-1)", () => {
  it("shows five items and three group headings", () => {
    renderSidebar();
    const nav = desktopNav();

    expect(nav.getAllByRole("link").map((link) => link.textContent)).toEqual([
      "Pulpit",
      "Zapytania",
      "ModularProjects",
      "Produkty",
      "Profil zdolności",
      "Ustawienia firmy",
    ]);
    for (const heading of ["Zlecenia", "Oferta", "Firma"]) expect(nav.getByText(heading)).toBeInTheDocument();
  });

  it("no longer links to the old account, product inquiries and quotes entries", () => {
    renderSidebar();
    const nav = desktopNav();

    for (const name of ["Konto", "Zapytania o produkt", "Moje wyceny"]) expect(nav.queryByRole("link", { name })).toBeNull();
  });

  it("marks only the dashboard as current on the dashboard route", () => {
    renderSidebar();

    expect(desktopNav().getByRole("link", { name: "Pulpit" })).toHaveAttribute("aria-current", "page");
    expect(desktopNav().getByRole("link", { name: "Zapytania" })).not.toHaveAttribute("aria-current");
  });

  it.each([
    ["/pl/producer/panel/inquiries/abc", "Zapytania"],
    ["/pl/producer/panel/product-inquiries/abc", "Zapytania"],
    ["/pl/producer/panel/board", "ModularProjects"],
    ["/pl/producer/panel/board/abc", "ModularProjects"],
    ["/pl/producer/panel/board-quotes", "ModularProjects"],
    ["/pl/producer/panel/settings", "Ustawienia firmy"],
  ])("highlights the right entry on %s", (path, label) => {
    mockPathname = path;
    renderSidebar();

    expect(desktopNav().getByRole("link", { name: label })).toHaveAttribute("aria-current", "page");
    expect(desktopNav().getByRole("link", { name: "Pulpit" })).not.toHaveAttribute("aria-current");
  });
});

// spec 0074 AC-2: same liczby, bez słowa "nowe", znika przy zerze, pełny opis w aria-label.
describe("ProducerPanelSidebar counts (spec 0074 AC-2)", () => {
  it("shows the numbers with a full aria-label", () => {
    renderSidebar({ inquiries: 3, board: 2 });
    const nav = desktopNav();

    expect(nav.getByRole("img", { name: "Zapytania wymagające Twojej reakcji: 3" })).toHaveTextContent("3");
    expect(nav.getByRole("img", { name: "Zapytania ModularProjects czekające na Twoją wycenę: 2" })).toHaveTextContent("2");
  });

  it("hides a badge at zero", () => {
    renderSidebar({ inquiries: 0, board: 0 });

    expect(desktopNav().queryAllByRole("img")).toHaveLength(0);
  });

  it("renders no badges without counts", () => {
    renderSidebar();

    expect(desktopNav().queryAllByRole("img")).toHaveLength(0);
  });
});

// spec 0046 AC-1: the theme switcher sits in the sidebar footer next to the
// existing LanguageSwitcher, reused unchanged from spec 0043's ThemeToggle.
describe("ProducerPanelSidebar theme toggle (spec 0046)", () => {
  it("keeps the desktop navigation constrained to the viewport", () => {
    const { container } = renderSidebar();
    const sidebar = container.querySelector("aside");

    expect(sidebar).toHaveClass("md:sticky", "md:top-0", "md:h-screen", "md:self-start", "overflow-y-auto");
  });

  it("renders the theme toggle next to the language switcher", () => {
    renderSidebar();

    expect(screen.getAllByRole("button", { name: "Przełącz na ciemny motyw" }).length).toBeGreaterThan(0);
  });

  it("flips the panel's theme when clicked, without touching theme-klient", async () => {
    const user = userEvent.setup();
    renderSidebar();

    await user.click(screen.getAllByRole("button", { name: "Przełącz na ciemny motyw" })[0]);

    expect(document.body.classList.contains("theme-producer")).toBe(true);
    expect(document.body.classList.contains("dark")).toBe(true);
    expect(document.body.classList.contains("theme-klient")).toBe(false);
  });
});
