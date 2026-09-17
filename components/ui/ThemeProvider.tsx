"use client";

import { createContext, useContext, useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { THEME_COOKIE_MAX_AGE, THEME_COOKIE_NAME, type Theme } from "@/lib/theme";

interface ThemeContextValue {
  /** The effective theme this render should paint with (explicit choice, else detected system preference). */
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function subscribeToSystemTheme(onChange: () => void) {
  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
  mediaQuery.addEventListener("change", onChange);
  return () => mediaQuery.removeEventListener("change", onChange);
}

function getSystemTheme(): Theme {
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

// The server can't know the visitor's OS preference; "light" here only ever
// feeds the ThemeToggle's icon/aria-label until the client value settles a
// render or two later (the page's own colors are unaffected, already correct
// from app/globals.css's plain media query — see the comment below).
function getServerSystemTheme(): Theme {
  return "light";
}

interface ThemeProviderProps {
  /** The `theme` cookie's value, read server side; `null` means no explicit choice yet (follow system). */
  initialTheme: Theme | null;
  children: ReactNode;
}

// Scopes dark mode to the customer flow only (spec 0043 AC-11: producer/internal
// stay light). The wrapper's own class only ever reflects the explicit cookie
// choice, never the system-detected fallback below — the no-cookie case is left
// to app/globals.css's plain `@media (prefers-color-scheme: dark)` rule, which
// paints correctly before hydration with no blocking script (AC-3). `contents`
// keeps this div invisible to layout (RouteShell's <main> still sits directly in
// body's flex column), it exists purely to scope the CSS custom property overrides.
export function ThemeProvider({ initialTheme, children }: ThemeProviderProps) {
  const [explicitTheme, setExplicitTheme] = useState<Theme | null>(initialTheme);
  const systemTheme = useSyncExternalStore(subscribeToSystemTheme, getSystemTheme, getServerSystemTheme);

  // Headless UI's Dialog (SiteHeader's mobile menu, ResultsFilterBar's mobile
  // sheet, …) portals its content to the end of document.body, outside this
  // component's own subtree — so it never sees the wrapper div's class below.
  // Mirroring the same classes onto body (client only; the wrapper div still
  // carries them server side for the actual first-paint, flash free theming)
  // fixes portaled content too. Removed on unmount so a client side
  // navigation into producer/internal (which never mounts ThemeProvider)
  // can't leave a stale dark body behind (spec 0043 AC-11).
  useEffect(() => {
    document.body.classList.add("theme-klient");
    return () => {
      document.body.classList.remove("theme-klient", "dark", "light");
    };
  }, []);

  useEffect(() => {
    document.body.classList.toggle("dark", explicitTheme === "dark");
    document.body.classList.toggle("light", explicitTheme === "light");
  }, [explicitTheme]);

  function setTheme(next: Theme) {
    setExplicitTheme(next);
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${THEME_COOKIE_NAME}=${next}; Path=/; Max-Age=${THEME_COOKIE_MAX_AGE}; SameSite=Lax${secure}`;
  }

  return (
    <ThemeContext.Provider value={{ theme: explicitTheme ?? systemTheme, setTheme }}>
      <div className={`contents theme-klient ${explicitTheme ?? ""}`}>{children}</div>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within a ThemeProvider");
  return context;
}
