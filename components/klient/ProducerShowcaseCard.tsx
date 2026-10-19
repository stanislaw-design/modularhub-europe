import { ArrowRight, BadgeCheck } from "lucide-react";
import { getTranslations } from "next-intl/server";
import Image from "next/image";
import Link from "next/link";
import type { CountryCode, Producer } from "@/lib/data/types";

interface ProducerShowcaseCardProps {
  producer: Producer;
  locale: string;
}

// Karta strony głównej, celowo osobna od ProducerCard (karta projektu): tu
// liczą się trzy fakty zaufania i jedno wejście dalej, a kraje dostawy to
// pełne nazwy, nie emoji flag (nie renderują się na Windowsie).
export async function ProducerShowcaseCard({ producer, locale }: ProducerShowcaseCardProps) {
  const t = await getTranslations("ProducerShowcase");
  const tCountry = await getTranslations("ProducerCard.country");
  const countryLabel = (code: CountryCode) => tCountry(code);
  const href = `/${locale}/producers/${producer.id}`;

  return (
    <Link
      href={href}
      className="focus-ring group flex h-full flex-col overflow-hidden rounded-v5-card border border-brand-v5-line bg-brand-v5-surface"
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        <Image
          src={producer.featuredPhotoUrl}
          alt=""
          fill
          sizes="(min-width: 1024px) 22vw, (min-width: 640px) 45vw, 80vw"
          className="object-cover transition-transform duration-200 ease-out group-hover:scale-[1.03]"
        />
      </div>
      <div className="flex flex-1 flex-col gap-brand-2 p-brand-3">
        <span className="inline-flex w-fit items-center gap-1 text-data font-semibold text-brand-v5-ink">
          <BadgeCheck className="size-4 text-status-approved" aria-hidden="true" />
          {t("verified")}
        </span>
        <span className="font-display text-h3 font-bold text-brand-v5-ink">{producer.name}</span>
        <ul className="flex flex-col gap-1 text-data text-brand-v5-muted">
          {producer.completedProjectsCount > 0 ? (
            <li className="font-semibold text-brand-v5-ink">
              {t("completedProjects", { count: producer.completedProjectsCount })}
            </li>
          ) : null}
          <li>{t("models", { count: producer.modelsCount })}</li>
          {producer.deliveryCountries.length > 0 ? (
            <li>
              {t("deliveryTo", {
                countries: producer.deliveryCountries.map(countryLabel).join(", "),
              })}
            </li>
          ) : null}
        </ul>
        <span className="mt-auto inline-flex items-center gap-1 pt-brand-2 text-body font-semibold text-brand-v5-ink">
          {t("viewModels")}
          <ArrowRight
            className="size-4 transition-transform duration-200 ease-out group-hover:translate-x-1"
            aria-hidden="true"
          />
        </span>
      </div>
    </Link>
  );
}
