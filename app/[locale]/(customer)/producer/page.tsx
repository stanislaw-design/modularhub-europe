import { ArrowRight, Phone } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Button } from "@/components/ui";

// Telefon do rozmowy z producentem: Stanisław, podany wprost przez niego do
// publikacji na tej stronie (2026-11-21).
const CALL_PHONE_HREF = "tel:+48505753683";

// Boczny odstęp każdej sekcji, ten sam co w SiteHeader, żeby tekst stał w linii z logo.
const EDGE = "px-4 sm:px-6 lg:px-10";

// Linie podziału siatki liczb: 2 kolumny na telefonie, 4 od lg.
const STAT_CELL_BORDERS = [
  "",
  "border-l pl-brand-4",
  "border-t lg:border-t-0 lg:border-l lg:pl-brand-4",
  "border-t border-l pl-brand-4 lg:border-t-0",
];

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "ProducentPage" });
  return {
    title: { absolute: t("metaTitle") },
    description: t("metaDescription"),
    alternates: { canonical: `/${locale}/producer` },
  };
}

// Nadtytuł sekcji. Na jasnym tle tekst w kolorze muted z bursztynową kropką
// (sam bursztyn na bieli ma za mały kontrast dla tekstu), na ciemnym bursztyn.
function Eyebrow({ children, onDark = false }: { children: string; onDark?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-brand-1 text-label font-semibold uppercase tracking-[0.14em] ${
        onDark ? "text-brand-v5-amber" : "text-brand-v5-muted"
      }`}
    >
      <span aria-hidden="true" className="size-1.5 rounded-full bg-brand-v5-amber" />
      {children}
    </span>
  );
}

// Strona /producer: strona dla producentów, która ma ich pozyskiwać (brak
// producentów jest dziś wąskim gardłem, nie brak zleceń). Copy ustalone z
// użytkownikiem 2026-11-21: krótko, konkretnie, liczby z prawdziwych zleceń.
// Żyje w grupie (customer), żeby mieć ten sam nagłówek, stopkę i tryb ciemny
// co reszta publicznej strony. Nie czyta sesji (szkielet (customer) jest
// prerenderowany, spec 0078), więc zalogowany producent widzi ją jak gość;
// do panelu prowadzi go menu nagłówka.
// Kolory: v5-ink/surface/muted/line odwracają się w trybie ciemnym, a
// v5-night/v5-paper zostają stałe (ciemne sekcje i tekst na zdjęciu).
export default async function ProducentPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("ProducentPage");

  const registerHref = `/${locale}/registration?role=producer`;
  const loginHref = `/${locale}/login?callbackUrl=${encodeURIComponent(`/${locale}/producer/panel`)}`;

  const stats = [1, 2, 3, 4].map((n) => ({ value: t(`stat${n}Value`), label: t(`stat${n}Label`) }));
  const timePoints = [1, 2, 3, 4].map((n) => ({ title: t(`time${n}Title`), body: t(`time${n}Body`) }));
  const products = [1, 2, 3, 4, 5].map((n) => t(`whoProduct${n}`));
  const steps = [1, 2, 3, 4].map((n) => ({ title: t(`step${n}Title`), body: t(`step${n}Body`) }));
  const faq = [1, 2, 3].map((n) => ({ question: t(`faq${n}Question`), answer: t(`faq${n}Answer`) }));

  return (
    <div className="producer-wide flex flex-col">
      {/* Hero: zdjęcie hali, nagłówek na dole po lewej. Tekst w tej samej linii co logo
          (EDGE), tak jak hero strony głównej. */}
      <section className="relative isolate flex min-h-[600px] flex-col justify-end overflow-hidden pt-28 pb-brand-6 text-brand-v5-paper lg:min-h-[min(760px,88vh)] lg:pb-brand-7">
        <Image
          src="/images/producer/hala.webp"
          alt=""
          fill
          priority
          sizes="100vw"
          className="-z-10 object-cover"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-[linear-gradient(to_top,rgba(10,12,16,0.9)_0%,rgba(10,12,16,0.45)_45%,transparent_78%),linear-gradient(to_right,rgba(10,12,16,0.6)_0%,transparent_62%)]"
        />
        <div className={`flex w-full flex-col items-start gap-brand-4 ${EDGE}`}>
          <h1 className="max-w-[14ch] font-display text-[clamp(2.75rem,7vw,6.25rem)] leading-[0.94] font-bold tracking-[-0.045em] text-balance [text-shadow:0_2px_24px_rgba(0,0,0,0.35)]">
            {t("heroTitle")}
          </h1>
          <p className="max-w-[44ch] text-[clamp(1.0625rem,1.4vw,1.3125rem)] leading-relaxed text-brand-v5-paper/85">
            {t("heroBody")}
          </p>
          <div className="mt-brand-1 flex flex-wrap items-center gap-x-brand-4 gap-y-brand-2">
            <Button as="a" href={registerHref} surface="v5" size="lg" className="rounded-v5-pill shadow-[0_10px_30px_-10px_rgba(255,170,0,0.6)]">
              {t("heroCta")}
              <ArrowRight className="size-5" aria-hidden="true" />
            </Button>
            <Link
              href={loginHref}
              className="focus-ring rounded-data text-body text-brand-v5-paper/75 underline decoration-brand-v5-paper/30 underline-offset-4 transition-colors hover:text-brand-v5-paper hover:decoration-brand-v5-paper"
            >
              {t("loginPrompt")}
            </Link>
          </div>
        </div>
      </section>

      {/* Popyt: układ redakcyjny (nagłówek | tekst), pod nim liczby w siatce z
          liniami podziału. Bursztynowa kreska nad liczbą to jedyny akcent. */}
      <section aria-labelledby="producer-demand" className={`py-brand-7 lg:py-28 ${EDGE}`}>
        <div className="grid grid-cols-1 gap-brand-4 lg:grid-cols-12 lg:items-end">
          <div className="flex flex-col gap-brand-3 lg:col-span-7">
            <Eyebrow>{t("demandEyebrow")}</Eyebrow>
            <h2
              id="producer-demand"
              className="font-display text-[clamp(2rem,3.6vw,3.25rem)] leading-[1.02] font-bold tracking-[-0.03em] text-balance"
            >
              {t("demandHeading")}
            </h2>
          </div>
          <p className="text-body-l text-brand-v5-muted lg:col-span-5">{t("demandBody")}</p>
        </div>
        <dl className="mt-brand-6 grid grid-cols-2 border-y border-brand-v5-line lg:grid-cols-4">
          {stats.map((stat, index) => (
            <div
              key={stat.label}
              className={`flex flex-col gap-brand-2 border-brand-v5-line py-brand-5 pr-brand-3 ${STAT_CELL_BORDERS[index]}`}
            >
              {/* Bursztynowa kreska jako ::before liczby: w <dl> wolno mieć tylko dt/dd. */}
              <dd className="order-1 font-display text-[clamp(2.75rem,5.5vw,4.75rem)] leading-none font-bold tracking-[-0.04em] before:mb-brand-3 before:block before:h-0.5 before:w-8 before:rounded-full before:bg-brand-v5-amber before:content-['']">
                {stat.value}
              </dd>
              <dt className="order-2 text-body text-brand-v5-muted">{stat.label}</dt>
            </div>
          ))}
        </dl>
      </section>

      {/* Czas: główna obawa producentów to marnowanie czasu na wyceny bez szans.
          Karty z dużą numeracją, nagłówek przyklejony po lewej na desktopie. */}
      <section
        aria-labelledby="producer-time"
        className={`bg-brand-v5-night py-brand-7 text-brand-v5-paper lg:py-28 ${EDGE}`}
      >
        <div className="grid w-full grid-cols-1 gap-brand-6 lg:grid-cols-12">
          <div className="flex flex-col gap-brand-3 lg:sticky lg:top-28 lg:col-span-4 lg:self-start">
            <Eyebrow onDark>{t("timeEyebrow")}</Eyebrow>
            <h2
              id="producer-time"
              className="font-display text-[clamp(2rem,3.6vw,3.25rem)] leading-[1.02] font-bold tracking-[-0.03em] text-balance"
            >
              {t("timeHeading")}
            </h2>
          </div>
          <ol className="grid list-none grid-cols-1 gap-brand-3 sm:grid-cols-2 lg:col-span-8">
            {timePoints.map((point, index) => (
              <li
                key={point.title}
                className="group flex flex-col gap-brand-2 rounded-v5-panel border border-brand-v5-paper/10 bg-brand-v5-paper/[0.04] p-brand-4 transition-colors hover:border-brand-v5-amber/40 hover:bg-brand-v5-paper/[0.07]"
              >
                <span aria-hidden="true" className="font-mono text-body font-semibold text-brand-v5-amber">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h3 className="text-h3 font-semibold tracking-tight text-balance">{point.title}</h3>
                <p className="text-body text-brand-v5-paper/70">{point.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Cena i dla kogo: dwa panele. Cena jako mocne zdanie na ciemnym
          bursztynie nie wyjdzie czytelnie, więc panel ceny jest jasny z dużą
          typografią, a „dla kogo” to panel z kategoriami. */}
      <section className={`grid grid-cols-1 gap-brand-3 py-brand-7 lg:grid-cols-12 lg:py-28 ${EDGE}`}>
        <div className="flex flex-col justify-between gap-brand-5 rounded-v5-panel border border-brand-v5-line bg-brand-v5-surface p-brand-5 lg:col-span-7 lg:p-brand-6">
          <h2 className="font-display text-[clamp(2.25rem,4.4vw,4rem)] leading-[0.98] font-bold tracking-[-0.04em] text-balance">
            {t("priceHeading")}
          </h2>
          <p className="max-w-[46ch] text-body-l text-brand-v5-muted">{t("priceBody")}</p>
        </div>
        <div className="flex flex-col gap-brand-4 rounded-v5-panel bg-brand-v5-night p-brand-5 text-brand-v5-paper lg:col-span-5 lg:p-brand-6">
          <div className="flex flex-col gap-brand-2">
            <h2 className="font-display text-h2 font-bold tracking-tight text-balance">{t("whoHeading")}</h2>
            <p className="text-body-l text-brand-v5-paper/70">{t("whoBody")}</p>
          </div>
          <ul className="mt-auto flex list-none flex-wrap gap-brand-1">
            {products.map((product, index) => (
              <li
                key={product}
                className={`rounded-v5-pill px-brand-2 py-1.5 text-body font-medium ${
                  index === products.length - 1
                    ? "text-brand-v5-paper/60"
                    : "border border-brand-v5-paper/20 text-brand-v5-paper"
                }`}
              >
                {product}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Jak to działa: oś z linią łączącą kroki (od lg), zgodna z procesem 0070. */}
      <section aria-labelledby="producer-steps" className={EDGE}>
        <div className="flex flex-col gap-brand-3 border-t border-brand-v5-line pt-brand-7 lg:pt-28">
          <Eyebrow>{t("stepsEyebrow")}</Eyebrow>
          <h2
            id="producer-steps"
            className="font-display text-[clamp(2rem,3.6vw,3.25rem)] leading-[1.02] font-bold tracking-[-0.03em]"
          >
            {t("stepsHeading")}
          </h2>
        </div>
        <ol className="relative mt-brand-6 grid list-none grid-cols-1 gap-brand-5 sm:grid-cols-2 lg:grid-cols-4 lg:gap-brand-4">
          <span
            aria-hidden="true"
            className="absolute top-6 right-[12.5%] left-6 hidden h-px bg-brand-v5-line lg:block"
          />
          {steps.map((step, index) => (
            <li key={step.title} className="relative flex flex-col gap-brand-2">
              <span
                aria-hidden="true"
                className={`flex size-12 items-center justify-center rounded-full font-mono text-body-l font-semibold ring-8 ring-background ${
                  index === steps.length - 1
                    ? "bg-brand-v5-amber text-brand-v5-amber-foreground"
                    : "border border-brand-v5-line bg-brand-v5-surface text-brand-v5-ink"
                }`}
              >
                {index + 1}
              </span>
              <h3 className="mt-brand-2 text-h3 font-semibold tracking-tight">{step.title}</h3>
              <p className="max-w-[30ch] text-body text-brand-v5-muted">{step.body}</p>
            </li>
          ))}
        </ol>
        <div className="pb-brand-7 lg:pb-28" />
      </section>

      {/* FAQ: natywne details/summary, działa bez JS i z klawiatury. */}
      <section aria-labelledby="producer-faq" className={EDGE}>
        <div className="grid grid-cols-1 gap-brand-5 border-t border-brand-v5-line py-brand-7 lg:grid-cols-12 lg:py-28">
          <div className="flex flex-col gap-brand-3 lg:col-span-4">
            <Eyebrow>{t("faqEyebrow")}</Eyebrow>
            <h2
              id="producer-faq"
              className="font-display text-[clamp(2rem,3.6vw,3.25rem)] leading-[1.02] font-bold tracking-[-0.03em]"
            >
              {t("faqHeading")}
            </h2>
          </div>
          <div className="flex flex-col border-t border-brand-v5-line lg:col-span-8">
            {faq.map((item) => (
              <details key={item.question} className="group border-b border-brand-v5-line">
                <summary className="focus-ring flex cursor-pointer list-none items-center justify-between gap-brand-3 rounded-data py-brand-4 text-body-l font-semibold transition-colors hover:text-brand-v5-muted [&::-webkit-details-marker]:hidden">
                  {item.question}
                  <span
                    aria-hidden="true"
                    className="flex size-9 shrink-0 items-center justify-center rounded-full border border-brand-v5-line text-h3 leading-none font-normal transition-transform duration-300 group-open:rotate-45 group-open:border-brand-v5-amber group-open:bg-brand-v5-amber group-open:text-brand-v5-amber-foreground"
                  >
                    +
                  </span>
                </summary>
                <p className="max-w-[60ch] pb-brand-4 text-body-l text-brand-v5-muted">{item.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Zamknięcie: to samo zdjęcie hali co w hero, ciemniej, jako klamra strony. */}
      <section className={`relative isolate overflow-hidden bg-brand-v5-night py-brand-7 text-brand-v5-paper lg:py-28 ${EDGE}`}>
        <Image src="/images/producer/hala.webp" alt="" fill sizes="100vw" className="-z-10 object-cover opacity-30" />
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-[linear-gradient(to_right,rgba(10,12,16,0.95)_0%,rgba(10,12,16,0.75)_55%,rgba(10,12,16,0.5)_100%)]"
        />
        <div className="flex w-full flex-col items-start gap-brand-5">
          <h2 className="max-w-[16ch] font-display text-[clamp(2.5rem,5.5vw,5rem)] leading-[0.96] font-bold tracking-[-0.045em] text-balance">
            {t("closingHeading")}
          </h2>
          <div className="flex flex-wrap items-center gap-brand-3">
            <Button as="a" href={registerHref} surface="v5" size="lg" className="rounded-v5-pill shadow-[0_10px_30px_-10px_rgba(255,170,0,0.6)]">
              {t("heroCta")}
              <ArrowRight className="size-5" aria-hidden="true" />
            </Button>
            <a
              href={CALL_PHONE_HREF}
              className="focus-ring inline-flex min-h-12 items-center gap-brand-2 rounded-v5-pill border border-brand-v5-paper/30 py-1.5 pr-brand-4 pl-1.5 text-body-l font-medium text-brand-v5-paper transition-colors hover:border-brand-v5-amber"
            >
              <span className="flex size-9 items-center justify-center rounded-full bg-brand-v5-paper/10">
                <Phone className="size-4" aria-hidden="true" />
              </span>
              <span className="flex flex-col leading-tight">
                <span>{t("callCta")}</span>
                <span className="text-data font-normal text-brand-v5-paper/70">{t("callPerson")}</span>
              </span>
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}
