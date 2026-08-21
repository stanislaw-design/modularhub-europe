import { Clock, FileCheck2, Scale, ShieldCheck } from "lucide-react";
import { Container } from "@/components/ui";

const benefits = [
  {
    icon: Scale,
    title: "Porównuj wygodnie",
    description: "Porównaj ceny, specyfikacje i terminy dostawy od producentów.",
  },
  {
    icon: ShieldCheck,
    title: "100% przejrzystości",
    description: "Brak ukrytych kosztów. Zero niespodzianek.",
  },
  {
    icon: FileCheck2,
    title: "Compliance Engine™",
    description: "Sprawdzamy zgodność z przepisami w Twoim kraju.",
  },
  {
    icon: Clock,
    title: "Oszczędzaj czas i pieniądze",
    description: "Otrzymuj wiele ofert dopasowanych do Ciebie w 48 godzin.",
  },
];

// The "Jak to działa" anchor target is the closing CTA's numbered explainer
// (ClosingCta.tsx, id="jak-to-dziala") — this button and SiteHeader's nav
// link both point there (spec 0014 AC-1, AC-7, AC-9).
export function WhyUs() {
  return (
    <section className="full-bleed bg-brand-v4-surface py-brand-5">
      <Container className="grid grid-cols-1 gap-brand-5 lg:grid-cols-12">
        <div className="flex flex-col items-start gap-brand-3 lg:col-span-4">
          <span className="text-label font-semibold tracking-[0.1em] text-brand-v4-amber">
            Dlaczego ModularHub Europe?
          </span>
          <h2 className="text-h2 font-display font-semibold text-brand-v4-ink">
            Wszystko, czego potrzebujesz w jednej platformie
          </h2>
          <p className="text-body-l text-brand-v4-muted">
            Upraszczamy proces wyszukiwania, porównywania i zakupu domów modułowych i
            prefabrykowanych w całej Europie.
          </p>
          <a
            href="#jak-to-dziala"
            className="focus-ring inline-flex items-center rounded-v4-pill bg-brand-v4-ink px-brand-4 py-brand-2 text-body font-semibold text-brand-v4-surface hover:opacity-90"
          >
            Dowiedz się, jak to działa
          </a>
        </div>
        <div className="grid grid-cols-1 gap-brand-3 sm:grid-cols-2 lg:col-span-8">
          {benefits.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="flex flex-col items-start gap-brand-2 rounded-v4-card border border-brand-v4-line p-brand-3"
            >
              <span className="flex size-11 items-center justify-center rounded-full bg-brand-v4-paper">
                <Icon className="size-5 text-brand-v4-ink" aria-hidden="true" />
              </span>
              <h3 className="text-body-l font-semibold text-brand-v4-ink">{title}</h3>
              <p className="text-body text-brand-v4-muted">{description}</p>
            </div>
          ))}
        </div>
      </Container>
    </section>
  );
}
