import Image from "next/image";
import Link from "next/link";
import { ModularProjectStatusBadge } from "./ModularProjectStatusBadge";
import { Heading, Text } from "@/components/ui";
import type { ResolvedModularProject } from "@/lib/data/modularprojects";

const CARD_FACT_COUNT = 3;

// Karta realizacji na liście: cała karta jest linkiem do wpisu (spec 0076 AC-6).
export async function ModularProjectCard({ project, locale }: { project: ResolvedModularProject; locale: string }) {
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
        <ModularProjectStatusBadge status={project.status} locale={locale} />
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
