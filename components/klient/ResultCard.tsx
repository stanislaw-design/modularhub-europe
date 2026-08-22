import { Clock3, MapPin } from "lucide-react";
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

const standardLabel = {
  "surowy-zamkniety": "Stan surowy zamknięty",
  deweloperski: "Standard deweloperski",
  "pod-klucz": "Pod klucz",
} as const;

function roomsLabel(count: number) {
  return count === 1 ? "pokój" : count >= 2 && count <= 4 ? "pokoje" : "pokoi";
}

export function ResultCard({
  project,
  countryName,
  eligibilityStatus,
  selected,
  selectionDisabled,
  onToggleSelect,
}: ResultCardProps) {
  return (
    <Card as="article" padding="none" className="flex h-full flex-col overflow-hidden">
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
      <div className="flex flex-1 flex-col gap-brand-2 p-brand-3">
        {eligibilityStatus === "conditional" && (
          <StatusPill status="conditional">Wymaga dodatkowych dokumentów</StatusPill>
        )}
        <div className="flex flex-col gap-1">
          <Heading level="h3" className="text-body-l">
            {project.name}
          </Heading>
          <Text tone="muted" className="flex items-center gap-1 text-data">
            <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
            <span>{project.producerName} · {countryName}</span>
          </Text>
        </div>
        <Text className="font-medium">
          {project.floorAreaM2} m² użytkowe · {project.rooms} {roomsLabel(project.rooms)} · {project.storeys} kond.
        </Text>
        <Text tone="muted" className="text-data">
          {project.constructionSystem} · {standardLabel[project.commercial.completionStandard]}
        </Text>
        <div className="mt-auto border-t border-brand-steel pt-brand-2">
          <Text variant="label" tone="muted">Szacowany pakiet</Text>
          <DataText as="p" className="mt-1 text-body-l font-semibold">
            {priceFormatter.format(project.priceMin)}–{priceFormatter.format(project.priceMax)} €
          </DataText>
          <Text tone="muted" className="mt-1 text-data">Dom + standardowy transport + montaż</Text>
        </div>
        <Text tone="muted" className="flex items-center gap-1 text-data">
          <Clock3 className="size-3.5 shrink-0" aria-hidden="true" />
          {project.commercial.productionLeadTimeWeeksMin}–{project.commercial.productionLeadTimeWeeksMax} tyg. produkcji · {project.commercial.onSiteAssemblyDaysMin}–{project.commercial.onSiteAssemblyDaysMax} dni montażu
        </Text>
      </div>
    </Card>
  );
}
