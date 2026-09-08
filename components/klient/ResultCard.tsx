import { Clock3, ImageOff, MapPin } from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import Link from "next/link";
import { Card, Checkbox, DataText, Heading, StatusPill, Text } from "@/components/ui";
import { FavoriteButton } from "./FavoriteButton";
import { isLocalProjectId } from "@/lib/local-client-projects";
import type { CountryCode, EligibilityStatus, Project } from "@/lib/data/types";

interface ResultCardProps {
  project: Project;
  countryName: string;
  /** Do budowy linku do /klient/projekt/[id] (spec 0020 AC-2). */
  locale: string;
  eligibilityStatus?: EligibilityStatus;
  selected?: boolean;
  selectionDisabled?: boolean;
  onToggleSelect?: () => void;
  /** Target delivery country from /wyniki's `country` URL param, carried into
   * the /klient/projekt/[id] link so the legal compliance section there can
   * resolve it (spec 0015 AC-14). */
  countryCode?: CountryCode;
  /** Doklejone lokalnie z localStorage producenta (spec 0016, AC-11): pokazuje
   * etykietę podglądu zamiast checkboxa zaznaczenia, bo ta ścieżka nie może dziś
   * wejść w zapytanie (serwer nie widzi localStorage producenta). Karta pozostaje
   * nieklikalna dla tych projektów, bo trasa /klient/projekt/[id] czyta tylko
   * katalog przykładowy (spec 0020 AC-8). */
  localPreview?: boolean;
  /** Serce "dodaj do ulubionych" (spec 0024 AC-2, AC-4); pominięte dla podglądu
   * lokalnego producenta, ten sam wyjątek co checkbox zaznaczenia powyżej. */
  favorite?: {
    isClientSession: boolean;
    initialFavorited: boolean;
  };
}

const priceFormatter = new Intl.NumberFormat("pl-PL", { maximumFractionDigits: 0 });

function roomsCountBucket(count: number): "one" | "few" | "many" {
  return count === 1 ? "one" : count >= 2 && count <= 4 ? "few" : "many";
}

export function ResultCard({
  project,
  countryName,
  locale,
  eligibilityStatus,
  selected,
  selectionDisabled,
  onToggleSelect,
  countryCode,
  localPreview,
  favorite,
}: ResultCardProps) {
  const t = useTranslations("ResultCard");
  const standardLabel = {
    "surowy-zamkniety": t("completionStandard.surowy-zamkniety"),
    deweloperski: t("completionStandard.deweloperski"),
    "pod-klucz": t("completionStandard.pod-klucz"),
  } as const;
  const roomsLabel = t(`rooms.${roomsCountBucket(project.rooms)}`);
  const isClickable = !localPreview && !isLocalProjectId(project.id);
  const href = isClickable
    ? `/${locale}/klient/projekt/${project.id}${countryCode ? `?country=${countryCode}` : ""}`
    : undefined;

  return (
    <Card
      as="article"
      padding="none"
      surface="v5"
      className="group relative flex h-full flex-col overflow-hidden transition-shadow hover:shadow-md"
    >
      {href && (
        <Link
          href={href}
          className="focus-ring absolute inset-0 z-0 rounded-v5-card"
          aria-label={t("viewDetails", { name: project.name })}
        />
      )}
      <div className="relative aspect-[3/2] overflow-hidden">
        {project.coverImageUrl ? (
          <Image
            src={project.coverImageUrl}
            alt=""
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          // Zdjęcie nieustawione (spec 0023 AC-10): łagodny placeholder zamiast
          // pustego <Image src="">, które rzuciłoby błąd.
          <div className="flex size-full items-center justify-center bg-brand-v5-line/40">
            <ImageOff className="size-8 text-brand-v5-muted/50" aria-hidden="true" />
          </div>
        )}
        {onToggleSelect && !localPreview && (
          <label className="absolute right-brand-2 top-brand-2 z-10 flex items-center justify-center rounded-data bg-brand-v5-surface/95 p-1.5 shadow-sm">
            <span className="sr-only">{t("selectForInquiry", { name: project.name })}</span>
            <Checkbox
              surface="v5"
              checked={selected ?? false}
              disabled={selectionDisabled}
              onChange={onToggleSelect}
              title={selectionDisabled ? t("selectionLimitReached") : undefined}
            />
          </label>
        )}
        {favorite && !localPreview && (
          <FavoriteButton
            productId={project.id}
            productName={project.name}
            locale={locale}
            isClientSession={favorite.isClientSession}
            initialFavorited={favorite.initialFavorited}
            className="absolute left-brand-2 top-brand-2 z-10"
            surface="v5"
          />
        )}
      </div>
      <div className="flex flex-1 flex-col gap-brand-2 p-brand-3">
        {localPreview && (
          <span className="w-fit rounded-data bg-brand-v5-amber/10 px-2 py-0.5 text-label font-medium uppercase tracking-[0.1em] text-brand-v5-ink">
            {t("localPreviewBadge")}
          </span>
        )}
        {eligibilityStatus === "conditional" && (
          <StatusPill status="conditional">{t("needsMoreDocuments")}</StatusPill>
        )}
        <div className="flex flex-col gap-1">
          <Heading level="h3" surface="v5" className="text-body-l">
            {project.name}
          </Heading>
          <Text tone="muted" surface="v5" className="flex items-center gap-1 text-data">
            <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
            <span>{project.producerName} · {countryName}</span>
          </Text>
        </div>
        <Text surface="v5" className="font-medium">
          {t("summary", { area: project.floorAreaM2, rooms: project.rooms, roomsLabel, storeys: project.storeys })}
        </Text>
        <Text tone="muted" surface="v5" className="text-data">
          {project.constructionSystem} · {standardLabel[project.commercial.completionStandard]}
        </Text>
        <div className="mt-auto border-t border-brand-v5-line pt-brand-2">
          {project.priceOnRequest ? (
            <>
              <Text variant="label" tone="muted" surface="v5">{t("price")}</Text>
              <DataText as="p" surface="v5" className="mt-1 text-body-l font-semibold">{t("priceOnRequest")}</DataText>
              <Text tone="muted" surface="v5" className="mt-1 text-data">{t("priceOnRequestHint")}</Text>
            </>
          ) : (
            <>
              <Text variant="label" tone="muted" surface="v5">{t("house")}</Text>
              <DataText as="p" surface="v5" className="mt-1 text-body-l font-semibold">
                {t("priceFrom", { price: priceFormatter.format(project.commercial.housePriceMinEur) })}
              </DataText>
            </>
          )}
        </div>
        {project.commercial.productionLeadTimeWeeksMax > 0 && (
          <Text tone="muted" surface="v5" className="flex items-center gap-1 text-data">
            <Clock3 className="size-3.5 shrink-0" aria-hidden="true" />
            {t("leadTime", {
              productionMin: project.commercial.productionLeadTimeWeeksMin,
              productionMax: project.commercial.productionLeadTimeWeeksMax,
              assemblyMin: project.commercial.onSiteAssemblyDaysMin,
              assemblyMax: project.commercial.onSiteAssemblyDaysMax,
            })}
          </Text>
        )}
      </div>
    </Card>
  );
}
