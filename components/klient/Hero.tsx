import { FileCheck2, ShieldCheck, Wallet } from "lucide-react";
import Image from "next/image";
import { Container } from "@/components/ui";

const heroImage = "/images/houses/golden-hour/baltyk-loft-120.webp";

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
export function Hero() {
  return (
    <section className="full-bleed -mt-brand-4 relative overflow-hidden bg-brand-v4-night text-brand-v4-surface">
      <Container className="relative flex flex-col gap-brand-5 pt-brand-6 pb-brand-6 lg:min-h-[600px] lg:justify-center lg:py-brand-7 lg:pl-[0%]">
        <div className="flex flex-col items-start gap-brand-4 lg:max-w-[56ch]">
          <span className="text-label font-semibold tracking-[0.1em] text-brand-v4-amber">
            Najlepsza platforma w Europie
          </span>
          <h1 className="text-h1 font-display font-bold text-balance">
            Mądrzejszy sposób na budowanie Twojej przyszłości
          </h1>
          <p className="text-body-l text-brand-v4-mist max-w-[46ch]">
            Porównuj domy modułowe i prefabrykowane od sprawdzonych europejskich producentów —
            jedna platforma, przejrzyste ceny i zgodność z przepisami Twojego kraju.
          </p>
          <ul className="flex flex-wrap gap-brand-4">
            {trustBadges.map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-brand-1 text-body text-brand-v4-surface">
                <Icon className="size-5 shrink-0 text-brand-v4-amber" aria-hidden="true" />
                {label}
              </li>
            ))}
          </ul>
        </div>
      </Container>
      <div className="relative mt-brand-2 aspect-[4/3] w-full px-[6%] pb-brand-6 lg:absolute lg:inset-y-0 lg:right-0 lg:mt-0 lg:aspect-auto lg:w-1/2 lg:px-0 lg:pb-0">
        <div className="relative h-full w-full overflow-hidden rounded-v4-panel lg:rounded-none">
          <Image
            src={heroImage}
            alt="Nowoczesny, dwukondygnacyjny dom modułowy o zmierzchu, z oświetlonym wnętrzem i tarasem"
            fill
            priority
            sizes="(min-width: 1024px) 50vw, 100vw"
            className="object-cover"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-t from-brand-v4-night-deep/40 via-transparent to-transparent"
          />
        </div>
        {/* Blends the image's left edge into the text panel so the two
            halves read as one continuous band instead of a hard seam. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-0 hidden w-1/4 bg-gradient-to-r from-brand-v4-night to-transparent lg:block"
        />
      </div>
    </section>
  );
}
