import { MapPin } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { DataText, Heading, Text } from "@/components/ui";
import type { Country, Project } from "@/lib/data/types";
import { roundedSizeRangeFor } from "@/lib/size-thresholds";

interface FeaturedHomesProps {
  locale: string;
  projects: Project[];
  countries: Country[];
}

const priceFormatter = new Intl.NumberFormat("pl-PL", { maximumFractionDigits: 0 });

function resultsHrefFor(project: Project, locale: string): string {
  const { sizeMin, sizeMax } = roundedSizeRangeFor(project.floorAreaM2);
  const params = new URLSearchParams();
  if (sizeMin !== undefined) params.set("sizeMin", String(sizeMin));
  if (sizeMax !== undefined) params.set("sizeMax", String(sizeMax));
  const query = params.toString();
  return `/${locale}/klient/wyniki${query ? `?${query}` : ""}`;
}

export function FeaturedHomes({ locale, projects, countries }: FeaturedHomesProps) {
  const countryNameByCode = new Map(countries.map((country) => [country.code, country.name]));

  return (
    <section className="flex flex-col gap-brand-3">
      <Heading level="h2">Polecane domy</Heading>
      <div className="grid grid-cols-2 gap-brand-4 sm:grid-cols-3 lg:grid-cols-4">
        {projects.map((project) => (
          <Link
            key={project.id}
            href={resultsHrefFor(project, locale)}
            className="focus-ring group flex flex-col gap-brand-1 rounded-3xl"
          >
            <div className="relative aspect-square overflow-hidden rounded-2xl">
              <Image
                src={project.coverImageUrl}
                alt=""
                fill
                sizes="(min-width: 1024px) 20vw, (min-width: 640px) 33vw, 50vw"
                className="object-cover transition-transform duration-300 group-hover:scale-105"
              />
            </div>
            <div className="flex items-baseline justify-between gap-brand-1">
              <Heading level="h3" className="min-w-0 flex-1 truncate text-body-l">
                {project.name}
              </Heading>
              <DataText className="shrink-0">
                {priceFormatter.format(project.priceMin)}–{priceFormatter.format(project.priceMax)} €
              </DataText>
            </div>
            <Text tone="muted" className="flex items-center gap-1">
              <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
              <span className="min-w-0 flex-1 truncate">
                {project.producerName} ·{" "}
                {countryNameByCode.get(project.countryOfProduction) ?? project.countryOfProduction}
              </span>
            </Text>
            <Text tone="muted">
              {project.floorAreaM2} m² · {project.bedrooms} sypialnie
            </Text>
          </Link>
        ))}
      </div>
    </section>
  );
}
