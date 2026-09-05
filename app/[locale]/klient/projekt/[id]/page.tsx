import { Award, CheckCircle2, Minus, ShieldCheck, Truck } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { Button, Card, DataText, Heading, StatusPill, Text } from "@/components/ui";
import { FavoriteButton } from "@/components/klient/FavoriteButton";
import { ProducerCard } from "@/components/klient/ProducerCard";
import { ProjectCertifications } from "@/components/klient/ProjectCertifications";
import { ProjectGalleryCover, ProjectGalleryThumbnails } from "@/components/klient/ProjectGallery";
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
import { getEligibilityByCountry, getProjectById } from "@/lib/data/projects";
import type { EligibilityByCountry, EligibilityStatus } from "@/lib/data/types";
import { getClientIdForUser, getFavoritedProductIds } from "@/lib/db/queries";
import { parseResultsSearchParams } from "@/lib/results-filters";

const priceFormatter = new Intl.NumberFormat("pl-PL", { maximumFractionDigits: 0 });

const legalStatusLabel: Record<EligibilityStatus, string> = {
  approved: "Zgodny z przepisami",
  conditional: "Wymaga dodatkowych dokumentów",
  blocked: "Niedostępny w tym kraju",
};

function roomsLabel(count: number) {
  return count === 1 ? "pokój" : count >= 2 && count <= 4 ? "pokoje" : "pokoi";
}

function bedroomsLabel(count: number) {
  return count === 1 ? "sypialnia" : count >= 2 && count <= 4 ? "sypialnie" : "sypialni";
}

type PageParams = { locale: string; id: string };
type PageSearchParams = { [key: string]: string | string[] | undefined };

