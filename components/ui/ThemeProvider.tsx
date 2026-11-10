"use client";

import { createContext, useContext, useEffect, useState, useSyncExternalStore, type ReactNode } from "react";
import { isTheme, THEME_COOKIE_MAX_AGE, THEME_COOKIE_NAME, type Theme } from "@/lib/theme";

// Runs while the browser parses the HTML, before the first paint: puts the saved
// choice on the wrapper div that is the script's parent.
const THEME_COOKIE_SCRIPT = `(function(){var m=document.cookie.match(/(?:^|; )${THEME_COOKIE_NAME}=(light|dark)/);var s=document.currentScript;if(m&&s&&s.parentElement)s.parentElement.classList.add(m[1])})()`;

function readThemeCookie(): Theme | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${THEME_COOKIE_NAME}=([^;]*)`));
  return match && isTheme(match[1]) ? match[1] : null;
}

interface ThemeContextValue {
  /** The effective theme this render should paint with (explicit choice, else detected system preference). */
  theme: Theme;
  setTheme: (theme: Theme) => void;
  /** What the server rendered for `theme`: the explicit choice it knew, else "light". Hydration-safe fallback for markup that shows `theme`. */
  serverTheme: Theme;
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
  /**
   * Spec 0078 AC-6: skeleton layouts that must not read cookies on the server
   * pass `initialTheme={null}` plus this flag. An inline script, first child of
   * the wrapper, copies the cookie choice onto the wrapper before first paint,
   * and the state catches up after mount (the wrapper keeps the script's class
   * until then, which is why it suppresses hydration warnings).
   */
  themeFromCookieScript?: boolean;
  /** CSS scope class this instance paints under (e.g. `theme-klient`, `theme-producer`; see app/globals.css). */
  scopeClassName: string;
  children: ReactNode;
}

// Scopes dark mode to whichever subtree mounts this provider (spec 0043
// AC-11: producer public routes stay light by never mounting it at all;
// spec 0046 adds a second scope, theme-producer, for the producer panel, and
// spec 0055 a third, theme-internal, for the admin panel, via scopeClassName
// rather than a second/third provider). The wrapper's own class
// only ever reflects the explicit cookie choice, never the system-detected
// fallback below — the no-cookie case is left to app/globals.css's plain
// `@media (prefers-color-scheme: dark)` rule, which paints correctly before
// hydration with no blocking script (AC-3). `contents` keeps this div
// invisible to layout, it exists purely to scope the CSS custom property
// overrides.
export function ThemeProvider({ initialTheme, themeFromCookieScript = false, scopeClassName, children }: ThemeProviderProps) {
  const [explicitTheme, setExplicitTheme] = useState<Theme | null>(initialTheme);

  useEffect(() => {
    if (!themeFromCookieScript) return;
    const cookieTheme = readThemeCookie();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the cookie is only readable in the browser
    if (cookieTheme) setExplicitTheme(cookieTheme);
  }, [themeFromCookieScript]);
  const systemTheme = useSyncExternalStore(subscribeToSystemTheme, getSystemTheme, getServerSystemTheme);

  // Headless UI's Dialog (SiteHeader's mobile menu, ResultsFilterBar's mobile
  // sheet, the producer panel's DeleteProductDialog, …) portals its content to
  // the end of document.body, outside this component's own subtree — so it
  // never sees the wrapper div's class below. Mirroring the same classes onto
  // body (client only; the wrapper div still carries them server side for the
  // actual first-paint, flash free theming) fixes portaled content too.
  // Removed on unmount so a client side navigation into an area that never
  // mounts ThemeProvider (producer public routes, internal) can't leave a
  // stale dark body behind (spec 0043 AC-11).
  useEffect(() => {
    document.body.classList.add(scopeClassName);
    return () => {
      document.body.classList.remove(scopeClassName, "dark", "light");
    };
  }, [scopeClassName]);

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
    <ThemeContext.Provider value={{ theme: explicitTheme ?? systemTheme, setTheme, serverTheme: initialTheme ?? getServerSystemTheme() }}>
      <div className={`contents ${scopeClassName} ${explicitTheme ?? ""}`} suppressHydrationWarning={themeFromCookieScript}>
        {themeFromCookieScript && <script dangerouslySetInnerHTML={{ __html: THEME_COOKIE_SCRIPT }} />}
        {children}
      </div>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within a ThemeProvider");
  return context;
}
