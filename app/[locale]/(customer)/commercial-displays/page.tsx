import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import {
  ArrowRight,
  Building2,
  Droplets,
  Hotel,
  ClipboardList,
  Monitor,
  MonitorSmartphone,
  ShieldCheck,
  Signpost,
  Sun,
  Thermometer,
  Trees,
  UtensilsCrossed,
  Waves,
  type LucideIcon,
} from "lucide-react";
import { CommercialDisplayInquiryForm } from "@/components/klient/CommercialDisplayInquiryForm";
import { Container, Heading, Text } from "@/components/ui";
import { getCountries } from "@/lib/data/countries";
import type { Locale } from "@/lib/i18n/routing";
import { routing } from "@/lib/i18n/routing";

type PageParams = { locale: string };

const IMG = "/images/outdoor-tv/commercial";
const VIDEO_DIR = "/videos/outdoor-tv";
const VIDEO = `${VIDEO_DIR}/commercial-showcase`;

// Etykiety w języku własnym, bo użytkownik wybiera ścieżkę w menu odtwarzacza niezależnie od języka strony.
const CAPTION_TRACKS = [
  { lang: "pl", label: "Polski" },
  { lang: "en", label: "English" },
  { lang: "de", label: "Deutsch" },
  { lang: "nl", label: "Nederlands" },
] as const;

export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "CommercialDisplaysPage" });
  const canonicalPath = `/${locale}/commercial-displays`;

  const languageAlternates = Object.fromEntries(
    routing.locales.map((code) => [code, `/${code}/commercial-displays`]),
  );

  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    alternates: {
      canonical: canonicalPath,
      languages: { ...languageAlternates, "x-default": `/${routing.defaultLocale}/commercial-displays` },
    },
    openGraph: {
      title: t("metaTitle"),
      description: t("metaDescription"),
      url: canonicalPath,
      images: [{ url: `${IMG}/hero.webp` }],
    },
  };
}

// Dane z posteru MirageVision z 2026-10-06 (wyświetlacze IP66). Celowo pominięte pola, w których
// źródła się rozjeżdżają (pobór mocy 32″ i 86″, gwarancja, jasność 86″ podana jako "3000+").
// Waga w kg przeliczona z funtów z posteru. Wartości są orientacyjne, dokładne daje oferta.
const DISPLAY_ROWS = [
  { size: "22″", resolution: "Full HD", brightness: "1500", weight: "11", vesa: "200×200", versions: "versionAndroid" },
  { size: "27″", resolution: "Full HD", brightness: "1500", weight: "15", vesa: "200×200", versions: "versionAndroid" },
  { size: "32″", resolution: "Full HD", brightness: "2000", weight: "20", vesa: "300×200", versions: "versionAndroid" },
  { size: "55″", resolution: "Full HD", brightness: "2500", weight: "48", vesa: "400×200", versions: "versionAndroidHdmiTouch" },
  { size: "75″", resolution: "4K UHD", brightness: "3000", weight: "86", vesa: "1410×600", versions: "versionAndroidHdmi" },
  { size: "86″", resolution: "4K UHD", brightness: "3000+", weight: "150", vesa: "1410×600", versions: "versionAndroidHdmi" },
] as const;

function IconBadge({ icon: Icon, tone = "night" }: { icon: LucideIcon; tone?: "night" | "glass" }) {
  return (
    <span
      aria-hidden="true"
      className={`flex size-11 shrink-0 items-center justify-center rounded-full text-brand-v5-amber ${
        tone === "glass" ? "bg-black/45 backdrop-blur-sm" : "bg-brand-v5-night"
      }`}
    >
      <Icon className="size-5" aria-hidden="true" />
    </span>
  );
}

