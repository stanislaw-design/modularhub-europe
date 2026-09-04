import { FileCheck2, ShieldCheck, Wallet } from "lucide-react";
import Image from "next/image";
import type { ReactNode } from "react";
import { Container } from "@/components/ui";

const trustBadges = [
  { icon: ShieldCheck, label: "Zweryfikowani producenci" },
  { icon: Wallet, label: "Przejrzyste ceny" },
  { icon: FileCheck2, label: "Compliance Engine™" },
];

interface HeroProps {
  children?: ReactNode;
}

// TEMP facade iteration: full-bleed photo background, content anchored
// bottom-left under a transparent overlay header (SiteHeader's isHomeRoute
// branch) — not yet reconciled with spec 0015 AC-2/AC-13's "single column,
// no photo, centered" decision. Flag to revisit via /architect or /sync once
// this direction is confirmed. -mt-brand-5 fully cancels RouteShell's
// pt-brand-5 (not just partially, like the old -mt-brand-4 did against the
// previously in-flow sticky header) so the photo reaches the true top of the
// viewport — SiteHeader now floats over it via fixed positioning instead of
// occupying layout space. Reuses the v4 dark-gradient-over-photo pattern from
// ClosingCta.tsx (bg-brand-v4-night gradient + brand-v4-surface/mist text)
// since v5 has no on-photo text token.
export function Hero({ children }: HeroProps) {
  return (
    <section className="full-bleed -mt-brand-5 relative isolate flex min-h-[640px] flex-col justify-end overflow-hidden pt-24 pb-brand-6 text-brand-v4-surface lg:min-h-[760px] lg:pb-brand-8">
      <Image
        src="/images/hero/klient-hero-bg.png"
        alt=""
        fill
        priority
        sizes="100vw"
        className="-z-10 object-cover"
      />
      {/* TEMP disabled 2026-09-04 at user request, to preview the raw photo
          without the legibility scrim — kept in code, not deleted, restore
          once the look is confirmed. */}
      {false && (
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-gradient-to-t from-brand-v4-night via-brand-v4-night/45 to-transparent"
        />
      )}
      <Container className="flex flex-col items-start gap-brand-5 pl-[3%] text-left lg:pl-[1%]">
        {/* hero-heading-mask (globals.css) clips only for the entrance's
            duration, then reverts to visible — so descenders/diacritics/the
            underline are never clipped once the heading settles. */}
        <div className="hero-heading-mask">
          <h1 className="hero-heading-in whitespace-nowrap font-display text-[clamp(1.75rem,4.6vw,5.25rem)] leading-[0.97] font-bold tracking-[-0.04em] text-brand-v4-surface [text-shadow:0_2px_12px_rgba(0,0,0,0.35)]">
            Twój{" "}
            <span className="hero-underline">dom.</span>{" "}
            Mądrze{" "}
            <span className="hero-underline">wybrany.</span>
          </h1>
        </div>
        {children ? <div className="w-full max-w-3xl">{children}</div> : null}
        <div className="flex flex-col items-start gap-brand-2">
          <p className="max-w-[46ch] text-body-l text-brand-v4-mist">
            Porównaj sprawdzone domy modułowe z całej Europy.
          </p>
          <ul className="flex flex-col items-start gap-brand-2 sm:flex-row sm:flex-wrap sm:gap-brand-4">
            {trustBadges.map(({ icon: Icon, label }) => (
              <li
                key={label}
                className="flex items-center gap-brand-1 text-data font-medium text-brand-v4-surface"
              >
                <Icon className="size-4 shrink-0" aria-hidden="true" />
                {label}
              </li>
            ))}
          </ul>
        </div>
      </Container>
    </section>
  );
}
