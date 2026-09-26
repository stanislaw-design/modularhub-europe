import { ChevronDown, ClipboardCheck, Factory, HardHat, Paintbrush, Truck } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { DataText, Heading, Text } from "@/components/ui";
import type { TimelineStage, TimelineStageKey } from "@/lib/data/types";

interface ProjectTimelineProps {
  stages: TimelineStage[];
}

// Chronologiczna kolejność, użyta tylko do sortowania stages faktycznie
// obecnych w danych (spec 0054 AC-6) — nie renderowana jako stała lista pięciu
// pozycji.
const STAGE_ORDER: TimelineStageKey[] = ["formalnosci", "produkcja", "transport", "montaz", "wykonczenie"];

// Jeden symbol na etap, żeby pozioma wersja (desktop) czytała się bez
// czytania etykiety — ten sam zestaw ikon działa też na mobile.
const STAGE_ICON: Record<TimelineStageKey, typeof ClipboardCheck> = {
  formalnosci: ClipboardCheck,
  produkcja: Factory,
  transport: Truck,
  montaz: HardHat,
  wykonczenie: Paintbrush,
};

// Pozioma oś na desktopie (ikona w kolorowym znaczniku + łącząca linia
// zakotwiczona w środku znacznika, niezależnie od wysokości tekstu pod nią),
// pionowa i wyśrodkowana na mobile (spec 0042 Feature design, odświeżone
// wizualnie: ikony + akcent amber zamiast gołych kropek). Inny komponent niż
// components/ui/StageTimeline (ten śledzi postęp realizacji przez status
// completed/current/upcoming); tu nie ma statusu, tylko plan: czas trwania,
// punkt odniesienia startu i osoba odpowiedzialna — stąd własny, bespoke
// układ zamiast wymuszania cudzego kształtu danych na ten prymityw. Renderuje
// tylko etapy, dla których wybrany wariant ma wiersz, w ich chronologicznej
// kolejności; łącząca linia/chevron biegnie tylko między wyrenderowanymi
// etapami (spec 0054 AC-6); cała sekcja znika, gdy wariant ma zero etapów
// (AC-8).
export async function ProjectTimeline({ stages }: ProjectTimelineProps) {
  const t = await getTranslations("ProjectTimeline");
  const stageLabel: Record<TimelineStageKey, string> = {
    formalnosci: t("stage.formalnosci"),
    produkcja: t("stage.produkcja"),
    transport: t("stage.transport"),
    montaz: t("stage.montaz"),
    wykonczenie: t("stage.wykonczenie"),
  };
  const stageByKey = new Map(stages.map((stage) => [stage.stageKey, stage]));
  const presentStages = STAGE_ORDER.filter((stageKey) => stageByKey.has(stageKey));

  if (presentStages.length === 0) return null;

  return (
    <div className="flex flex-col gap-brand-4">
      <Heading level="h2" surface="v5" className="text-h3">
        {t("heading")}
      </Heading>
      <ol className="flex flex-col gap-brand-3 md:flex-row md:items-start md:gap-0">
        {presentStages.map((stageKey, index) => {
          const stage = stageByKey.get(stageKey)!;
          const isFirst = index === 0;
          const isLast = index === presentStages.length - 1;
          const { durationMinDays: min, durationMaxDays: max } = stage;
          const durationText =
            max !== undefined ? (min !== undefined && min !== max ? t("durationRange", { min, max }) : t("durationSingle", { count: max })) : null;
          const StageIcon = STAGE_ICON[stageKey];

          return (
            <li key={stageKey} className="flex flex-col items-center gap-brand-3 md:flex-1 md:px-brand-2">
              <div className="relative flex w-full items-center justify-center">
                {!isFirst && (
                  <span
                    className="absolute top-1/2 left-0 right-1/2 hidden h-px -translate-y-1/2 bg-brand-v5-line md:block"
                    aria-hidden="true"
                  />
                )}
                {!isLast && (
                  <span
                    className="absolute top-1/2 left-1/2 right-0 hidden h-px -translate-y-1/2 bg-brand-v5-line md:block"
                    aria-hidden="true"
                  />
                )}
                <span className="relative z-10 flex size-14 shrink-0 items-center justify-center rounded-full bg-brand-v5-amber-strong md:size-16">
                  <StageIcon className="size-7 text-brand-v5-amber-foreground md:size-8" aria-hidden="true" />
                </span>
              </div>
              <div className="flex flex-col items-center gap-1 text-center">
                <Text as="p" variant="bodyL" surface="v5" className="font-semibold md:text-h3">
                  {stageLabel[stageKey]}
                </Text>
                {durationText && (
                  <DataText as="p" surface="v5" className="md:text-body-l">
                    {durationText}
                  </DataText>
                )}
                {stage.startsFromLabel && (
                  <Text tone="muted" surface="v5" className="text-data md:text-body">
                    {t("startsFrom", { label: stage.startsFromLabel })}
                  </Text>
                )}
                {stage.responsibleParty && (
                  <Text tone="muted" surface="v5" className="text-data md:text-body">
                    {t("responsibleParty", { party: stage.responsibleParty })}
                  </Text>
                )}
              </div>
              {!isLast && <ChevronDown className="size-6 text-brand-v5-muted md:hidden" aria-hidden="true" />}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
