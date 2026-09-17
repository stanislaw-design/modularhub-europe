export type Theme = "light" | "dark";

export const THEME_COOKIE_NAME = "theme";

// ~1 year, matching the spec's "kolejne wizyty" persistence requirement (0043 AC-4).
export const THEME_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function isTheme(value: string | undefined): value is Theme {
  return value === "light" || value === "dark";
}
