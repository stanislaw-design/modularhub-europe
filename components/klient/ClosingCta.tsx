import { getTranslations } from "next-intl/server";
import Image from "next/image";

// id="jak-to-dziala" is the anchor target for SiteHeader's "Jak to działa"
// link and WhyUs's "Dowiedz się, jak to działa" button (spec 0014 AC-1,
// AC-7, AC-9). "Otrzymaj darmowe oferty" scrolls back up to the search card
// rather than starting a new flow — the "3 dopasowane oferty" promise isn't
// built yet (see spec 0014 rationale.md); redirecting to a working search is
// an honest substitute, not a literal fulfilment of the headline's promise.
export async function ClosingCta() {
  const t = await getTranslations("ClosingCta");
  const steps = [
    { number: "1", title: t("step1Title"), description: t("step1Description") },
    { number: "2", title: t("step2Title"), description: t("step2Description") },
    { number: "3", title: t("step3Title"), description: t("step3Description") },
  ];

  return (
    <section
      id="jak-to-dziala"
      className="full-bleed relative overflow-hidden bg-brand-v4-night py-brand-6 text-brand-v4-surface scroll-mt-brand-6"
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
            {t("eyebrow")}
          </span>
          <h2 className="text-h2 font-display font-bold text-balance">{t("heading")}</h2>
          <p className="text-body-l text-brand-v4-mist">{t("body")}</p>
          <a
            href="#search-card"
            className="focus-ring inline-flex items-center rounded-v4-pill bg-brand-v4-amber px-brand-4 py-brand-2 text-body font-semibold text-brand-v4-amber-foreground hover:bg-brand-v4-amber-strong"
          >
            {t("cta")}
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
