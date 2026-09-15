import { Award, CheckCircle2, Minus, ShieldCheck, Truck } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import Image from "next/image";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { Button, Card, DataText, Heading, StatusPill, Text } from "@/components/ui";
import { BulkProductInquiryModal } from "@/components/klient/BulkProductInquiryModal";
import { FavoriteButton } from "@/components/klient/FavoriteButton";
import { ProducerCard } from "@/components/klient/ProducerCard";
import { ProjectCertifications } from "@/components/klient/ProjectCertifications";
import { ProjectGalleryCover, ProjectGalleryThumbnails } from "@/components/klient/ProjectGallery";
import { GalleryLightboxProvider } from "@/components/klient/ProjectGalleryLightbox";
import {
  AssemblyTimeIcon,
  BathroomsIcon,
  BedroomsIcon,
  CompletionStandardIcon,
  FloorAreaIcon,
  ProductionTimeIcon,
  RoomsIcon,
  StoreysIcon,
  WarrantyIcon,
} from "@/components/klient/ProjectSpecIcons";
import { ProjectTechnicalSpecs } from "@/components/klient/ProjectTechnicalSpecs";
import { getCountries } from "@/lib/data/countries";
import { getProducerById } from "@/lib/data/producers";
import { getEligibilityByCountry, getProducerVolumeProfile, getProjectById } from "@/lib/data/projects";
import type { EligibilityByCountry } from "@/lib/data/types";
import { getClientIdForUser, getFavoritedProductIds } from "@/lib/db/queries";
import { routing, type Locale } from "@/lib/i18n/routing";
import { parseResultsSearchParams } from "@/lib/results-filters";

const priceFormatter = new Intl.NumberFormat("pl-PL", { maximumFractionDigits: 0 });

