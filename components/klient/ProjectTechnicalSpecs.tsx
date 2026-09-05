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

interface SpecRow {
  label: string;
  value: string;
}

interface SpecGroup {
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
const GROUP_ACCENTS: Record<
  string,
  { plaque: string; icon: string; rule: string }
> = {
  "Konstrukcja i wykończenie": {
    plaque: "bg-brand-v5-ink",
    icon: "text-brand-v5-paper",
    rule: "border-brand-v5-ink/30",
  },
  "Efektywność energetyczna": {
    plaque: "bg-brand-v5-amber/15",
    icon: "text-brand-v5-amber-strong",
    rule: "border-brand-v5-amber-strong/40",
  },
  "Bezpieczeństwo i gwarancja": {
    plaque: "bg-status-approved/15",
    icon: "text-status-approved",
    rule: "border-status-approved/40",
  },
};

// Real producer data is uneven (rationale.md: Budman podaje U-value tylko na osobnej
// podstronie, nie w tekście) — każdy wiersz renderuje się tylko, gdy pole źródłowe jest
// niepuste; brak choćby jednego wiersza nigdy nie renderuje pustego placeholdera
// (spec 0020 AC-4, ten sam wzorzec co ProjectCertifications). Pola grupują się w trzy
// pytania, jakie zadaje sobie pierwszy raz kupujący dom transgranicznie (z czego to jest,
// czy będzie tanio w utrzymaniu, czy to bezpieczne) zamiast płaskiej listy 14 wierszy.
export function ProjectTechnicalSpecs({ project }: ProjectTechnicalSpecsProps) {
  const groups: SpecGroup[] = [
    {
      title: "Konstrukcja i wykończenie",
      icon: ConstructionIcon,
      rows: [
        { label: "System konstrukcyjny", value: project.constructionSystem },
        { label: "Wymiary zewnętrzne", value: project.externalDimensions },
        { label: "Dach", value: project.roofType },
        { label: "Fundament", value: project.foundationOptions },
        { label: "Przegroda ścienna", value: project.wallBuildUp },
        { label: "Zakres personalizacji", value: project.customizationScope },
      ],
    },
    {
      title: "Efektywność energetyczna",
      icon: EnergyEfficiencyIcon,
      rows: [
        { label: "Izolacyjność", value: project.insulation },
        {
          label: "Współczynniki przenikania ciepła",
          value: project.heatTransferCoefficients,
        },
        { label: "Klasa okien", value: project.windowClass },
        { label: "Wentylacja", value: project.ventilation },
        { label: "Źródło ciepła", value: project.heatSource },
      ],
    },
    {
      title: "Bezpieczeństwo i gwarancja",
      icon: SafetyIcon,
      rows: [
        { label: "Odporność ogniowa", value: project.fireResistance },
        { label: "Odporność na wiatr", value: project.windResistance },
        {
          label: "Gwarancja konstrukcyjna",
          value: `${project.structuralWarrantyYears} lat`,
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
        Technologia i konstrukcja
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
          const accent = GROUP_ACCENTS[group.title];
          return (
            <ScrollReveal
              key={group.title}
              className={
                index === 0
                  ? "flex flex-col gap-brand-5"
                  : `flex flex-col gap-brand-5 border-t pt-brand-6 lg:pt-brand-7 ${accent?.rule ?? "border-brand-v5-line"}`
              }
              style={{ transitionDelay: `${index * 120}ms` }}
            >
              <div className="flex items-center gap-brand-4">
                <span
                  className={`flex size-14 shrink-0 items-center justify-center rounded-data ${accent?.plaque ?? "bg-brand-v5-ink"}`}
                >
                  <group.icon
                    className={`size-7 ${accent?.icon ?? "text-brand-v5-paper"}`}
                  />
                </span>
                <Heading level="h3" surface="v5" className="text-h3 font-bold leading-snug">
                  {group.title}
                </Heading>
              </div>
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
            </ScrollReveal>
          );
        })}
      </div>
    </div>
  );
}
