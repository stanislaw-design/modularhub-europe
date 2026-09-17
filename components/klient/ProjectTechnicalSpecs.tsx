import { getTranslations } from "next-intl/server";
import type { ComponentType } from "react";
import { Heading, Text, DataText, ScrollReveal } from "@/components/ui";
import {
  ConstructionIcon,
  EnergyEfficiencyIcon,
  SafetyIcon,
  type SpecIconProps,
} from "@/components/klient/ProjectSpecIcons";
import type { Project } from "@/lib/data/types";

interface ProjectTechnicalSpecsProps {
  project: Project;
}

type GroupId = "construction" | "energy" | "safety";

interface SpecRow {
  label: string;
  value: string;
}

interface SpecGroup {
  id: GroupId;
  title: string;
  icon: ComponentType<SpecIconProps>;
  rows: SpecRow[];
}

// Każda grupa dostaje własny kolor plakietki zamiast jednolitego, czarnego
// wariantu — powtarza kod barw już użyty wyżej na tej stronie (ShieldCheck/
// Award w sygnałach zaufania używają text-status-approved, RoomsIcon i inne w
// pasku "kluczowe dane" używają bg-brand-v5-amber/10), więc to nie nowa
// dekoracja, tylko konsekwentne domknięcie istniejącego kodu barw: czerń =
// konstrukcja, pomarańcz = parametry energetyczne, zielony = bezpieczeństwo/
// gwarancja (ten sam zielony co status "approved" wyżej na stronie).
const GROUP_ACCENTS: Record<GroupId, { plaque: string; icon: string; rule: string; panel: string }> = {
  construction: {
    plaque: "bg-brand-v5-night",
    icon: "text-brand-v5-paper",
    rule: "border-brand-v5-night/30",
    panel: "bg-brand-v5-night/[0.06]",
  },
  energy: {
    plaque: "bg-brand-v5-amber/15",
    icon: "text-brand-v5-amber-strong",
    rule: "border-brand-v5-amber-strong/40",
    panel: "bg-brand-v5-amber/12",
  },
  safety: {
    plaque: "bg-status-approved/15",
    icon: "text-status-approved",
    rule: "border-status-approved/40",
    panel: "bg-status-approved/10",
  },
};

