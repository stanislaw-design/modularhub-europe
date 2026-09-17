"use client";

import { Moon, Sun } from "lucide-react";
import { useTranslations } from "next-intl";
import { useTheme } from "./ThemeProvider";

interface ThemeToggleProps {
  className?: string;
  /** Renders as an icon + text row (matching SiteHeader's other slide-out menu links) instead of an icon-only square button. */
  withLabel?: boolean;
}

// Icon shows the mode currently displayed (sun while light, moon while
// dark); aria-label still describes the action a click performs, so it stays
// the opposite of the icon (spec 0043 AC-1, AC-2, AC-5, AC-9).
export function ThemeToggle({ className = "", withLabel = false }: ThemeToggleProps) {
  const t = useTranslations("Theme");
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";
  const label = isDark ? t("toggleToLight") : t("toggleToDark");
  const Icon = isDark ? Moon : Sun;

  if (withLabel) {
    return (
      <button
        type="button"
        onClick={() => setTheme(isDark ? "light" : "dark")}
        aria-pressed={isDark}
        className={`focus-ring flex items-center gap-1 rounded-data text-body font-medium ${className}`}
      >
        <Icon className="size-4" aria-hidden="true" />
        {label}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-pressed={isDark}
      aria-label={label}
      className={`focus-ring flex size-11 shrink-0 items-center justify-center rounded-data hover:opacity-70 ${className}`}
    >
      <Icon className="size-5" aria-hidden="true" />
    </button>
  );
}
