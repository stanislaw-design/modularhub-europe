import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { Button, Card, DataText, Heading, Text } from "@/components/ui";
import { FavoriteButton } from "@/components/klient/FavoriteButton";
import { GalleryLightboxProvider } from "@/components/klient/ProjectGalleryLightbox";
import { ProjectGalleryCarousel, ProjectGalleryCover, ProjectGalleryThumbnails } from "@/components/klient/ProjectGallery";
import { ProjectDocumentsAndFaq } from "@/components/klient/ProjectDocumentsAndFaq";
import { ProjectSectionNav } from "@/components/klient/ProjectSectionNav";
import { ProjectVariantPicker } from "@/components/klient/ProjectVariantPicker";
import { OutdoorTvFeatures } from "@/components/klient/OutdoorTvFeatures";
import { OutdoorTvPartnerSection } from "@/components/klient/OutdoorTvPartnerSection";
import { OutdoorTvRealUseGallery } from "@/components/klient/OutdoorTvRealUseGallery";
import { OutdoorTvTechnicalSpecs } from "@/components/klient/OutdoorTvTechnicalSpecs";
import { OutdoorTvVideoSection } from "@/components/klient/OutdoorTvVideoSection";
import { getDefaultProjectVariant } from "@/lib/data/project-variants";
import { getProducerById, getProducerPhotoUrl } from "@/lib/data/producers";
import { getProjectById } from "@/lib/data/projects";
import type { CompletionStandard } from "@/lib/data/types";
import { getClientIdForUser, getFavoritedProductIds } from "@/lib/db/queries";
import { routing, type Locale } from "@/lib/i18n/routing";
import { resolveProductHref } from "@/lib/product-family-groups";

const priceFormatter = new Intl.NumberFormat("pl-PL", { maximumFractionDigits: 0 });

function firstParam(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" ? value : undefined;
}

type PageParams = { locale: string; id: string };
type PageSearchParams = { [key: string]: string | string[] | undefined };

export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>;
}): Promise<Metadata> {
  const { locale, id } = await params;
  const [project, t] = await Promise.all([
    getProjectById(id, locale as Locale),
    getTranslations({ locale, namespace: "OutdoorTvPage" }),
  ]);
  if (!project || project.family !== "outdoor-tv") return {};

  const priceLabel = project.priceOnRequest
    ? t("priceOnRequest").toLowerCase()
    : `${t("from")} ${priceFormatter.format(project.priceMin)} €`;
  const description = `${project.name} — ${project.producerName}, ${priceLabel}.`;
  const canonicalPath = `/${locale}/outdoor-tv/${project.id}`;

  const languageAlternates = Object.fromEntries(
    routing.locales.map((code) => [code, `/${code}/outdoor-tv/${project.id}`]),
  );

  return {
    title: `${project.name} — ${project.producerName} | ModularHub Europe`,
    description,
    alternates: {
      canonical: canonicalPath,
      languages: { ...languageAlternates, "x-default": `/${routing.defaultLocale}/outdoor-tv/${project.id}` },
    },
    openGraph: {
      title: project.name,
      description,
      url: canonicalPath,
      images: [{ url: project.coverImageUrl }],
    },
  };
}

