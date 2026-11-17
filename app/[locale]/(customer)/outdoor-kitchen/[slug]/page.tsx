import { Suspense } from "react";
import { PageviewAttribution } from "@/components/analytics/PageviewAttribution";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { notFound, permanentRedirect, redirect } from "next/navigation";
import { Button, Card, DataText, Heading, Text } from "@/components/ui";
import { FavoriteButton } from "@/components/klient/FavoriteButton";
import { GalleryLightboxProvider } from "@/components/klient/ProjectGalleryLightbox";
import { ProjectGalleryTabs } from "@/components/klient/ProjectGalleryTabs";
import { ProjectDocumentsAndFaq } from "@/components/klient/ProjectDocumentsAndFaq";
import { ProjectOptionsConfigurator } from "@/components/klient/ProjectOptionsConfigurator";
import { ProjectFeatureTiles } from "@/components/klient/ProjectFeatureTiles";
import { ProjectSectionNav } from "@/components/klient/ProjectSectionNav";
import { ProjectVideoSection } from "@/components/klient/ProjectVideoSection";
import { OutdoorTvPartnerSection } from "@/components/klient/OutdoorTvPartnerSection";
import { OutdoorKitchenDelivery, OutdoorKitchenSpecs } from "@/components/klient/OutdoorKitchenSpecs";
import {
  flattenSelectedProductOptionIds,
  getDefaultProjectVariant,
  getSelectedProductOptionsPrice,
  resolveSelectedProductOptions,
  toggleProductOption,
} from "@/lib/data/project-variants";
import { getProductAltSubject } from "@/lib/product-alt";
import {
  getProducerByIdCached,
  getProducerPhotoUrlCached,
  getProductOptionGroupsCached,
  getProjectBySlugOrIdCached,
} from "@/lib/data/public-cache";
import { routing, type Locale } from "@/lib/i18n/routing";
import { resolveProductHref } from "@/lib/product-family-groups";
import { RouteWidthMarker } from "@/components/RouteWidthMarker";

// Spec 0078: strona szczegółów czyta searchParams (wariant, opcje, kraj) w całej treści,
// więc nie jest w pełni statyczna. Dane są z "use cache", sesja nie jest czytana na serwerze.
// Pełna statyka wymaga przeniesienia wyboru wariantu do wysp klienckich (osobna decyzja).
export const instant = false;

const priceFormatter = new Intl.NumberFormat("pl-PL", {
  maximumFractionDigits: 0,
});

function firstParam(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" ? value : undefined;
}

// Klon dzisiejszego search params (ten sam wzorzec co /project/[slug] i
// /outdoor-tv/[slug]): zachowuje cały ciąg zapytania przy przekierowaniu id ->
// slug (spec 0058 AC-4), zamiast go gubić.
function preserveQuery(searchParams: PageSearchParams): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    const resolved = firstParam(value);
    if (resolved) params.set(key, resolved);
  }
  const query = params.toString();
  return query ? `?${query}` : "";
}

type PageParams = { locale: string; slug: string };
type PageSearchParams = { [key: string]: string | string[] | undefined };

// Strona produktu kuchni ogrodowej (spec 0086 AC-6 do AC-11), złożona z komponentów strony
// sauny. Produkt innej rodziny pod tym adresem przekierowuje na adres z resolveProductHref.
function isOutdoorKitchenProduct(project: { family: string }): boolean {
  return project.family === "outdoor-kitchen";
}