export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>;
}): Promise<Metadata> {
  const { locale, id } = await params;
  const project = await getProjectById(id);
  if (!project) return {};

  const priceLabel = project.priceOnRequest
    ? "wycena indywidualna"
    : `od ${priceFormatter.format(project.priceMin)} €`;
  const description = `${project.name} od ${project.producerName} — ${project.floorAreaM2} m², ${project.rooms} ${roomsLabel(project.rooms)}, ${priceLabel}.`;
  const canonicalPath = `/${locale}/klient/projekt/${project.id}`;

  return {
    title: `${project.name} — ${project.producerName} | ModularHub Europe`,
    description,
    alternates: { canonical: canonicalPath },
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
  const [{ locale, id }, rawSearchParams] = await Promise.all([params, searchParams]);
  const project = await getProjectById(id);
  if (!project) notFound();

  const { countryCode } = parseResultsSearchParams(rawSearchParams);

  const [countries, producer, eligibilityRows, session] = await Promise.all([
    getCountries(),
    getProducerById(project.producerId),
    countryCode
      ? getEligibilityByCountry(countryCode)
      : Promise.resolve<EligibilityByCountry[]>([]),
    auth(),
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
  const descriptionImageUrl = project.galleryImageUrls?.filter((url) => url.length > 0).at(-1) ?? project.coverImageUrl;
  const isLongDescription = project.description.trim().length > 220;

  // Cztery ustalenia handlowe, filtrowane do tych realnie znanych: dane
  // realnych dostawców bywają niepełne (Budman nie podaje gwarancji ani
  // czasu produkcji/montażu), a "0 lat"/"0–0 dni" czytałoby się jako fałszywe
  // zapewnienie, nie jako brak danych — ten sam wzorzec co ProjectTechnicalSpecs.
  const commercialTerms = [
    {
      icon: CompletionStandardIcon,
      label: "Standard wykończenia",
      value: {
        "surowy-zamkniety": "Stan surowy zamknięty",
        deweloperski: "Standard deweloperski",
        "pod-klucz": "Pod klucz",
      }[project.commercial.completionStandard],
    },
    project.structuralWarrantyYears > 0
      ? { icon: WarrantyIcon, label: "Gwarancja konstrukcyjna", value: `${project.structuralWarrantyYears} lat` }
      : null,
    project.commercial.productionLeadTimeWeeksMax > 0
      ? {
          icon: ProductionTimeIcon,
          label: "Czas produkcji",
          value: `${project.commercial.productionLeadTimeWeeksMin}–${project.commercial.productionLeadTimeWeeksMax} tyg.`,
        }
      : null,
    project.commercial.onSiteAssemblyDaysMax > 0
      ? {
          icon: AssemblyTimeIcon,
          label: "Czas montażu",
          value: `${project.commercial.onSiteAssemblyDaysMin}–${project.commercial.onSiteAssemblyDaysMax} dni`,
        }
      : null,
  ].filter((entry): entry is NonNullable<typeof entry> => entry !== null);

  const query = countryCode ? `&country=${countryCode}` : "";
  const zapytanieHref = `/${locale}/klient/zapytanie?projects=${project.id}${query}`;
  const shortlistHref = `/${locale}/klient/wyniki?projects=${project.id}${query}`;
  const dzialkaHref = `/${locale}/klient/dzialka?projects=${project.id}${query}`;

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
              totalCount={(project.galleryImageUrls?.filter((url) => url.length > 0).length ?? 0) + 1}
              projectName={project.name}
              className="h-full max-lg:rounded-none"
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
                      Cena
                    </Text>
                    <DataText as="p" surface="v5" className="text-h2 font-semibold">
                      Wycena indywidualna
                    </DataText>
                    <Text tone="muted" surface="v5" className="text-data">
                      Cena ustalana bezpośrednio z producentem po zgłoszeniu zapytania.
                    </Text>
                  </>
                ) : (
                  <>
                    <Text variant="label" tone="muted" surface="v5">
                      Szacowany pakiet
                    </Text>
                    <DataText as="p" surface="v5" className="text-h2 font-semibold">
                      {priceFormatter.format(project.priceMin)}–{priceFormatter.format(project.priceMax)} €
                    </DataText>
                    <Text tone="muted" surface="v5" className="text-data">
                      Dom + standardowy transport + montaż
                    </Text>
                  </>
                )}
                <Button as="a" href={zapytanieHref} size="lg" surface="v5" className="mt-brand-1 w-full sm:w-fit">
                  Wyślij zapytanie
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
                    {project.structuralWarrantyYears} lat gwarancji konstrukcyjnej
                  </Text>
                </span>
              )}
              {project.certifications && project.certifications.length > 0 && (
                <span className="flex items-center gap-brand-1">
                  <Award className="size-4 shrink-0 text-status-approved" aria-hidden="true" />
                  <Text className="text-data" tone="muted" surface="v5">
                    Potwierdzone {project.certifications.length}{" "}
                    {project.certifications.length === 1 ? "certyfikatem" : "certyfikatami"}
                  </Text>
                </span>
              )}
              {project.commercial.onSiteAssemblyDaysMax > 0 && (
                <span className="flex items-center gap-brand-1">
                  <Truck className="size-4 shrink-0 text-status-approved" aria-hidden="true" />
                  <Text className="text-data" tone="muted" surface="v5">
                    Montaż na działce w {project.commercial.onSiteAssemblyDaysMin}–
                    {project.commercial.onSiteAssemblyDaysMax} dni
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
          <div className="flex flex-col gap-brand-4 rounded-v5-card border-2 border-brand-v5-ink bg-brand-v5-surface p-brand-4 sm:p-brand-5 lg:flex-row lg:items-stretch lg:gap-brand-5">
            <div className="flex items-center gap-brand-3 border-b border-brand-v5-line pb-brand-4 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-brand-5">
              <span className="flex size-16 shrink-0 items-center justify-center rounded-data bg-brand-v5-ink">
                <FloorAreaIcon className="size-8 text-brand-v5-paper" />
              </span>
              <div className="flex flex-col">
                <DataText surface="v5" className="text-h2 font-black leading-none">
                  {project.floorAreaM2} m²
                </DataText>
                <Text variant="label" tone="muted" surface="v5" className="font-semibold">
                  Powierzchnia użytkowa
                </Text>
              </div>
            </div>

            <div className="grid min-w-0 flex-1 grid-cols-2 gap-brand-4 sm:grid-cols-4 lg:gap-0 lg:divide-x lg:divide-brand-v5-line">
              {(
                [
                  { icon: RoomsIcon, value: String(project.rooms), label: roomsLabel(project.rooms) },
                  project.bedrooms > 0
                    ? { icon: BedroomsIcon, value: String(project.bedrooms), label: bedroomsLabel(project.bedrooms) }
                    : null,
                  {
                    icon: BathroomsIcon,
                    value: String(project.bathrooms),
                    label: project.bathrooms === 1 ? "łazienka" : "łazienki",
                  },
                  {
                    icon: StoreysIcon,
                    value: String(project.storeys),
                    label: project.storeys === 1 ? "kondygnacja" : "kondygnacje",
                  },
                ] as const
              )
                .filter((entry) => entry !== null)
                .map(({ icon: Icon, value, label }) => (
                <div
                  key={label}
                  className="flex min-w-0 items-center gap-brand-2 lg:px-brand-4 lg:first:pl-0 lg:last:pr-0"
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
                  Opis
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
                        <span className="group-has-[[open]]/desc:hidden">Pokaż więcej</span>
                        <span className="hidden group-has-[[open]]/desc:inline">Pokaż mniej</span>
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
                      alt={`${project.name}, dom modułowy`}
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
                    ? "Kwalifikuje się do zgłoszenia uproszczonego"
                    : "Nie kwalifikuje się do zgłoszenia uproszczonego"}
                </StatusPill>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-brand-4">
          <Heading level="h2" surface="v5" className="text-h3">
            Warunki komercyjne
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
                    Cena zawiera
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
                    Cena nie zawiera
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
              Zgodność prawna w {targetCountryName ?? countryCode}
            </Heading>
            <StatusPill status={eligibility.status}>{legalStatusLabel[eligibility.status]}</StatusPill>
            <Text tone="muted" surface="v5">
              {eligibility.reason}
            </Text>
          </div>
        )}

        {producer && (
          <div className="flex flex-col gap-brand-3">
            <Heading level="h2" surface="v5" className="text-h3">
              Producent
            </Heading>
            <ProducerCard producer={producer} />
          </div>
        )}

        <div className="flex flex-wrap items-center gap-brand-2 border-t border-brand-v5-line pt-brand-4">
          <Button as="a" href={zapytanieHref} size="lg" surface="v5">
            Wyślij zapytanie
          </Button>
          <Button as="a" href={shortlistHref} variant="secondary" surface="v5">
            Dodaj do shortlisty
          </Button>
          <Button as="a" href={dzialkaHref} variant="secondary" surface="v5">
            Sprawdź działkę pod ten projekt
          </Button>
        </div>
      </div>

      {/* Sticky CTA na mobile: cena + "Wyślij zapytanie" pod ręką bez scrollowania
          z powrotem do sekcji hero. Desktop ma tę samą akcję już w treści. */}
      <div className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-between gap-brand-3 border-t-2 border-brand-v5-ink bg-brand-v5-surface px-brand-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-brand-3 lg:hidden">
        <div className="flex min-w-0 flex-col">
          {project.priceOnRequest ? (
            <DataText surface="v5" className="truncate text-body-l font-semibold">
              Wycena indywidualna
            </DataText>
          ) : (
            <>
              <Text variant="label" tone="muted" surface="v5">
                od
              </Text>
              <DataText surface="v5" className="text-body-l font-black leading-none">
                {priceFormatter.format(project.priceMin)} €
              </DataText>
            </>
          )}
        </div>
        <Button as="a" href={zapytanieHref} size="lg" surface="v5" className="shrink-0">
          Wyślij zapytanie
        </Button>
      </div>
    </>
  );
}
