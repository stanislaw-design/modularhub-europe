import Image from "next/image";

const steps = [
  {
    number: "1",
    title: "Powiedz nam, czego potrzebujesz",
    description: "Odpowiedz na kilka pytań o Twój wymarzony dom.",
  },
  {
    number: "2",
    title: "Dobieramy najlepszych producentów",
    description: "Wybieramy sprawdzonych producentów dopasowanych do Twojego projektu.",
  },
  {
    number: "3",
    title: "Otrzymujesz oferty",
    description: "Otrzymujesz oferty i wybierasz najlepszą opcję dla siebie.",
  },
];

// id="jak-to-dziala" is the anchor target for SiteHeader's "Jak to działa"
// link and WhyUs's "Dowiedz się, jak to działa" button (spec 0014 AC-1,
// AC-7, AC-9). "Otrzymaj darmowe oferty" scrolls back up to the search card
// rather than starting a new flow — the "3 dopasowane oferty" promise isn't
// built yet (see spec 0014 rationale.md); redirecting to a working search is
// an honest substitute, not a literal fulfilment of the headline's promise.
export function ClosingCta() {
  return (
    <section
      id="jak-to-dziala"
      className="full-bleed relative overflow-hidden bg-brand-v4-night py-brand-6 text-brand-v4-surface scroll-mt-brand-4"
    >
      <Image
        src="/images/houses/golden-hour/karpaty-ridge-72.webp"
        alt=""
        fill
        sizes="100vw"
        className="object-cover opacity-25"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-r from-brand-v4-night via-brand-v4-night/85 to-brand-v4-night/40"
      />
      <div className="relative mx-auto grid w-full max-w-brand-max grid-cols-1 gap-brand-5 px-[6%] lg:grid-cols-12">
        <div className="flex flex-col items-start gap-brand-3 lg:col-span-5">
          <span className="text-label font-semibold tracking-[0.1em] text-brand-v4-amber">
            Nie wiesz, od czego zacząć?
          </span>
          <h2 className="text-h2 font-display font-bold text-balance">
            Otrzymaj 3 dopasowane oferty w 48 godzin
          </h2>
          <p className="text-body-l text-brand-v4-mist">
            Powiedz nam, czego potrzebujesz, a my przejrzymy dla Ciebie spersonalizowane oferty od
            najlepszych producentów.
          </p>
          <a
            href="#search-card"
            className="focus-ring inline-flex items-center rounded-v4-pill bg-brand-v4-amber px-brand-4 py-brand-2 text-body font-semibold text-brand-v4-amber-foreground hover:bg-brand-v4-amber-strong"
          >
            Otrzymaj darmowe oferty
          </a>
        </div>
        <ol className="flex list-none flex-col gap-brand-3 lg:col-span-7">
          {steps.map((step) => (
            <li
              key={step.number}
              className="flex items-start gap-brand-3 rounded-v4-card border border-brand-v4-line-dark bg-brand-v4-night-deep/60 p-brand-3"
            >
              <span
                aria-hidden="true"
                className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-v4-amber font-mono text-body font-semibold text-brand-v4-amber-foreground"
              >
                {step.number}
              </span>
              <div className="flex flex-col gap-1">
                <h3 className="text-body-l font-semibold text-brand-v4-surface">{step.title}</h3>
                <p className="text-body text-brand-v4-mist">{step.description}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