export async function generateMetadata({ params }: { params: Promise<PageParams> }): Promise<Metadata> {
  const { locale, slug } = await params;
  const [project, t] = await Promise.all([
    getProjectBySlugOrIdCached(slug, locale as Locale),
    getTranslations({ locale, namespace: "OutdoorKitchenPage" }),
  ]);
  // AC-6: tylko opublikowany produkt ma stronę, więc i metadane.
  if (!project || !isOutdoorKitchenProduct(project) || project.status !== "published") return {};

  const priceLabel = project.priceOnRequest
    ? t("priceOnRequest").toLowerCase()
    : `${t("from")} ${priceFormatter.format(project.priceMin)} €`;
  const altSubject = await getProductAltSubject(project, locale);
  const description = `${altSubject}, ${priceLabel}.`;
  const canonicalSegment = project.slug ?? project.id;
  const canonicalPath = `/${locale}/outdoor-kitchen/${canonicalSegment}`;

  const languageAlternates = Object.fromEntries(
    routing.locales.map((code) => [code, `/${code}/outdoor-kitchen/${canonicalSegment}`]),
  );

  return {
    title: `${altSubject} | ModularHub Europe`,
    description,
    alternates: {
      canonical: canonicalPath,
      languages: {
        ...languageAlternates,
        "x-default": `/${routing.defaultLocale}/outdoor-kitchen/${canonicalSegment}`,
      },
    },
    openGraph: {
      title: project.name,
      description,
      url: canonicalPath,
      images: [{ url: project.coverImageUrl, alt: altSubject }],
    },
  };
}

