import { FileCheck2, ShieldCheck, Wallet } from "lucide-react";
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

// Server component: no interactions live here — the search bar (children)
// carries all client state. Single centered column, no photo (spec 0015
// redesign v2): headline, then the search bar directly beneath it, so the
// primary action sits above the fold with nothing competing for attention.
// The subcopy + trust badges sit below the search bar, not above it, so they
// read as supporting reassurance rather than something to get through first.
export function Hero({ children }: HeroProps) {
  return (
    <section className="full-bleed -mt-brand-4 relative bg-brand-v5-paper pt-brand-7 pb-brand-5 lg:pt-brand-8">
      <Container className="flex flex-col items-center gap-brand-5 text-center">
        {/* Amber stays a fill/decoration, never body text color, on this
            light surface — direct amber text on white fails WCAG AA
            contrast (checklist.md), so the accent words get an amber
            underline instead of amber fill color. */}
        {/* hero-heading-mask (globals.css) clips only for the entrance's
            duration, then reverts to visible — so descenders/diacritics/the
            underline are never clipped once the heading settles. */}
        <div className="hero-heading-mask">
          <h1 className="hero-heading-in whitespace-nowrap font-display text-[clamp(1.75rem,4.6vw,5.25rem)] leading-[0.97] font-bold tracking-[-0.04em] text-brand-v5-ink">
            Twój{" "}
            <span className="hero-underline">dom.</span>{" "}
            Mądrze{" "}
            <span className="hero-underline">wybrany.</span>
          </h1>
        </div>
        {children ? <div className="w-full max-w-3xl">{children}</div> : null}
        <div className="flex flex-col items-center gap-brand-2">
          <p className="max-w-[46ch] text-body-l text-brand-v5-muted">
            Porównaj sprawdzone domy modułowe z całej Europy.
          </p>
          <ul className="flex flex-col items-center gap-brand-2 sm:flex-row sm:flex-wrap sm:justify-center sm:gap-brand-4">
            {trustBadges.map(({ icon: Icon, label }) => (
              <li
                key={label}
                className="flex items-center gap-brand-1 text-data font-medium text-brand-v5-ink"
              >
                <Icon className="size-4 shrink-0 text-brand-v5-ink" aria-hidden="true" />
                {label}
              </li>
            ))}
          </ul>
        </div>
      </Container>
    </section>
  );
}
