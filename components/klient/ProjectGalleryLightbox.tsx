"use client";

import { Dialog, DialogBackdrop, DialogPanel } from "@headlessui/react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type TouchEvent,
} from "react";

interface GalleryImage {
  src: string;
  alt: string;
}

interface GalleryLightboxContextValue {
  openAt: (index: number) => void;
}

const GalleryLightboxContext = createContext<GalleryLightboxContextValue | null>(null);

export function useGalleryLightbox(): GalleryLightboxContextValue {
  const context = useContext(GalleryLightboxContext);
  if (!context) throw new Error("useGalleryLightbox must be used within a GalleryLightboxProvider");
  return context;
}

interface GalleryLightboxProviderProps {
  images: GalleryImage[];
  children: ReactNode;
}

const SWIPE_THRESHOLD_PX = 40;

// Jedna instancja modala na stronę projektu, dzielona przez okładkę i pasek
// miniatur przez ten kontekst — dzięki temu strzałki przechodzą płynnie po
// całej galerii (okładka + zdjęcia dodatkowe), niezależnie od tego, które z
// dwóch (osobno layoutowanych, spec 0020) zdjęć otworzyło modal.
export function GalleryLightboxProvider({ images, children }: GalleryLightboxProviderProps) {
  const t = useTranslations("ProjectGallery");
  const [index, setIndex] = useState<number | null>(null);
  const touchStartX = useRef<number | null>(null);

  const openAt = useCallback((i: number) => setIndex(i), []);
  const close = useCallback(() => setIndex(null), []);
  const showPrev = useCallback(() => {
    setIndex((current) => (current === null ? current : (current - 1 + images.length) % images.length));
  }, [images.length]);
  const showNext = useCallback(() => {
    setIndex((current) => (current === null ? current : (current + 1) % images.length));
  }, [images.length]);

  // Strzałki klawiatury na desktopie (spec: gest na mobile, strzałki na desktopie);
  // Esc i focus trap dostajemy za darmo z Headless UI Dialog poniżej.
  useEffect(() => {
    if (index === null) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "ArrowLeft") showPrev();
      else if (event.key === "ArrowRight") showNext();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [index, showPrev, showNext]);

  function onTouchStart(event: TouchEvent) {
    touchStartX.current = event.touches[0].clientX;
  }

  function onTouchEnd(event: TouchEvent) {
    const startX = touchStartX.current;
    touchStartX.current = null;
    if (startX === null) return;
    const deltaX = event.changedTouches[0].clientX - startX;
    if (deltaX > SWIPE_THRESHOLD_PX) showPrev();
    else if (deltaX < -SWIPE_THRESHOLD_PX) showNext();
  }

  const contextValue = useMemo(() => ({ openAt }), [openAt]);
  const current = index !== null ? images[index] : null;

  return (
    <GalleryLightboxContext.Provider value={contextValue}>
      {children}
      <Dialog open={current !== null} onClose={close} transition className="relative z-50">
        <DialogBackdrop
          transition
          className="fixed inset-0 bg-brand-v5-night/80 backdrop-blur-md transition duration-200 ease-out data-[closed]:opacity-0"
        />
        <div className="fixed inset-0 flex items-center justify-center p-brand-2">
          <DialogPanel
            transition
            className="relative flex h-full w-full max-w-6xl items-center justify-center gap-brand-1 transition duration-200 ease-out data-[closed]:scale-95 data-[closed]:opacity-0 sm:gap-brand-4"
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
          >
            <button
              type="button"
              onClick={close}
              aria-label={t("lightboxClose")}
              className="focus-ring absolute right-0 top-0 z-10 flex size-11 items-center justify-center rounded-full border-0 bg-brand-v5-night/60 text-brand-v5-paper transition hover:bg-brand-v5-night/80 sm:right-brand-2 sm:top-brand-2"
            >
              <X className="size-6" aria-hidden="true" />
            </button>

            {/* Strzałki żyją obok zdjęcia w tym samym wierszu flex (nie
                position: absolute na jego rogach), więc nigdy go nie zasłaniają
                — zdjęcie (flex-1) po prostu dostaje mniej szerokości. */}
            {images.length > 1 && (
              <button
                type="button"
                onClick={showPrev}
                aria-label={t("lightboxPrev")}
                className="focus-ring z-10 flex size-9 shrink-0 items-center justify-center rounded-full border-0 bg-brand-v5-night/60 text-brand-v5-paper transition hover:bg-brand-v5-night/80 sm:size-11"
              >
                <ChevronLeft className="size-5 sm:size-7" aria-hidden="true" />
              </button>
            )}

            {current && (
              <div className="relative h-[65vh] min-w-0 flex-1 sm:h-[78vh]">
                <Image src={current.src} alt={current.alt} fill sizes="100vw" className="object-contain" priority />
              </div>
            )}

            {images.length > 1 && (
              <button
                type="button"
                onClick={showNext}
                aria-label={t("lightboxNext")}
                className="focus-ring z-10 flex size-9 shrink-0 items-center justify-center rounded-full border-0 bg-brand-v5-night/60 text-brand-v5-paper transition hover:bg-brand-v5-night/80 sm:size-11"
              >
                <ChevronRight className="size-5 sm:size-7" aria-hidden="true" />
              </button>
            )}

            {images.length > 1 && index !== null && (
              <span className="absolute bottom-brand-2 left-1/2 -translate-x-1/2 rounded-v5-pill bg-brand-v5-night/60 px-brand-2 py-1 text-label font-medium text-brand-v5-paper">
                {t("lightboxCounter", { current: index + 1, total: images.length })}
              </span>
            )}
          </DialogPanel>
        </div>
      </Dialog>
    </GalleryLightboxContext.Provider>
  );
}

interface GalleryImageButtonProps {
  index: number;
  label: string;
  className?: string;
  children: ReactNode;
}

// Cienki klikalny wrapper renderowany wewnątrz ProjectGalleryCover/Thumbnails
// (serwerowe, async) — sam jest "use client", więc zdjęcie (dziecko, wyrenderowane
// po stronie serwera) trafia do niego jako children bez zmiany, tylko dostaje
// onClick otwierający wspólny modal.
export function GalleryImageButton({ index, label, className, children }: GalleryImageButtonProps) {
  const { openAt } = useGalleryLightbox();
  return (
    <button
      type="button"
      onClick={() => openAt(index)}
      aria-label={label}
      className={`focus-ring block w-full cursor-zoom-in border-0 bg-transparent p-0 text-left ${className ?? ""}`}
    >
      {children}
    </button>
  );
}
