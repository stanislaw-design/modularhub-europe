"use client";

import { AnimatePresence, motion, type MotionProps } from "motion/react";
import { useEffect, useState, type ReactNode } from "react";

interface WordRotateProps {
  words: ReactNode[];
  duration?: number;
  motionProps?: MotionProps;
  className?: string;
  /** Extra classes (e.g. padding) on the outer clipping span. The
   * overflow-hidden here is permanent (unlike a one-shot entrance mask),
   * so anything a rotating word paints past its own line box — descenders,
   * an underline — needs this widened up front; there's no "reveal after"
   * to fall back on the way a single-play entrance animation has. */
  wrapperClassName?: string;
}

// magicui.design's word-rotate pattern (AnimatePresence mode="wait" runs the
// outgoing word's exit to completion before the next word enters, rather
// than an instant swap). Adapted from the upstream string-only API to take
// ReactNode so a caller can nest markup (e.g. an underline) inside a
// rotating item, and wrapped in an inline-block span (not a div/h1) so it
// can sit mid-sentence — used by SearchCard's collapsed-teaser hint text.
// Skips the interval entirely under prefers-reduced-motion (WCAG 2.2.2:
// auto-updating content needs a way to stop), landing on the first word and
// holding there, rather than leaving that to every caller.
export function WordRotate({
  words,
  duration = 2500,
  motionProps = {
    initial: { opacity: 0, y: -50 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 50 },
    transition: { duration: 0.25, ease: "easeOut" },
  },
  className,
  wrapperClassName,
}: WordRotateProps) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const interval = setInterval(() => {
      setIndex((prevIndex) => (prevIndex + 1) % words.length);
    }, duration);
    return () => clearInterval(interval);
  }, [words, duration]);

  return (
    <span
      className={
        wrapperClassName
          ? `inline-block overflow-hidden align-bottom ${wrapperClassName}`
          : "inline-block overflow-hidden align-bottom"
      }
    >
      <AnimatePresence mode="wait">
        <motion.span
          key={index}
          className={className ? `inline-block ${className}` : "inline-block"}
          {...motionProps}
        >
          {words[index]}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