function countBucket(count: number): "one" | "few" | "many" {
  return count === 1 ? "one" : count >= 2 && count <= 4 ? "few" : "many";
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
  const [{ locale, id }, rawSearchParams, t, tGallery] = await Promise.all([
    params,
    searchParams,
    getTranslations("KlientProjektPage"),
    getTranslations("ProjectGallery"),
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
  const descriptionImageUrl = galleryExtraImages.at(-1) ?? project.coverImageUrl;
  const isLongDescription = project.description.trim().length > 220;
  // Ta sama kolejność co okładka (index 0) + miniatury (index 1+) w
  // ProjectGalleryCover/Thumbnails — GalleryLightboxProvider musi widzieć
  // dokładnie ten sam zestaw zdjęć w tej samej kolejności, żeby strzałki w
  // modalu odpowiadały temu, na co kliknięto.
  const lightboxImages = [
    { src: project.coverImageUrl, alt: tGallery("coverAlt", { name: project.name }) },
    ...galleryExtraImages.map((url, index) => ({
      src: url,
      alt: tGallery("thumbnailAlt", { name: project.name, index: index + 2 }),
    })),
  ];

  // Cztery ustalenia handlowe, filtrowane do tych realnie znanych: dane
  // realnych dostawców bywają niepełne (Budman nie podaje gwarancji ani
  // czasu produkcji/montażu), a "0 lat"/"0–0 dni" czytałoby się jako fałszywe
  // zapewnienie, nie jako brak danych — ten sam wzorzec co ProjectTechnicalSpecs.
  const commercialTerms = [
    {
      icon: CompletionStandardIcon,
      label: t("completionStandardLabel"),
      value: t(`completionStandard.${project.commercial.completionStandard}`),
    },
    project.structuralWarrantyYears > 0
      ? {
          icon: WarrantyIcon,
          label: t("warrantyTermLabel"),
          value: t("warrantyYearsValue", { years: project.structuralWarrantyYears }),
        }
      : null,
    project.commercial.productionLeadTimeWeeksMax > 0
      ? {
          icon: ProductionTimeIcon,
          label: t("productionTimeLabel"),
          value: t("productionTimeValue", {
            min: project.commercial.productionLeadTimeWeeksMin,
            max: project.commercial.productionLeadTimeWeeksMax,
          }),
        }
      : null,
    project.commercial.onSiteAssemblyDaysMax > 0
      ? {
          icon: AssemblyTimeIcon,
          label: t("assemblyTimeLabel"),
          value:
            project.commercial.onSiteAssemblyDaysMin === project.commercial.onSiteAssemblyDaysMax
              ? t(project.commercial.onSiteAssemblyDaysMax === 1 ? "assemblyTimeOne" : "assemblyTimeMany", {
                  count: project.commercial.onSiteAssemblyDaysMax,
                })
              : t("assemblyTimeValue", {
                  min: project.commercial.onSiteAssemblyDaysMin,
                  max: project.commercial.onSiteAssemblyDaysMax,
                }),
        }
      : null,
  ].filter((entry): entry is NonNullable<typeof entry> => entry !== null);

  const query = countryCode ? `&country=${countryCode}` : "";
  const zapytanieHref = `/${locale}/inquiry?projects=${project.id}${query}`;
  const shortlistHref = `/${locale}/results?projects=${project.id}${query}`;
  const dzialkaHref = `/${locale}/plot?projects=${project.id}${query}`;

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
          się nie renderuje i CTA żyje tylko w treści strony. */}
      <GalleryLightboxProvider images={lightboxImages}>
      <div className="flex flex-col gap-brand-6 pb-24 lg:pb-0">
        {/* Hero: galeria + nazwa + cena + CTA (spec 0020 AC-1) — zdjęcia dostają
            wizualną przewagę (7 z 12 kolumn). Prawa kolumna jest wyrównana do
            wysokości samego zdjęcia głównego (items-stretch w tym wierszu), nie do
            całej galerii razem z paskiem miniatur — dlatego miniatury renderują się
            w osobnym wierszu siatki poniżej, poza tym stretch-em. */}
        <div className="grid grid-cols-1 items-stretch gap-brand-4 lg:grid-cols-12">
          {/* Pełna szerokość ekranu na mobile (przełamuje 6% padding Containera
              ujemnym marginesem) — na desktopie z powrotem w siatce 7/12. */}
          <div className="-mx-[6%] lg:col-span-7 lg:mx-0">
            <ProjectGalleryCover
              coverImageUrl={project.coverImageUrl}
              totalCount={galleryExtraImages.length + 1}
              projectName={project.name}
              className="max-lg:rounded-none"
            />
          </div>
          <div className="flex h-full flex-col justify-between gap-brand-3 lg:col-span-5">
            <div className="flex flex-col gap-brand-3">
              <div className="flex items-start justify-between gap-brand-2">
                <div className="flex flex-col gap-1">
                  <Heading level="h1" surface="v5">
                    {project.name}
                  </Heading>
                  <Text tone="muted" surface="v5">
                    {project.producerName} · {countryName}
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

              <Card padding="lg" surface="v5" className="flex flex-col gap-brand-2 border-brand-v5-amber-strong/30">
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
                ) : (
                  <>
                    <Text variant="label" tone="muted" surface="v5">
                      {t("estimatedPackage")}
                    </Text>
                    <DataText as="p" surface="v5" className="text-h2 font-semibold">
                      {t("from")} {priceFormatter.format(project.priceMin)} €
                    </DataText>
                    <Text tone="muted" surface="v5" className="text-data">
                      {t("packageIncludes")}
                    </Text>
                  </>
                )}
                <Button as="a" href={zapytanieHref} size="lg" surface="v5" className="mt-brand-1 w-full sm:w-fit">
                  {t("sendInquiry")}
                </Button>
              </Card>
            </div>

            {/* Szybkie sygnały zaufania, przypięte do dołu kolumny (czyli do dołu
                zdjęcia) — ten sam moment decyzji nie musi czekać na scroll do
                sekcji technicznej, żeby zbić pierwsze obawy. */}
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
              {project.commercial.onSiteAssemblyDaysMax > 0 && (
                <span className="flex items-center gap-brand-1">
                  <Truck className="size-4 shrink-0 text-status-approved" aria-hidden="true" />
                  <Text className="text-data" tone="muted" surface="v5">
                    {project.commercial.onSiteAssemblyDaysMin === project.commercial.onSiteAssemblyDaysMax
                      ? t(project.commercial.onSiteAssemblyDaysMax === 1 ? "assemblyDaysOne" : "assemblyDaysMany", {
                          count: project.commercial.onSiteAssemblyDaysMax,
                        })
                      : t("assemblyDays", {
                          min: project.commercial.onSiteAssemblyDaysMin,
                          max: project.commercial.onSiteAssemblyDaysMax,
                        })}
                  </Text>
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <ProjectGalleryThumbnails galleryImageUrls={project.galleryImageUrls} projectName={project.name} />
          </div>
        </div>

        <div className="flex flex-col gap-brand-5">
          {/* Kluczowe dane skrótowo (spec 0020 AC-1). Powierzchnia jest tym, co
              pierwsze pada w rozmowie o domu, więc dostaje osobną, większą kolumnę
              (grubsza plakietka, text-h1) — reszta parametrów stoi obok, mniejsza,
              oddzielona pionową kreską. Kontrast rozmiaru robi hierarchię zamiast
              jednego rzędu identycznych kafli, a rysunkowe ikony (linia wymiarowa,
              rozwarcie drzwi, rzut łóżka...) mówią czego dotyczy dany parametr,
              zamiast być zamiennym glifem z biblioteki. */}
          <div className="flex flex-col gap-brand-4 rounded-v5-card border-2 border-brand-v5-ink bg-brand-v5-surface p-brand-4 sm:p-brand-5">
            <div className="flex items-center gap-brand-3 border-b border-brand-v5-line pb-brand-4">
              <span className="flex size-16 shrink-0 items-center justify-center rounded-data bg-brand-v5-ink">
                <FloorAreaIcon className="size-8 text-brand-v5-paper" />
              </span>
              <div className="flex flex-col">
                <DataText surface="v5" className="text-h2 font-black leading-none">
                  {project.floorAreaM2} m²
                </DataText>
                <Text variant="label" tone="muted" surface="v5" className="font-semibold">
                  {t("floorAreaLabel")}
                </Text>
              </div>
            </div>

            <div className="grid min-w-0 grid-cols-2 gap-brand-4 sm:grid-cols-4">
              {(
                [
                  {
                    icon: RoomsIcon,
                    value: String(project.rooms),
                    label: t(`roomsLabel.${countBucket(project.rooms)}`),
                  },
                  project.bedrooms > 0
                    ? {
                        icon: BedroomsIcon,
                        value: String(project.bedrooms),
                        label: t(`bedroomsLabel.${countBucket(project.bedrooms)}`),
                      }
                    : null,
                  {
                    icon: BathroomsIcon,
                    value: String(project.bathrooms),
                    label: t(`bathroomsLabel.${project.bathrooms === 1 ? "one" : "other"}`),
                  },
                  {
                    icon: StoreysIcon,
                    value: String(project.storeys),
                    label: t(`storeysLabel.${project.storeys === 1 ? "one" : "other"}`),
                  },
                ] as const
              )
                .filter((entry) => entry !== null)
                .map(({ icon: Icon, value, label }) => (
                <div
                  key={label}
                  className="flex min-w-0 items-center gap-brand-2"
                >
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-data bg-brand-v5-amber/10">
                    <Icon className="size-6 text-brand-v5-amber-strong" />
                  </span>
                  <div className="flex min-w-0 flex-col">
                    <DataText surface="v5" className="text-body-l font-black leading-none">
                      {value}
                    </DataText>
                    <Text variant="label" tone="muted" surface="v5" className="text-[0.6875rem] font-semibold">
                      {label}
                    </Text>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {project.description.trim().length > 0 && (
            <div className="grid grid-cols-1 gap-brand-5 lg:grid-cols-12 lg:items-center lg:gap-brand-6">
              <div className="flex flex-col gap-brand-3 lg:col-span-7">
                <Text variant="label" tone="muted" surface="v5">
                  {t("descriptionLabel")}
                </Text>
                {isLongDescription ? (
                  // Bez JS: `details[open]` w obrębie `.group/desc` steruje przez
                  // `group-has-[[open]]` czy tekst jest przycięty i którą etykietę
                  // pokazać — jeden przełącznik zamiast osobnego stanu klienckiego.
                  <div className="group/desc flex flex-col items-start gap-brand-2">
                    <Text
                      variant="bodyL"
                      surface="v5"
                      measure
                      className="text-h3 leading-snug line-clamp-4 group-has-[[open]]/desc:line-clamp-none"
                    >
                      {project.description}
                    </Text>
                    <details>
                      <summary className="focus-ring w-fit cursor-pointer list-none text-body-l font-semibold text-brand-v5-ink underline underline-offset-2 [&::-webkit-details-marker]:hidden">
                        <span className="group-has-[[open]]/desc:hidden">{t("showMore")}</span>
                        <span className="hidden group-has-[[open]]/desc:inline">{t("showLess")}</span>
                      </summary>
                    </details>
                  </div>
                ) : (
                  <Text variant="bodyL" surface="v5" measure className="text-h3 leading-snug">
                    {project.description}
                  </Text>
                )}
              </div>
              {descriptionImageUrl && (
                <div className="hidden lg:col-span-5 lg:block">
                  <div className="relative aspect-[4/3] overflow-hidden rounded-v5-card">
                    <Image
                      src={descriptionImageUrl}
                      alt={t("descriptionImageAlt", { name: project.name })}
                      fill
                      sizes="(min-width: 1024px) 33vw, 100vw"
                      className="object-cover"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-brand-4">
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

        <div className="flex flex-col gap-brand-4">
          <Heading level="h2" surface="v5" className="text-h3">
            {t("commercialTermsHeading")}
          </Heading>
          {/* Cztery ustalenia handlowe, każde odpowiada na inne pytanie kupującego
              (w jakim stanie odbieram dom / na ile lat / jak długo czekam / ile trwa
              montaż) — stąd własna, rysunkowa ikona przy każdym, a nie ten sam wzorzec
              wizualny co pasek "kluczowe dane" wyżej. Siatka z gap-px i wspólnym tłem
              rysuje cienkie linie podziału niezależnie od liczby kolumn na danej
              szerokości ekranu, bez osobnej logiki obramowań na komórkę. */}
          <dl
            className={`grid grid-cols-1 gap-px overflow-hidden rounded-v5-card border border-brand-v5-line bg-brand-v5-line ${commercialTerms.length > 1 ? "sm:grid-cols-2" : ""}`}
          >
            {commercialTerms.map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-center gap-brand-3 bg-brand-v5-surface p-brand-4">
                <span className="flex size-12 shrink-0 items-center justify-center rounded-data border border-brand-v5-ink/15 bg-brand-v5-ink/5">
                  <Icon className="size-6 text-brand-v5-ink" />
                </span>
                <div className="flex flex-col gap-0.5">
                  <Text as="dt" variant="label" tone="muted" surface="v5">
                    {label}
                  </Text>
                  <DataText as="dd" surface="v5" className="text-h3 font-semibold leading-tight">
                    {value}
                  </DataText>
                </div>
              </div>
            ))}
          </dl>

          {(project.commercial.priceIncludes.length > 0 || project.commercial.priceExcludes.length > 0) && (
            <div className="grid gap-brand-3 sm:grid-cols-2">
              {project.commercial.priceIncludes.length > 0 && (
                <div className="flex flex-col gap-brand-3 rounded-v5-card border border-status-approved/30 bg-status-approved/5 p-brand-4">
                  <Text variant="label" tone="muted" surface="v5">
                    {t("priceIncludesHeading")}
                  </Text>
                  <ul className="flex flex-col gap-brand-2">
                    {project.commercial.priceIncludes.map((item) => (
                      <li key={item} className="flex items-start gap-brand-2">
                        <CheckCircle2
                          className="mt-0.5 size-4 shrink-0 text-status-approved"
                          aria-hidden="true"
                        />
                        <Text as="span" surface="v5">
                          {item}
                        </Text>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {project.commercial.priceExcludes.length > 0 && (
                <div className="flex flex-col gap-brand-3 rounded-v5-card border border-brand-v5-line bg-brand-v5-line/10 p-brand-4">
                  <Text variant="label" tone="muted" surface="v5">
                    {t("priceExcludesHeading")}
                  </Text>
                  <ul className="flex flex-col gap-brand-2">
                    {project.commercial.priceExcludes.map((item) => (
                      <li key={item} className="flex items-start gap-brand-2">
                        <Minus className="mt-0.5 size-4 shrink-0 text-brand-v5-muted" aria-hidden="true" />
                        <Text as="span" tone="muted" surface="v5">
                          {item}
                        </Text>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
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

        {producer && (
          <div className="flex flex-col gap-brand-3">
            <Heading level="h2" surface="v5" className="text-h3">
              {t("producerHeading")}
            </Heading>
            <ProducerCard producer={producer} />
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

        <div className="flex flex-wrap items-center gap-brand-2 border-t border-brand-v5-line pt-brand-4">
          <Button as="a" href={zapytanieHref} size="lg" surface="v5">
            {t("sendInquiry")}
          </Button>
          <Button as="a" href={shortlistHref} variant="secondary" surface="v5">
            {t("addToShortlist")}
          </Button>
          <Button as="a" href={dzialkaHref} variant="secondary" surface="v5">
            {t("checkPlot")}
          </Button>
        </div>
      </div>
      </GalleryLightboxProvider>

      {/* Sticky CTA na mobile: cena + "Wyślij zapytanie" pod ręką bez scrollowania
          z powrotem do sekcji hero. Desktop ma tę samą akcję już w treści. */}
      <div className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-between gap-brand-3 border-t-2 border-brand-v5-ink bg-brand-v5-surface px-brand-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-brand-3 lg:hidden">
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
        <Button as="a" href={zapytanieHref} size="lg" surface="v5" className="shrink-0">
          {t("sendInquiry")}
        </Button>
      </div>
    </>
  );
}
