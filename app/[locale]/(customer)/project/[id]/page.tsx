import { Award, ShieldCheck, Truck } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { Button, Card, DataText, Heading, StatusPill, Text } from "@/components/ui";
import { BulkProductInquiryModal } from "@/components/klient/BulkProductInquiryModal";
import { FavoriteButton } from "@/components/klient/FavoriteButton";
import { ProducerRealizationsSection } from "@/components/klient/ProducerRealizationsSection";
import { ProjectCertifications } from "@/components/klient/ProjectCertifications";
import { ProjectCostComparisonTable } from "@/components/klient/ProjectCostComparisonTable";
import { ProjectDocumentsAndFaq } from "@/components/klient/ProjectDocumentsAndFaq";
import { ProjectGalleryTabs, type GalleryTabKey } from "@/components/klient/ProjectGalleryTabs";
import { GalleryLightboxProvider } from "@/components/klient/ProjectGalleryLightbox";
import { ProjectLogistics } from "@/components/klient/ProjectLogistics";
import { ProjectRoomLayout } from "@/components/klient/ProjectRoomLayout";
import { ProjectSectionNav } from "@/components/klient/ProjectSectionNav";
import { ProjectTechnicalSpecs } from "@/components/klient/ProjectTechnicalSpecs";
import { ProjectTimeline } from "@/components/klient/ProjectTimeline";
import { ProjectVariantPicker } from "@/components/klient/ProjectVariantPicker";
import { getCountries } from "@/lib/data/countries";
import { getProducerById } from "@/lib/data/producers";
import { getDisplayProjectVariants, getEligibilityByCountry, getProducerVolumeProfile, getProjectById } from "@/lib/data/projects";
import type { CompletionStandard, EligibilityByCountry } from "@/lib/data/types";
import { getClientIdForUser, getFavoritedProductIds } from "@/lib/db/queries";
import { routing, type Locale } from "@/lib/i18n/routing";
import { parseResultsSearchParams } from "@/lib/results-filters";

const priceFormatter = new Intl.NumberFormat("pl-PL", { maximumFractionDigits: 0 });

function countBucket(count: number): "one" | "few" | "many" {
  return count === 1 ? "one" : count >= 2 && count <= 4 ? "few" : "many";
}

function firstParam(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" ? value : undefined;
}

// Klon dzisiejszego search params z jedną nadpisaną wartością (spec 0042
// AC-1): przełącznik wariantu i zakładki galerii idą przez zwykłą nawigację
// <Link>, nie stan klienta, więc każdy inny parametr (np. country) musi
// przetrwać zmianę.
function buildQueryHref(searchParams: PageSearchParams, overrides: Record<string, string | undefined>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    const resolved = firstParam(value);
    if (resolved) params.set(key, resolved);
  }
  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) params.delete(key);
    else params.set(key, value);
  }
  const query = params.toString();
  return query ? `?${query}` : "";
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
    getTranslations({ locale, namespace: "KlientProjektPage" }),
  ]);
  if (!project) return {};

  const priceLabel = project.priceOnRequest
    ? t("priceOnRequest").toLowerCase()
    : `${t("from")} ${priceFormatter.format(project.priceMin)} €`;
  const roomsLabel = t(`roomsLabel.${countBucket(project.rooms)}`);
  const description = `${project.name} ${t("from")} ${project.producerName} — ${project.floorAreaM2} m², ${project.rooms} ${roomsLabel}, ${priceLabel}.`;
  const canonicalPath = `/${locale}/project/${project.id}`;

  // Ten sam zasób pod trzema prefiksami języka (AC-8): x-default wskazuje na
  // /pl, bo to jedyny język z gwarantowaną, kompletną treścią dziś.
  const languageAlternates = Object.fromEntries(
    routing.locales.map((code) => [code, `/${code}/project/${project.id}`]),
  );

  return {
    title: `${project.name} — ${project.producerName} | ModularHub Europe`,
    description,
    alternates: {
      canonical: canonicalPath,
      languages: { ...languageAlternates, "x-default": `/${routing.defaultLocale}/project/${project.id}` },
    },
    openGraph: {
      title: project.name,
      description,
      url: canonicalPath,
      images: [{ url: project.coverImageUrl }],
    },
  };
}

