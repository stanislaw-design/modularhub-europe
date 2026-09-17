"use client";

import { ArrowRight } from "lucide-react";
import { motion, useMotionValueEvent, useReducedMotion, useScroll, useTransform } from "motion/react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { DataText } from "@/components/ui";
import type { CategoryShowcaseItem } from "./CategoryShowcase";

interface CategoryShowcaseCarouselProps {
  headingUnderline: string;
  headingRest: string;
  viewOffersLabel: string;
  viewOffersShortLabel: string;
  nextCategoryLabel: string;
  categories: CategoryShowcaseItem[];
}

// Desktop (`lg`+, motion allowed, IntersectionObserver available) pins the
// section while the user scrolls a tall spacer (categories.length viewport
// heights) and crossfades the active category from useScroll's progress
// (spec 0029 AC-1). Every other case — below `lg`, prefers-reduced-motion,
// or no IntersectionObserver — renders the same categories as a plain
// snap-x touch carousel instead (AC-2, AC-7): scroll hijacking on a phone
// fights momentum scrolling and browser chrome in ways a desktop trackpad
// doesn't. Only one of the two ever mounts (never both hidden-via-CSS), so
// there is exactly one heading, one set of dots, and one accessible link
// per category at any time.
export function CategoryShowcaseCarousel({
  headingUnderline,
  headingRest,
  viewOffersLabel,
  viewOffersShortLabel,
  nextCategoryLabel,
  categories,
}: CategoryShowcaseCarouselProps) {
  const prefersReducedMotion = useReducedMotion();
  const [canPin, setCanPin] = useState(false);
  const [isLgViewport, setIsLgViewport] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- odczyt zdolności środowiska (IntersectionObserver) po hydracji, niedostępny podczas SSR
    setCanPin(!prefersReducedMotion && typeof IntersectionObserver !== "undefined");
  }, [prefersReducedMotion]);

  useEffect(() => {
    // jsdom (Vitest) has no matchMedia implementation at all, unlike its
    // IntersectionObserver-shaped gap above — guard the same way so a unit
    // test render defaults to the carousel fallback instead of throwing.
    if (typeof window.matchMedia !== "function") return;
    const query = window.matchMedia("(min-width: 1024px)");
    const update = () => setIsLgViewport(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  const showPinned = canPin && isLgViewport;

  return showPinned ? (
    <PinnedShowcase
      headingUnderline={headingUnderline}
      headingRest={headingRest}
      viewOffersLabel={viewOffersLabel}
      viewOffersShortLabel={viewOffersShortLabel}
      nextCategoryLabel={nextCategoryLabel}
      categories={categories}
      activeIndex={activeIndex}
      onActiveIndexChange={setActiveIndex}
      prefersReducedMotion={Boolean(prefersReducedMotion)}
    />
  ) : (
    <CarouselShowcase
      headingUnderline={headingUnderline}
      headingRest={headingRest}
      viewOffersLabel={viewOffersLabel}
      viewOffersShortLabel={viewOffersShortLabel}
      nextCategoryLabel={nextCategoryLabel}
      categories={categories}
      activeIndex={activeIndex}
      onActiveIndexChange={setActiveIndex}
      prefersReducedMotion={Boolean(prefersReducedMotion)}
    />
  );
}

interface ShowcaseModeProps {
  headingUnderline: string;
  headingRest: string;
  viewOffersLabel: string;
  viewOffersShortLabel: string;
  nextCategoryLabel: string;
  categories: CategoryShowcaseItem[];
  activeIndex: number;
  onActiveIndexChange: (index: number) => void;
  prefersReducedMotion: boolean;
}

function PinnedShowcase({
  headingUnderline,
  headingRest,
  viewOffersLabel,
  viewOffersShortLabel,
  nextCategoryLabel,
  categories,
  activeIndex,
  onActiveIndexChange,
  prefersReducedMotion,
}: ShowcaseModeProps) {
  const pinRef = useRef<HTMLDivElement>(null);
  // Suppresses the scroll -> index sync while a dot/arrow click is driving
  // window.scrollTo, so the click's intended target isn't immediately
  // overwritten by the scroll progress it is itself producing.
  const isNavigatingRef = useRef(false);

  const { scrollYProgress } = useScroll({ target: pinRef, offset: ["start start", "end end"] });
  const rawIndex = useTransform(scrollYProgress, [0, 1], [0, categories.length - 1]);

  useMotionValueEvent(rawIndex, "change", (latest) => {
    if (isNavigatingRef.current) return;
    const next = Math.min(categories.length - 1, Math.max(0, Math.round(latest)));
    onActiveIndexChange(next);
  });

  function goToCategory(index: number) {
    const target = ((index % categories.length) + categories.length) % categories.length;
    onActiveIndexChange(target);

    const node = pinRef.current;
    if (!node) return;
    isNavigatingRef.current = true;
    const rect = node.getBoundingClientRect();
    const rangeHeight = rect.height - window.innerHeight;
    const denominator = Math.max(categories.length - 1, 1);
    const top = window.scrollY + rect.top + (rangeHeight * target) / denominator;
    window.scrollTo({ top, behavior: prefersReducedMotion ? "auto" : "smooth" });
    window.setTimeout(
      () => {
        isNavigatingRef.current = false;
      },
      prefersReducedMotion ? 0 : 700
    );
  }

  return (
    <div ref={pinRef} className="relative" style={{ height: `${categories.length * 100}vh` }}>
      <div className="sticky top-0 h-screen w-full overflow-hidden">
        {categories.map((category, index) => (
          <motion.div
            key={category.family}
            className="absolute inset-0"
            animate={{ opacity: activeIndex === index ? 1 : 0 }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
            inert={activeIndex !== index}
          >
            <CategorySlide
              category={category}
              viewOffersLabel={viewOffersLabel}
              viewOffersShortLabel={viewOffersShortLabel}
              priority={index === 0}
            />
          </motion.div>
        ))}
        <ShowcaseChrome
          headingUnderline={headingUnderline}
          headingRest={headingRest}
          categories={categories}
          activeIndex={activeIndex}
          nextCategoryLabel={nextCategoryLabel}
          onSelect={goToCategory}
        />
      </div>
    </div>
  );
}

function CarouselShowcase({
  headingUnderline,
  headingRest,
  viewOffersLabel,
  viewOffersShortLabel,
  nextCategoryLabel,
  categories,
  activeIndex,
  onActiveIndexChange,
  prefersReducedMotion,
}: ShowcaseModeProps) {
  const trackRef = useRef<HTMLDivElement>(null);

  // Keeps the dots/heading in sync with a manual swipe, not just clicks.
  useEffect(() => {
    const track = trackRef.current;
    if (!track || typeof IntersectionObserver === "undefined") return;
    const slides = Array.from(track.children) as HTMLElement[];
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio > 0.6) {
            const index = slides.indexOf(entry.target as HTMLElement);
            if (index !== -1) onActiveIndexChange(index);
          }
        }
      },
      { root: track, threshold: 0.6 }
    );
    for (const slide of slides) observer.observe(slide);
    return () => observer.disconnect();
  }, [onActiveIndexChange]);

  function goToCategory(index: number) {
    const target = ((index % categories.length) + categories.length) % categories.length;
    onActiveIndexChange(target);
    const slide = trackRef.current?.children[target];
    if (slide && typeof slide.scrollIntoView === "function") {
      slide.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", inline: "start", block: "nearest" });
    }
  }

  return (
    <div className="relative h-[80vh] min-h-[620px] w-full overflow-hidden">
      <div
        ref={trackRef}
        className="flex h-full snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {categories.map((category, index) => (
          <div key={category.family} className="h-full w-full shrink-0 snap-start">
            <CategorySlide
              category={category}
              viewOffersLabel={viewOffersLabel}
              viewOffersShortLabel={viewOffersShortLabel}
              priority={index === 0}
            />
          </div>
        ))}
      </div>
      <ShowcaseChrome
        headingUnderline={headingUnderline}
        headingRest={headingRest}
        categories={categories}
        activeIndex={activeIndex}
        nextCategoryLabel={nextCategoryLabel}
        onSelect={goToCategory}
      />
    </div>
  );
}

