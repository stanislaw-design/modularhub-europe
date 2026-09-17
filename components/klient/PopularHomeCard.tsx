import { getTranslations } from "next-intl/server";
import Image from "next/image";
import Link from "next/link";
import { DataText, Heading, Text } from "@/components/ui";
import type { CountryCode, Project } from "@/lib/data/types";

const countryFlag: Record<CountryCode, string> = { PL: "🇵🇱", DE: "🇩🇪", NL: "🇳🇱" };
const priceFormatter = new Intl.NumberFormat("pl-PL", { maximumFractionDigits: 0 });

interface PopularHomeCardProps {
  project: Project;
  countryName: string;
  href: string;
}

export async function PopularHomeCard({ project, countryName, href }: PopularHomeCardProps) {
  const t = await getTranslations("PopularHomeCard");
  return (
    <Link
      href={href}
      className="focus-ring group flex flex-col overflow-hidden rounded-v5-card border border-brand-v5-line bg-brand-v5-surface transition-shadow hover:shadow-lg"
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        <Image
          src={project.coverImageUrl}
          alt={t("coverAlt", { name: project.name })}
          fill
          sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
          className="object-cover transition-transform duration-300 group-hover:scale-105"
        />
      </div>
      <div className="flex flex-col gap-brand-1 p-brand-3">
        <Heading level="h3" className="text-body-l">
          {project.name}
        </Heading>
        <Text tone="muted" className="text-data">
          {project.rooms > 0
            ? t("summary", { area: project.floorAreaM2, rooms: project.rooms })
            : t("summaryNoRooms", { area: project.floorAreaM2 })}{" "}
          · {countryFlag[project.countryOfProduction]}{" "}
          {countryName}
        </Text>
        <DataText as="p" className="mt-1 text-body-l font-semibold">
          {project.priceOnRequest
            ? t("priceOnRequest")
            : t("priceFrom", { price: priceFormatter.format(project.priceMin) })}
        </DataText>
      </div>
    </Link>
  );
}
