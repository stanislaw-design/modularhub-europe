import { MapPin } from "lucide-react";
import Image from "next/image";
import { Card, Checkbox, DataText, Heading, StatusPill, Text } from "@/components/ui";
import type { EligibilityStatus, Project } from "@/lib/data/types";

interface ResultCardProps {
  project: Project;
  countryName: string;
  eligibilityStatus?: EligibilityStatus;
  selected?: boolean;
  selectionDisabled?: boolean;
  onToggleSelect?: () => void;
}

const priceFormatter = new Intl.NumberFormat("pl-PL", { maximumFractionDigits: 0 });

export function ResultCard({
  project,
  countryName,
  eligibilityStatus,
  selected,
  selectionDisabled,
  onToggleSelect,
}: ResultCardProps) {
  return (
    <Card as="article" padding="none" className="flex flex-col gap-brand-2 overflow-hidden">
      <div className="relative aspect-[3/2] overflow-hidden">
        <Image
          src={project.coverImageUrl}
          alt=""
          fill
          sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
          className="object-cover"
        />
        {onToggleSelect && (
          <label className="absolute right-brand-2 top-brand-2 flex items-center justify-center rounded-data bg-brand-warm-white/95 p-1.5 shadow-sm">
            <span className="sr-only">Zaznacz {project.name} do zapytania</span>
            <Checkbox
              checked={selected ?? false}
              disabled={selectionDisabled}
              onChange={onToggleSelect}
              title={selectionDisabled ? "Można zaznaczyć maksymalnie 3 projekty" : undefined}
            />
          </label>
        )}
      </div>
      <div className="flex flex-col gap-brand-2 px-brand-3 pb-brand-3">
        {eligibilityStatus === "conditional" && (
          <StatusPill status="conditional">Wymaga dodatkowych dokumentów</StatusPill>
        )}
        <div className="flex items-baseline justify-between gap-brand-1">
          <Heading level="h3" className="min-w-0 flex-1 truncate text-body-l">
            {project.name}
          </Heading>
          <DataText className="shrink-0">
            {priceFormatter.format(project.priceMin)}–{priceFormatter.format(project.priceMax)} €
          </DataText>
        </div>
        <Text tone="muted" className="flex items-center gap-1">
          <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
          <span className="min-w-0 flex-1 truncate">
            {project.producerName} · {countryName}
          </span>
        </Text>
        <Text tone="muted">
          {project.floorAreaM2} m² · {project.bedrooms} sypialnie
        </Text>
      </div>
    </Card>
  );
}