function CategorySlide({
  category,
  viewOffersLabel,
  viewOffersShortLabel,
  priority,
}: {
  category: CategoryShowcaseItem;
  viewOffersLabel: string;
  viewOffersShortLabel: string;
  priority: boolean;
}) {
  return (
    <div className="relative h-full w-full overflow-hidden">
      <Image
        src={category.image}
        alt=""
        fill
        priority={priority}
        sizes="100vw"
        className="scale-105 object-cover blur-[2px]"
      />
      {/* Darkened + softly blurred background (unlike Hero's scrim-free
          treatment): the bottom-left copy and offer card read as the
          foreground content here, not a caption over a crisp photo. */}
      <div className="absolute inset-0 bg-brand-v5-night/50" />
      {/* Sizes step up at `lg` only (same reasoning as ShowcaseChrome's
          heading): the mobile carousel frame is a fixed-height box shared
          with this section's persistent top heading, so oversized text here
          risks colliding with it on a short viewport — confirmed happening
          at 700px tall before this was made responsive. */}
      <div className="absolute inset-x-0 bottom-0 flex flex-col gap-brand-3 p-brand-4 pb-20 lg:flex-row lg:items-end lg:justify-between lg:gap-brand-4 lg:p-brand-6 lg:pb-16">
        <div className="max-w-[30ch] lg:max-w-[38ch]">
          <p className="font-display text-h1 font-bold text-brand-v5-paper [text-shadow:0_2px_16px_rgba(0,0,0,0.45)] lg:text-display-xl">
            {category.name}
          </p>
          <p className="mt-brand-1 max-w-[32ch] text-body-l text-brand-v5-paper/90 [text-shadow:0_2px_10px_rgba(0,0,0,0.4)] lg:mt-brand-2 lg:text-h3">
            {category.description}
          </p>
        </div>
        <Link
          href={category.href}
          className="focus-ring group flex w-full max-w-lg items-center gap-brand-4 rounded-v5-card bg-brand-v5-surface p-brand-4 shadow-2xl transition-transform hover:-translate-y-0.5 sm:w-auto"
        >
          <span className="relative size-24 shrink-0 overflow-hidden rounded-v5-card sm:size-28">
            <Image src={category.image} alt={category.imageAlt} fill sizes="112px" className="object-cover" />
          </span>
          {/* Hierarchy: price is the loudest thing in the card (what a
              buyer scans for first), the category name is a quieter
              caption under it, the CTA is a clearly separated button
              rather than competing at the same weight as the price. */}
          <span className="flex flex-col items-start gap-1">
            <DataText className="text-h1 leading-none font-bold text-brand-v5-ink">{category.offerLabel}</DataText>
            <span className="text-body text-brand-v5-muted">{category.name}</span>
            <span className="focus-ring mt-brand-2 inline-flex items-center gap-1 rounded-v5-pill bg-brand-v5-amber px-brand-3 py-brand-1 text-body font-semibold text-brand-v5-amber-foreground transition-colors group-hover:bg-brand-v5-amber-strong">
              {/* Shorter label on mobile — the button competes for width
                  next to the price/name column in a narrow card there. */}
              <span className="lg:hidden">{viewOffersShortLabel}</span>
              <span className="hidden lg:inline">{viewOffersLabel}</span>
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
            </span>
          </span>
        </Link>
      </div>
    </div>
  );
}

