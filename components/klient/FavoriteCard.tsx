import { ImageOff, MapPin } from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import Link from "next/link";
import { Card, Checkbox, DataText, Heading, StatusPill, Text } from "@/components/ui";
import type { FavoriteListEntry } from "@/lib/data/projects";
import { FavoriteButton } from "./FavoriteButton";

interface FavoriteCardProps {
  entry: FavoriteListEntry;
  locale: string;
  selected: boolean;
  selectionDisabled: boolean;
  onToggleSelect: () => void;
}

const priceFormatter = new Intl.NumberFormat("pl-PL", { maximumFractionDigits: 0 });

// Karta na /klient/panel/ulubione (spec 0024 AC-2, AC-3, AC-6): serce cofa
// ulubienie (zawsze sesja klienta, zawsze favorited na tej stronie), checkbox
// zaznacza do porównania (maksymalnie 3, stan w URL, patrz FavoritesGrid).
// Produkt niedostępny zostaje na liście, tylko oznaczony, nie znika po cichu.
// Only ever rendered from FavoritesGrid ("use client"): useTranslations, not
// getTranslations (same reason as InquiryConfirmationCard).
export function FavoriteCard({ entry, locale, selected, selectionDisabled, onToggleSelect }: FavoriteCardProps) {
  const t = useTranslations("FavoriteCard");
  const { project, available } = entry;
  const href = `/${locale}/klient/projekt/${project.id}`;

  return (
    <Card
      as="article"
      padding="none"
      surface="v5"
      className="group relative flex h-full flex-col overflow-hidden transition-shadow hover:shadow-md"
    >
      <Link
        href={href}
        className="focus-ring absolute inset-0 z-0 rounded-v5-card"
        aria-label={t("viewDetails", { name: project.name })}
      />
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
          <div className="flex size-full items-center justify-center bg-brand-v5-line/40">
            <ImageOff className="size-8 text-brand-v5-muted/50" aria-hidden="true" />
          </div>
        )}
        <label className="absolute right-brand-2 top-brand-2 z-10 flex items-center justify-center rounded-data bg-brand-v5-surface/95 p-1.5 shadow-sm">
          <span className="sr-only">{t("selectForCompare", { name: project.name })}</span>
          <Checkbox
            surface="v5"
            checked={selected}
            disabled={selectionDisabled}
            onChange={onToggleSelect}
            title={selectionDisabled ? t("compareLimitReached") : undefined}
          />
        </label>
        <FavoriteButton
          productId={project.id}
          productName={project.name}
          locale={locale}
          isClientSession
          initialFavorited
          className="absolute left-brand-2 top-brand-2 z-10"
          surface="v5"
        />
      </div>
      <div className="relative z-10 flex flex-1 flex-col gap-brand-2 p-brand-3">
        {!available && <StatusPill status="blocked">{t("unavailable")}</StatusPill>}
        <div className="flex flex-col gap-1">
          <Heading level="h3" surface="v5" className="text-body-l">
            {project.name}
          </Heading>
          <Text tone="muted" surface="v5" className="flex items-center gap-1 text-data">
            <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
            <span>{project.producerName}</span>
          </Text>
        </div>
        <Text surface="v5" className="font-medium">
          {t("floorArea", { area: project.floorAreaM2 })}
        </Text>
        <DataText surface="v5" className="mt-auto border-t border-brand-v5-line pt-brand-2 text-body-l font-semibold">
          {t("priceFrom", { price: priceFormatter.format(project.priceMin) })}
        </DataText>
      </div>
    </Card>
  );
}
