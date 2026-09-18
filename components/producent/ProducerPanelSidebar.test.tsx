import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "@/components/ui";
import { ProducerPanelSidebar } from "./ProducerPanelSidebar";

vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  usePathname: () => "/pl/producer/panel",
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/lib/i18n/navigation", () => ({
  usePathname: () => "/producer/panel",
  useRouter: () => ({ replace: vi.fn() }),
}));

vi.mock("@/lib/auth-session-actions", () => ({
  signOutAction: async () => {},
}));

function renderSidebar() {
  return render(
    <ThemeProvider initialTheme="light" scopeClassName="theme-producer">
      <ProducerPanelSidebar locale="pl" />
    </ThemeProvider>
  );
}

// spec 0046 AC-1: the theme switcher sits in the sidebar footer next to the
// existing LanguageSwitcher, reused unchanged from spec 0043's ThemeToggle.
describe("ProducerPanelSidebar theme toggle (spec 0046)", () => {
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
