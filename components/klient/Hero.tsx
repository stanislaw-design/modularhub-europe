import { FileCheck2, ShieldCheck, Wallet } from "lucide-react";
import Image from "next/image";
import type { ReactNode } from "react";
import { Container } from "@/components/ui";

const heroImages = [
  {
    src: "/images/houses/golden-hour/baltyk-loft-120.webp",
    className: "lg:col-span-7 lg:row-span-7",
  },
  {
    src: "/images/houses/golden-hour/karpaty-alpine-104.webp",
    className: "lg:col-span-5 lg:row-span-4",
  },
  {
    src: "/images/houses/golden-hour/modulor-family-90.webp",
    className: "lg:col-span-5 lg:row-span-5",
  },
  {
    src: "/images/houses/golden-hour/karpaty-ridge-72.webp",
    className: "lg:col-span-4 lg:row-span-5",
  },
  {
    src: "/images/houses/golden-hour/modulor-compact-56.webp",
    className: "lg:col-span-4 lg:row-span-5",
  },
  {
    src: "/images/houses/golden-hour/baltyk-studio-38.webp",
    className: "lg:col-span-4 lg:row-span-3",
  },
];

const trustBadges = [
  { icon: ShieldCheck, label: "Zweryfikowani producenci" },
  { icon: Wallet, label: "Przejrzyste ceny" },
  { icon: FileCheck2, label: "Compliance Engine™" },
];

// Server component: the only interaction here is an anchor scroll to the
// search card (id="search-card", rendered by app/[locale]/klient/page.tsx
// right after this section) — no client state needed. The search itself
// lives in SearchCard.tsx, which owns the SearchSegment instances and the
// /wyniki navigation (spec 0014 AC-3, AC-4).
export function Hero({ children }: { children?: ReactNode }) {
  return (
    <section className="full-bleed -mt-brand-4 relative overflow-hidden bg-brand-v4-night text-brand-v4-surface">
      <Container className="relative flex flex-col gap-brand-5 pt-brand-6 pb-brand-6 lg:min-h-[600px] lg:justify-center lg:py-brand-7 lg:pl-[0%]">
        <div className="relative z-10 flex flex-col items-start gap-brand-4 lg:max-w-[780px]">
          <span className="hidden text-label font-semibold tracking-[0.1em] text-brand-v4-amber lg:inline">
            Najlepsza platforma w Europie
          </span>
          <h1 className="max-w-[14ch] font-display text-[clamp(3.5rem,5.5vw,5.75rem)] leading-[0.95] font-bold tracking-[-0.045em]">
            Twój <span className="text-brand-v4-amber">dom.</span>
            <br />
            <span className="lg:whitespace-nowrap">
              <span className="text-brand-v4-amber">Mądrze</span> wybrany.
            </span>
          </h1>
          <p className="hidden max-w-[46ch] text-body-l text-brand-v4-mist lg:block">
            Porównaj sprawdzone domy modułowe z całej Europy.
          </p>
          <ul className="hidden flex-wrap gap-brand-4 lg:flex lg:flex-nowrap lg:gap-brand-3">
            {trustBadges.map(({ icon: Icon, label }) => (
              <li
                key={label}
                className="flex items-center gap-brand-1 text-body whitespace-nowrap text-brand-v4-surface"
              >
                <Icon className="size-5 shrink-0 text-brand-v4-amber" aria-hidden="true" />
                {label}
              </li>
            ))}
          </ul>
        </div>
      </Container>
      <div className="absolute inset-y-0 right-0 w-full lg:w-[58%]">
        <div
          className="relative grid h-full w-full grid-cols-1 auto-rows-max gap-1 overflow-hidden rounded-v4-panel bg-brand-v4-night lg:grid-cols-12 lg:grid-rows-12 lg:rounded-none"
          role="img"
          aria-label="Mozaika różnych domów modułowych dostępnych na platformie"
        >
          {heroImages.map((image, index) => (
            <div
              key={image.src}
              className={`relative aspect-video min-h-0 min-w-0 overflow-hidden rounded-v4-card lg:aspect-auto ${image.className}`}
            >
              <Image
                src={image.src}
                alt=""
                fill
                priority={index < 3}
                sizes="(min-width: 1024px) 34vw, 50vw"
                className="object-cover saturate-[0.82] contrast-[1.06]"
              />
              <div aria-hidden="true" className="absolute inset-0 bg-brand-v4-night-deep/10" />
            </div>
          ))}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.07)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.07)_1px,transparent_1px)] bg-[size:72px_72px]"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-brand-v4-night/50 lg:hidden"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-gradient-to-r from-brand-v4-night/95 via-brand-v4-night/65 to-transparent lg:hidden"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-brand-v4-night via-brand-v4-night/70 to-transparent"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-2/5 backdrop-blur-[12px] [mask-image:linear-gradient(to_top,black,transparent)]"
          />
        </div>
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-0 hidden w-2/5 bg-gradient-to-r from-brand-v4-night via-brand-v4-night/80 to-transparent lg:block"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-0 hidden w-1/3 backdrop-blur-[10px] [mask-image:linear-gradient(to_right,black,transparent)] lg:block"
        />
      </div>
      {children ? (
        <Container className="relative z-20 pb-brand-6">
          {children}
          <ul className="mt-brand-4 flex flex-col gap-brand-3 lg:hidden">
            {trustBadges.map(({ icon: Icon, label }) => (
              <li
                key={label}
                className="flex items-center gap-brand-1 text-body whitespace-nowrap text-brand-v4-surface"
              >
                <Icon className="size-5 shrink-0 text-brand-v4-amber" aria-hidden="true" />
                {label}
              </li>
            ))}
          </ul>
        </Container>
      ) : null}
    </section>
  );
}
