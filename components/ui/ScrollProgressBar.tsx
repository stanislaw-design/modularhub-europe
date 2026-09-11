"use client";

import { useEffect, useRef } from "react";

// Replaces the native scrollbar (hidden globally, see globals.css) with a
// slim reading-progress indicator: the track spans the full viewport height
// and the fill grows from the top down as the page scrolls, so its height
// always reads directly as "how far down the page you are" — unlike a
// native thumb, whose size instead reflects how much content there is.
export function ScrollProgressBar() {
  const fillRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let ticking = false;

    const update = () => {
      ticking = false;
      const doc = document.documentElement;
      const scrollable = doc.scrollHeight - doc.clientHeight;
      const percent = scrollable > 0 ? (doc.scrollTop / scrollable) * 100 : 0;
      if (fillRef.current) {
        fillRef.current.style.height = `${percent}%`;
      }
    };

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className="fixed inset-y-0 right-0 z-50 w-1.5 bg-brand-steel"
    >
      <div ref={fillRef} className="w-full bg-brand-orange" style={{ height: 0 }} />
    </div>
  );
}
