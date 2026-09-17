import { getTranslations } from "next-intl/server";
import Image from "next/image";
import Link from "next/link";
import { DataText, Heading, StatusPill, Text } from "@/components/ui";
import type { CountryCode, Project } from "@/lib/data/types";

const countryFlag: Record<CountryCode, string> = { PL: "🇵🇱", DE: "🇩🇪", NL: "🇳🇱" };
const priceFormatter = new Intl.NumberFormat("pl-PL", { maximumFractionDigits: 0 });

interface VerifiedManufacturerProjectCardProps {
  project: Project;
  countryName: string;
  href: string;
  producerName: string;
  unitsPerMonth: number | null;
  certifications: string[];
  deliveryCountries: CountryCode[];
  deliveryCountryNameByCode: Map<CountryCode, string>;
}

// Kafelek poziomy (na życzenie zamawiającego): każda karta niesie własny
// komplet danych producenta (nazwa, odznaka, zdolność, certyfikaty, kraje
// dostawy) zamiast jednego, wspólnego nagłówka nad grupą projektów — przy
// większej liczbie zweryfikowanych producentów wspólny nagłówek myliłby
// projekty różnych producentów ze sobą.
export async function VerifiedManufacturerProjectCard({
  project,
  countryName,
  href,
  producerName,
  unitsPerMonth,
  certifications,
  deliveryCountries,
  deliveryCountryNameByCode,
}: VerifiedManufacturerProjectCardProps) {
  const [tCard, tPage] = await Promise.all([
    getTranslations("PopularHomeCard"),
    getTranslations("VerifiedManufacturersPage"),
  ]);

  return (
    <Link
      href={href}
      className="focus-ring group flex flex-col overflow-hidden rounded-v5-card border border-brand-v5-line bg-brand-v5-surface transition-shadow hover:shadow-lg sm:flex-row"
    >
      <div className="relative aspect-[16/9] overflow-hidden sm:w-96 sm:shrink-0">
        <Image
          src={project.coverImageUrl}
          alt={tCard("coverAlt", { name: project.name })}
          fill
          sizes="(min-width: 640px) 384px, 100vw"
          className="object-cover transition-transform duration-300 group-hover:scale-105"
        />
      </div>
      <div className="flex flex-1 flex-col gap-brand-2 p-brand-4">
        <div className="flex flex-wrap items-center gap-brand-2">
          <Text tone="muted" surface="v5" className="text-label font-semibold tracking-wide uppercase">
            {producerName}
          </Text>
          <StatusPill status="approved">{tPage("verifiedBadge")}</StatusPill>
        </div>
        <Heading level="h3" surface="v5" className="text-body-l">
          {project.name}
        </Heading>
        <Text tone="muted" surface="v5" className="text-data">
          {project.rooms > 0
            ? tCard("summary", { area: project.floorAreaM2, rooms: project.rooms })
            : tCard("summaryNoRooms", { area: project.floorAreaM2 })}{" "}
          · {countryFlag[project.countryOfProduction]} {countryName}
        </Text>
        <DataText as="p" className="text-body-l font-semibold">
          {project.priceOnRequest
            ? tCard("priceOnRequest")
            : tCard("priceFrom", { price: priceFormatter.format(project.priceMin) })}
        </DataText>
        <div className="mt-auto flex flex-wrap gap-brand-3 border-t border-brand-v5-line pt-brand-2">
          {unitsPerMonth !== null && (
            <Text tone="muted" surface="v5" className="text-data">
              {tPage("capacityLabel", { units: unitsPerMonth })}
            </Text>
          )}
          {certifications.length > 0 && (
            <Text tone="muted" surface="v5" className="text-data">
              {tPage("certificationsLabel", { list: certifications.join(", ") })}
            </Text>
          )}
          {deliveryCountries.length > 0 && (
            <Text tone="muted" surface="v5" className="text-data">
              {tPage("deliveryLabel", {
                list: deliveryCountries.map((code) => deliveryCountryNameByCode.get(code) ?? code).join(", "),
              })}
            </Text>
          )}
        </div>
      </div>
    </Link>
  );
}
