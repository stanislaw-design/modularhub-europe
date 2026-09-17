import { getTranslations } from "next-intl/server";
import { getFeaturedProjectByFamily } from "@/lib/data/projects";
import { getProductFamilyCounts } from "@/lib/db/queries";
import type { ProductFamily } from "@/lib/product-technical-specs";
import { CategoryShowcaseCarousel } from "./CategoryShowcaseCarousel";

interface CategoryShowcaseProps {
  locale: string;
}

export type OutdoorFamily = Extract<ProductFamily, "spa-modulowe" | "kontenery-modulowe">;

// Everything the client carousel (CategoryShowcaseCarousel) needs to render
// one category, pre-formatted here so the client component stays pure
// presentation: no icon component crosses the server/client boundary (RSC
// props must be serializable), and offerLabel/imageAlt/dotLabel are already
// translated strings rather than making the client call next-intl itself.
export interface CategoryShowcaseItem {
  family: OutdoorFamily;
  name: string;
  description: string;
  image: string;
  imageAlt: string;
  href: string;
  offerLabel: string;
  dotLabel: string;
}

// Kontenery modułowe tymczasowo reużywają dawne zdjęcie pergoli jako
// placeholder (spec 0039 Follow-up), do czasu prawdziwej fotografii produktu.
const FAMILY_IMAGES: Record<OutdoorFamily, string> = {
  "spa-modulowe": "/spa/zdj1.jpeg",
  "kontenery-modulowe": "/images/houses/golden-hour/baltyk-studio-38.webp",
};

const priceFormatter = new Intl.NumberFormat("pl-PL", { maximumFractionDigits: 0 });

function productCountBucket(count: number): "one" | "few" | "many" {
  if (count === 1) return "one";
  const lastDigit = count % 10;
  const lastTwoDigits = count % 100;
  if (lastDigit >= 2 && lastDigit <= 4 && !(lastTwoDigits >= 12 && lastTwoDigits <= 14)) return "few";
  return "many";
}

// "Więcej niż dom": spa i kontenery modułowe tylko, dom żyje już wyżej na tej stronie
// (PopularHomes). Każda karta linkuje do jednego prawdziwego, klikalnego
// przykładu z tej rodziny (getFeaturedProjectByFamily, lib/data/projects.ts),
// nie do nieprzefiltrowanego /wyniki — to realne "oferty" zachęcające do
// zakupu, ten sam wzorzec co PopularHomes. Gdy żaden przykład nie istnieje dla
// rodziny, karta wraca do /wyniki jako defensywny fallback.
//
// Presentation is a pinned, full-bleed showcase (spec 0029): this component
// stays the async server boundary (data fetch only, unchanged from spec
// 0022 AC-8), CategoryShowcaseCarousel owns the pin/carousel/dots/arrow
// interaction client side.
export async function CategoryShowcase({ locale }: CategoryShowcaseProps) {
  const t = await getTranslations("CategoryShowcase");
  const familyNames: Record<OutdoorFamily, string> = {
    "spa-modulowe": t("spaName"),
    "kontenery-modulowe": t("containersName"),
  };
  const familyDescriptions: Record<OutdoorFamily, string> = {
    "spa-modulowe": t("spaDescription"),
    "kontenery-modulowe": t("containersDescription"),
  };

  const allResultsHref = `/${locale}/results`;
  const families = Object.keys(FAMILY_IMAGES) as OutdoorFamily[];
  const [familyCounts, featuredProjects] = await Promise.all([
    getProductFamilyCounts(),
    Promise.all(families.map((family) => getFeaturedProjectByFamily(family))),
  ]);

  const totalsByFamily = new Map<ProductFamily, number>();
  for (const row of familyCounts) {
    totalsByFamily.set(row.family, (totalsByFamily.get(row.family) ?? 0) + row.count);
  }
  const featuredByFamily = new Map(families.map((family, index) => [family, featuredProjects[index]]));

  const categories: CategoryShowcaseItem[] = families.map((family) => {
    const project = featuredByFamily.get(family) ?? null;
    const name = familyNames[family];
    const count = totalsByFamily.get(family) ?? 0;
    const priceFromEur = project ? (project.priceOnRequest ? null : project.priceMin) : null;
    const offerLabel =
      priceFromEur !== null
        ? t("priceFrom", { price: priceFormatter.format(priceFromEur) })
        : t(`productCount.${productCountBucket(count)}`, { count });

    return {
      family,
      name,
      description: familyDescriptions[family],
      image: project?.coverImageUrl ?? FAMILY_IMAGES[family],
      imageAlt: t("imageAlt", { category: name }),
      href: project ? `/${locale}/project/${project.id}` : allResultsHref,
      offerLabel,
      dotLabel: t("dotLabel", { category: name }),
    };
  });

  return (
    // No overflow-hidden here (unlike other full-bleed sections, e.g. Hero):
    // it would clip position: sticky in PinnedShowcase (an overflow value
    // other than visible on any ancestor breaks sticky's containing block).
    // Each showcase mode clips its own crossfading/scrolling content itself.
    <section
      id="category-showcase"
      className="full-bleed relative isolate mt-brand-7 mb-brand-7 bg-brand-v5-night"
    >
      <CategoryShowcaseCarousel
        headingUnderline={t("headingUnderline")}
        headingRest={t("headingRest")}
        viewOffersLabel={t("viewOffers")}
        viewOffersShortLabel={t("viewOffersShort")}
        nextCategoryLabel={t("nextCategory")}
        categories={categories}
      />
    </section>
  );
}
