import { ArrowUpRight, Bath, BedDouble, Layers, Ruler, type LucideIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";
import Image from "next/image";
import Link from "next/link";
import { Heading } from "@/components/ui";
import { getProjectPriceDisplay } from "@/lib/data/project-variants";
import type { CountryCode, Project } from "@/lib/data/types";
import { formatPriceEur } from "@/lib/format-price";
import { getProductAltSubject } from "@/lib/product-alt";

interface PopularHomeCardProps {
  project: Project;
  countryName: string;
  href: string;
  locale: string;
  /** "lead" is the large photo-first card; "compact" the horizontal one beside it. */
  variant?: "lead" | "compact";
}

type Spec = { key: string; icon: LucideIcon; label: string };

type CountKey = "bedrooms" | "bathrooms" | "storeys" | "rooms";

// Windows renders flag emoji as bare letters, so the country shows as its code
// plus its name on every platform instead.
function CountryTag({ code, name }: { code: CountryCode; name: string }) {
  return (
    <span className="inline-flex items-baseline gap-1">
      <span className="text-label font-semibold tracking-[0.08em]">{code}</span>
      {name}
    </span>
  );
}

function SpecList({ specs, className }: { specs: Spec[]; className: string }) {
  if (specs.length === 0) return null;
  return (
    <ul className={`flex flex-wrap gap-x-brand-2 gap-y-1 ${className}`}>
      {specs.map(({ key, icon: Icon, label }) => (
        <li key={key} className="flex items-center gap-1 text-data">
          <Icon className="size-4 shrink-0 opacity-70" aria-hidden="true" />
          {label}
        </li>
      ))}
    </ul>
  );
}

export async function PopularHomeCard({ project, countryName, href, locale, variant = "compact" }: PopularHomeCardProps) {
  const t = await getTranslations("PopularHomeCard");
  const altSubject = await getProductAltSubject(project);

  // Price, standard and per m² all come from the same default variant so a
  // price is never shown beside another variant's scope (spec 0044 AC-1).
  const price = getProjectPriceDisplay(project);
  const standard =
    !price.priceOnRequest && price.variant.completionStandard !== "katalogowy"
      ? t(`completionStandard.${price.variant.completionStandard}`)
      : null;
  const pricePerM2 =
    !price.priceOnRequest && project.floorAreaM2 !== null && project.floorAreaM2 > 0
      ? formatPriceEur(Math.round(price.variant.priceMin / project.floorAreaM2), locale)
      : null;
  const priceText = price.priceOnRequest
    ? t("priceOnRequest")
    : t("priceFrom", { price: formatPriceEur(price.variant.priceMin, locale) });

  // Plural form picked per locale (Polish has one/few/many), the keys nest one string per form.
  const plural = new Intl.PluralRules(locale);
  const counted = (key: CountKey, count: number) => t(`${key}.${plural.select(count)}`, { count });

  const specs: Spec[] = [
    {
      key: "area",
      icon: Ruler,
      label: project.floorAreaM2 !== null ? `${project.floorAreaM2} m²` : t("areaUnknown"),
    },
    project.bedrooms !== null && project.bedrooms > 0
      ? { key: "bedrooms", icon: BedDouble, label: counted("bedrooms", project.bedrooms) }
      : project.rooms !== null && project.rooms > 0
        ? { key: "rooms", icon: BedDouble, label: counted("rooms", project.rooms) }
        : null,
    project.bathrooms !== null && project.bathrooms > 0
      ? { key: "bathrooms", icon: Bath, label: counted("bathrooms", project.bathrooms) }
      : null,
    project.storeys !== null && project.storeys > 0
      ? { key: "storeys", icon: Layers, label: counted("storeys", project.storeys) }
      : null,
  ].filter((spec): spec is Spec => spec !== null);

  const image = (
    <Image
      src={project.coverImageUrl}
      alt={altSubject}
      fill
      sizes={
        variant === "lead"
          ? "(min-width: 1024px) 58vw, 100vw"
          : "(min-width: 1024px) 20vw, (min-width: 640px) 40vw, 100vw"
      }
      className="object-cover transition-transform duration-500 ease-[cubic-bezier(0.25,1,0.5,1)] group-hover:scale-105"
    />
  );

  if (variant === "lead") {
    return (
      <Link
        href={href}
        className="focus-ring group relative isolate flex min-h-[30rem] w-full flex-col justify-end overflow-hidden rounded-v5-panel bg-brand-v5-night text-brand-v5-paper lg:min-h-[36rem]"
      >
        {image}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-linear-to-t from-brand-v5-night via-brand-v5-night/60 to-transparent to-65%"
        />
        {standard ? (
          <span className="absolute top-brand-3 left-brand-3 max-w-[calc(100%-3rem)] rounded-v5-pill bg-brand-v5-night/80 px-brand-2 py-1 text-data font-semibold">
            {standard}
          </span>
        ) : null}
        <div className="relative flex flex-col gap-brand-2 p-brand-3 sm:p-brand-4">
          <p className="text-data text-brand-v5-paper/75">
            {project.producerName} · <CountryTag code={project.countryOfProduction} name={countryName} />
          </p>
          <Heading
            level="h3"
            surface="v5"
            className="text-[clamp(1.75rem,2.6vw,3rem)] leading-[1.05] font-bold tracking-[-0.03em] !text-brand-v5-paper"
          >
            {project.name}
          </Heading>
          <SpecList specs={specs} className="text-brand-v5-paper/90" />
          <div className="mt-brand-1 flex flex-wrap items-end justify-between gap-brand-2 border-t border-brand-v5-paper/20 pt-brand-2">
            <div className="flex flex-col">
              <span className="text-[clamp(1.5rem,2vw,2.25rem)] leading-tight font-semibold tabular-nums">
                {priceText}
              </span>
              {pricePerM2 ? (
                <span className="text-data text-brand-v5-paper/75">{t("pricePerM2", { price: pricePerM2 })}</span>
              ) : null}
            </div>
            <span className="inline-flex shrink-0 items-center gap-1 rounded-v5-pill bg-brand-v5-amber px-brand-3 py-2 text-data font-semibold text-brand-v5-amber-foreground transition-colors group-hover:bg-brand-v5-amber-strong">
              {t("viewProject")}
              <ArrowUpRight className="size-4" aria-hidden="true" />
            </span>
          </div>
        </div>
      </Link>
    );
  }

  return (
    <Link
      href={href}
      className="focus-ring group flex flex-col overflow-hidden rounded-v5-card border border-brand-v5-line bg-brand-v5-surface text-brand-v5-ink transition-colors hover:border-brand-v5-ink/40 sm:flex-row"
    >
      <div className="relative aspect-[16/9] w-full shrink-0 overflow-hidden sm:aspect-auto sm:w-[38%]">{image}</div>
      <div className="flex min-w-0 flex-1 flex-col gap-brand-1 p-brand-3">
        <p className="truncate text-data text-brand-v5-muted">
          {project.producerName} · <CountryTag code={project.countryOfProduction} name={countryName} />
        </p>
        <Heading level="h3" surface="v5" className="text-body-l font-semibold leading-tight">
          {project.name}
        </Heading>
        <SpecList specs={specs} className="text-brand-v5-muted" />
        <div className="mt-auto flex items-end justify-between gap-brand-2 pt-brand-1">
          <div className="flex flex-col">
            <span className="text-body-l font-semibold tabular-nums">{priceText}</span>
            {standard || pricePerM2 ? (
              <span className="text-data text-brand-v5-muted">
                {[standard, pricePerM2 ? t("pricePerM2", { price: pricePerM2 }) : null].filter(Boolean).join(" · ")}
              </span>
            ) : null}
          </div>
          <ArrowUpRight
            className="size-5 shrink-0 text-brand-v5-muted transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-brand-v5-ink"
            aria-hidden="true"
          />
        </div>
      </div>
    </Link>
  );
}
