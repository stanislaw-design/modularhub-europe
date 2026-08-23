import { ArrowRight } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Container } from "@/components/ui";

interface CategoryShowcaseProps {
  locale: string;
}

// Decorative categories: Project has no houseType field, so these link to
// the full, unfiltered /wyniki list rather than a real filter (spec 0014
// AC-6) — intentionally unfiltered, not dead. Counts are illustrative.
const categories = [
  {
    name: "Domy modułowe",
    count: "642 projekty",
    image: "/images/houses/golden-hour/modulor-family-90.webp",
  },
  {
    name: "Domy prefabrykowane",
    count: "512 projektów",
    image: "/images/houses/golden-hour/modulor-compact-56.webp",
  },
  {
    name: "Domy tiny",
    count: "236 projektów",
    image: "/images/houses/golden-hour/baltyk-studio-38.webp",
  },
  {
    name: "Domy szkieletowe",
    count: "398 projektów",
    image: "/images/houses/golden-hour/karpaty-alpine-104.webp",
  },
];

export function CategoryShowcase({ locale }: CategoryShowcaseProps) {
  const allResultsHref = `/${locale}/klient/wyniki`;

  return (
    <section className="full-bleed bg-brand-v5-paper py-brand-5">
      <Container className="flex flex-col gap-brand-4">
        <div className="flex flex-wrap items-baseline justify-between gap-brand-2">
          <h2 className="text-h2 font-display font-semibold text-brand-v5-ink">
            Odkryj popularne kategorie domów
          </h2>
          <Link
            href={allResultsHref}
            className="focus-ring flex items-center gap-1 rounded-data text-body font-semibold text-brand-v5-ink hover:underline"
          >
            Zobacz wszystkie kategorie
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-brand-4 sm:grid-cols-2 lg:grid-cols-4">
          {categories.map((category) => (
            <Link
              key={category.name}
              href={allResultsHref}
              className="focus-ring group flex flex-col gap-brand-2 rounded-v5-card"
            >
              <div className="relative aspect-[4/3] overflow-hidden rounded-v5-card">
                <Image
                  src={category.image}
                  alt={`Przykładowy dom z kategorii ${category.name}`}
                  fill
                  sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </div>
              <div className="flex items-center justify-between gap-brand-1">
                <div className="flex flex-col">
                  <span className="text-body-l font-semibold text-brand-v5-ink">
                    {category.name}
                  </span>
                  <span className="text-body text-brand-v5-muted">{category.count}</span>
                </div>
                <ArrowRight
                  className="size-5 shrink-0 text-brand-v5-ink transition-transform group-hover:translate-x-1"
                  aria-hidden="true"
                />
              </div>
            </Link>
          ))}
        </div>
      </Container>
    </section>
  );
}
