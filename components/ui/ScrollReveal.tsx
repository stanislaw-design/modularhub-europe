"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

interface ScrollRevealProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}

// Generic scroll-triggered reveal wrapper (see .scroll-reveal in app/globals.css
// for the actual transition and the prefers-reduced-motion override). Reveals
// once and disconnects rather than toggling on every scroll direction change,
// so content doesn't flicker in and out as the user scrolls past it.
export function ScrollReveal({ children, className, style }: ScrollRevealProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (typeof IntersectionObserver === "undefined") {
      const id = window.setTimeout(() => setRevealed(true), 0);
      return () => window.clearTimeout(id);
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setRevealed(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -10% 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`scroll-reveal${revealed ? " is-revealed" : ""}${className ? ` ${className}` : ""}`}
      style={style}
    >
      {children}
    </div>
  );
}
