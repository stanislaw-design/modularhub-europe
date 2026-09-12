"use client";

import { Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface FloatingSearchButtonProps {
  locale: string;
}

// Home page only (rendered from klient/page.tsx below Hero). Hidden until
// Hero's #hero-end sentinel scrolls out of view, then floats bottom-right for
// the rest of the page. Always links to /wyniki with no query params (a
// fresh, unfiltered browse entry point, distinct from SearchCard's
// country/family/size search inside Hero itself).
export function FloatingSearchButton({ locale }: FloatingSearchButtonProps) {
  const t = useTranslations("FloatingSearchButton");
  const router = useRouter();
  const [visible, setVisible] = useState(false);
  const [bubbleHidden, setBubbleHidden] = useState(false);

  useEffect(() => {
    const sentinel = document.getElementById("hero-end");
    if (!sentinel) return;

    const observer = new IntersectionObserver(([entry]) => setVisible(!entry.isIntersecting));
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, []);

  // The pinned "Więcej niż dom" showcase (CategoryShowcase) is a full-bleed
  // dark section spanning several viewport heights while scrolled through —
  // the bubble's own dark bg-brand-v5-ink would sit invisibly on top of it,
  // so it's hidden for as long as any part of that section is in view and
  // reappears once scrolled past. The round button itself stays put.
  useEffect(() => {
    const section = document.getElementById("category-showcase");
    if (!section) return;

    const observer = new IntersectionObserver(([entry]) => setBubbleHidden(entry.isIntersecting));
    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      inert={!visible}
      className={`fixed right-brand-3 bottom-brand-3 z-40 flex flex-col items-end gap-brand-2 transition-[opacity,transform] duration-300 ease-out ${
        visible ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
      }`}
    >
      <div
        className={`relative rounded-v5-panel bg-brand-v5-ink px-brand-3 py-brand-2 text-body font-medium whitespace-nowrap text-brand-v5-paper shadow-lg transition-[opacity,transform] duration-300 ease-out ${
          bubbleHidden ? "translate-y-2 opacity-0" : "translate-y-0 opacity-100"
        }`}
      >
        {t("prompt")}
        <span
          aria-hidden="true"
          className="absolute -bottom-1.5 right-6 size-3 rotate-45 bg-brand-v5-ink"
        />
      </div>
      <button
        type="button"
        onClick={() => router.push(`/${locale}/results`)}
        aria-label={t("buttonAriaLabel")}
        className="focus-ring flex size-14 items-center justify-center rounded-full bg-brand-v5-amber text-brand-v5-amber-foreground shadow-xl transition-colors hover:bg-brand-v5-amber-strong"
      >
        <Search className="size-6" aria-hidden="true" />
      </button>
    </div>
  );
}
