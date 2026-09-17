import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "@/components/ui";
import { SiteHeader } from "./SiteHeader";

// SiteHeader renders ThemeToggle, which needs a ThemeProvider ancestor
// (spec 0043); "light" keeps every existing assertion below theme-agnostic.
function renderHeader(props: ComponentProps<typeof SiteHeader>) {
  return render(
    <ThemeProvider initialTheme="light">
      <SiteHeader {...props} />
    </ThemeProvider>
  );
}

const replace = vi.fn();

vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  usePathname: () => "/pl/results",
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/lib/i18n/navigation", () => ({
  usePathname: () => "/wyniki",
  useRouter: () => ({ replace }),
}));

async function openMenu() {
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: "Otwórz menu" }));
  return user;
}

describe("SiteHeader (spec 0030)", () => {
  it("gives the hamburger a fixed 44x44 touch target that never shrinks (AC-1)", () => {
    renderHeader({ locale: "pl", session: null });

    const hamburger = screen.getByRole("button", { name: "Otwórz menu" });
    expect(hamburger.className).toContain("size-11");
    expect(hamburger.className).toContain("shrink-0");
  });

  it("splits the slide-out menu into a labelled Navigation group and a labelled Account group (AC-2)", async () => {
    renderHeader({ locale: "pl", session: null });
    await openMenu();

    expect(screen.getByRole("navigation", { name: "Nawigacja" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Konto" })).toBeInTheDocument();
  });

  it("keeps only the live navigation links, dropping Producenci/Inspiracje/O nas (AC-3)", async () => {
    renderHeader({ locale: "pl", session: null });
    await openMenu();

    const nav = screen.getByRole("navigation", { name: "Nawigacja" });
    expect(within(nav).getByRole("link", { name: "Domy" })).toHaveAttribute("href", "/pl");
    expect(within(nav).getByRole("link", { name: "Projekty" })).toHaveAttribute("href", "/pl/results");
    expect(within(nav).getByRole("link", { name: "Jak to działa" })).toHaveAttribute(
      "href",
      "/pl#jak-to-dziala"
    );
    expect(within(nav).getByRole("link", { name: "Zweryfikowani producenci" })).toHaveAttribute(
      "href",
      "/pl/verified-manufacturers"
    );
    expect(within(nav).getByRole("link", { name: "Dołącz jako producent B2B" })).toHaveAttribute(
      "href",
      "/pl/producer/registration"
    );
    expect(screen.queryByText("Producenci")).not.toBeInTheDocument();
    expect(screen.queryByText("Inspiracje")).not.toBeInTheDocument();
    expect(screen.queryByText("O nas")).not.toBeInTheDocument();
  });

  it("shows the sign-in link in the menu's Account group when there is no session (AC-4)", async () => {
    renderHeader({ locale: "pl", session: null });
    await openMenu();

    const account = screen.getByRole("group", { name: "Konto" });
    expect(within(account).getByRole("link", { name: /Ulubione/ })).toBeInTheDocument();
    expect(within(account).getByRole("link", { name: /Zaloguj się/ })).toBeInTheDocument();
    expect(within(account).queryByText("Mój profil")).not.toBeInTheDocument();
    expect(within(account).queryByText("Panel administratora")).not.toBeInTheDocument();
  });

  it("shows 'Załóż konto' as the header CTA, linking to the shared registration wizard, when there is no session (spec 0040 AC-1)", () => {
    renderHeader({ locale: "pl", session: null });

    expect(screen.getByRole("link", { name: "Załóż konto" })).toHaveAttribute("href", "/pl/registration");
  });

  it("hides the header CTA below `sm` and shows a matching CTA inside the slide out menu instead, hidden from `sm` up", async () => {
    renderHeader({ locale: "pl", session: null });

    const headerCta = screen.getByRole("link", { name: "Załóż konto" });
    expect(headerCta.className).toContain("hidden");
    expect(headerCta.className).toContain("sm:inline-flex");

    // Headless UI marks the rest of the page (including the header CTA)
    // aria-hidden while the dialog is open, so only the menu's own copy is
    // reachable by role here; that is the accessibility behavior working as
    // intended, not a sign the header copy disappeared.
    await openMenu();
    const menuCta = screen.getByRole("link", { name: "Załóż konto" });
    expect(menuCta).not.toBe(headerCta);
    expect(menuCta.className).toContain("sm:hidden");
    expect(menuCta.closest('[role="group"]')).toBeNull();
  });

  it("adds a person icon next to 'Mój profil' but not next to 'Załóż konto' or 'Panel administratora'", () => {
    const { rerender } = renderHeader({ locale: "pl", session: null });
    expect(screen.getByRole("link", { name: "Załóż konto" }).querySelector("svg")).not.toBeInTheDocument();

    rerender(
      <ThemeProvider initialTheme="light">
        <SiteHeader locale="pl" session={{ user: { role: "client" } }} />
      </ThemeProvider>
    );
    expect(screen.getByRole("link", { name: "Mój profil" }).querySelector("svg")).toBeInTheDocument();

    rerender(
      <ThemeProvider initialTheme="light">
        <SiteHeader locale="pl" session={{ user: { role: "admin" } }} />
      </ThemeProvider>
    );
    expect(screen.getByRole("link", { name: "Panel administratora" }).querySelector("svg")).not.toBeInTheDocument();
  });

  it("replaces the 'Załóż konto' CTA with 'Mój profil' for a client session, and drops it from the menu's Account group so it is never shown twice", async () => {
    renderHeader({ locale: "pl", session: { user: { role: "client" } } });

    expect(screen.getByRole("link", { name: "Mój profil" })).toHaveAttribute("href", "/pl/panel/inquiries");
    expect(screen.queryByRole("link", { name: "Załóż konto" })).not.toBeInTheDocument();

    await openMenu();
    const account = screen.getByRole("group", { name: "Konto" });
    expect(within(account).queryByText("Mój profil")).not.toBeInTheDocument();
    expect(within(account).queryByText("Zaloguj się")).not.toBeInTheDocument();
  });

  it("replaces the 'Załóż konto' CTA with 'Panel administratora' for an admin session, and drops it from the menu's Account group", async () => {
    renderHeader({ locale: "pl", session: { user: { role: "admin" } } });

    expect(screen.getByRole("link", { name: "Panel administratora" })).toHaveAttribute("href", "/pl/internal/inquiries");
    expect(screen.queryByRole("link", { name: "Załóż konto" })).not.toBeInTheDocument();

    await openMenu();
    const account = screen.getByRole("group", { name: "Konto" });
    expect(within(account).getByRole("link", { name: /Ulubione/ })).toBeInTheDocument();
    expect(within(account).queryByText("Panel administratora")).not.toBeInTheDocument();
  });

  it("offers PL/EN/NL as plain buttons in the Account group, not a dropdown (AC-4)", async () => {
    renderHeader({ locale: "pl", session: null });
    await openMenu();

    const account = screen.getByRole("group", { name: "Konto" });
    expect(within(account).getByRole("button", { name: "Polski" })).toBeInTheDocument();
    expect(within(account).getByRole("button", { name: "English" })).toBeInTheDocument();
    expect(within(account).getByRole("button", { name: "Nederlands" })).toBeInTheDocument();
  });

  it("switches locale by calling router.replace when a language button is clicked", async () => {
    renderHeader({ locale: "pl", session: null });
    const user = await openMenu();

    await user.click(screen.getByRole("button", { name: "English" }));

    expect(replace).toHaveBeenCalledWith("/wyniki", { locale: "en" });
  });

  it("hides the whole Account group from `md` up and hides Favorites/language earlier, at `sm`, matching each item's header row twin so nothing is shown twice on desktop", async () => {
    renderHeader({ locale: "pl", session: null });
    await openMenu();

    const account = screen.getByRole("group", { name: "Konto" });
    expect(account.className).toContain("md:hidden");

    const favorites = within(account).getByRole("link", { name: /Ulubione/ });
    expect(favorites.closest("li")?.className).toContain("sm:hidden");

    const polish = within(account).getByRole("button", { name: "Polski" });
    expect(polish.closest("li")?.className).toContain("sm:hidden");

    const signIn = within(account).getByRole("link", { name: /Zaloguj się/ });
    expect(signIn.closest("li")?.className ?? "").not.toContain("sm:hidden");
  });
});