export default async function OutdoorTvPage({
  params,
  searchParams,
}: {
  params: Promise<PageParams>;
  searchParams: Promise<PageSearchParams>;
}) {
  const [{ locale, id }, rawSearchParams, t, tGallery] = await Promise.all([
    params,
    searchParams,
    getTranslations("OutdoorTvPage"),
    getTranslations("ProjectGallery"),
  ]);
  const project = await getProjectById(id, locale as Locale);
  if (!project) notFound();
  // Odwrotność strażnika na /project/[id] (spec 0056 AC-6): stary lub błędny
  // link na inną rodzinę trafia na jej właściwy route zamiast renderować się
  // tutaj po cichu, na stronie zbudowanej wyłącznie pod outdoor-tv.
  if (project.family !== "outdoor-tv") redirect(resolveProductHref(project.family, project.id, locale));

  const [producer, producerPhotoUrl, session] = await Promise.all([
    getProducerById(project.producerId),
    getProducerPhotoUrl(project.producerId),
    auth(),
  ]);

  const isClientSession = session?.user.role === "client";
  let isFavorited = false;
  if (session && isClientSession) {
    const clientId = await getClientIdForUser(session.user.id);
    if (clientId) isFavorited = (await getFavoritedProductIds(clientId)).has(project.id);
  }

  const galleryExtraImages = project.galleryImageUrls?.filter((url) => url.length > 0) ?? [];
  const lightboxImages = [
    { src: project.coverImageUrl, alt: tGallery("coverAlt", { name: project.name }) },
    ...galleryExtraImages.map((url, index) => ({
      src: url,
      alt: tGallery("thumbnailAlt", { name: project.name, index: index + 2 }),
    })),
  ];

  const wariantParam = firstParam(rawSearchParams.wariant);
  const selectedVariant =
    project.variants.find((variant) => variant.completionStandard === wariantParam) ?? getDefaultProjectVariant(project);

  function hrefForVariant(standard: CompletionStandard): string {
    const query = new URLSearchParams();
    query.set("wariant", standard);
    return `${resolveProductHref("outdoor-tv", project!.id, locale)}?${query.toString()}`;
  }

  // completionStandard jest tu tylko technicznym slotem wariantu (spec 0056
  // Feature design: "modeluje warianty tak, jak dziś modeluje standardy
  // wykończenia domu") — prawdziwa nazwa wariantu (43", 50", sama szafka)
  // zawsze żyje w variantLabel; ten fallback pokazuje się tylko, gdyby
  // brakło variantLabel na wierszu.
  const standardLabel: Record<CompletionStandard, string> = {
    "surowy-zamkniety": t("variantFallbackLabel"),
    deweloperski: t("variantFallbackLabel"),
    "pod-klucz": t("variantFallbackLabel"),
    katalogowy: t("variantFallbackLabel"),
  };

  const zapytanieHref = `/${locale}/inquiry?projects=${project.id}${
    selectedVariant ? `&wariant=${selectedVariant.completionStandard}` : ""
  }`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: project.name,
    description: project.description || undefined,
    image: [project.coverImageUrl],
    brand: { "@type": "Organization", name: project.producerName },
    ...(project.priceOnRequest
      ? {}
      : {
          offers: {
            "@type": "Offer",
            priceCurrency: "EUR",
            price: project.priceMin,
            availability: "https://schema.org/InStock",
          },
        }),
  };

  const hasFeaturesSection = (project.features?.length ?? 0) > 0;
  const hasSpecsSection = Boolean(project.technicalSpecs && Object.keys(project.technicalSpecs).length > 0);
  const hasRealUseSection = project.documents.some((doc) => doc.purpose === "product_realization_photo");
  const hasPartnerSection = Boolean(producer && (producer.description || producerPhotoUrl));
  const hasFaqSection =
    Boolean(project.documents.find((doc) => doc.purpose === "product_specification")) || (project.faq?.length ?? 0) > 0;

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <GalleryLightboxProvider images={lightboxImages}>
        <div className="-mt-brand-5 flex flex-col gap-brand-6 pb-24 lg:mt-0 lg:pb-0">
          <div className="grid grid-cols-1 items-stretch gap-brand-4 lg:grid-cols-12">
            <div className="flex flex-col gap-brand-3 lg:col-span-7">
              <div className="lg:hidden">
                <ProjectGalleryCarousel coverImageUrl={project.coverImageUrl} galleryImageUrls={project.galleryImageUrls} projectName={project.name} />
              </div>
              <div className="hidden lg:block">
                <ProjectGalleryCover
                  coverImageUrl={project.coverImageUrl}
                  totalCount={galleryExtraImages.length + 1}
                  projectName={project.name}
                />
                <div className="mt-brand-2">
                  <ProjectGalleryThumbnails galleryImageUrls={project.galleryImageUrls} projectName={project.name} />
                </div>
              </div>
            </div>
            <div className="flex h-full flex-col justify-between gap-brand-3 lg:col-span-5">
              <div className="flex flex-col gap-brand-3">
                <div className="flex items-start justify-between gap-brand-2">
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <Heading level="h1" surface="v5">
                      {project.name}
                    </Heading>
                    <Text tone="muted" surface="v5">
                      {project.producerName}
                    </Text>
                  </div>
                  <FavoriteButton
                    productId={project.id}
                    productName={project.name}
                    locale={locale}
                    isClientSession={isClientSession}
                    initialFavorited={isFavorited}
                    surface="v5"
                  />
                </div>

                <ProjectVariantPicker
                  variants={project.variants}
                  selectedVariantId={selectedVariant?.id ?? ""}
                  hrefFor={hrefForVariant}
                  standardLabel={standardLabel}
                  ariaLabel={t("variantPickerAriaLabel")}
                />

                <Card padding="lg" surface="v5" className="flex flex-col gap-brand-3 border-brand-v5-amber-strong/30">
                  {project.priceOnRequest || selectedVariant?.priceOnRequest ? (
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
                        {priceFormatter.format(selectedVariant.priceMin)} €{" "}
                        <Text as="span" tone="muted" surface="v5" className="text-body-l font-normal">
                          {t("netVat")}
                        </Text>
                      </DataText>
                      {project.priceNote && (
                        <Text tone="muted" surface="v5" className="text-data">
                          {project.priceNote}
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
                      {project.priceNote && (
                        <Text tone="muted" surface="v5" className="text-data">
                          {project.priceNote}
                        </Text>
                      )}
                    </>
                  )}
                  <Button as="a" href={zapytanieHref} size="lg" surface="v5" className="mt-brand-1 w-full sm:w-fit">
                    {t("sendInquiry")}
                  </Button>
                </Card>
              </div>
            </div>
          </div>

          <OutdoorTvVideoSection
            productName={project.name}
            videoUrl={project.videoUrl}
            usageNote={project.usageNote}
          />

          <ProjectSectionNav
            items={[
              { id: "cechy", label: t("sectionNav.cechy"), disabled: !hasFeaturesSection },
              { id: "specyfikacja", label: t("sectionNav.specyfikacja"), disabled: !hasSpecsSection },
              { id: "partner", label: t("sectionNav.partner"), disabled: !hasPartnerSection },
              { id: "faq", label: t("sectionNav.faq"), disabled: !hasFaqSection },
            ]}
            ariaLabel={t("sectionNavAriaLabel")}
            scrollLeftLabel={t("sectionNavScrollLeft")}
            scrollRightLabel={t("sectionNavScrollRight")}
          />

          {hasFeaturesSection && (
            <div id="cechy" className="scroll-mt-20">
              <OutdoorTvFeatures features={project.features} />
            </div>
          )}

          {hasSpecsSection && (
            <div id="specyfikacja" className="scroll-mt-20">
              <OutdoorTvTechnicalSpecs specs={project.technicalSpecs} labels={project.technicalSpecsLabels} />
            </div>
          )}

          {hasRealUseSection && (
            <div id="w-praktyce" className="scroll-mt-20">
              <OutdoorTvRealUseGallery productName={project.name} documents={project.documents} />
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

          {hasFaqSection && (
            <div id="faq" className="scroll-mt-20">
              <ProjectDocumentsAndFaq faq={project.faq} documents={project.documents} />
            </div>
          )}
        </div>
      </GalleryLightboxProvider>
    </>
  );
}
