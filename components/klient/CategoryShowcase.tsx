import { ArrowRight, Droplets, Umbrella } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { ComponentType } from "react";
import { Container } from "@/components/ui";
import { getFeaturedProjectByFamily } from "@/lib/data/projects";
import { getProductFamilyCounts } from "@/lib/db/queries";
import type { ProductFamily } from "@/lib/product-technical-specs";

interface CategoryShowcaseProps {
  locale: string;
}

type OutdoorFamily = Extract<ProductFamily, "spa-modulowe" | "pergola">;

// "Więcej niż dom": spa i pergole tylko, dom żyje już wyżej na tej stronie
// (PopularHomes). Każda karta linkuje do jednego prawdziwego, klikalnego
// przykładu z tej rodziny (getFeaturedProjectByFamily, lib/data/projects.ts),
// nie do nieprzefiltrowanego /wyniki — to realne "oferty" zachęcające do
// zakupu, ten sam wzorzec co PopularHomes. Gdy żaden przykład nie istnieje dla
// rodziny, karta wraca do /wyniki jako defensywny fallback.
const FAMILY_DISPLAY: Record<
  OutdoorFamily,
  { name: string; description: string; image: string; icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }> }
> = {
  "spa-modulowe": {
    name: "Spa modułowe",
    description: "Sauny, jacuzzi i strefy wellness do Twojego ogrodu",
    image: "/spa/zdj1.jpeg",
    icon: Droplets,
  },
  pergola: {
    name: "Pergole",
    description: "Aluminiowe i drewniane, z zadaszeniem i przeszkleniami",
    image: "/images/houses/golden-hour/baltyk-studio-38.webp",
    icon: Umbrella,
  },
};

const priceFormatter = new Intl.NumberFormat("pl-PL", { maximumFractionDigits: 0 });

function formatProductCount(count: number): string {
  if (count === 1) return "1 produkt";
  const lastDigit = count % 10;
  const lastTwoDigits = count % 100;
  if (lastDigit >= 2 && lastDigit <= 4 && !(lastTwoDigits >= 12 && lastTwoDigits <= 14)) {
    return `${count} produkty`;
  }
  return `${count} produktów`;
}

export async function CategoryShowcase({ locale }: CategoryShowcaseProps) {
  const allResultsHref = `/${locale}/klient/wyniki`;
  const families = Object.keys(FAMILY_DISPLAY) as OutdoorFamily[];
  const [familyCounts, featuredProjects] = await Promise.all([
    getProductFamilyCounts(),
    Promise.all(families.map((family) => getFeaturedProjectByFamily(family))),
  ]);

  const totalsByFamily = new Map<ProductFamily, number>();
  for (const row of familyCounts) {
    totalsByFamily.set(row.family, (totalsByFamily.get(row.family) ?? 0) + row.count);
  }
  const featuredByFamily = new Map(families.map((family, index) => [family, featuredProjects[index]]));

  const categories = families.map((family) => {
    const project = featuredByFamily.get(family) ?? null;
    return {
      family,
      name: FAMILY_DISPLAY[family].name,
      description: FAMILY_DISPLAY[family].description,
      image: project?.coverImageUrl ?? FAMILY_DISPLAY[family].image,
      icon: FAMILY_DISPLAY[family].icon,
      count: totalsByFamily.get(family) ?? 0,
      href: project ? `/${locale}/klient/projekt/${project.id}` : allResultsHref,
      priceFromEur: project ? (project.priceOnRequest ? null : project.priceMin) : null,
    };
  });

  return (
    <section className="full-bleed bg-brand-v5-paper py-brand-5">
      <Container className="flex flex-col gap-brand-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-h2 font-display font-semibold text-brand-v5-ink">Więcej niż dom</h2>
        </div>
        <div className="grid grid-cols-1 gap-brand-4 sm:grid-cols-2">
          {categories.map((category) => {
            const Icon = category.icon;
            return (
              <Link
                key={category.family}
                href={category.href}
                className="focus-ring group flex flex-col overflow-hidden rounded-v5-card bg-brand-v5-surface shadow-sm transition-shadow duration-300 hover:shadow-lg"
              >
                <div className="relative aspect-video overflow-hidden">
                  <Image
                    src={category.image}
                    alt={`Przykładowa realizacja z kategorii ${category.name}`}
                    fill
                    sizes="(min-width: 640px) 50vw, 100vw"
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <span className="absolute right-brand-2 top-brand-2 rounded-v5-pill bg-brand-v5-paper/90 px-brand-2 py-1 text-data font-semibold text-brand-v5-ink backdrop-blur-sm">
                    {category.priceFromEur !== null
                      ? `od ${priceFormatter.format(category.priceFromEur)} €`
                      : formatProductCount(category.count)}
                  </span>
                </div>
                <div className="flex flex-col gap-brand-1 p-brand-3">
                  <span className="flex size-9 items-center justify-center rounded-full bg-brand-v5-amber text-brand-v5-amber-foreground">
                    <Icon className="size-5" aria-hidden={true} />
                  </span>
                  <span className="text-body-l font-semibold text-brand-v5-ink">
                    {category.name}
                  </span>
                  <span className="text-body text-brand-v5-muted">{category.description}</span>
                  <span className="mt-1 inline-flex items-center gap-1 text-body font-semibold text-brand-v5-amber-strong">
                    Zobacz oferty
                    <ArrowRight
                      className="size-4 transition-transform group-hover:translate-x-1"
                      aria-hidden="true"
                    />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </Container>
    </section>
  );
}
