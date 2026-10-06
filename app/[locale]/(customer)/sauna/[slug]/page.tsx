import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound, permanentRedirect, redirect } from "next/navigation";
import { auth } from "@/auth";
import { Button, Card, DataText, Heading, Text } from "@/components/ui";
import { FavoriteButton } from "@/components/klient/FavoriteButton";
import { GalleryLightboxProvider } from "@/components/klient/ProjectGalleryLightbox";
import { ProjectGalleryCarousel, ProjectGalleryCover, ProjectGalleryThumbnails } from "@/components/klient/ProjectGallery";
import { ProjectDocumentsAndFaq } from "@/components/klient/ProjectDocumentsAndFaq";
import { ProjectLogistics } from "@/components/klient/ProjectLogistics";
import { ProjectOptionsConfigurator } from "@/components/klient/ProjectOptionsConfigurator";
import { ProjectFeatureTiles } from "@/components/klient/ProjectFeatureTiles";
import { ProjectSectionNav } from "@/components/klient/ProjectSectionNav";
import { ProjectVariantPicker } from "@/components/klient/ProjectVariantPicker";
import { ProjectVideoSection } from "@/components/klient/ProjectVideoSection";
import { OutdoorTvPartnerSection } from "@/components/klient/OutdoorTvPartnerSection";
import { SaunaTechnicalSpecs } from "@/components/klient/SaunaTechnicalSpecs";
import {
  flattenSelectedProductOptionIds,
  getDefaultProjectVariant,
  getSelectedProductOptionsPrice,
  resolveSelectedProductOptions,
  toggleProductOption,
} from "@/lib/data/project-variants";
import { getProducerById, getProducerPhotoUrl } from "@/lib/data/producers";
import { getProductAltSubject } from "@/lib/product-alt";
import { getProjectBySlugOrId } from "@/lib/data/projects";
import type { CompletionStandard } from "@/lib/data/types";
import { getClientIdForUser, getFavoritedProductIds, getProductOptionGroups } from "@/lib/db/queries";
import { routing, type Locale } from "@/lib/i18n/routing";
import { resolveProductHref } from "@/lib/product-family-groups";

const priceFormatter = new Intl.NumberFormat("pl-PL", { maximumFractionDigits: 0 });

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

// Produkt musi być spa-modulowe/sauna, inaczej 404 (spec 0061 AC-11): żadna
// strona produktu nie renderuje cudzego produktu pod swoim adresem.
function isSaunaProduct(project: { family: string; spaSubcategory?: string | null }): boolean {
  return project.family === "spa-modulowe" && project.spaSubcategory === "sauna";
}

export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const [project, t] = await Promise.all([
    getProjectBySlugOrId(slug, locale as Locale),
    getTranslations({ locale, namespace: "SaunaPage" }),
  ]);
  if (!project || !isSaunaProduct(project)) return {};

  const priceLabel = project.priceOnRequest
    ? t("priceOnRequest").toLowerCase()
    : `${t("from")} ${priceFormatter.format(project.priceMin)} €`;
  const altSubject = await getProductAltSubject(project, locale);
  const description = `${altSubject}, ${priceLabel}.`;
  const canonicalSegment = project.slug ?? project.id;
  const canonicalPath = `/${locale}/sauna/${canonicalSegment}`;

  const languageAlternates = Object.fromEntries(
    routing.locales.map((code) => [code, `/${code}/sauna/${canonicalSegment}`]),
  );

  return {
    title: `${altSubject} | ModularHub Europe`,
    description,
    alternates: {
      canonical: canonicalPath,
      languages: { ...languageAlternates, "x-default": `/${routing.defaultLocale}/sauna/${canonicalSegment}` },
    },
    // Spec 0058 AC-7, spec 0061 AC-9: ten sam wzorzec co /project/[slug] i /outdoor-tv/[slug].
    ...(project.status !== "published" ? { robots: { index: false, follow: false } } : {}),
    openGraph: {
      title: project.name,
      description,
      url: canonicalPath,
      images: [{ url: project.coverImageUrl, alt: altSubject }],
    },
  };
}

