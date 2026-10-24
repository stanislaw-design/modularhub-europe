import { ArrowLeft, ArrowRight } from "lucide-react";
import { getTranslations } from "next-intl/server";
import Image from "next/image";
import Link from "next/link";
import { FeaturedProjectGallery } from "./FeaturedProjectGallery";
import { ModularProjectModelLoader } from "./ModularProjectModelLoader";
import { ModularProjectStatusBadge } from "./ModularProjectStatusBadge";
import { Container } from "@/components/ui";
import { MODULARPROJECT_GALLERY_GROUPS, type ResolvedModularProject } from "@/lib/data/modularprojects";

const eyebrow = "text-label uppercase tracking-[0.08em]";

// Wpis w stylu bloga (spec 0076 AC-7): pełnoszerokie pasy (hero, fakty, opis, galerie, wezwanie do działania).
export async function ModularProjectArticle({ project, locale }: { project: ResolvedModularProject; locale: string }) {
  const t = await getTranslations({ locale, namespace: "ModularProjectPage" });
  const groups = MODULARPROJECT_GALLERY_GROUPS.map((group) => ({
    group,
    images: project.gallery.filter((image) => image.group === group),
  })).filter(({ images }) => images.length > 0);

  return (
    <article className="modularproject-wide">
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
            {project.facts.map((fact) => (
              <div key={fact.label} className="flex flex-col gap-0.5 border-t border-current/30 pt-2">
                <dt className="text-data opacity-80">{fact.label}</dt>
                <dd className="text-h3 font-semibold">{fact.value}</dd>
              </div>
            ))}
          </dl>
        </Container>
      </section>

      {project.sections.map((section, sectionIndex) => (
        <section key={section.heading} className="bg-brand-v5-surface">
          <Container className="grid gap-brand-3 py-brand-6 lg:grid-cols-[minmax(0,4fr)_minmax(0,7fr)] lg:gap-brand-6">
            <h2 className="font-display text-h2 font-semibold text-brand-v5-ink lg:sticky lg:top-brand-6 lg:self-start">
              {section.heading}
            </h2>
            <div className="flex flex-col gap-brand-3">
              {section.paragraphs.map((paragraph) => (
                <p key={paragraph} className="max-w-[65ch] text-body-l text-brand-v5-ink">
                  {paragraph}
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
      ))}

      {groups.map(({ group, images }, index) => {
        const dark = index % 2 === 1;
        return (
          <section
            key={group}
            className={dark ? "bg-brand-v5-night text-brand-v5-paper" : "bg-brand-v5-surface text-brand-v5-ink"}
          >
            <Container className="grid gap-brand-3 py-brand-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,8fr)] lg:gap-brand-5">
              <div className="flex flex-col gap-1 lg:sticky lg:top-brand-6 lg:self-start">
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
            {t("ctaHeading")}
          </h2>
          <div className="flex flex-col gap-brand-2 sm:flex-row sm:flex-wrap">
            <Link
              href={`/${locale}/project-request`}
              className="focus-ring group inline-flex w-fit items-center gap-1 rounded-v5-pill bg-brand-v5-night px-brand-3 py-2 text-data font-semibold text-brand-v5-paper transition-colors hover:bg-brand-v5-night/85"
            >
              {t("investorCta")}
              <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" aria-hidden="true" />
            </Link>
            <Link
              href={`/${locale}/producer/registration`}
              className="focus-ring group inline-flex w-fit items-center gap-1 rounded-v5-pill border border-brand-v5-night/60 px-brand-3 py-2 text-data font-semibold transition-colors hover:bg-brand-v5-night/10"
            >
              {t("producerCta")}
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
