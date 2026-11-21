import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { getTranslations } from "next-intl/server";
import Image from "next/image";
import Link from "next/link";
import { Fragment, type ReactNode } from "react";
import { FeaturedProjectGallery } from "./FeaturedProjectGallery";
import { ModularProjectModelLoader } from "./ModularProjectModelLoader";
import { ModularProjectStatusBadge } from "./ModularProjectStatusBadge";
import { Container } from "@/components/ui";
import { MODULARPROJECT_GALLERY_GROUPS, type ResolvedModularProject } from "@/lib/data/modularprojects";
import { RouteWidthMarker } from "@/components/RouteWidthMarker";

const eyebrow = "text-label uppercase tracking-[0.08em]";
const CTA_BASE =
  "focus-ring group inline-flex w-fit items-center gap-1 rounded-v5-pill px-brand-3 py-2 text-data font-semibold transition-colors";
const CTA_PRIMARY = "bg-brand-v5-night text-brand-v5-paper hover:bg-brand-v5-night/85";
const CTA_SECONDARY = "border border-brand-v5-night/60 hover:bg-brand-v5-night/10";

// Link wewnętrzny w treści wpisu: [tekst](/modularprojects/slug), dostaje prefiks języka.
const INTERNAL_LINK = /\[([^\]]+)\]\((\/modularprojects(?:\/[a-z0-9-]+)?)\)/g;

function renderParagraph(paragraph: string, locale: string) {
  const parts: ReactNode[] = [];
  let last = 0;
  for (const match of paragraph.matchAll(INTERNAL_LINK)) {
    const index = match.index ?? 0;
    if (index > last) parts.push(paragraph.slice(last, index));
    parts.push(
      <Link
        key={index}
        href={`/${locale}${match[2]}`}
        className="focus-ring rounded-data font-semibold underline decoration-brand-v5-amber decoration-2 underline-offset-4 hover:text-brand-v5-amber-strong"
      >
        {match[1]}
      </Link>,
    );
    last = index + match[0].length;
  }
  if (last < paragraph.length) parts.push(paragraph.slice(last));
  return parts;
}

