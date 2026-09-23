import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "@/components/ui";
import { ClientPanelSidebar } from "./ClientPanelSidebar";

vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  usePathname: () => "/pl/panel/inquiries",
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/lib/i18n/navigation", () => ({
  usePathname: () => "/panel/inquiries",
  useRouter: () => ({ replace: vi.fn() }),
}));

vi.mock("@/lib/auth-session-actions", () => ({
  signOutAction: async () => {},
}));

function renderSidebar(hasUnreadZapytania = false) {
  return render(
    <ThemeProvider initialTheme="light" scopeClassName="theme-klient">
      <ClientPanelSidebar locale="pl" hasUnreadZapytania={hasUnreadZapytania} />
    </ThemeProvider>
  );
}

describe("ClientPanelSidebar", () => {
  it("keeps the desktop navigation constrained to the viewport", () => {
    const { container } = renderSidebar();
    const sidebar = container.querySelector("aside");

    expect(sidebar).toHaveClass("md:sticky", "md:top-0", "md:h-screen", "md:self-start", "overflow-y-auto");
  });

  it("renders navigation items for inquiries, favorites and profile", () => {
    renderSidebar();

    const inquiriesLinks = screen.getAllByRole("link", { name: /Zapytania/i });
    expect(inquiriesLinks.length).toBeGreaterThan(0);
    expect(inquiriesLinks[0]).toHaveAttribute("href", "/pl/panel/inquiries");

    const favoritesLinks = screen.getAllByRole("link", { name: /Ulubione/i });
    expect(favoritesLinks.length).toBeGreaterThan(0);
    expect(favoritesLinks[0]).toHaveAttribute("href", "/pl/panel/favorites");

    const profileLinks = screen.getAllByRole("link", { name: /Profil/i });
    expect(profileLinks.length).toBeGreaterThan(0);
    expect(profileLinks[0]).toHaveAttribute("href", "/pl/panel/profile");
  });

  it("renders unread badge when hasUnreadZapytania is true", () => {
    renderSidebar(true);

    const badges = screen.getAllByLabelText("Nowa oferta");
    expect(badges.length).toBeGreaterThan(0);
  });

  it("renders theme toggle and language switcher in footer", () => {
    renderSidebar();

    expect(screen.getAllByRole("button", { name: "Przełącz na ciemny motyw" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("button", { name: "Zmień język" }).length).toBeGreaterThan(0);
  });

  it("toggles collapsed state on desktop collapse button click", async () => {
    const user = userEvent.setup();
    const { container } = renderSidebar();

    const collapseBtn = screen.getByRole("button", { name: "Zwiń menu" });
    expect(collapseBtn).toBeInTheDocument();
    expect(collapseBtn).toHaveAttribute("aria-expanded", "true");

    await user.click(collapseBtn);

    const expandBtn = screen.getByRole("button", { name: "Rozwiń menu" });
    expect(expandBtn).toBeInTheDocument();
    expect(expandBtn).toHaveAttribute("aria-expanded", "false");

    const sidebar = container.querySelector("aside");
    expect(sidebar).toHaveAttribute("data-collapsed", "true");
  });

  it("renders a sign out button with LogOut icon", () => {
    renderSidebar();

    const signOutBtns = screen.getAllByRole("button", { name: "Wyloguj" });
    expect(signOutBtns.length).toBeGreaterThan(0);
  });
});