// Strona sprzedażowa z formularzem zapytania (spec 0083): przyciski "Zapytaj o wycenę" przewijają do
// sekcji #zapytanie, a zgłoszenie zapisuje akcja submitCommercialDisplayInquiry.
// v5-night i v5-paper zostają stałe w obu motywach (spec 0043), więc pasy ze zdjęciami wyglądają tak samo
// w jasnym i ciemnym motywie.
export default async function CommercialDisplaysPage({ params }: { params: Promise<PageParams> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "CommercialDisplaysPage" });

  const countries = await getCountries(locale as Locale);
  const inquiryHref = "#zapytanie";
  const gardenTvHref = `/${locale}/results?family=outdoor-tv`;

  const stats = [
    { icon: Sun, value: t("statBrightnessValue"), label: t("statBrightnessLabel") },
    { icon: Droplets, value: t("statProtectionValue"), label: t("statProtectionLabel") },
    { icon: Thermometer, value: t("statTempValue"), label: t("statTempLabel") },
    { icon: ShieldCheck, value: t("statGlassValue"), label: t("statGlassLabel") },
  ];

  const families = [
    {
      icon: Monitor,
      title: t("familyDisplaysTitle"),
      text: t("familyDisplaysText"),
      meta: t("familyDisplaysMeta"),
      image: `${IMG}/showroom-displays.webp`,
      alt: t("familyDisplaysImageAlt"),
      position: "object-center",
    },
    {
      icon: Signpost,
      title: t("familySignageTitle"),
      text: t("familySignageText"),
      meta: t("familySignageMeta"),
      image: `${IMG}/signage-snow.webp`,
      alt: t("familySignageImageAlt"),
      position: "object-[50%_30%]",
    },
    {
      icon: MonitorSmartphone,
      title: t("familyLedTitle"),
      text: t("familyLedText"),
      meta: t("familyLedMeta"),
      image: `${IMG}/cinema-led-wall.webp`,
      alt: t("familyLedImageAlt"),
      position: "object-center",
    },
  ];

  const useCases = [
    {
      icon: Hotel,
      title: t("useHotelsTitle"),
      text: t("useHotelsText"),
      image: `${IMG}/resort-garden.webp`,
      position: "object-[50%_62%]",
      span: "lg:col-span-7",
    },
    {
      icon: UtensilsCrossed,
      title: t("useRestaurantsTitle"),
      text: t("useRestaurantsText"),
      image: `${IMG}/restaurant-bar.webp`,
      position: "object-center",
      span: "lg:col-span-5",
    },
    {
      icon: Waves,
      title: t("usePoolsTitle"),
      text: t("usePoolsText"),
      image: `${IMG}/pool-terrace-led-wall.webp`,
      position: "object-[50%_30%]",
      span: "lg:col-span-4",
    },
    {
      icon: Building2,
      title: t("useResidentialTitle"),
      text: t("useResidentialText"),
      image: `${IMG}/rooftop-led-wall.webp`,
      position: "object-[50%_55%]",
      span: "lg:col-span-4",
    },
    {
      icon: Trees,
      title: t("useGardensTitle"),
      text: t("useGardensText"),
      image: `${IMG}/fireplace-patio.webp`,
      position: "object-center",
      span: "lg:col-span-4",
    },
  ];

  const reasons = [
    { title: t("whyBrightTitle"), text: t("whyBrightText") },
    { title: t("whySealedTitle"), text: t("whySealedText") },
    { title: t("whyToughTitle"), text: t("whyToughText") },
    { title: t("whyRemoteTitle"), text: t("whyRemoteText") },
  ];

  const steps = [
    { title: t("step1Title"), text: t("step1Text") },
    { title: t("step2Title"), text: t("step2Text") },
    { title: t("step3Title"), text: t("step3Text") },
  ];

  return (
    <div className="flex flex-col gap-brand-7 pb-brand-7">
      {/* Hero na całą szerokość: zdjęcie jest pionowe, więc na komputerze kadr wycina środek z pergolą i ekranem. */}
      <section className="full-bleed relative isolate overflow-hidden bg-brand-v5-night text-brand-v5-paper">
        <Image
          src={`${IMG}/hero.webp`}
          alt={t("heroImageAlt")}
          fill
          priority
          sizes="100vw"
          className="-z-20 object-cover object-[50%_48%]"
        />
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-r from-black/80 via-black/40 to-black/5" />
        <div aria-hidden="true" className="absolute inset-x-0 bottom-0 -z-10 h-2/3 bg-gradient-to-t from-black/80 to-transparent" />
        <Container className="flex min-h-[36rem] flex-col justify-between gap-brand-6 py-brand-6 lg:min-h-[46rem]">
          <div className="flex max-w-3xl flex-col items-start gap-brand-3">
            <span className="text-label font-semibold uppercase tracking-[0.12em] text-brand-v5-amber">
              {t("eyebrow")}
            </span>
            <h1 className="font-display text-[2.5rem] font-semibold leading-[2.75rem] text-balance sm:text-h1 lg:text-[3.75rem] lg:leading-[4rem]">
              {t("heading")}
            </h1>
            <p className="max-w-2xl text-body-l text-brand-v5-paper/85">{t("lead")}</p>
            <div className="mt-brand-1 flex flex-wrap gap-brand-2">
              <a
                href={inquiryHref}
                className="focus-ring inline-flex h-12 items-center gap-brand-1 rounded-v5-pill bg-brand-v5-amber px-brand-4 text-body-l font-semibold text-brand-v5-amber-foreground hover:bg-brand-v5-amber-strong"
              >
                <ClipboardList className="size-5" aria-hidden="true" />
                {t("ctaPrimary")}
              </a>
              <Link
                href={gardenTvHref}
                className="focus-ring inline-flex h-12 items-center gap-brand-1 rounded-v5-pill border border-white/40 bg-black/25 px-brand-4 text-body-l font-medium text-brand-v5-paper backdrop-blur-sm hover:bg-black/45"
              >
                {t("ctaSecondary")}
                <ArrowRight className="size-5" aria-hidden="true" />
              </Link>
            </div>
          </div>
          <ul aria-label={t("statsAriaLabel")} className="grid list-none grid-cols-2 gap-brand-2 lg:grid-cols-4">
            {stats.map((stat) => (
              <li
                key={stat.value}
                className="flex items-center gap-brand-2 rounded-v5-card border border-white/15 bg-black/40 p-brand-2 backdrop-blur-md sm:p-brand-3"
              >
                <IconBadge icon={stat.icon} tone="glass" />
                <div className="flex min-w-0 flex-col">
                  <span className="font-display text-body-l font-semibold sm:text-h3">{stat.value}</span>
                  <span className="text-label text-brand-v5-paper/75 sm:text-data">{stat.label}</span>
                </div>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      {/* Film produktowy */}
      <section className="full-bleed bg-brand-v5-night py-brand-6 text-brand-v5-paper">
        <Container className="grid grid-cols-1 items-center gap-brand-5 lg:grid-cols-12">
          <div className="flex flex-col gap-brand-2 lg:col-span-4">
            <h2 className="font-display text-h2 font-semibold text-balance">{t("videoHeading")}</h2>
            <p className="text-body-l text-brand-v5-paper/80">{t("videoText")}</p>
            <p className="text-data text-brand-v5-paper/65">{t("videoCaptionsHint")}</p>
          </div>
          <div className="overflow-hidden rounded-v5-panel border border-white/15 bg-black shadow-2xl lg:col-span-8">
            <video
              className="aspect-video w-full"
              controls
              playsInline
              preload="metadata"
              poster={`${VIDEO}-poster.webp`}
              aria-label={t("videoAriaLabel")}
            >
              <source src={`${VIDEO}.webm`} type="video/webm" />
              <source src={`${VIDEO}.mp4`} type="video/mp4" />
              {/* Narracja jest po angielsku, więc angielska ścieżka to napisy dla niesłyszących, reszta to tłumaczenia.
                  Domyślnie włączona jest ścieżka zgodna z językiem strony. */}
              {CAPTION_TRACKS.map((track) => (
                <track
                  key={track.lang}
                  kind={track.lang === "en" ? "captions" : "subtitles"}
                  src={`${VIDEO_DIR}/captions/commercial-showcase.${track.lang}.vtt`}
                  srcLang={track.lang}
                  label={track.label}
                  default={track.lang === locale}
                />
              ))}
              {t("videoFallback")}
            </video>
          </div>
        </Container>
      </section>

      {/* Trzy rodziny rozwiązań: wiersze ze zdjęciami na przemian */}
      <Container className="flex flex-col gap-brand-6">
        <div className="flex flex-col gap-1">
          <Heading level="h2" surface="v5">
            {t("familiesHeading")}
          </Heading>
          <Text surface="v5" tone="muted">
            {t("familiesIntro")}
          </Text>
        </div>
        {families.map((family, index) => (
          <article key={family.title} className="grid grid-cols-1 items-center gap-brand-4 lg:grid-cols-12 lg:gap-brand-6">
            <div
              className={`relative aspect-[16/11] overflow-hidden rounded-v5-panel lg:col-span-7 ${
                index % 2 === 1 ? "lg:order-2" : ""
              }`}
            >
              <Image
                src={family.image}
                alt={family.alt}
                fill
                sizes="(min-width: 1024px) 58vw, 100vw"
                className={`object-cover ${family.position}`}
              />
            </div>
            <div className="flex flex-col items-start gap-brand-2 lg:col-span-5">
              <IconBadge icon={family.icon} />
              <Heading level="h3" surface="v5">
                {family.title}
              </Heading>
              <Text surface="v5">{family.text}</Text>
              <span className="mt-1 inline-flex rounded-v5-pill border border-brand-v5-line px-brand-3 py-1 text-data font-medium text-brand-v5-muted">
                {family.meta}
              </span>
            </div>
          </article>
        ))}
      </Container>

      {/* Zastosowania: mozaika zdjęć z podpisami */}
      <Container className="flex flex-col gap-brand-4">
        <div className="flex flex-col gap-1">
          <Heading level="h2" surface="v5">
            {t("useCasesHeading")}
          </Heading>
          <Text surface="v5" tone="muted">
            {t("useCasesIntro")}
          </Text>
        </div>
        <ul className="grid list-none grid-cols-1 gap-brand-3 sm:grid-cols-2 lg:grid-cols-12">
          {useCases.map((useCase) => (
            <li
              key={useCase.title}
              className={`group relative isolate min-h-[19rem] overflow-hidden rounded-v5-card bg-brand-v5-night text-brand-v5-paper lg:min-h-[24rem] ${useCase.span}`}
            >
              <Image
                src={useCase.image}
                alt=""
                fill
                sizes="(min-width: 1024px) 50vw, (min-width: 640px) 50vw, 100vw"
                className={`-z-10 object-cover transition-transform duration-700 motion-safe:group-hover:scale-105 ${useCase.position}`}
              />
              <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-t from-black/85 via-black/25 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 flex flex-col gap-1 p-brand-4">
                <span className="flex items-center gap-brand-2">
                  <useCase.icon className="size-5 text-brand-v5-amber" aria-hidden="true" />
                  <h3 className="font-display text-h3 font-semibold">{useCase.title}</h3>
                </span>
                <p className="max-w-md text-body text-brand-v5-paper/85">{useCase.text}</p>
              </div>
            </li>
          ))}
        </ul>
      </Container>

      {/* Tabela rozmiarów */}
      <Container className="flex flex-col gap-brand-3">
        <div className="flex flex-col gap-1">
          <Heading level="h2" surface="v5">
            {t("specsHeading")}
          </Heading>
          <Text surface="v5" tone="muted">
            {t("specsIntro")}
          </Text>
        </div>
        <div className="overflow-x-auto rounded-v5-card border border-brand-v5-line">
          <table className="w-full min-w-[640px] border-collapse text-left text-body">
            <caption className="sr-only">{t("specsCaption")}</caption>
            <thead>
              <tr className="border-b border-brand-v5-line bg-brand-v5-line/40 text-data text-brand-v5-muted">
                <th scope="col" className="px-brand-3 py-brand-2 font-semibold">{t("colSize")}</th>
                <th scope="col" className="px-brand-3 py-brand-2 font-semibold">{t("colResolution")}</th>
                <th scope="col" className="px-brand-3 py-brand-2 font-semibold">{t("colBrightness")}</th>
                <th scope="col" className="px-brand-3 py-brand-2 font-semibold">{t("colWeight")}</th>
                <th scope="col" className="px-brand-3 py-brand-2 font-semibold">{t("colVesa")}</th>
                <th scope="col" className="px-brand-3 py-brand-2 font-semibold">{t("colVersions")}</th>
              </tr>
            </thead>
            <tbody>
              {DISPLAY_ROWS.map((row) => (
                <tr key={row.size} className="border-b border-brand-v5-line last:border-b-0">
                  <th scope="row" className="px-brand-3 py-brand-2 font-display font-semibold text-brand-v5-ink">
                    {row.size}
                  </th>
                  <td className="px-brand-3 py-brand-2 text-brand-v5-ink">{row.resolution}</td>
                  <td className="px-brand-3 py-brand-2 text-brand-v5-ink">{row.brightness} nit</td>
                  <td className="px-brand-3 py-brand-2 text-brand-v5-ink">{row.weight} kg</td>
                  <td className="px-brand-3 py-brand-2 text-brand-v5-ink">{row.vesa}</td>
                  <td className="px-brand-3 py-brand-2 text-brand-v5-ink">{t(row.versions)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Text surface="v5" tone="muted" className="text-data">
          {t("specsNote")}
        </Text>
      </Container>

      {/* Dlaczego outdoor */}
      <Container className="flex flex-col gap-brand-4">
        <Heading level="h2" surface="v5">
          {t("whyHeading")}
        </Heading>
        <ul className="grid list-none grid-cols-1 gap-brand-4 sm:grid-cols-2 lg:grid-cols-4">
          {reasons.map((reason) => (
            <li key={reason.title} className="flex flex-col gap-1 border-l-2 border-brand-v5-amber pl-brand-3">
              <Heading level="h3" surface="v5" className="text-body-l">
                {reason.title}
              </Heading>
              <Text surface="v5" tone="muted">
                {reason.text}
              </Text>
            </li>
          ))}
        </ul>
      </Container>

      {/* Jak wygląda zapytanie */}
      <Container className="flex flex-col gap-brand-4">
        <Heading level="h2" surface="v5">
          {t("stepsHeading")}
        </Heading>
        <ol className="grid list-none grid-cols-1 gap-brand-3 lg:grid-cols-3">
          {steps.map((step, index) => (
            <li
              key={step.title}
              className="flex items-start gap-brand-3 rounded-v5-card border border-brand-v5-line bg-brand-v5-surface p-brand-4"
            >
              <span
                aria-hidden="true"
                className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-v5-night font-mono text-body font-semibold text-brand-v5-amber"
              >
                {index + 1}
              </span>
              <div className="flex flex-col gap-1">
                <Heading level="h3" surface="v5" className="text-body-l">
                  {step.title}
                </Heading>
                <Text surface="v5" tone="muted">
                  {step.text}
                </Text>
              </div>
            </li>
          ))}
        </ol>
      </Container>

      {/* Zapytanie: formularz na tle zdjęcia. Cel przycisków "Zapytaj o wycenę". */}
      <section
        id="zapytanie"
        className="full-bleed relative isolate scroll-mt-16 overflow-hidden bg-brand-v5-night py-brand-7 text-brand-v5-paper"
      >
        <Image src={`${IMG}/home-cinema.webp`} alt="" fill sizes="100vw" className="-z-20 object-cover" />
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-r from-black/90 via-black/75 to-black/55" />
        <Container className="grid grid-cols-1 items-start gap-brand-5 lg:grid-cols-12">
          <div className="flex flex-col items-start gap-brand-3 lg:col-span-5">
            <h2 className="font-display text-h2 font-semibold text-balance">{t("ctaHeading")}</h2>
            <p className="text-body-l text-brand-v5-paper/80">{t("ctaBody")}</p>
            <ul className="flex list-none flex-col gap-brand-1 text-body text-brand-v5-paper/90">
              {[t("ctaPoint1"), t("ctaPoint2"), t("ctaPoint3")].map((point) => (
                <li key={point} className="flex items-center gap-brand-2">
                  <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-brand-v5-amber" />
                  {point}
                </li>
              ))}
            </ul>
            <Link
              href={gardenTvHref}
              className="focus-ring mt-brand-1 rounded-data text-body font-medium text-brand-v5-paper underline underline-offset-4"
            >
              {t("ctaCatalog")}
            </Link>
          </div>
          <div className="lg:col-span-7">
            <CommercialDisplayInquiryForm locale={locale} countries={countries} />
          </div>
        </Container>
      </section>
    </div>
  );
}