// Wpis w stylu bloga (spec 0076 AC-7): pełnoszerokie pasy (hero, fakty, opis, galerie, wezwanie do działania).
export async function ModularProjectArticle({ project, locale }: { project: ResolvedModularProject; locale: string }) {
  const t = await getTranslations({ locale, namespace: "ModularProjectPage" });
  const groups = MODULARPROJECT_GALLERY_GROUPS.map((group) => ({
    group,
    images: project.gallery.filter((image) => image.group === group),
  })).filter(({ images }) => images.length > 0);
  // Zapytanie otwarte (zbieramy oferty): więcej wezwań do producentów, żeby złożyli ofertę.
  const isOpen = project.status === "planned";
  const registrationHref = `/${locale}/producer/registration`;
  const boardHref = `/${locale}/producer/panel/board`;

  return (
    <article>
      <RouteWidthMarker name="modularproject-wide" />
      <section className="bg-brand-v5-night text-brand-v5-paper">
        <Container className="grid gap-brand-5 py-brand-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:items-center">
          <div className="flex flex-col items-start gap-brand-3">
            <Link
              href={`/${locale}/modularprojects`}
              className="focus-ring inline-flex items-center gap-1 rounded-data text-data font-semibold text-brand-v5-paper/80 underline hover:text-brand-v5-amber"
            >
              <ArrowLeft className="size-3.5" aria-hidden="true" />
              {t("backToList")}
            </Link>
            <ModularProjectStatusBadgeOnDark status={project.status} locale={locale} />
            <h1 className="font-display text-h1 font-semibold text-brand-v5-paper">{project.title}</h1>
            <p className="max-w-[60ch] text-body-l text-brand-v5-paper/80">{project.lead}</p>
            {isOpen ? <ProducerOfferLinks t={t} registrationHref={registrationHref} boardHref={boardHref} /> : null}
          </div>
          <div className="relative aspect-[4/3] overflow-hidden rounded-v5-panel">
            <Image
              src={project.cover.src}
              alt={project.cover.alt}
              fill
              priority
              sizes="(min-width: 1024px) 55vw, 100vw"
              className="object-cover"
            />
          </div>
        </Container>
      </section>

      <section aria-labelledby="mp-facts" className="bg-brand-v5-amber text-brand-v5-amber-foreground">
        <Container className="py-brand-5">
          <h2 id="mp-facts" className={`${eyebrow} mb-brand-3 opacity-80`}>
            {t("factsHeading")}
          </h2>
          <dl className="grid grid-cols-1 gap-x-brand-4 gap-y-brand-3 sm:grid-cols-2 lg:grid-cols-4">
            {project.facts.map((fact) => {
              const showInvestorLogo = project.slug === "cocoleisure" && fact.value === "CocoLeisure";

              return (
                <div key={fact.label} className="flex flex-col gap-0.5 border-t border-current/30 pt-2">
                  <dt className="text-data opacity-80">{fact.label}</dt>
                  {showInvestorLogo ? (
                    <dd className="mt-1 w-fit rounded-lg bg-white px-3 py-2 shadow-sm">
                      <Image
                        src="/images/modularprojects/cocoleisure/logo.webp"
                        alt={fact.value}
                        width={640}
                        height={312}
                        sizes="208px"
                        className="h-auto w-48 sm:w-52"
                      />
                    </dd>
                  ) : (
                    <dd className="text-h3 font-semibold">{fact.value}</dd>
                  )}
                </div>
              );
            })}
          </dl>
        </Container>
      </section>

      {project.sections.map((section, sectionIndex) => (
        <Fragment key={section.heading}>
          <section className="bg-brand-v5-surface">
            <Container className="grid gap-brand-3 py-brand-6 lg:grid-cols-[minmax(0,4fr)_minmax(0,7fr)] lg:gap-brand-6">
              <h2 className="font-display text-h2 font-semibold text-brand-v5-ink lg:sticky lg:top-[calc(var(--brand-space-6)+24px)] lg:self-start">
                {section.heading}
              </h2>
              <div className="flex flex-col gap-brand-3">
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph} className="max-w-[65ch] text-body-l text-brand-v5-ink">
                    {renderParagraph(paragraph, locale)}
                  </p>
                ))}
                {sectionIndex === 0 && project.model && (
                  <div className="mt-brand-3 flex flex-col gap-brand-2">
                    <h3 className="text-label uppercase tracking-[0.08em] text-brand-v5-muted">{t("modelHeading")}</h3>
                    <ModularProjectModelLoader
                      labels={{
                        alt: project.model.alt,
                        hint: t("modelHint"),
                        viewLabel: t("modelViewLabel"),
                        shell: t("modelShell"),
                        frame: t("modelFrame"),
                        unsupported: t("modelUnsupported"),
                      }}
                    />
                  </div>
                )}
              </div>
            </Container>
          </section>
          {isOpen && sectionIndex === 0 ? (
            <ProducerOfferBand t={t} registrationHref={registrationHref} boardHref={boardHref} />
          ) : null}
        </Fragment>
      ))}

      {groups.map(({ group, images }, index) => {
        const dark = index % 2 === 1;
        return (
          <section
            key={group}
            className={dark ? "bg-brand-v5-night text-brand-v5-paper" : "bg-brand-v5-surface text-brand-v5-ink"}
          >
            <Container className="grid gap-brand-3 py-brand-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,8fr)] lg:gap-brand-5">
              <div className="flex flex-col gap-1 lg:sticky lg:top-[calc(var(--brand-space-6)+24px)] lg:self-start">
                <span className={`${eyebrow} ${dark ? "text-brand-v5-amber" : "text-brand-v5-muted"}`}>
                  {String(index + 1).padStart(2, "0")}
                </span>
                <h2 className="font-display text-h2 font-semibold">{t(`groups.${group}`)}</h2>
              </div>
              <div className="overflow-hidden rounded-v5-panel">
                <FeaturedProjectGallery
                  images={images.map(({ src, alt }) => ({ src, alt }))}
                  label={t(`groups.${group}`)}
                  showImageLabel={t("galleryHeading")}
                  priority={false}
                />
              </div>
            </Container>
          </section>
        );
      })}

      <section aria-labelledby="mp-cta" className="bg-brand-v5-amber text-brand-v5-amber-foreground">
        <Container className="flex flex-col gap-brand-4 py-brand-6 lg:flex-row lg:items-center lg:justify-between">
          <h2 id="mp-cta" className="font-display text-h2 font-semibold">
            {isOpen ? t("open.ctaHeading") : t("ctaHeading")}
          </h2>
          <div
            className={`flex gap-brand-2 sm:flex-wrap ${isOpen ? "flex-col-reverse sm:flex-row-reverse" : "flex-col sm:flex-row"}`}
          >
            <Link
              href={`/${locale}/project-request`}
              className={`${CTA_BASE} ${isOpen ? CTA_SECONDARY : CTA_PRIMARY}`}
            >
              {t("investorCta")}
              <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" aria-hidden="true" />
            </Link>
            <Link
              href={registrationHref}
              className={`${CTA_BASE} ${isOpen ? CTA_PRIMARY : CTA_SECONDARY}`}
            >
              {isOpen ? t("open.heroCta") : t("producerCta")}
              <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" aria-hidden="true" />
            </Link>
          </div>
        </Container>
      </section>
    </article>
  );
}