export default async function SaunaPage({
  params,
  searchParams,
}: {
  params: Promise<PageParams>;
  searchParams: Promise<PageSearchParams>;
}) {
  const [{ locale, slug }, rawSearchParams, t, tGallery] = await Promise.all([
    params,
    searchParams,
    getTranslations("SaunaPage"),
    getTranslations("ProjectGallery"),
  ]);
  const project = await getProjectBySlugOrId(slug, locale as Locale);
  if (!project) notFound();
  // Strażnik rodziny/podkategorii (spec 0061 AC-11): każdy stary lub błędny
  // link na inny produkt trafia na jego właściwy route zamiast renderować się
  // tutaj po cichu, na stronie zbudowanej wyłącznie pod sauny.
  if (!isSaunaProduct(project)) {
    redirect(resolveProductHref(project.family, project.id, locale, project.slug, project.spaSubcategory));
  }
  // Wejście po id, gdy produkt już ma slug, przekierowuje trwale (308) na
  // kanoniczny adres ze slugiem, z zachowaniem całego ciągu zapytania (spec
  // 0058 AC-4); produkt bez sluga jeszcze renderuje się normalnie pod
  // adresem z id, bez przekierowania (AC-5).
  if (project.slug && project.slug !== slug) {
    permanentRedirect(`/${locale}/sauna/${project.slug}${preserveQuery(rawSearchParams)}`);
  }

  const [producer, producerPhotoUrl, session, optionGroups] = await Promise.all([
    getProducerById(project.producerId, locale as Locale),
    getProducerPhotoUrl(project.producerId),
    auth(),
    getProductOptionGroups(project.id, locale as Locale),
  ]);

  const isClientSession = session?.user.role === "client";
  let isFavorited = false;
  if (session && isClientSession) {
    const clientId = await getClientIdForUser(session.user.id);
    if (clientId) isFavorited = (await getFavoritedProductIds(clientId)).has(project.id);
  }

  const altSubject = await getProductAltSubject(project);
  const galleryExtraImages = project.galleryImageUrls?.filter((url) => url.length > 0) ?? [];
  const lightboxImages = [
    { src: project.coverImageUrl, alt: altSubject },
    ...galleryExtraImages.map((url, index) => ({
      src: url,
      alt: tGallery("thumbnailAlt", { subject: altSubject, index: index + 2 }),
    })),
  ];

  const wariantParam = firstParam(rawSearchParams.wariant);
  // Dopasowanie po variant.id, nie completionStandard (ten sam powód co
  // komentarz w ProjectVariantPicker.tsx): sauna jest katalogowa, może mieć
  // wiele wariantów dzielących completionStandard = 'katalogowy' naraz.
  const selectedVariant =
    project.variants.find((variant) => variant.id === wariantParam) ?? getDefaultProjectVariant(project);

  // Spec 0059/0061 AC-4: piec, kolor impregnacji i panele podczerwieni żyją
  // jako opcje, nigdy w technicalSpecs — ten sam mechanizm cenowy co dziś dla
  // kontenerów Dampol, bez żadnej zmiany w logice.
  const resolvedOptions = resolveSelectedProductOptions(optionGroups, firstParam(rawSearchParams.opcje));
  const selectedOptionIds = flattenSelectedProductOptionIds(resolvedOptions);
  const optionsPrice = getSelectedProductOptionsPrice(optionGroups, selectedOptionIds);

  function hrefForVariant(variantId: string): string {
    const query = new URLSearchParams();
    query.set("wariant", variantId);
    return `/${locale}/sauna/${slug}?${query.toString()}`;
  }

  function hrefForOption(groupId: string, optionId: string): string {
    const query = new URLSearchParams();
    if (wariantParam) query.set("wariant", wariantParam);
    query.set("opcje", toggleProductOption(optionGroups, resolvedOptions, groupId, optionId));
    return `/${locale}/sauna/${slug}?${query.toString()}`;
  }

  // completionStandard jest tu tylko technicznym slotem wariantu (ten sam
  // wzorzec co /outdoor-tv/[slug]) — prawdziwa nazwa wariantu żyje w variantLabel.
  const standardLabel: Record<CompletionStandard, string> = {
    "surowy-zamkniety": t("variantFallbackLabel"),
    deweloperski: t("variantFallbackLabel"),
    "pod-klucz": t("variantFallbackLabel"),
    katalogowy: t("variantFallbackLabel"),
  };

  const zapytanieHref = `/${locale}/inquiry?projects=${project.id}${
    selectedVariant ? `&wariant=${selectedVariant.id}` : ""
  }`;

  // Spec 0059 AC-3, AC-4: cena = cena bazowa WYBRANEGO wariantu + suma
  // zaznaczonych opcji (ten sam wzorzec co /project/[slug], nie płaska
  // project.priceMin) — u Kory/WDH piec jest realną dopłatą, nie kosmetyczną,
  // więc cena musi ją odzwierciedlać od razu w hero, bez żadnej zmiany logiki.
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
  const hasSpecsSection = Boolean(project.saunaTechnicalSpecs);
  const hasDzialkaSection =
    Boolean(project.externalDimensions) || Boolean(project.foundationOptions) || (project.clientRequirements?.length ?? 0) > 0;
  const hasPartnerSection = Boolean(producer && (producer.description || producerPhotoUrl));
  const hasDokumentySection =
    Boolean(project.documents.find((doc) => doc.purpose === "product_specification")) || (project.faq?.length ?? 0) > 0;

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <GalleryLightboxProvider images={lightboxImages}>
        <div className="-mt-brand-5 flex flex-col gap-brand-6 pb-24 lg:mt-0 lg:pb-0">
          <div className="grid grid-cols-1 items-stretch gap-brand-4 lg:grid-cols-12">
            <div className="flex flex-col gap-brand-3 lg:col-span-7">
              <div className="lg:hidden">
                <ProjectGalleryCarousel coverImageUrl={project.coverImageUrl} galleryImageUrls={project.galleryImageUrls} altSubject={altSubject} />
              </div>
              <div className="hidden lg:block">
                <ProjectGalleryCover
                  coverImageUrl={project.coverImageUrl}
                  totalCount={galleryExtraImages.length + 1}
                  altSubject={altSubject}
                />
                <div className="mt-brand-2">
                  <ProjectGalleryThumbnails galleryImageUrls={project.galleryImageUrls} altSubject={altSubject} />
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
                  <Button as="a" href={zapytanieHref} size="lg" surface="v5" className="mt-brand-1 w-full sm:w-fit">
                    {t("sendInquiry")}
                  </Button>
                </Card>
              </div>
            </div>
          </div>

          {/* Spec 0061 AC-4: opcje dodatkowe konfiguratora (piec, kolor
              impregnacji, panele podczerwieni) zaraz po hero, przed sekcją
              wideo i specyfikacją — klient widzi dopłaty i decyduje o
              konfiguracji zanim przewinie do pozostałej treści, ten sam
              powód co /project/[slug] (spec 0059 follow-up). */}
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
              />
            </div>
          )}

          <ProjectVideoSection productName={project.name} videoUrl={project.videoUrl} usageNote={project.usageNote} />

          <ProjectSectionNav
            items={[
              { id: "opcje", label: t("sectionNav.opcje"), disabled: !hasOptionsSection },
              { id: "cechy", label: t("sectionNav.cechy"), disabled: !hasFeaturesSection },
              { id: "specyfikacja", label: t("sectionNav.specyfikacja"), disabled: !hasSpecsSection },
              { id: "dzialka", label: t("sectionNav.dzialka"), disabled: !hasDzialkaSection },
              { id: "partner", label: t("sectionNav.partner"), disabled: !hasPartnerSection },
              { id: "dokumenty", label: t("sectionNav.dokumenty"), disabled: !hasDokumentySection },
            ]}
            ariaLabel={t("sectionNavAriaLabel")}
            scrollLeftLabel={t("sectionNavScrollLeft")}
            scrollRightLabel={t("sectionNavScrollRight")}
          />

          {hasFeaturesSection && (
            <div id="cechy" className="scroll-mt-20">
              <ProjectFeatureTiles features={project.features} />
            </div>
          )}

          {hasSpecsSection && (
            <div id="specyfikacja" className="scroll-mt-20">
              <SaunaTechnicalSpecs specs={project.saunaTechnicalSpecs} />
            </div>
          )}

          {hasDzialkaSection && (
            <div id="dzialka" className="scroll-mt-20">
              <ProjectLogistics project={project} />
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
      </GalleryLightboxProvider>
    </>
  );
}
