import { getTranslations } from "next-intl/server";
import { DataText, Heading, StatusPill, Text } from "@/components/ui";
import type { TimelineStage, TimelineStageKey } from "@/lib/data/types";

interface ProjectTimelineProps {
  stages: TimelineStage[];
}

const ALL_STAGE_KEYS: TimelineStageKey[] = ["formalnosci", "produkcja", "transport", "montaz", "wykonczenie"];

// Pionowa oś z kropką i łączącą linią, jeden wiersz na etap, nie karty (spec
// 0042 Feature design). Inny komponent niż components/ui/StageTimeline (ten
// śledzi postęp realizacji przez status completed/current/upcoming); tu nie
// ma statusu, tylko plan: czas trwania, punkt odniesienia startu i osoba
// odpowiedzialna — stąd własny, bespoke układ zamiast wymuszania cudzego
// kształtu danych na ten prymityw. Renderuje zawsze wszystkie pięć etapów w
// stałej kolejności: etap bez wiersza w bazie pokazuje jawny placeholder
// zamiast znikać (świadome odejście od pierwotnego AC-6).
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

  return (
    <div className="flex flex-col gap-brand-3">
      <Heading level="h2" surface="v5" className="text-h3">
        {t("heading")}
      </Heading>
      <ol className="flex flex-col">
        {ALL_STAGE_KEYS.map((stageKey, index) => {
          const stage = stageByKey.get(stageKey);
          const isLast = index === ALL_STAGE_KEYS.length - 1;
          const { durationMinDays: min, durationMaxDays: max } = stage ?? {};
          const durationText =
            max !== undefined ? (min !== undefined && min !== max ? t("durationRange", { min, max }) : t("durationSingle", { count: max })) : null;

          return (
            <li key={stageKey} className="flex gap-brand-3">
              <div className="flex flex-col items-center">
                <span
                  className={`mt-1.5 size-3 shrink-0 rounded-full ${stage ? "bg-brand-v5-ink" : "border border-dashed border-brand-v5-muted bg-transparent"}`}
                  aria-hidden="true"
                />
                {!isLast && <span className="w-px flex-1 bg-brand-v5-line" aria-hidden="true" />}
              </div>
              <div className="flex-1 pb-brand-4">
                <Text as="p" variant="bodyL" surface="v5" className="font-semibold">
                  {stageLabel[stageKey]}
                </Text>
                {stage ? (
                  <>
                    {durationText && (
                      <DataText as="p" surface="v5" className="text-data">
                        {durationText}
                      </DataText>
                    )}
                    {stage.startsFromLabel && (
                      <Text tone="muted" surface="v5" className="text-data">
                        {t("startsFrom", { label: stage.startsFromLabel })}
                      </Text>
                    )}
                    {stage.responsibleParty && (
                      <Text tone="muted" surface="v5" className="text-data">
                        {t("responsibleParty", { party: stage.responsibleParty })}
                      </Text>
                    )}
                  </>
                ) : (
                  <div className="mt-1">
                    <StatusPill status="conditional">{t("toBeCompleted")}</StatusPill>
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