function ShowcaseChrome({
  headingUnderline,
  headingRest,
  categories,
  activeIndex,
  nextCategoryLabel,
  onSelect,
}: {
  headingUnderline: string;
  headingRest: string;
  categories: CategoryShowcaseItem[];
  activeIndex: number;
  nextCategoryLabel: string;
  onSelect: (index: number) => void;
}) {
  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col justify-between">
      {/* pt-24/pt-28 (not p-brand-4/6's own top) is deliberate: the fixed
          SiteHeader (~73px tall on every breakpoint) floats over this pinned
          frame, which starts at the true viewport top, so the heading needs
          more top clearance than its horizontal/bottom padding. Only `lg`
          gets the big display size — the carousel's shorter mobile frame
          (h-[80vh]) doesn't have room for a 2-line display-xl heading above
          the category name/description without the two colliding.
          hero-underline (globals.css) is the same animated amber underline
          Hero.tsx draws under its own heading words, reused here for visual
          consistency between the two full-bleed sections. */}
      <h2 className="pointer-events-auto max-w-[20ch] px-brand-4 pt-24 pb-brand-4 font-display text-h2 leading-tight font-bold text-brand-v5-paper [text-shadow:0_2px_16px_rgba(0,0,0,0.4)] lg:max-w-[14ch] lg:px-brand-6 lg:pt-28 lg:pb-brand-6 lg:text-display-xl lg:leading-[1.05]">
        <span className="hero-underline">{headingUnderline}</span> {headingRest}
      </h2>
      <div className="pointer-events-auto flex items-center justify-center gap-brand-2 pb-brand-4">
        {categories.map((category, index) => (
          <button
            key={category.family}
            type="button"
            aria-label={category.dotLabel}
            aria-current={activeIndex === index}
            onClick={() => onSelect(index)}
            className={`focus-ring size-2.5 rounded-full transition-colors ${
              activeIndex === index ? "bg-brand-v5-paper" : "bg-brand-v5-paper/40 hover:bg-brand-v5-paper/70"
            }`}
          />
        ))}
        <button
          type="button"
          aria-label={nextCategoryLabel}
          onClick={() => onSelect(activeIndex + 1)}
          className="focus-ring ml-brand-1 flex size-9 items-center justify-center rounded-full bg-brand-v5-paper/90 text-brand-v5-night transition-colors hover:bg-brand-v5-paper"
        >
          <ArrowRight className="size-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
