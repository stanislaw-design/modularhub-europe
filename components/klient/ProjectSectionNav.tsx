"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface SectionNavItem {
  id: string;
  label: string;
  disabled?: boolean;
}

interface ProjectSectionNavProps {
  items: SectionNavItem[];
  ariaLabel: string;
  scrollLeftLabel: string;
  scrollRightLabel: string;
}

// Pasek szybkiej nawigacji po sekcjach strony projektu, zaraz pod hero.
// Zwykłe kotwice `#id`. Sekcja bez żadnej prawdziwej treści na tym
// konkretnym projekcie (cena, działka, harmonogram, dokumenty — policzone w
// page.tsx, spec 0054 AC-8) renderuje się jako wyłączona (disabled) pozycja
// zamiast martwego linku donikąd, ten sam wzorzec co "Podobne domy" (jawnie
// poza zakresem, spec 0042 AC-15). Klienckie: strzałki przewijania na
// desktopie wymagają śledzenia pozycji scrolla — na mobile przewija się
// samym gestem (natywny overflow-x-auto), strzałki są tam ukryte.
export function ProjectSectionNav({ items, ariaLabel, scrollLeftLabel, scrollRightLabel }: ProjectSectionNavProps) {
  const scrollRef = useRef<HTMLElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    function updateScrollState() {
      if (!el) return;
      setCanScrollLeft(el.scrollLeft > 4);
      setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
    }

    updateScrollState();
    el.addEventListener("scroll", updateScrollState, { passive: true });
    window.addEventListener("resize", updateScrollState);
    return () => {
      el.removeEventListener("scroll", updateScrollState);
      window.removeEventListener("resize", updateScrollState);
    };
  }, [items]);

  function scrollByPage(direction: -1 | 1) {
    scrollRef.current?.scrollBy({ left: direction * scrollRef.current.clientWidth * 0.6, behavior: "smooth" });
  }

  return (
    <div className="flex items-center gap-brand-1 border-b border-brand-v5-line">
      <button
        type="button"
        onClick={() => scrollByPage(-1)}
        aria-label={scrollLeftLabel}
        tabIndex={canScrollLeft ? 0 : -1}
        className={`focus-ring hidden size-8 shrink-0 items-center justify-center rounded-full border border-brand-v5-line text-brand-v5-muted transition-opacity hover:text-brand-v5-ink sm:flex ${
          canScrollLeft ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <ChevronLeft className="size-4" aria-hidden="true" />
      </button>

      <nav
        ref={scrollRef}
        aria-label={ariaLabel}
        className="flex flex-1 gap-brand-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {items.map((item) =>
          item.disabled ? (
            <span
              key={item.id}
              aria-disabled="true"
              className="shrink-0 cursor-not-allowed whitespace-nowrap border-b-2 border-transparent px-brand-3 py-brand-2 text-body font-semibold text-brand-v5-muted/50"
            >
              {item.label}
            </span>
          ) : (
            <a
              key={item.id}
              href={`#${item.id}`}
              className="focus-ring shrink-0 whitespace-nowrap border-b-2 border-transparent px-brand-3 py-brand-2 text-body font-semibold text-brand-v5-muted transition-colors hover:border-brand-v5-line hover:text-brand-v5-ink"
            >
              {item.label}
            </a>
          ),
        )}
      </nav>

      <button
        type="button"
        onClick={() => scrollByPage(1)}
        aria-label={scrollRightLabel}
        tabIndex={canScrollRight ? 0 : -1}
        className={`focus-ring hidden size-8 shrink-0 items-center justify-center rounded-full border border-brand-v5-line text-brand-v5-muted transition-opacity hover:text-brand-v5-ink sm:flex ${
          canScrollRight ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <ChevronRight className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}