export default async function OutdoorKitchenPage({
  params,
  searchParams,
}: {
  params: Promise<PageParams>;
  searchParams: Promise<PageSearchParams>;
}) {
  const [{ locale, slug }, rawSearchParams] = await Promise.all([params, searchParams]);
  const [t, tGallery, project] = await Promise.all([
    getTranslations({ locale, namespace: "OutdoorKitchenPage" }),
    getTranslations({ locale, namespace: "ProjectGallery" }),
    getProjectBySlugOrIdCached(slug, locale as Locale),
  ]);
  // AC-6: nieznany albo nieopublikowany produkt daje 404.
  if (!project || project.status !== "published") notFound();
  // Strażnik rodziny (spec 0086 AC-6, wzorzec spec 0061 AC-11): link na produkt innej
  // rodziny trafia na jego właściwy adres zamiast renderować się tutaj.
  if (!isOutdoorKitchenProduct(project)) {
    redirect(resolveProductHref(project.family, project.id, locale, project.slug, project.spaSubcategory));
  }
  // Wejście po id, gdy produkt już ma slug, przekierowuje trwale (308) na
  // kanoniczny adres ze slugiem, z zachowaniem całego ciągu zapytania (spec
  // 0058 AC-4); produkt bez sluga jeszcze renderuje się normalnie pod
  // adresem z id, bez przekierowania (AC-5).
  if (project.slug && project.slug !== slug) {
    permanentRedirect(`/${locale}/outdoor-kitchen/${project.slug}${preserveQuery(rawSearchParams)}`);
  }

  const [producer, producerPhotoUrl, optionGroups] = await Promise.all([
    getProducerByIdCached(project.producerId, locale as Locale),
    getProducerPhotoUrlCached(project.producerId),
    getProductOptionGroupsCached(project.id, locale as Locale),
  ]);

  // Spec 0078: serce ulubionych dostaje stan konta z przeglądarki (AccountProvider).

  const altSubject = await getProductAltSubject(project, locale);
  const galleryExtraImages = project.galleryImageUrls?.filter((url) => url.length > 0) ?? [];
  const lightboxImages = [
    { src: project.coverImageUrl, alt: altSubject },
    ...galleryExtraImages.map((url, index) => ({
      src: url,
      alt: tGallery("thumbnailAlt", { subject: altSubject, index: index + 2 }),
    })),
  ];

  const wariantParam = firstParam(rawSearchParams.wariant);
  // Kuchnia ma jeden wariant katalogowy; dopasowanie po variant.id jak na stronie sauny.
  const selectedVariant =
    project.variants.find((variant) => variant.id === wariantParam) ?? getDefaultProjectVariant(project);

  // Spec 0086 AC-8: układ, kolor i dodatki to opcje (spec 0059), nigdy pola technicalSpecs.
  const resolvedOptions = resolveSelectedProductOptions(optionGroups, firstParam(rawSearchParams.opcje));
  const selectedOptionIds = flattenSelectedProductOptionIds(resolvedOptions);
  // AC-8: dodatki "na zapytanie" (WDH) nie zmieniają sumy: suma liczy tylko opcje z ceną,
  // a wybrany dodatek na zapytanie dostaje osobną notkę pod ceną.
  const onRequestOptionIds = new Set(
    optionGroups.flatMap((group) => group.options.filter((option) => option.priceOnRequest).map((option) => option.id)),
  );
  const hasOnRequestOptionSelected = selectedOptionIds.some((id) => onRequestOptionIds.has(id));
  const optionsPrice = getSelectedProductOptionsPrice(
    optionGroups,
    selectedOptionIds.filter((id) => !onRequestOptionIds.has(id)),
  );

  function hrefForOption(groupId: string, optionId: string): string {
    const query = new URLSearchParams();
    if (wariantParam) query.set("wariant", wariantParam);
    query.set("opcje", toggleProductOption(optionGroups, resolvedOptions, groupId, optionId));
    return `/${locale}/outdoor-kitchen/${slug}?${query.toString()}`;
  }

  const zapytanieHref = `/${locale}/inquiry?projects=${project.id}${
    selectedVariant ? `&wariant=${selectedVariant.id}` : ""
  }`;

  // Spec 0059 AC-3, AC-4: cena = cena bazowa wariantu + suma zaznaczonych opcji
  // (np. wyspa przy Premium 360: 8 750 € + 1 804 €).
  const showPriceOnRequest = project.priceOnRequest || selectedVariant?.priceOnRequest || optionsPrice.priceOnRequest;
  const totalPriceEur =
    selectedVariant?.priceMin !== undefined && !optionsPrice.priceOnRequest
      ? selectedVariant.priceMin + optionsPrice.totalEur
      : undefined;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: project.name,
    description: project.description || undefined,
    image: [project.coverImageUrl],
    brand: { "@type": "Organization", name: project.producerName },
    ...(showPriceOnRequest
      ? {}
      : {
          offers: {
            "@type": "Offer",
            priceCurrency: "EUR",
            price: totalPriceEur ?? project.priceMin,
            availability: "https://schema.org/InStock",
          },
        }),
  };

  const hasOptionsSection = optionGroups.length > 0;
  const hasFeaturesSection = (project.features?.length ?? 0) > 0;
  const kitchenSpecs = project.outdoorKitchenTechnicalSpecs;
  const hasSpecsSection = Boolean(kitchenSpecs);
  // AC-9: deliveryNote jest wymagane w schemacie, więc dostawa jest zawsze, gdy są dane kuchni.
  const hasDostawaSection = Boolean(kitchenSpecs?.deliveryNote.trim());
  // AC-10: marka własna ModularHub nie ma sekcji partnera.
  const hasPartnerSection = Boolean(
    producer && !producer.isPlatformBrand && (producer.description || producerPhotoUrl),
  );
  const hasDokumentySection =
    Boolean(project.documents.find((doc) => doc.purpose === "product_specification")) || (project.faq?.length ?? 0) > 0;

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Suspense fallback={null}>
        <PageviewAttribution
          pageType="outdoor_kitchen"
          producerId={project.producerId}
          productId={project.id}
          family={project.family}
        />
      </Suspense>
      <GalleryLightboxProvider images={lightboxImages}>
        {/* Ten sam układ hero co /project/[slug]: od lg galeria do krawędzi
            ekranu po lewej, panel zakupowy przyklejony po prawej przez całą
            długość strony (cena i "Wyślij zapytanie" zawsze w zasięgu). Kuchnie
            nie mają rzutów, więc galeria bez zakładek. */}
        <div className="-mt-brand-5 pb-24 lg:mt-0 lg:grid lg:grid-cols-[minmax(0,1fr)_30rem] lg:pb-0 2xl:grid-cols-[minmax(0,1fr)_34rem]">
          <RouteWidthMarker name="project-wide" />
          <div className="lg:col-start-1 lg:row-start-1">
            <ProjectGalleryTabs
              projectName={project.name}
              altSubject={altSubject}
              coverImageUrl={project.coverImageUrl}
              galleryImageUrls={project.galleryImageUrls}
              floorPlans={[]}
              activeTab="wizualizacje"
              hrefFor={() => ""}
              showFloorPlanTab={false}
            />
          </div>

          {/* Panel rozciąga się na całą wysokość siatki (linia po lewej biegnie
              do końca strony), a sama treść zostaje przyklejona u góry. */}
          <aside className="mt-brand-4 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:mt-0 lg:border-l lg:border-brand-v5-line">
            <div className="flex flex-col gap-brand-3 lg:sticky lg:top-20 lg:p-brand-5">
              <Link
                href={`/${locale}/outdoor-kitchen`}
                className="focus-ring inline-flex w-fit items-center gap-1 rounded-data text-data font-semibold text-brand-v5-muted hover:text-brand-v5-ink"
              >
                <ArrowLeft className="size-4" aria-hidden="true" />
                {t("backToKitchens")}
              </Link>
              <div className="flex items-start justify-between gap-brand-2">
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <Heading level="h1" surface="v5">
                    {project.name}
                  </Heading>
                  <Text tone="muted" surface="v5">
                    {project.producerName}
                  </Text>
                </div>
                <FavoriteButton productId={project.id} productName={project.name} locale={locale} surface="v5" />
              </div>

              <Card padding="lg" surface="v5" className="flex flex-col gap-brand-3 border-brand-v5-amber-strong/30">
                {showPriceOnRequest ? (
                  <>
                    <Text variant="label" tone="muted" surface="v5">
                      {t("price")}
                    </Text>
                    <DataText as="p" surface="v5" className="text-h2 font-semibold">
                      {t("priceOnRequest")}
                    </DataText>
                  </>
                ) : selectedVariant?.priceMin !== undefined ? (
                  <>
                    <Text variant="label" tone="muted" surface="v5">
                      {selectedVariant.variantLabel ?? t("price")}
                    </Text>
                    <DataText as="p" surface="v5" className="text-h2 font-semibold">
                      {priceFormatter.format(totalPriceEur ?? selectedVariant.priceMin)} €{" "}
                      <Text as="span" tone="muted" surface="v5" className="text-body-l font-normal">
                        {t("netVat")}
                      </Text>
                    </DataText>
                    <Text tone="muted" surface="v5" className="text-data">
                      {t("vatDisclaimer")}
                    </Text>
                    {hasOnRequestOptionSelected && (
                      <Text tone="muted" surface="v5" className="text-data">
                        {t("onRequestOptionsNote")}
                      </Text>
                    )}
                  </>
                ) : (
                  <>
                    <Text variant="label" tone="muted" surface="v5">
                      {t("estimatedPackage")}
                    </Text>
                    <DataText as="p" surface="v5" className="text-h2 font-semibold">
                      {t("from")} {priceFormatter.format(project.priceMin)} €
                    </DataText>
                  </>
                )}
                <Button as="a" href={zapytanieHref} size="lg" surface="v5" className="mt-brand-1 w-full">
                  {t("sendInquiry")}
                </Button>
              </Card>
            </div>
          </aside>

          <div className="mt-brand-6 flex flex-col gap-brand-6 lg:[&_h2]:text-h2 lg:col-start-1 lg:row-start-2 lg:mt-0 lg:px-10 lg:py-brand-6">
            {/* Spec 0086 AC-8: opcje (układ, kolor, dodatki WDH na zapytanie) zaraz po hero,
              ten sam konfigurator co sauny (spec 0059). */}
            {hasOptionsSection && (
              <div id="opcje" className="scroll-mt-20">
                <ProjectOptionsConfigurator
                  groups={optionGroups}
                  selectedOptionIds={selectedOptionIds}
                  hrefFor={hrefForOption}
                  heading={t("optionsHeading")}
                  ariaLabel={t("optionsAriaLabel")}
                  includedLabel={t("optionIncluded")}
                  priceOnRequestLabel={t("optionPriceOnRequest")}
                  showMoreLabel={t.raw("optionsShowMore") as string}
                  showLessLabel={t.raw("optionsShowLess") as string}
                />
              </div>
            )}

            <ProjectVideoSection productName={project.name} videoUrl={project.videoUrl} usageNote={project.usageNote} />

            <div className="lg:sticky lg:top-20 lg:z-30 lg:-mx-10 lg:bg-background lg:px-10">
              <ProjectSectionNav
                items={[
                  {
                    id: "opcje",
                    label: t("sectionNav.opcje"),
                    disabled: !hasOptionsSection,
                  },
                  {
                    id: "cechy",
                    label: t("sectionNav.cechy"),
                    disabled: !hasFeaturesSection,
                  },
                  {
                    id: "specyfikacja",
                    label: t("sectionNav.specyfikacja"),
                    disabled: !hasSpecsSection,
                  },
                  {
                    id: "dostawa",
                    label: t("sectionNav.dostawa"),
                    disabled: !hasDostawaSection,
                  },
                  {
                    id: "partner",
                    label: t("sectionNav.partner"),
                    disabled: !hasPartnerSection,
                  },
                  {
                    id: "dokumenty",
                    label: t("sectionNav.dokumenty"),
                    disabled: !hasDokumentySection,
                  },
                ]}
                ariaLabel={t("sectionNavAriaLabel")}
                scrollLeftLabel={t("sectionNavScrollLeft")}
                scrollRightLabel={t("sectionNavScrollRight")}
              />
            </div>

            {hasFeaturesSection && (
              <div id="cechy" className="scroll-mt-20">
                <ProjectFeatureTiles features={project.features} />
              </div>
            )}

            {kitchenSpecs && (
              <div id="specyfikacja" className="scroll-mt-20">
                <OutdoorKitchenSpecs specs={kitchenSpecs} locale={locale} />
              </div>
            )}

            {kitchenSpecs && hasDostawaSection && (
              <div id="dostawa" className="scroll-mt-20">
                <OutdoorKitchenDelivery specs={kitchenSpecs} locale={locale} />
              </div>
            )}

            {hasPartnerSection && (
              <div id="partner" className="scroll-mt-20">
                <OutdoorTvPartnerSection
                  producerName={project.producerName}
                  description={producer?.description}
                  photoUrl={producerPhotoUrl}
                />
              </div>
            )}

            {hasDokumentySection && (
              <div id="dokumenty" className="scroll-mt-20">
                <ProjectDocumentsAndFaq faq={project.faq} documents={project.documents} />
              </div>
            )}
          </div>
        </div>
      </GalleryLightboxProvider>
      {/* Sticky CTA na mobile (jak /project/[slug]): cena, serce i "Wyślij
          zapytanie" pod ręką; desktop ma je w przyklejonym panelu. */}
      <div className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-between gap-brand-2 border-t-2 border-brand-v5-ink bg-brand-v5-surface px-brand-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-brand-3 lg:hidden">
        <div className="flex min-w-0 flex-col">
          {showPriceOnRequest ? (
            <DataText surface="v5" className="truncate text-body-l font-semibold">
              {t("priceOnRequest")}
            </DataText>
          ) : (
            <>
              <Text variant="label" tone="muted" surface="v5">
                {totalPriceEur !== undefined ? t("price") : t("from")}
              </Text>
              <DataText surface="v5" className="text-body-l font-black leading-none">
                {priceFormatter.format(totalPriceEur ?? project.priceMin)} €
              </DataText>
            </>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-brand-2">
          <FavoriteButton
            productId={project.id}
            productName={project.name}
            locale={locale}
            surface="v5"
            className="shrink-0 border border-brand-v5-line"
          />
          <Button as="a" href={zapytanieHref} size="md" surface="v5" className="shrink-0">
            {t("sendInquiry")}
          </Button>
        </div>
      </div>
    </>
  );
}
