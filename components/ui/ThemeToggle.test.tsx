import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ThemeProvider } from "./ThemeProvider";
import { ThemeToggle } from "./ThemeToggle";

function suppressExpectedErrorLog<T>(run: () => T): T {
  const spy = vi.spyOn(console, "error").mockImplementation(() => {});
  try {
    return run();
  } finally {
    spy.mockRestore();
  }
}

function getThemeCookie(): string | undefined {
  return document.cookie.split("; ").find((row) => row.startsWith("theme="))?.split("=")[1];
}

afterEach(() => {
  document.cookie = "theme=; path=/; max-age=0";
});

describe("ThemeToggle (spec 0043 AC-1, AC-2, AC-5, AC-9)", () => {
  it("shows the moon icon and offers switching to dark while the theme is light", () => {
    render(
      <ThemeProvider initialTheme="light">
        <ThemeToggle />
      </ThemeProvider>
    );

    const button = screen.getByRole("button", { name: "Przełącz na ciemny motyw" });
    expect(button).toHaveAttribute("aria-pressed", "false");
    expect(button.querySelector("svg")).toBeInTheDocument();
  });

  it("shows the sun icon and offers switching to light while the theme is dark", () => {
    render(
      <ThemeProvider initialTheme="dark">
        <ThemeToggle />
      </ThemeProvider>
    );

    const button = screen.getByRole("button", { name: "Przełącz na jasny motyw" });
    expect(button).toHaveAttribute("aria-pressed", "true");
  });

  it("flips the theme, aria-pressed, and label on click (AC-2, AC-5)", async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider initialTheme="light">
        <ThemeToggle />
      </ThemeProvider>
    );

    await user.click(screen.getByRole("button", { name: "Przełącz na ciemny motyw" }));

    expect(screen.getByRole("button", { name: "Przełącz na jasny motyw" })).toHaveAttribute("aria-pressed", "true");
  });

  it("writes the choice to the theme cookie on click, so it survives a reload (AC-4)", async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider initialTheme="light">
        <ThemeToggle />
      </ThemeProvider>
    );

    await user.click(screen.getByRole("button", { name: "Przełącz na ciemny motyw" }));

    expect(getThemeCookie()).toBe("dark");
  });

  it("follows the system preference when no explicit theme was chosen yet", () => {
    const matchMediaSpy = vi.spyOn(window, "matchMedia").mockReturnValue({
      matches: true,
      media: "(prefers-color-scheme: dark)",
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    } as unknown as MediaQueryList);

    render(
      <ThemeProvider initialTheme={null}>
        <ThemeToggle />
      </ThemeProvider>
    );

    expect(screen.getByRole("button", { name: "Przełącz na jasny motyw" })).toHaveAttribute("aria-pressed", "true");
    matchMediaSpy.mockRestore();
  });

  it("renders a visible text label next to the icon when withLabel is set (mobile menu usage)", () => {
    render(
      <ThemeProvider initialTheme="light">
        <ThemeToggle withLabel />
      </ThemeProvider>
    );

    expect(screen.getByRole("button", { name: "Przełącz na ciemny motyw" })).toHaveTextContent("Przełącz na ciemny motyw");
  });

  it("is reachable by Tab and activates with the keyboard (AC-9)", async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider initialTheme="light">
        <ThemeToggle />
      </ThemeProvider>
    );

    await user.tab();
    expect(screen.getByRole("button", { name: "Przełącz na ciemny motyw" })).toHaveFocus();

    await user.keyboard("{Enter}");
    expect(screen.getByRole("button", { name: "Przełącz na jasny motyw" })).toHaveAttribute("aria-pressed", "true");
  });

  it("throws when rendered outside a ThemeProvider, instead of silently doing nothing", () => {
    expect(() => suppressExpectedErrorLog(() => render(<ThemeToggle />))).toThrow(
      "useTheme must be used within a ThemeProvider"
    );
  });
});
