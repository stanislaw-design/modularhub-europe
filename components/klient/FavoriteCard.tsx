import { ImageOff, MapPin } from "lucide-react";
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
export function FavoriteCard({ entry, locale, selected, selectionDisabled, onToggleSelect }: FavoriteCardProps) {
  const { project, available } = entry;
  const href = `/${locale}/klient/projekt/${project.id}`;

  return (
    <Card as="article" padding="none" className="relative flex h-full flex-col overflow-hidden">
      <Link
        href={href}
        className="focus-ring absolute inset-0 z-0 rounded-card"
        aria-label={`Zobacz szczegóły projektu ${project.name}`}
      />
      <div className="relative aspect-[3/2] overflow-hidden">
        {project.coverImageUrl ? (
          <Image
            src={project.coverImageUrl}
            alt=""
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
            className="object-cover"
          />
        ) : (
          <div className="flex size-full items-center justify-center bg-brand-steel/20">
            <ImageOff className="size-8 text-brand-technical-graphite/50" aria-hidden="true" />
          </div>
        )}
        <label className="absolute right-brand-2 top-brand-2 z-10 flex items-center justify-center rounded-data bg-brand-warm-white/95 p-1.5 shadow-sm">
          <span className="sr-only">Zaznacz {project.name} do porównania</span>
          <Checkbox
            checked={selected}
            disabled={selectionDisabled}
            onChange={onToggleSelect}
            title={selectionDisabled ? "Można porównać maksymalnie 3 domy" : undefined}
          />
        </label>
        <FavoriteButton
          productId={project.id}
          productName={project.name}
          locale={locale}
          isClientSession
          initialFavorited
          className="absolute left-brand-2 top-brand-2 z-10"
        />
      </div>
      <div className="relative z-10 flex flex-1 flex-col gap-brand-2 p-brand-3">
        {!available && <StatusPill status="blocked">Produkt niedostępny</StatusPill>}
        <div className="flex flex-col gap-1">
          <Heading level="h3" className="text-body-l">
            {project.name}
          </Heading>
          <Text tone="muted" className="flex items-center gap-1 text-data">
            <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
            <span>{project.producerName}</span>
          </Text>
        </div>
        <Text className="font-medium">{project.floorAreaM2} m² użytkowe</Text>
        <DataText className="mt-auto border-t border-brand-steel pt-brand-2 text-body-l font-semibold">
          od {priceFormatter.format(project.priceMin)} €
        </DataText>
      </div>
    </Card>
  );
}
