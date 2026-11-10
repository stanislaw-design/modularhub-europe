"use client";

import { useLayoutEffect, useRef } from "react";

export type RouteWidth = "results-wide" | "project-wide" | "modularprojects-wide" | "modularproject-wide";

// Znacznik, po którym globals.css (`main:has(.results-wide) > .route-container` itd.) zdejmuje
// limit szerokości kontenera trasy. Z `cacheComponents` Next trzyma poprzednie strony w DOM
// jako ukryte (Activity), a `:has()` widzi też ukryte elementy, więc sam statyczny znacznik
// zostawiał kontener rozszerzony na kolejnej stronie (np. na głównej po wizycie na liście
// realizacji). Klasa jest w HTML z serwera (bez migania przy pierwszym wejściu), a efekt
// zdejmuje ją, gdy strona jest ukrywana, i przywraca przy ponownym pokazaniu.
export function RouteWidthMarker({ name }: { name: RouteWidth }) {
  const ref = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const element = ref.current;
    element?.classList.add(name);
    return () => element?.classList.remove(name);
  }, [name]);

  return <span ref={ref} className={name} aria-hidden="true" hidden />;
}
