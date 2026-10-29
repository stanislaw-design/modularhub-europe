import Image from "next/image";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ModularProjectStatusBadge } from "./ModularProjectStatusBadge";
import { ArrowRight } from "lucide-react";
import { Heading, Text } from "@/components/ui";
import type { ResolvedModularProject } from "@/lib/data/modularprojects";

const CARD_FACT_COUNT = 3;
const FEATURED_FACT_COUNT = 6;

// Karta realizacji na liście: cała karta jest linkiem do wpisu (spec 0076 AC-6).
export async function ModularProjectCard({
  project,
  locale,
  variant = "default",
}: {
  project: ResolvedModularProject;
  locale: string;
  variant?: "default" | "featured";
}) {
  const t = await getTranslations({ locale, namespace: "ModularProjectsPage.filters" });
  const added = new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(project.publishedAt));
  if (variant === "featured") {
    return (
      <Link
        href={`/${locale}/modularprojects/${project.slug}`}
        className="focus-ring group grid overflow-hidden rounded-v5-card border border-brand-v5-line bg-brand-v5-surface transition-shadow hover:shadow-lg lg:grid-cols-5"
      >
        <div className="relative aspect-video overflow-hidden lg:col-span-3 lg:aspect-auto lg:min-h-[28rem]">
          <Image
            src={project.cover.src}
            alt={project.cover.alt}
            fill
            priority
            sizes="(min-width: 1024px) 60vw, 100vw"
            className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
          />
        </div>
        <div className="flex flex-col gap-brand-3 p-brand-4 lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-brand-1">
            <ModularProjectStatusBadge status={project.status} locale={locale} />
            <time dateTime={project.publishedAt} className="text-data text-brand-v5-muted">
              {t("addedOn", { date: added })}
            </time>
          </div>
          <Heading level="h2" surface="v5">
            {project.title}
          </Heading>
          <Text surface="v5" tone="muted">
            {project.lead}
          </Text>
          <dl className="grid grid-cols-2 gap-x-brand-3 gap-y-brand-2 border-t border-brand-v5-line pt-brand-3">
            {project.facts.slice(0, FEATURED_FACT_COUNT).map((fact) => (
              <div key={fact.label} className="flex flex-col">
                <dt className="text-data text-brand-v5-muted">{fact.label}</dt>
                <dd className="text-body font-semibold text-brand-v5-ink">{fact.value}</dd>
              </div>
            ))}
          </dl>
          <span className="mt-auto inline-flex items-center gap-2 font-semibold text-brand-v5-ink">
            {t("viewProject")}
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
          </span>
        </div>
      </Link>
    );
  }
  return (
    <Link
      href={`/${locale}/modularprojects/${project.slug}`}
      className="focus-ring group flex h-full flex-col overflow-hidden rounded-v5-card border border-brand-v5-line bg-brand-v5-surface transition-shadow hover:shadow-lg"
    >
      <div className="relative aspect-video overflow-hidden">
        <Image
          src={project.cover.src}
          alt={project.cover.alt}
          fill
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
        />
      </div>
      <div className="flex flex-1 flex-col gap-brand-2 p-brand-3">
        <div className="flex flex-wrap items-center justify-between gap-brand-1">
          <ModularProjectStatusBadge status={project.status} locale={locale} />
          <time dateTime={project.publishedAt} className="text-data text-brand-v5-muted">
            {t("addedOn", { date: added })}
          </time>
        </div>
        <Heading level="h3" surface="v5">
          {project.title}
        </Heading>
        <Text surface="v5" tone="muted">
          {project.lead}
        </Text>
        <dl className="mt-auto grid grid-cols-2 gap-x-brand-2 gap-y-1 pt-brand-2">
          {project.facts.slice(0, CARD_FACT_COUNT).map((fact) => (
            <div key={fact.label} className="flex flex-col">
              <dt className="text-data text-brand-v5-muted">{fact.label}</dt>
              <dd className="text-data font-semibold text-brand-v5-ink">{fact.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </Link>
  );
}