// Real producer data is uneven (rationale.md: Budman podaje U-value tylko na osobnej
// podstronie, nie w tekście) — każdy wiersz renderuje się tylko, gdy pole źródłowe jest
// niepuste; brak choćby jednego wiersza nigdy nie renderuje pustego placeholdera
// (spec 0020 AC-4, ten sam wzorzec co ProjectCertifications). Pola grupują się w trzy
// pytania, jakie zadaje sobie pierwszy raz kupujący dom transgranicznie (z czego to jest,
// czy będzie tanio w utrzymaniu, czy to bezpieczne) zamiast płaskiej listy 14 wierszy.
export async function ProjectTechnicalSpecs({ project }: ProjectTechnicalSpecsProps) {
  const t = await getTranslations("ProjectTechnicalSpecs");
  const groups: SpecGroup[] = [
    {
      id: "construction" as const,
      title: t("groupConstructionTitle"),
      icon: ConstructionIcon,
      rows: [
        { label: t("constructionSystem"), value: project.constructionSystem },
        { label: t("externalDimensions"), value: project.externalDimensions },
        { label: t("roofType"), value: project.roofType },
        { label: t("foundationOptions"), value: project.foundationOptions },
        { label: t("wallBuildUp"), value: project.wallBuildUp },
        { label: t("customizationScope"), value: project.customizationScope },
      ],
    },
    {
      id: "energy" as const,
      title: t("groupEnergyTitle"),
      icon: EnergyEfficiencyIcon,
      rows: [
        { label: t("insulation"), value: project.insulation },
        {
          label: t("heatTransferCoefficients"),
          value: project.heatTransferCoefficients,
        },
        { label: t("windowClass"), value: project.windowClass },
        { label: t("ventilation"), value: project.ventilation },
        { label: t("heatSource"), value: project.heatSource },
      ],
    },
    {
      id: "safety" as const,
      title: t("groupSafetyTitle"),
      icon: SafetyIcon,
      rows: [
        { label: t("fireResistance"), value: project.fireResistance },
        { label: t("windResistance"), value: project.windResistance },
        {
          label: t("warrantyLabel"),
          value: t("warrantyValue", { years: project.structuralWarrantyYears }),
        },
      ],
    },
  ]
    .map((group) => ({
      ...group,
      rows: group.rows.filter((row) => row.value.trim().length > 0),
    }))
    .filter((group) => group.rows.length > 0);

  if (groups.length === 0) return null;

  return (
    <div className="flex flex-col gap-brand-6">
      <Heading level="h2" surface="v5" className="text-h3">
        {t("heading")}
      </Heading>
      {/* Odchodzimy od gęstej tabeli z cienkimi liniami podziału na rzecz układu
          edytorialnego: każda grupa to osobna, przestronna sekcja oddzielona samą
          cienką linią u góry i dużym odstępem (brand-7 na dużym ekranie), bez
          obramowanej "karty". Ta sama gęstość danych czytana jest wtedy jak strona
          konfiguratora auta premium, nie arkusz kalkulacyjny — powietrze wokół
          danych robi wrażenie ekskluzywności, nie same dane. ScrollReveal wprowadza
          każdą sekcję z osobna i z lekkim opóźnieniem, więc treść odsłania się
          w swoim tempie przy scrollu, zamiast wyskakiwać w całości naraz. */}
      <div className="flex flex-col gap-brand-6 lg:gap-brand-7">
        {groups.map((group, index) => {
          const accent = GROUP_ACCENTS[group.id];
          return (
            <ScrollReveal
              key={group.id}
              className={
                index === 0
                  ? "flex flex-col gap-brand-5"
                  : `flex flex-col gap-brand-5 border-t pt-brand-6 lg:pt-brand-7 ${accent?.rule ?? "border-brand-v5-line"}`
              }
              style={{ transitionDelay: `${index * 120}ms` }}
            >
              <div className="flex items-center gap-brand-4">
                <span
                  className={`flex size-14 shrink-0 items-center justify-center rounded-data ${accent?.plaque ?? "bg-brand-v5-night"}`}
                >
                  <group.icon
                    className={`size-7 ${accent?.icon ?? "text-brand-v5-paper"}`}
                  />
                </span>
                <Heading level="h3" surface="v5" className="text-h3 font-bold leading-snug">
                  {group.title}
                </Heading>
              </div>
              {group.id === "safety" ? (
                <dl className="grid grid-cols-1 gap-x-brand-6 gap-y-brand-5 sm:grid-cols-2 lg:grid-cols-3">
                  {group.rows.map((row) => {
                    // Krótkie wartości (wymiary, lata gwarancji, klasy) dostają duży,
                    // "cennikowy" rozmiar dla efektu ekskluzywności; dłuższe, zdaniowe
                    // opisy (np. przegroda ścienna, współczynniki U) zajmują cały wiersz
                    // i mniejszy rozmiar, żeby nie zawijały się w gęstą ścianę tekstu.
                    const isLongValue = row.value.length > 40;
                    return (
                      <div
                        key={row.label}
                        className={`flex flex-col gap-2 ${isLongValue ? "sm:col-span-2 lg:col-span-3" : ""}`}
                      >
                        <Text as="dt" variant="label" tone="muted" surface="v5">
                          {row.label}
                        </Text>
                        <DataText
                          as="dd"
                          surface="v5"
                          className={
                            isLongValue
                              ? "text-body-l font-medium leading-snug"
                              : "text-h3 font-medium leading-snug"
                          }
                        >
                          {row.value}
                        </DataText>
                      </div>
                    );
                  })}
                </dl>
              ) : (
                // Konstrukcja i technologia stawiają pytanie kupującego jako argument
                // ("czy będzie mi tu ciepło"), a surowy parametr producenta jest tylko
                // odpowiedzią pod spodem — nie odwrotnie, jak w dawnym układzie tabeli,
                // gdzie sama liczba (duży DataText) była bohaterem karty. Cała grupa
                // siedzi w jednym, nasyconym kolorem akcentu panelu zamiast siatki
                // identycznych, obramowanych kart (banalne i płaskie, ten sam problem
                // co odrzucona generyczna e-commerce'owa siatka specyfikacji) — próba
                // wyróżnienia jednego "najlepszego" wiersza zamiast tego zawodzi w
                // praktyce, bo dane producenta są nierówne (patrz komentarz wyżej) i to,
                // co akurat przetrwa filtr pustych pól, bywa najsłabszym argumentem, nie
                // najmocniejszym. Każde pytanie w panelu dostaje więc równą, dużą wagę.
                <div className={`rounded-v5-card border p-brand-5 lg:p-brand-6 ${accent?.panel ?? "bg-brand-v5-surface"} ${accent?.rule ?? "border-brand-v5-line"}`}>
                  <div className="grid grid-cols-1 gap-x-brand-6 gap-y-brand-5 sm:grid-cols-2">
                    {group.rows.map((row) => (
                      <div key={row.label} className="flex flex-col gap-2">
                        <Text as="h4" surface="v5" className="text-h3 font-bold leading-snug">
                          {row.label}
                        </Text>
                        <Text as="p" variant="body" tone="muted" surface="v5" className="leading-relaxed">
                          {row.value}
                        </Text>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </ScrollReveal>
          );
        })}
      </div>
    </div>
  );
}
