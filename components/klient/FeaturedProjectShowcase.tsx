import { ArrowRight } from "lucide-react";
import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { FeaturedProjectGallery } from "./FeaturedProjectGallery";
import { Heading, ScrollReveal, Text } from "@/components/ui";

// Realizacja pokazowa na stronie głównej (zastąpiła kafle B2B z BulkOrdersShowcase).
// Dane projektu i lista zdjęć są na razie wpisane na stałe, bez źródła w bazie.
const GALLERY = [
  { file: "01-zgory.webp", key: "top" },
  { file: "02-bok.webp", key: "side" },
  { file: "03-prawo.webp", key: "right" },
  { file: "04-przod.webp", key: "front" },
  { file: "05-lewo.webp", key: "left" },
  { file: "06-sypialnia.webp", key: "bedroom" },
  { file: "07-salon.webp", key: "living" },
  { file: "08-glab.webp", key: "deep" },
] as const;

const FACT_KEYS = ["investor", "producer", "count", "model", "area", "terrace", "total", "statusLabel"] as const;

const FACT_VALUES: Record<(typeof FACT_KEYS)[number], string | null> = {
  investor: "Succes Resorts",
  producer: "BUDMAN HOUSE",
  count: "49",
  model: "Voorgewel Chalet",
  area: "50,2 m²",
  terrace: "42,3 m²",
  total: "2 459,8 m²",
  statusLabel: null,
};

export async function FeaturedProjectShowcase({ locale }: { locale: string }) {
  const t = await getTranslations("FeaturedProjectShowcase");

  return (
    <section className="py-brand-7">
      <ScrollReveal>
        <div className="flex flex-col overflow-hidden rounded-v5-panel bg-brand-v5-night text-brand-v5-paper">
          <div className="grid grid-cols-1 lg:grid-cols-2">
            <FeaturedProjectGallery
              images={GALLERY.map(({ file, key }) => ({ src: `/images/success/${file}`, alt: t(`gallery.${key}`) }))}
              label={t("gallery.galleryLabel")}
              showImageLabel={t("gallery.showImage")}
              statusLabel={t("status")}
            />
            <div className="flex flex-col justify-center gap-brand-2 p-brand-4 sm:p-brand-5">
              <span className="text-label uppercase tracking-[0.08em] text-brand-v5-amber">{t("eyebrow")}</span>
              <Heading level="h2" surface="v5" className="text-h2 !text-brand-v5-paper">
                {t("heading")}
              </Heading>
              <Text surface="v5" className="text-body !text-brand-v5-paper/80" measure>
                {t("intro")}
              </Text>
              <div className="mt-brand-2 flex flex-col gap-brand-2 sm:flex-row sm:flex-wrap">
                <Link
                  href={`/${locale}/project-request`}
                  className="focus-ring group inline-flex w-fit items-center gap-1 rounded-v5-pill bg-brand-v5-amber px-brand-3 py-2 text-data font-semibold text-brand-v5-amber-foreground transition-colors hover:bg-brand-v5-amber-strong"
                >
                  {t("investorCta")}
                  <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                </Link>
                <Link
                  href={`/${locale}/producer/registration`}
                  className="focus-ring group inline-flex w-fit items-center gap-1 rounded-v5-pill border border-brand-v5-paper/40 px-brand-3 py-2 text-data font-semibold text-brand-v5-paper transition-colors hover:border-brand-v5-amber hover:text-brand-v5-amber"
                >
                  {t("producerCta")}
                  <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                </Link>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-brand-2 px-brand-4 pb-brand-4 pt-brand-3 sm:px-brand-5 sm:pb-brand-5">
            <h3 className="text-label uppercase tracking-[0.08em] text-brand-v5-paper/60">{t("factsHeading")}</h3>
            <dl className="grid grid-cols-1 gap-x-brand-4 sm:grid-cols-2 lg:grid-cols-4">
              {FACT_KEYS.map((key) => (
                <div key={key} className="flex flex-col gap-0.5 border-t border-brand-v5-paper/15 py-2">
                  <dt className="text-data text-brand-v5-paper/60">{t(key)}</dt>
                  <dd className="text-body font-semibold">{FACT_VALUES[key] ?? t("statusValue")}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </ScrollReveal>
    </section>
  );
}
