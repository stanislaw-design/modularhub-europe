import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";
import { ThemeProvider, useTheme } from "./ThemeProvider";

// Headless UI's Dialog (SiteHeader's mobile menu, ResultsFilterBar's mobile
// sheet) portals its content to the end of document.body, outside
// ThemeProvider's own wrapper div — so only body-level classes reach it.
// These tests lock in that mirroring (found missing by /check verify 2026-09-17).
function ThemeConsumer() {
  const { theme, setTheme } = useTheme();
  return (
    <button type="button" onClick={() => setTheme(theme === "dark" ? "light" : "dark")}>
      current: {theme}
    </button>
  );
}

afterEach(() => {
  document.body.className = "";
});

describe("ThemeProvider body class mirroring (spec 0043 AC-11, portal fix)", () => {
  it("adds theme-klient to document.body while mounted", () => {
    render(
      <ThemeProvider initialTheme="light">
        <ThemeConsumer />
      </ThemeProvider>
    );

    expect(document.body.classList.contains("theme-klient")).toBe(true);
  });

  it("adds dark to document.body when the initial (cookie) theme is dark", () => {
    render(
      <ThemeProvider initialTheme="dark">
        <ThemeConsumer />
      </ThemeProvider>
    );

    expect(document.body.classList.contains("dark")).toBe(true);
    expect(document.body.classList.contains("light")).toBe(false);
  });

  it("adds light to document.body when the initial (cookie) theme is light", () => {
    render(
      <ThemeProvider initialTheme="light">
        <ThemeConsumer />
      </ThemeProvider>
    );

    expect(document.body.classList.contains("light")).toBe(true);
    expect(document.body.classList.contains("dark")).toBe(false);
  });

  it("adds neither dark nor light when there is no explicit theme yet (follows system via CSS media query)", () => {
    render(
      <ThemeProvider initialTheme={null}>
        <ThemeConsumer />
      </ThemeProvider>
    );

    expect(document.body.classList.contains("dark")).toBe(false);
    expect(document.body.classList.contains("light")).toBe(false);
    expect(document.body.classList.contains("theme-klient")).toBe(true);
  });

  it("moves the dark/light class on document.body when the theme is toggled", async () => {
    const user = userEvent.setup();
    render(
      <ThemeProvider initialTheme="light">
        <ThemeConsumer />
      </ThemeProvider>
    );
    expect(document.body.classList.contains("light")).toBe(true);

    await user.click(screen.getByRole("button"));

    expect(document.body.classList.contains("dark")).toBe(true);
    expect(document.body.classList.contains("light")).toBe(false);
  });

  it("removes theme-klient, dark, and light from document.body on unmount", () => {
    const { unmount } = render(
      <ThemeProvider initialTheme="dark">
        <ThemeConsumer />
      </ThemeProvider>
    );
    expect(document.body.classList.contains("dark")).toBe(true);

    // Mirrors a client-side navigation from a dark customer page into
    // producer/internal, which never mounts ThemeProvider (spec 0043 AC-11):
    // without this cleanup, body would keep a stale "dark" class and every
    // page after would render dark too.
    unmount();

    expect(document.body.classList.contains("theme-klient")).toBe(false);
    expect(document.body.classList.contains("dark")).toBe(false);
    expect(document.body.classList.contains("light")).toBe(false);
  });
});
