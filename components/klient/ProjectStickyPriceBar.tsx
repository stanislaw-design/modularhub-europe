"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

interface ProjectStickyPriceBarProps {
  // Karta ceny z hero (cena + "Wyślij zapytanie"), obserwowana przez
  // IntersectionObserver — nie cały hero, tylko ta jedna karta.
  children: ReactNode;
  // Zawartość pływającego paska: ten sam rodzaj treści co karta wyżej
  // (cena + CTA), zbudowany przez wywołującego z tych samych zmiennych.
  floatingBar: ReactNode;
}

// Desktop floating CTA (2026-10-02, inżynier): mobile ma już stały pasek na
// dole ekranu (zawsze widoczny, bo karta ceny z małego viewportu znika po
// kilku pikselach scrolla), ale desktop nie miał żadnego odpowiednika — raz
// przewinięte poza kartę ceny w hero, "Wyślij zapytanie" wymagało powrotu do
// góry strony. IntersectionObserver na sentinelu owijającym dokładnie tę
// kartę: pasek pojawia się tylko wtedy, gdy karta faktycznie traci
// widoczność, nie przy każdym scrollu.
export function ProjectStickyPriceBar({ children, floatingBar }: ProjectStickyPriceBarProps) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [showBar, setShowBar] = useState(false);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => setShowBar(!entry.isIntersecting));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <div ref={sentinelRef}>{children}</div>
      {/* hidden lg:flex: tylko desktop, mobile ma własny, zawsze widoczny pasek
          w page.tsx. Zamontowany na stałe i przesuwany transformem (nie
          mount/unmount), żeby przejście było animowane, a nie skokowe;
          pointer-events-none w stanie schowanym, żeby pasek poza viewportem
          (translate-y-full) nie łapał kliknięć/focusu. */}
      <div
        aria-hidden={!showBar}
        className={`fixed inset-x-0 bottom-0 z-40 hidden border-t-2 border-brand-v5-ink bg-brand-v5-surface transition-transform duration-200 ease-out lg:flex ${
          showBar ? "translate-y-0" : "pointer-events-none translate-y-full"
        }`}
      >
        {floatingBar}
      </div>
    </>
  );
}