// Znacznik statusu na ciemnym tle hero: ten sam tekst i ikona, jasny obrys.
function ModularProjectStatusBadgeOnDark(props: { status: ResolvedModularProject["status"]; locale: string }) {
  return (
    <div className="[&>span]:border-brand-v5-paper/40 [&>span]:text-brand-v5-paper">
      <ModularProjectStatusBadge {...props} />
    </div>
  );
}

type ArticleT = Awaited<ReturnType<typeof getTranslations<"ModularProjectPage">>>;

// Główny przycisk "Wyceń ten projekt" i link dla producentów, którzy mają już konto (tablica zapytań).
function ProducerOfferLinks({ t, registrationHref, boardHref }: { t: ArticleT; registrationHref: string; boardHref: string }) {
  return (
    <div className="mt-brand-1 flex flex-col items-start gap-brand-2">
      <Link
        href={registrationHref}
        className="focus-ring group inline-flex items-center gap-1 rounded-v5-pill bg-brand-v5-amber px-brand-4 py-3 text-body font-semibold text-brand-v5-amber-foreground transition-colors hover:bg-brand-v5-amber-strong"
      >
        {t("open.heroCta")}
        <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
      </Link>
      <Link
        href={boardHref}
        className="focus-ring rounded-data text-data font-semibold text-brand-v5-paper/80 underline hover:text-brand-v5-amber"
      >
        {t("open.boardLink")}
      </Link>
    </div>
  );
}

// Pas dla producentów przy otwartym zapytaniu: trzy kroki do oferty i powody, żeby ją złożyć.
function ProducerOfferBand({ t, registrationHref, boardHref }: { t: ArticleT; registrationHref: string; boardHref: string }) {
  const steps = [
    { title: t("open.step1Title"), text: t("open.step1Text") },
    { title: t("open.step2Title"), text: t("open.step2Text") },
    { title: t("open.step3Title"), text: t("open.step3Text") },
  ];
  const perks = [t("open.perk1"), t("open.perk2"), t("open.perk3")];

  return (
    <section aria-labelledby="mp-offer" className="bg-brand-v5-night text-brand-v5-paper">
      <Container className="grid gap-brand-5 py-brand-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] lg:gap-brand-6">
        <div className="flex flex-col items-start gap-brand-3">
          <span className={`${eyebrow} text-brand-v5-amber`}>{t("open.bandEyebrow")}</span>
          <h2 id="mp-offer" className="font-display text-h2 font-semibold">
            {t("open.bandHeading")}
          </h2>
          <p className="max-w-[55ch] text-body-l text-brand-v5-paper/80">{t("open.bandLead")}</p>
          <ul aria-label={t("open.perksLabel")} className="flex flex-col gap-brand-2">
            {perks.map((perk) => (
              <li key={perk} className="flex items-start gap-2 text-body">
                <Check className="mt-1 size-4 shrink-0 text-brand-v5-amber" aria-hidden="true" />
                {perk}
              </li>
            ))}
          </ul>
          <ProducerOfferLinks t={t} registrationHref={registrationHref} boardHref={boardHref} />
        </div>
        <div className="flex flex-col gap-brand-3">
          <h3 className={`${eyebrow} text-brand-v5-paper/60`}>{t("open.stepsLabel")}</h3>
          <ol className="flex flex-col gap-brand-3">
            {steps.map((step, index) => (
              <li
                key={step.title}
                className="flex items-start gap-brand-3 rounded-v5-card border border-brand-v5-paper/15 bg-brand-v5-paper/5 p-brand-3"
              >
                <span
                  aria-hidden="true"
                  className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-v5-amber font-display text-body font-semibold text-brand-v5-amber-foreground"
                >
                  {index + 1}
                </span>
                <div className="flex flex-col gap-0.5">
                  <span className="text-body-l font-semibold">{step.title}</span>
                  <span className="text-body text-brand-v5-paper/70">{step.text}</span>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </Container>
    </section>
  );
}
