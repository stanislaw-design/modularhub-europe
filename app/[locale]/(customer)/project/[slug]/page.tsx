import { Award, ShieldCheck, Truck } from "lucide-react";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { notFound, permanentRedirect, redirect } from "next/navigation";
import { auth } from "@/auth";
import { Button, Card, DataText, Heading, StatusPill, Text } from "@/components/ui";
import { BulkProductInquiryModal } from "@/components/klient/BulkProductInquiryModal";
import { FavoriteButton } from "@/components/klient/FavoriteButton";
import { ProducerRealizationsSection } from "@/components/klient/ProducerRealizationsSection";
import { ProjectCertifications } from "@/components/klient/ProjectCertifications";
import { ProjectComplianceAssessments } from "@/components/klient/ProjectComplianceAssessments";
import { ProjectCostComparisonTable } from "@/components/klient/ProjectCostComparisonTable";
import { ProjectEnvelopeParameters } from "@/components/klient/ProjectEnvelopeParameters";
import { ProjectDocumentsAndFaq } from "@/components/klient/ProjectDocumentsAndFaq";
import { ProjectGalleryTabs, type GalleryTabKey } from "@/components/klient/ProjectGalleryTabs";
import { GalleryLightboxProvider } from "@/components/klient/ProjectGalleryLightbox";
import { ProjectLogistics } from "@/components/klient/ProjectLogistics";
import { ProjectOptionsConfigurator } from "@/components/klient/ProjectOptionsConfigurator";
import { ProjectRoomLayout } from "@/components/klient/ProjectRoomLayout";
import { ProjectSectionNav } from "@/components/klient/ProjectSectionNav";
import { ProjectTechnicalSpecs } from "@/components/klient/ProjectTechnicalSpecs";
import { ProjectTimeline } from "@/components/klient/ProjectTimeline";
import { ProjectVariantPicker } from "@/components/klient/ProjectVariantPicker";
import { getCountries } from "@/lib/data/countries";
import { getProductAltSubject } from "@/lib/product-alt";
import {
  flattenSelectedProductOptionIds,
  getDefaultProjectVariant,
  getSelectedProductOptionsPrice,
  getEstimatedMinPriceEur,
  resolveSelectedProductOptions,
  toggleProductOption,
} from "@/lib/data/project-variants";
import { resolveProjectLayout, selectFloorPlans } from "@/lib/data/project-layout";
import { getProducerById } from "@/lib/data/producers";
import {
  getEligibilityByCountry,
  getProducerVolumeProfile,
  getProductComplianceAssessments,
  getProductEnvelopeParameters,
  getProductOptionLayouts,
  getProjectBySlugOrId,
} from "@/lib/data/projects";
import type { CompletionStandard, EligibilityByCountry } from "@/lib/data/types";
import { getClientIdForUser, getFavoritedProductIds, getProductOptionGroups } from "@/lib/db/queries";
import { ENVELOPE_SECTION_ENABLED, supportsEnvelopeParameters } from "@/lib/product-envelope-parameters";
import { routing, type Locale } from "@/lib/i18n/routing";
import { resolveProductHref } from "@/lib/product-family-groups";
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

type PageParams = { locale: string; slug: string };
type PageSearchParams = { [key: string]: string | string[] | undefined };