export default async function ProjektPage({
  params,
  searchParams,
}: {
  params: Promise<PageParams>;
  searchParams: Promise<PageSearchParams>;
}) {
  const [{ locale, id }, rawSearchParams, t, tGallery, tOptions] = await Promise.all([
    params,
    searchParams,
    getTranslations("KlientProjektPage"),
    getTranslations("ProjectGallery"),
    getTranslations("ProjectOptions"),
  ]);
  const project = await getProjectById(id, locale as Locale);
  if (!project) notFound();

  const { countryCode } = parseResultsSearchParams(rawSearchParams);

  const [countries, producer, eligibilityRows, session, volumeProfile] = await Promise.all([
    getCountries(),
    getProducerById(project.producerId),
    countryCode
      ? getEligibilityByCountry(countryCode)
      : Promise.resolve<EligibilityByCountry[]>([]),
    auth(),
    getProducerVolumeProfile(project.producerId),
  ]);

  const isClientSession = session?.user.role === "client";
  let isFavorited = false;
  if (session && isClientSession) {
    const clientId = await getClientIdForUser(session.user.id);
    if (clientId) isFavorited = (await getFavoritedProductIds(clientId)).has(project.id);
  }

  const countryNameByCode = new Map(countries.map((country) => [country.code, country.name]));
  const countryName = countryNameByCode.get(project.countryOfProduction) ?? project.countryOfProduction;
  const targetCountryName = countryCode
    ? (countryNameByCode.get(countryCode) ?? countryCode)
    : undefined;
  const eligibility = eligibilityRows.find((row) => row.projectId === project.id);
  const galleryExtraImages = project.galleryImageUrls?.filter((url) => url.length > 0) ?? [];
  // Ta sama kolejność co okładka (index 0) + miniatury (index 1+) w
  // ProjectGalleryTabs (zakładka Wizualizacje) — GalleryLightboxProvider musi
  // widzieć dokładnie ten sam zestaw zdjęć w tej samej kolejności, żeby
  // strzałki w modalu odpowiadały temu, na co kliknięto.
  const lightboxImages = [
    { src: project.coverImageUrl, alt: tGallery("coverAlt", { name: project.name }) },
    ...galleryExtraImages.map((url, index) => ({
      src: url,
      alt: tGallery("thumbnailAlt", { name: project.name, index: index + 2 }),
    })),
  ];

  // Wszystkie trzy standardy wykończenia są zawsze wybieralne (enum
  // zamknięty), niezależnie od tego, ile ma ich dziś wypełniony
  // `product_variant` — standard bez wiersza w bazie to placeholder
  // (getDisplayProjectVariants), żeby klient widział cały układ od razu.
  const displayVariants = getDisplayProjectVariants(project);
  // Wariant wybrany przez parametr adresu URL (spec 0042 AC-1): is_default,
  // a w jego braku pierwszy wg sort_order wśród realnych wariantów.
  const wariantParam = firstParam(rawSearchParams.wariant);
  const defaultRealVariant = project.variants.find((variant) => variant.isDefault) ?? project.variants[0];
  const selectedVariant =
    displayVariants.find((variant) => variant.completionStandard === wariantParam) ??
    (defaultRealVariant
      ? displayVariants.find((variant) => variant.completionStandard === defaultRealVariant.completionStandard)
      : displayVariants[0]);
  const zakladkaParam = firstParam(rawSearchParams.zakladka);
  const activeGalleryTab: GalleryTabKey = zakladkaParam === "rzut" ? zakladkaParam : "wizualizacje";

  function hrefForVariant(standard: CompletionStandard): string {
    return `/${locale}/project/${project!.id}${buildQueryHref(rawSearchParams, { wariant: standard })}`;
  }
  function hrefForGalleryTab(tab: GalleryTabKey): string {
    return `/${locale}/project/${project!.id}${buildQueryHref(rawSearchParams, { zakladka: tab === "wizualizacje" ? undefined : tab })}`;
  }

  const standardLabel: Record<CompletionStandard, string> = {
    "surowy-zamkniety": t("completionStandard.surowy-zamkniety"),
    deweloperski: t("completionStandard.deweloperski"),
    "pod-klucz": t("completionStandard.pod-klucz"),
  };
  const montazStage = selectedVariant?.timelineStages.find((stage) => stage.stageKey === "montaz");

  // Odznaka przeznaczenia (spec 0042 AC-13): family + category, już
  // istniejące pola, tylko luka w renderze — bez zmiany schematu. Category
  // jest znacząca tylko dla family "dom" (lib/data/types.ts).
  const familyLabel = tOptions(`family.${project.family}`);
  const purposeBadge =
    project.family === "dom" ? `${familyLabel} ${tOptions(`category.${project.category}`).toLowerCase()}` : familyLabel;

  const query = countryCode ? `&country=${countryCode}` : "";
  // Wariant przenosi się dalej do linku zapytania (AC-1), żeby wybór nie
  // zgubił się przy przejściu do formularza.
  const variantQuery = selectedVariant ? `&wariant=${selectedVariant.completionStandard}` : "";
  const zapytanieHref = `/${locale}/inquiry?projects=${project.id}${query}${variantQuery}`;
  const shortlistHref = `/${locale}/results?projects=${project.id}${query}`;

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
            "@type": "AggregateOffer",
            priceCurrency: "EUR",
            lowPrice: project.priceMin,
            highPrice: project.priceMax,
            availability: "https://schema.org/InStock",
          },
        }),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {/* pb-24 rezerwuje miejsce pod sticky pasek CTA na mobile (fixed, więc nie
          zajmuje miejsca w layoucie samodzielnie) — zdejmowane na lg, gdzie pasek
          się nie renderuje i CTA żyje tylko w treści strony. -mt-brand-5 na
          mobile znosi pt-brand-5 z RouteShell, żeby zdjęcie zaczynało się od
          razu pod navbarem, bez oddechu nad nim (desktopowy odstęp zostaje). */}
      <GalleryLightboxProvider images={lightboxImages}>
      <div className="-mt-brand-5 flex flex-col gap-brand-6 pb-24 lg:mt-0 lg:pb-0">
        {/* Hero: galeria (z zakładkami) + nazwa + przeznaczenie + cena i wariant +
            CTA (spec 0020 AC-1, spec 0042 AC-1, AC-13) — zdjęcia dostają wizualną
            przewagę (7 z 12 kolumn). Prawa kolumna jest wyrównana do wysokości
            samej galerii (items-stretch w tym wierszu). */}
        <div className="grid grid-cols-1 items-stretch gap-brand-4 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <ProjectGalleryTabs
              projectName={project.name}
              coverImageUrl={project.coverImageUrl}
              galleryImageUrls={project.galleryImageUrls}
              documents={project.documents}
              selectedVariantId={selectedVariant?.id}
              activeTab={activeGalleryTab}
              hrefFor={hrefForGalleryTab}
            />
          </div>
          <div className="flex h-full flex-col justify-between gap-brand-3 lg:col-span-5">
            <div className="flex flex-col gap-brand-3">
              <div className="flex items-start justify-between gap-brand-2">
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <Heading level="h1" surface="v5">
                    {project.name}
                  </Heading>
                  <div className="flex flex-wrap items-center gap-brand-2">
                    <span className="rounded-data border border-brand-v5-line px-brand-1 py-0.5 text-label font-semibold uppercase tracking-[0.1em] text-brand-v5-muted">
                      {purposeBadge}
                    </span>
                    <Text tone="muted" surface="v5">
                      {project.producerName} · {countryName}
                    </Text>
                  </div>
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
                variants={displayVariants}
                selectedVariantId={selectedVariant?.id ?? ""}
                hrefFor={hrefForVariant}
                standardLabel={standardLabel}
                ariaLabel={t("variantPickerAriaLabel")}
              />

              <Card padding="lg" surface="v5" className="flex flex-col gap-brand-3 border-brand-v5-amber-strong/30">
                {project.priceOnRequest ? (
                  <>
                    <Text variant="label" tone="muted" surface="v5">
                      {t("price")}
                    </Text>
                    <DataText as="p" surface="v5" className="text-h2 font-semibold">
                      {t("priceOnRequest")}
                    </DataText>
                    <Text tone="muted" surface="v5" className="text-data">
                      {t("priceOnRequestHint")}
                    </Text>
                  </>
                ) : selectedVariant?.priceMin !== undefined && selectedVariant?.priceMax !== undefined ? (
                  <>
                    <Text variant="label" tone="muted" surface="v5">
                      {t("priceForStandard", { standard: standardLabel[selectedVariant.completionStandard] })}
                    </Text>
                    <DataText as="p" surface="v5" className="text-h2 font-semibold">
                      {priceFormatter.format(selectedVariant.priceMin)} €{" "}
                      <Text as="span" tone="muted" surface="v5" className="text-body-l font-normal">
                        {t("netVat")}
                      </Text>
                    </DataText>
                    <Text tone="muted" surface="v5" className="text-data">
                      {t("vatDisclaimer")}
                    </Text>
                    {selectedVariant.scopeSummary && (
                      <Text tone="muted" surface="v5" className="text-data">
                        {selectedVariant.scopeSummary}
                      </Text>
                    )}
                    {(() => {
                      const pendingCount = selectedVariant.costLineItems.filter(
                        (item) => item.status === "do-wyceny",
                      ).length;
                      return (
                        <div className="hidden items-baseline justify-between gap-brand-3 border-t border-dashed border-brand-v5-line pt-brand-2 lg:flex">
                          <Text tone="muted" surface="v5" className="text-data">
                            {t("knownCostSum")}
                          </Text>
                          <DataText surface="v5" className="text-right text-body-l font-semibold">
                            {priceFormatter.format(selectedVariant.priceMin)} €
                            {pendingCount > 0 && (
                              <Text as="span" tone="muted" surface="v5" className="ml-1 text-data font-normal">
                                {t(`pendingCostItems.${countBucket(pendingCount)}`, { count: pendingCount })}
                              </Text>
                            )}
                          </DataText>
                        </div>
                      );
                    })()}
                  </>
                ) : project.variants.length === 0 ? (
                  // Produkt bez żadnego jeszcze wypełnionego product_variant
                  // (Follow-up spec 0041): pokazuje starą, płaską cenę
                  // project.priceMin bez opisu zakresu — nigdy fałszywe
                  // "wycena indywidualna" (spec 0042 AC-11).
                  <>
                    <Text variant="label" tone="muted" surface="v5">
                      {t("estimatedPackage")}
                    </Text>
                    <DataText as="p" surface="v5" className="text-h2 font-semibold">
                      {t("from")} {priceFormatter.format(project.priceMin)} €
                    </DataText>
                  </>
                ) : (
                  // Ten konkretny standard nie ma jeszcze własnego wiersza w
                  // product_variant, choć inne standardy tego produktu mają —
                  // jawny placeholder zamiast cichego przełączenia na płaską cenę.
                  <>
                    <Text variant="label" tone="muted" surface="v5">
                      {t("priceForStandard", {
                        standard: standardLabel[selectedVariant!.completionStandard],
                      })}
                    </Text>
                    <StatusPill status="conditional">{t("toBeCompleted")}</StatusPill>
                    <Text tone="muted" surface="v5" className="text-data">
                      {t("scopeToBeCompleted")}
                    </Text>
                  </>
                )}
                <Button as="a" href={zapytanieHref} size="lg" surface="v5" className="mt-brand-1 w-full sm:w-fit">
                  {t("sendInquiry")}
                </Button>
                <Button as="a" href={shortlistHref} variant="secondary" surface="v5" className="w-full sm:w-fit">
                  {t("compareWithAnother")}
                </Button>
                <div className="flex flex-col gap-1">
                  <Text tone="muted" surface="v5" className="text-data">
                    {t.rich("inquiryGoesTo", {
                      producer: project.producerName,
                      b: (chunks) => (
                        <Text as="span" surface="v5" className="font-semibold">
                          {chunks}
                        </Text>
                      ),
                    })}
                  </Text>
                  {producer?.inquiryResponseTimeLabel ? (
                    <Text tone="muted" surface="v5" className="text-data">
                      {t("inquiryResponseTimeShort", { label: producer.inquiryResponseTimeLabel })}
                    </Text>
                  ) : (
                    <span className="flex flex-wrap items-center gap-brand-1">
                      <Text tone="muted" surface="v5" className="text-data">
                        {t("inquiryResponseTimeLabel")}
                      </Text>
                      <StatusPill status="conditional">{t("toBeCompleted")}</StatusPill>
                      <Text tone="muted" surface="v5" className="text-data">
                        · {t("noPurchaseObligation")}
                      </Text>
                    </span>
                  )}
                </div>
              </Card>
            </div>

            {/* Szybkie sygnały zaufania, przypięte do dołu kolumny — ten sam moment
                decyzji nie musi czekać na scroll do sekcji technicznej. */}
            <div className="flex flex-col gap-brand-2">
              {project.structuralWarrantyYears > 0 && (
                <span className="flex items-center gap-brand-1">
                  <ShieldCheck className="size-4 shrink-0 text-status-approved" aria-hidden="true" />
                  <Text className="text-data" tone="muted" surface="v5">
                    {t("warrantyYears", { years: project.structuralWarrantyYears })}
                  </Text>
                </span>
              )}
              {project.certifications && project.certifications.length > 0 && (
                <span className="flex items-center gap-brand-1">
                  <Award className="size-4 shrink-0 text-status-approved" aria-hidden="true" />
                  <Text className="text-data" tone="muted" surface="v5">
                    {t(`certifiedCount.${project.certifications.length === 1 ? "one" : "other"}`, {
                      count: project.certifications.length,
                    })}
                  </Text>
                </span>
              )}
              {montazStage && (montazStage.durationMaxDays ?? 0) > 0 && (
                <span className="flex items-center gap-brand-1">
                  <Truck className="size-4 shrink-0 text-status-approved" aria-hidden="true" />
                  <Text className="text-data" tone="muted" surface="v5">
                    {montazStage.durationMinDays === montazStage.durationMaxDays
                      ? t(montazStage.durationMaxDays === 1 ? "assemblyDaysOne" : "assemblyDaysMany", {
                          count: montazStage.durationMaxDays ?? 0,
                        })
                      : t("assemblyDays", {
                          min: montazStage.durationMinDays ?? 0,
                          max: montazStage.durationMaxDays ?? 0,
                        })}
                  </Text>
                </span>
              )}
            </div>
          </div>
        </div>

        <ProjectSectionNav
          items={[
            { id: "uklad", label: t("sectionNav.uklad") },
            { id: "cena", label: t("sectionNav.cena") },
            { id: "dzialka", label: t("sectionNav.dzialka") },
            { id: "harmonogram", label: t("sectionNav.harmonogram") },
            { id: "komfort", label: t("sectionNav.komfort") },
            { id: "producent", label: t("sectionNav.producent") },
            { id: "dokumenty", label: t("sectionNav.dokumenty") },
            { id: "podobne", label: t("sectionNav.podobne"), disabled: true },
          ]}
          ariaLabel={t("sectionNavAriaLabel")}
          scrollLeftLabel={t("sectionNavScrollLeft")}
          scrollRightLabel={t("sectionNavScrollRight")}
        />

        <div className="flex flex-col gap-brand-5">
          <div id="uklad" className="scroll-mt-20">
            <ProjectRoomLayout
              rooms={project.roomLayout ?? []}
              roomCount={project.rooms}
              bathroomCount={project.bathrooms}
              projectName={project.name}
              coverImageUrl={project.coverImageUrl}
              documents={project.documents}
            />
          </div>

        </div>

        {/* Cena i zakres: tabela porównawcza pokazuje zawsze wszystkie trzy
            standardy wykończenia (getDisplayProjectVariants), niezależnie od
            tego, ile ma ich dziś wypełniony product_variant — standard bez
            danych pokazuje "do uzupełnienia" zamiast znikać razem z całą
            sekcją (świadome odejście od pierwotnego AC-2/AC-3/AC-11). */}
        <div id="cena" className="flex scroll-mt-20 flex-col gap-brand-4">
          <Heading level="h2" surface="v5" className="text-h3">
            {t("priceAndScopeHeading")}
          </Heading>
          <ProjectCostComparisonTable variants={displayVariants} />
        </div>

        <div id="dzialka" className="scroll-mt-20">
          <ProjectLogistics project={project} />
        </div>

        <div id="harmonogram" className="scroll-mt-20">
          <ProjectTimeline stages={selectedVariant?.timelineStages ?? []} />
        </div>

        <div id="komfort" className="flex scroll-mt-20 flex-col gap-brand-4">
          <ProjectTechnicalSpecs project={project} />

          {(project.certifications?.length || project.simplifiedPermitEligible !== undefined) && (
            <div className="flex flex-col gap-brand-2">
              <ProjectCertifications certifications={project.certifications} />
              {project.simplifiedPermitEligible !== undefined && (
                <StatusPill status={project.simplifiedPermitEligible ? "approved" : "blocked"}>
                  {project.simplifiedPermitEligible
                    ? t("simplifiedPermitEligible")
                    : t("simplifiedPermitNotEligible")}
                </StatusPill>
              )}
            </div>
          )}
        </div>

        {producer && (
          <div id="producent" className="flex scroll-mt-20 flex-col gap-brand-3">
            <Heading level="h2" surface="v5" className="text-h3">
              {t("producerHeading")}
            </Heading>
            <ProducerRealizationsSection
              producer={producer}
              projectName={project.name}
              documents={project.documents}
              selectedVariantId={selectedVariant?.id}
            />
          </div>
        )}

        <div id="dokumenty" className="scroll-mt-20">
          <ProjectDocumentsAndFaq faq={project.faq} documents={project.documents} />
        </div>

        {countryCode && eligibility && (
          <div className="flex flex-col gap-brand-2">
            <Heading level="h2" surface="v5" className="text-h3">
              {t("legalComplianceHeading", { country: targetCountryName ?? countryCode })}
            </Heading>
            <StatusPill status={eligibility.status}>{t(`status.${eligibility.status}`)}</StatusPill>
            <Text tone="muted" surface="v5">
              {eligibility.reason}
            </Text>
          </div>
        )}

        {volumeProfile && (
          <div className="flex flex-col gap-brand-2 rounded-v5-card border border-brand-v5-amber-strong/30 bg-brand-v5-amber/5 p-brand-4">
            <Heading level="h2" surface="v5" className="text-h3">
              {t("bulkInquiryHeading")}
            </Heading>
            <Text tone="muted" surface="v5">
              {t("bulkInquiryBody")}
            </Text>
            <BulkProductInquiryModal productId={project.id} countries={countries} />
          </div>
        )}

      </div>
      </GalleryLightboxProvider>

      {/* Sticky CTA na mobile: cena + ulubione + "Wyślij zapytanie" pod ręką
          bez scrollowania do hero. Shortlista/działka jako osobne akcje tu
          zostały wycofane (na razie nieużywane funkcjonalności) na rzecz
          serca — jedyna z trzech, która ma dziś realne działanie
          (toggleFavorite, patrz FavoriteButton). Desktop ma "Wyślij
          zapytanie" już w treści. */}
      <div className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-between gap-brand-2 border-t-2 border-brand-v5-ink bg-brand-v5-surface px-brand-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-brand-3 lg:hidden">
        <div className="flex min-w-0 flex-col">
          {project.priceOnRequest ? (
            <DataText surface="v5" className="truncate text-body-l font-semibold">
              {t("priceOnRequest")}
            </DataText>
          ) : (
            <>
              <Text variant="label" tone="muted" surface="v5">
                {t("from")}
              </Text>
              <DataText surface="v5" className="text-body-l font-black leading-none">
                {priceFormatter.format(project.priceMin)} €
              </DataText>
            </>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-brand-2">
          <FavoriteButton
            productId={project.id}
            productName={project.name}
            locale={locale}
            isClientSession={isClientSession}
            initialFavorited={isFavorited}
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