export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const [project, t] = await Promise.all([
    getProjectBySlugOrId(slug, locale as Locale),
    getTranslations({ locale, namespace: "KlientProjektPage" }),
  ]);
  if (!project || project.family === "outdoor-tv" || (project.family === "spa-modulowe" && project.spaSubcategory === "sauna")) {
    return {};
  }

  const priceLabel = project.priceOnRequest
    ? t("priceOnRequest").toLowerCase()
    : `${t("from")} ${priceFormatter.format(project.priceMin)} €`;
  // floorAreaM2/rooms bywają jeszcze nieuzupełnione przez producenta (null) —
  // ten fragment opisu po prostu wypada wtedy z meta description, zamiast
  // pisać do wyszukiwarki "null m²" albo nieprawdziwe "0 m²".
  const sizeAndRoomsLabel =
    project.floorAreaM2 !== null && project.rooms !== null
      ? `${project.floorAreaM2} m², ${project.rooms} ${t(`roomsLabel.${countBucket(project.rooms)}`)}, `
      : "";
  const altSubject = await getProductAltSubject(project, locale);
  const description = `${project.name} ${t("from")} ${project.producerName} — ${sizeAndRoomsLabel}${priceLabel}.`;
  // Adres kanoniczny liczony od sluga, gdy istnieje, inaczej id (spec 0058
  // AC-7) — ten sam wzorzec fallbacku co resolveProductHref.
  const canonicalSegment = project.slug ?? project.id;
  const canonicalPath = `/${locale}/project/${canonicalSegment}`;

  // Ten sam zasób pod trzema prefiksami języka (AC-8): x-default wskazuje na
  // /pl, bo to jedyny język z gwarantowaną, kompletną treścią dziś.
  const languageAlternates = Object.fromEntries(
    routing.locales.map((code) => [code, `/${code}/project/${canonicalSegment}`]),
  );

  return {
    title: `${project.name} — ${project.producerName} | ModularHub Europe`,
    description,
    alternates: {
      canonical: canonicalPath,
      languages: { ...languageAlternates, "x-default": `/${routing.defaultLocale}/project/${canonicalSegment}` },
    },
    // Produkt inny niż published (draft, np. jeszcze w toku kreatora) nie
    // trafia do wyszukiwarki, choć bezpośredni link wciąż renderuje stronę
    // normalnie (spec 0058 AC-7, spec 0020 AC-6: adres nigdy nie blokuje).
    ...(project.status !== "published" ? { robots: { index: false, follow: false } } : {}),
    openGraph: {
      title: project.name,
      description,
      url: canonicalPath,
      images: [{ url: project.coverImageUrl, alt: altSubject }],
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
  const [{ locale, slug }, rawSearchParams, t, tGallery, tOptions] = await Promise.all([
    params,
    searchParams,
    getTranslations("KlientProjektPage"),
    getTranslations("ProjectGallery"),
    getTranslations("ProjectOptions"),
  ]);
  const project = await getProjectBySlugOrId(slug, locale as Locale);
  if (!project) notFound();
  // Strona domu nie ma sekcji, jakich potrzebuje katalogowy produkt outdoor-tv
  // (spec 0056 AC-6): każdy stary lub błędny link na tę rodzinę trafia na jej
  // właściwy route zamiast renderować się tutaj po cichu.
  if (project.family === "outdoor-tv" || (project.family === "spa-modulowe" && project.spaSubcategory === "sauna")) {
    redirect(resolveProductHref(project.family, project.id, locale, project.slug, project.spaSubcategory));
  }
  // Wejście po id, gdy produkt już ma slug, przekierowuje trwale (308) na
  // kanoniczny adres ze slugiem, z zachowaniem całego ciągu zapytania (spec
  // 0058 AC-4); produkt bez sluga jeszcze (kreator w toku, bez nazwy) renderuje
  // się normalnie pod adresem z id, bez przekierowania (AC-5).
  if (project.slug && project.slug !== slug) {
    permanentRedirect(`/${locale}/project/${project.slug}${buildQueryHref(rawSearchParams, {})}`);
  }

  const { countryCode } = parseResultsSearchParams(rawSearchParams);

  const [countries, producer, eligibilityRows, session, volumeProfile, optionGroups, complianceAssessments, optionLayouts, envelopeParameters] =
    await Promise.all([
      getCountries(),
      getProducerById(project.producerId, locale as Locale),
      countryCode
        ? getEligibilityByCountry(countryCode, locale as Locale)
        : Promise.resolve<EligibilityByCountry[]>([]),
      auth(),
      getProducerVolumeProfile(project.producerId, locale as Locale),
      getProductOptionGroups(project.id, locale as Locale),
      getProductComplianceAssessments(project.id, locale as Locale),
      // Wersje układu wnętrz (spec 0069): pusta mapa dla produktu bez opcji
      // niosących układ, wtedy strona wygląda jak przed tą zmianą.
      getProductOptionLayouts(project.id, locale as Locale),
      // Spec 0075 AC-11: tylko dom i kontener mieszkalny, i tylko gdy sekcja jest włączona.
      ENVELOPE_SECTION_ENABLED && supportsEnvelopeParameters(project)
        ? getProductEnvelopeParameters(project.id)
        : Promise.resolve([]),
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
  const altSubject = await getProductAltSubject(project);
  const galleryExtraImages = project.galleryImageUrls?.filter((url) => url.length > 0) ?? [];
  // Ta sama kolejność co okładka (index 0) + miniatury (index 1+) w
  // ProjectGalleryTabs (zakładka Wizualizacje) — GalleryLightboxProvider musi
  // widzieć dokładnie ten sam zestaw zdjęć w tej samej kolejności, żeby
  // strzałki w modalu odpowiadały temu, na co kliknięto.
  const lightboxImages = [
    { src: project.coverImageUrl, alt: altSubject },
    ...galleryExtraImages.map((url, index) => ({
      src: url,
      alt: tGallery("thumbnailAlt", { subject: altSubject, index: index + 2 }),
    })),
  ];

  // Tylko prawdziwe wiersze product_variant, nigdy syntetyczny placeholder za
  // brakujący standard (spec 0054 AC-1). Wariant wybrany przez parametr
  // adresu URL (spec 0042 AC-1): is_default, a w jego braku pierwszy wg
  // sort_order. Wartość ?wariant= bez dopasowania (nieaktualny link albo
  // standard, który producent od tego czasu usunął) po prostu wraca do tego
  // samego domyślnego wariantu, zamiast rozwiązywać się do placeholdera albo
  // undefined (spec 0054 AC-9).
  // Dopasowanie po variant.id, nie completionStandard (patrz komentarz w
  // ProjectVariantPicker.tsx): completionStandard jest tu wprawdzie zawsze
  // unikalny per wariant domu, ale id jest jedynym kluczem, który działa
  // identycznie też dla rodzin katalogowych (outdoor-tv), gdzie hrefFor jest
  // tym samym współdzielonym komponentem.
  const wariantParam = firstParam(rawSearchParams.wariant);
  const selectedVariant =
    project.variants.find((variant) => variant.id === wariantParam) ??
    getDefaultProjectVariant(project);
  const zakladkaParam = firstParam(rawSearchParams.zakladka);
  const activeGalleryTab: GalleryTabKey = zakladkaParam === "rzut" ? zakladkaParam : "wizualizacje";

  // Spec 0059 AC-3, AC-6: `opcje` jest jedynym parametrem adresu dla
  // konfiguratora, rozwiązywany tolerancyjnie (nieznane/nieaktualne id po
  // cichu ignorowane, grupa single zawsze dostaje dokładnie jedną zaznaczoną
  // opcję, z fallbackiem na is_default).
  const resolvedOptions = resolveSelectedProductOptions(optionGroups, firstParam(rawSearchParams.opcje));
  const selectedOptionIds = flattenSelectedProductOptionIds(resolvedOptions);
  const optionsPrice = getSelectedProductOptionsPrice(optionGroups, selectedOptionIds);

  // Spec 0069 AC-1 do AC-4: układ i rzuty wybranej wersji. Wersję bazową
  // (project.floorAreaM2, rooms, roomLayout) zostawiają nietknięte lista
  // wyników, porównywarka, metadane, JSON-LD i zapytanie (AC-5), bo czytają
  // pola project, nie ten wynik.
  const resolvedLayout = resolveProjectLayout({
    project,
    groups: optionGroups,
    layouts: optionLayouts,
    selected: resolvedOptions,
  });
  const floorPlans = selectFloorPlans(project.documents, {
    selectedVariantId: selectedVariant?.id,
    layoutOptionId: resolvedLayout.layoutOptionId,
    allowedOptionIds: optionGroups.flatMap((group) => group.options.map((option) => option.id)),
  });

  function hrefForVariant(variantId: string): string {
    return `/${locale}/project/${slug}${buildQueryHref(rawSearchParams, { wariant: variantId })}`;
  }
  function hrefForGalleryTab(tab: GalleryTabKey): string {
    return `/${locale}/project/${slug}${buildQueryHref(rawSearchParams, { zakladka: tab === "wizualizacje" ? undefined : tab })}`;
  }
  function hrefForOption(groupId: string, optionId: string): string {
    return `/${locale}/project/${slug}${buildQueryHref(rawSearchParams, {
      opcje: toggleProductOption(optionGroups, resolvedOptions, groupId, optionId),
    })}`;
  }

  const standardLabel: Record<CompletionStandard, string> = {
    "surowy-zamkniety": t("completionStandard.surowy-zamkniety"),
    deweloperski: t("completionStandard.deweloperski"),
    "pod-klucz": t("completionStandard.pod-klucz"),
    // "katalogowy" (spec 0056 Follow-up) never actually reaches this route
    // (AC-6 redirects outdoor-tv products to /outdoor-tv/[id]), but
    // ProjectVariantPicker's shared prop type still demands it.
    katalogowy: t("completionStandard.katalogowy"),
  };
  const montazStage = selectedVariant?.timelineStages.find((stage) => stage.stageKey === "montaz");

  // Sekcja bez żadnej prawdziwej treści znika całkowicie, nagłówek włącznie,
  // a jej pozycja w ProjectSectionNav dostaje `disabled` zamiast zniknąć z
  // paska (spec 0054 AC-8, ten sam wzorzec co dzisiejsza pozycja "podobne").
  // Produkty katalogowe (kontenery-modulowe, spec 0059) dziś nigdy nie mają
  // wpisanych pozycji kosztowych — "Cena i zakres" bez nich pokazywałaby
  // tylko gołą tabelę z placeholderem "do uzupełnienia przez producenta", bez
  // żadnej realnej treści (inżynier, 2026-10-01), więc dla tej rodziny sekcja
  // wymaga realnych costLineItems, nie tylko istnienia wariantu.
  const hasRealCostLineItems = project.variants.some((variant) => variant.costLineItems.length > 0);
  const hasCenaSection =
    project.variants.length > 0 && (project.family !== "kontenery-modulowe" || hasRealCostLineItems);
  const hasOptionsSection = optionGroups.length > 0;
  // Ten sam powód co hasCenaSection wyżej: produkty katalogowe nie mają dziś
  // wpisanego rozkładu pomieszczeń (nie ma go sensu wpisywać dla kontenera),
  // ProjectRoomLayout domyślnie renderuje placeholder zamiast znikać (świadoma
  // decyzja dla rodziny "dom"), ale ten placeholder nie ma sensu dla rodziny,
  // która nigdy nie dostanie tych danych — sekcja więc znika całkowicie.
  const hasUkladSection = project.family !== "kontenery-modulowe" || (resolvedLayout.rooms?.length ?? 0) > 0;
  const hasDzialkaSection =
    Boolean(project.externalDimensions) || Boolean(project.foundationOptions) || (project.clientRequirements?.length ?? 0) > 0;
  const hasHarmonogramSection = (selectedVariant?.timelineStages.length ?? 0) > 0;
  const hasDokumentySection =
    Boolean(project.documents.find((doc) => doc.purpose === "product_specification")) || (project.faq?.length ?? 0) > 0;

  // Odznaka przeznaczenia (spec 0042 AC-13): family + category, już
  // istniejące pola, tylko luka w renderze — bez zmiany schematu. Category
  // jest znacząca tylko dla family "dom" (lib/data/types.ts).
  const familyLabel = tOptions(`family.${project.family}`);
  const purposeBadge =
    project.family === "dom" ? `${familyLabel} ${tOptions(`category.${project.category}`).toLowerCase()}` : familyLabel;

  const query = countryCode ? `&country=${countryCode}` : "";
  // Wariant przenosi się dalej do linku zapytania (AC-1), żeby wybór nie
  // zgubił się przy przejściu do formularza. Po variant.id, nie
  // completionStandard (spec 0059 AC-9): dla produktów katalogowych z wieloma
  // wariantami completionStandard jest zawsze "katalogowy" dla każdego z nich,
  // więc nie odróżniałby, który wariant klient faktycznie skonfigurował —
  // ten sam powód co komentarz w ProjectVariantPicker.tsx.
  const variantQuery = selectedVariant ? `&wariant=${selectedVariant.id}` : "";
  const zapytanieHref = `/${locale}/inquiry?projects=${project.id}${query}${variantQuery}`;
  const shortlistHref = `/${locale}/results?projects=${project.id}${query}`;

  // Spec 0059 AC-3, AC-4: cena = cena bazowa WYBRANEGO wariantu + suma
  // zaznaczonych opcji, nigdy płaska project.priceMin (cena "od" dla
  // najtańszego wariantu produktu, patrz lib/db/AGENTS.md price_sync_trigger)
  // — ten sam fallback, gdy produkt nie ma jeszcze żadnego wariantu.
  const showPriceOnRequest = project.priceOnRequest || selectedVariant?.priceOnRequest || optionsPrice.priceOnRequest;
  const totalPriceEur =
    selectedVariant?.priceMin !== undefined && !optionsPrice.priceOnRequest
      ? selectedVariant.priceMin + optionsPrice.totalEur
      : undefined;

  // Pasek kluczowych faktów pod galerią (od lg): odpowiedź na pierwsze pytania
  // kupującego, zanim zacznie przewijać. Wartości z tego samego rozwiązanego
  // układu co sekcja "Układ"; fakt bez danych po prostu wypada, a przy mniej
  // niż dwóch faktach pasek się nie renderuje.
  // Ta sama liczba co w sekcji "Układ": bez metrażu z wersji układu suma
  // pomieszczeń, a dopiero bez niej pole produktu.
  const roomAreas = (resolvedLayout.rooms ?? []).flatMap((room) => (room.areaM2 !== undefined ? [room.areaM2] : []));
  const factArea =
    resolvedLayout.floorAreaM2 ??
    (roomAreas.length > 0 ? Math.round(roomAreas.reduce((sum, area) => sum + area, 0) * 10) / 10 : project.floorAreaM2);
  const factRooms = resolvedLayout.roomCount ?? project.rooms;
  const factBathrooms = resolvedLayout.bathroomCount;
  const factAssemblyMax = montazStage?.durationMaxDays ?? 0;
  const factAssemblyMin = montazStage?.durationMinDays ?? factAssemblyMax;
  const facts: { value: string; label: string }[] = [
    ...(factArea ? [{ value: `${factArea} m²`, label: t("floorAreaLabel") }] : []),
    ...(factRooms ? [{ value: String(factRooms), label: t(`roomsLabel.${countBucket(factRooms)}`) }] : []),
    ...(factBathrooms ? [{ value: String(factBathrooms), label: t(`bathroomsLabel.${factBathrooms === 1 ? "one" : "other"}`) }] : []),
    ...(factAssemblyMax > 0
      ? [
          {
            value:
              factAssemblyMin === factAssemblyMax
                ? t(factAssemblyMax === 1 ? "assemblyTimeOne" : "assemblyTimeMany", { count: factAssemblyMax })
                : t("assemblyTimeValue", { min: factAssemblyMin, max: factAssemblyMax }),
            label: t("assemblyTimeLabel"),
          },
        ]
      : []),
    ...(project.structuralWarrantyYears > 0
      ? [{ value: t("warrantyYearsValue", { years: project.structuralWarrantyYears }), label: t("warrantyTermLabel") }]
      : []),
  ];
  const factsStrip =
    facts.length >= 2 ? (
      <dl className="hidden grid-flow-col auto-cols-fr divide-x divide-brand-v5-line border-b border-brand-v5-line lg:grid">
        {facts.map((fact) => (
          <div key={fact.label} className="flex flex-col gap-1 px-brand-4 py-brand-3 first:pl-brand-4">
            <dd className="order-1 m-0">
              <DataText surface="v5" className="text-h3 font-semibold">
                {fact.value}
              </DataText>
            </dd>
            <dt className="order-2">
              <Text variant="label" tone="muted" surface="v5">
                {fact.label}
              </Text>
            </dt>
          </div>
        ))}
      </dl>
    ) : null;

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

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {/* pb-24 rezerwuje miejsce pod sticky pasek CTA na mobile (fixed, więc nie
          zajmuje miejsca w layoucie samodzielnie) — zdejmowane na lg, gdzie pasek
          się nie renderuje i CTA żyje tylko w treści strony. -mt-brand-5 na
          mobile znosi pt-brand-5 z RouteShell, żeby zdjęcie zaczynało się od
          razu pod navbarem, bez oddechu nad nim (desktopowy odstęp zostaje). */}
      <GalleryLightboxProvider images={lightboxImages}>
      {/* Od lg: lewa kolumna to galeria do krawędzi ekranu, pasek faktów i
          sekcje, prawa to panel zakupowy przyklejony przez całą długość strony
          (cena i "Wyślij zapytanie" zawsze w zasięgu, zamiast dawnego
          pływającego paska). Panel zajmuje oba wiersze siatki, więc sticky
          działa do końca sekcji. Na mobile kolejność DOM (galeria, panel,
          sekcje) daje ten sam układ co dotąd. */}
      <div className="project-wide -mt-brand-5 pb-24 lg:mt-0 lg:grid lg:grid-cols-[minmax(0,1fr)_30rem] lg:pb-0 2xl:grid-cols-[minmax(0,1fr)_34rem]">
        <div className="lg:col-start-1 lg:row-start-1">
          <ProjectGalleryTabs
              projectName={project.name}
              altSubject={altSubject}
              coverImageUrl={project.coverImageUrl}
              galleryImageUrls={project.galleryImageUrls}
              floorPlans={floorPlans}
              floorPlanVersionLabel={resolvedLayout.layoutOptionLabel ?? undefined}
              activeTab={activeGalleryTab}
              hrefFor={hrefForGalleryTab}
            />
          {factsStrip}
        </div>

        <aside className="mt-brand-4 flex flex-col gap-brand-4 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:mt-0 lg:h-[calc(100svh-5rem)] lg:self-start lg:overflow-y-auto lg:border-l lg:border-brand-v5-line lg:p-brand-5 lg:sticky lg:top-20">
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
                variants={project.variants}
                selectedVariantId={selectedVariant?.id ?? ""}
                hrefFor={hrefForVariant}
                standardLabel={standardLabel}
                ariaLabel={t("variantPickerAriaLabel")}
              />
              <Card padding="lg" surface="v5" className="flex flex-col gap-brand-3 border-brand-v5-amber-strong/30">
                {/* Spec 0050 AC-13, AC-37: wariant może być priceOnRequest niezależnie
                    od flagi produktu wyżej — sprawdzany tu jawnie, inaczej wpadałby w
                    gałąź "do uzupełnienia" niżej (selectedVariant.priceMin też undefined,
                    ale z innego powodu). Spec 0059 AC-4: dowolna zaznaczona opcja
                    priceOnRequest ma ten sam efekt (showPriceOnRequest wyżej). */}
                {showPriceOnRequest ? (
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
                ) : selectedVariant?.priceMin !== undefined ? (
                  <>
                    <Text variant="label" tone="muted" surface="v5">
                      {t("priceForStandard", {
                        // variantLabel pierwszy (spec 0059 AC-9): dla produktów
                        // katalogowych standardLabel[completionStandard] jest
                        // zawsze tym samym generycznym "Wariant" niezależnie od
                        // tego, który wariant jest wybrany (wszystkie dzielą
                        // completionStandard = 'katalogowy'), ten sam fallback
                        // co w ProjectVariantPicker.tsx.
                        standard: selectedVariant.variantLabel ?? standardLabel[selectedVariant.completionStandard],
                      })}
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
                ) : (
                  // Produkt bez żadnego jeszcze wypełnionego product_variant
                  // (Follow-up spec 0041): pokazuje starą, płaską cenę
                  // project.priceMin bez opisu zakresu — nigdy fałszywe
                  // "wycena indywidualna" (spec 0042 AC-11). Gałąź dla "wybrany
                  // standard nie ma wiersza, choć inne standardy mają" jest
                  // nieosiągalna: selectedVariant to zawsze prawdziwy wiersz z
                  // project.variants albo w ogóle go nie ma (spec 0054 AC-4).
                  <>
                    <Text variant="label" tone="muted" surface="v5">
                      {t("estimatedPackage")}
                    </Text>
                    <DataText as="p" surface="v5" className="text-h2 font-semibold">
                      {t("from")} {priceFormatter.format(getEstimatedMinPriceEur(project) ?? project.priceMin)} €
                    </DataText>
                  </>
                )}
                <Button as="a" href={zapytanieHref} size="lg" surface="v5" className="mt-brand-1 w-full">
                  {t("sendInquiry")}
                </Button>
                <Button as="a" href={shortlistHref} variant="ghost" surface="v5" className="w-full">
                  {t("compareWithAnother")}
                </Button>
                <div className="flex flex-col gap-1">
                  <Text tone="muted" surface="v5" className="text-data">
                    {t("inquiryGoesToAdvisor")}
                  </Text>
                  <Text tone="muted" surface="v5" className="text-data">
                    · {t("noPurchaseObligation")}
                  </Text>
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
        </aside>

        <div className="mt-brand-6 flex flex-col gap-brand-6 lg:[&_h2]:text-h2 lg:col-start-1 lg:row-start-2 lg:mt-0 lg:px-10 lg:py-brand-6">
          <div className="lg:sticky lg:top-20 lg:z-30 lg:-mx-10 lg:bg-background lg:px-10">
        <ProjectSectionNav
          items={[
            { id: "opcje", label: t("sectionNav.opcje"), disabled: !hasOptionsSection },
            { id: "uklad", label: t("sectionNav.uklad"), disabled: !hasUkladSection },
            { id: "cena", label: t("sectionNav.cena"), disabled: !hasCenaSection },
            { id: "dzialka", label: t("sectionNav.dzialka"), disabled: !hasDzialkaSection },
            { id: "harmonogram", label: t("sectionNav.harmonogram"), disabled: !hasHarmonogramSection },
            { id: "komfort", label: t("sectionNav.komfort") },
            { id: "producent", label: t("sectionNav.producent") },
            { id: "dokumenty", label: t("sectionNav.dokumenty"), disabled: !hasDokumentySection },
            { id: "podobne", label: t("sectionNav.podobne"), disabled: true },
          ]}
          ariaLabel={t("sectionNavAriaLabel")}
          scrollLeftLabel={t("sectionNavScrollLeft")}
          scrollRightLabel={t("sectionNavScrollRight")}
        />
          </div>


        {/* Spec 0059 + follow-up (2026-10-01): opcje dodatkowe konfiguratora
            katalogowego jako pierwsza sekcja po hero, przed układem i ceną —
            klient widzi dopłaty i decyduje o konfiguracji zanim przewinie do
            pozostałej treści. Pełna szerokość (nie wąska kolumna obok ceny),
            żeby siatka kart opcji faktycznie wykorzystała dostępną przestrzeń. */}
        {hasOptionsSection && (
          <div id="opcje" className="scroll-mt-20 lg:scroll-mt-36">
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

        {hasUkladSection && (
          <div id="uklad" className="scroll-mt-20 lg:scroll-mt-36">
            <ProjectRoomLayout
              rooms={resolvedLayout.rooms ?? []}
              roomCount={resolvedLayout.roomCount}
              bathroomCount={resolvedLayout.bathroomCount}
              projectName={project.name}
              coverImageUrl={project.coverImageUrl}
              documents={floorPlans}
              floorAreaM2={
                resolvedLayout.floorAreaM2 ??
                // Pomieszczenia bez metrażu (rzut producenta bez wymiarów): bez tego suma to 0 m².
                ((resolvedLayout.rooms ?? []).some((room) => room.areaM2 !== undefined) ? null : project.floorAreaM2)
              }
              description={resolvedLayout.description}
            />
          </div>
        )}

        {/* Cena i zakres: tabela porównawcza pokazuje dokładnie tyle kolumn,
            ile projekt ma prawdziwych wariantów (spec 0054 AC-1, AC-2); cała
            sekcja znika, gdy nie ma żadnego (AC-8), albo (kontenery-modulowe,
            spec 0059 follow-up) gdy żaden wariant nie ma realnych pozycji
            kosztowych. */}
        {hasCenaSection && (
          <div id="cena" className="scroll-mt-20 lg:scroll-mt-36 lg:-mx-10 lg:bg-brand-v5-ink/[0.035] lg:px-10 lg:py-brand-6">
            <ProjectCostComparisonTable variants={project.variants} heading={t("priceAndScopeHeading")} />
          </div>
        )}

        {hasDzialkaSection && (
          <div id="dzialka" className="scroll-mt-20 lg:scroll-mt-36">
            <ProjectLogistics project={project} />
          </div>
        )}

        {hasHarmonogramSection && (
          <div id="harmonogram" className="scroll-mt-20 lg:scroll-mt-36 lg:-mx-10 lg:bg-brand-v5-ink/[0.035] lg:px-10 lg:py-brand-6">
            <ProjectTimeline stages={selectedVariant?.timelineStages ?? []} />
          </div>
        )}

        <div id="komfort" className="flex scroll-mt-20 lg:scroll-mt-36 flex-col gap-brand-4">
          <ProjectTechnicalSpecs project={project} />

          {Boolean(project.certifications?.length) && (
            <div className="flex flex-col gap-brand-2">
              <ProjectCertifications certifications={project.certifications} locale={locale} />
            </div>
          )}
        </div>

        {producer && (
          <div id="producent" className="flex scroll-mt-20 flex-col gap-brand-3 lg:scroll-mt-36 lg:-mx-10 lg:bg-brand-v5-ink/[0.035] lg:px-10 lg:py-brand-6">
            <Heading level="h2" surface="v5" className="text-h3">
              {t("producerHeading")}
            </Heading>
            <ProducerRealizationsSection
              producer={producer}
              projectName={project.name}
              documents={project.documents}
              selectedVariantId={selectedVariant?.id}
              structuralWarrantyYears={project.structuralWarrantyYears}
            />
          </div>
        )}

        {hasDokumentySection && (
          <div id="dokumenty" className="scroll-mt-20 lg:scroll-mt-36">
            <ProjectDocumentsAndFaq faq={project.faq} documents={project.documents} />
          </div>
        )}

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

        <ProjectEnvelopeParameters
          parameters={envelopeParameters}
          foundationStatus={project.foundationStatus}
          floorAreaM2={project.floorAreaM2}
          locale={locale}
        />

        <ProjectComplianceAssessments assessments={complianceAssessments} locale={locale} />

        {volumeProfile && (
          <div className="flex flex-col gap-brand-2 rounded-v5-card border border-brand-v5-amber-strong/30 bg-brand-v5-amber/5 p-brand-4">
            <Heading level="h2" surface="v5" className="text-h3">
              {t("bulkInquiryHeading")}
            </Heading>
            <Text tone="muted" surface="v5">
              {t("bulkInquiryBody")}
            </Text>
            <BulkProductInquiryModal
              productId={project.id}
              countries={countries}
              prefill={
                isClientSession && session?.user.email
                  ? { name: session.user.name ?? "", email: session.user.email, phone: session.user.phone ?? "" }
                  : undefined
              }
            />
          </div>
        )}

      </div>
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
          {project.priceOnRequest || selectedVariant?.priceOnRequest ? (
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
