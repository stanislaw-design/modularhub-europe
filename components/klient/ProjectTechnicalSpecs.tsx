import { getTranslations } from "next-intl/server";
import type { ComponentType } from "react";
import { Heading, Text, ScrollReveal } from "@/components/ui";
import {
  ConstructionIcon,
  CustomizationIcon,
  EnergyEfficiencyIcon,
  HeatSourceIcon,
  RoofPitchIcon,
  VentilationIcon,
  WindowSealIcon,
  type SpecIconProps,
} from "@/components/klient/ProjectSpecIcons";
import type { Project } from "@/lib/data/types";
import { ENERGY_CLASSES, HEAT_SOURCES, VENTILATION_TYPES } from "@/lib/product-technical-specs";

type Translate = Awaited<ReturnType<typeof getTranslations>>;

// heatTransferCoefficients/ventilation/heatSource są zapisane w bazie jako
// surowe wartości enumów (np. "pompa-ciepla-powietrze-woda"), ten sam katalog
// co kreator producenta (lib/product-technical-specs.ts) — bez tego mapowania
// klient widziałby wprost klucz enumu zamiast tłumaczonej etykiety.
// Tłumaczenia żyją pod "ProjectOptions", tą samą przestrzenią co
// ProjectWizardTechnicalStep/ProjectWizardSummaryStep (producent), żeby nie
// dublować katalogu wartości. Wartość spoza enumu (dane historyczne) albo
// pusty string wraca bez zmian — filtr pustych wierszy niżej i tak go usunie.
// Wyjątek: "nieznana" NIE bierze tOptions("energyClassNotSpecified") ("Nie
// podano") — ten string zostaje w ProjectOptions tylko jako etykieta opcji w
// kreatorze producenta. Na stronie klienta "Nie podano" czytało się jak brak
// informacji/zaniedbanie, a to świadoma, dostępna od razu opcja wyboru w
// kreatorze (spec 0026 AC-12) — klient dostaje więc własny, przyszłościowy
// tekst (energyClassPending) mówiący, że wybór nastąpi przy tworzeniu projektu
// z producentem, zależnie od potrzeb, nie że "nikt tego nie podał".
function resolveEnergyClass(value: string, t: Translate, tOptions: Translate): string {
  if (value === "nieznana") return t("energyClassPending");
  if ((ENERGY_CLASSES as readonly string[]).includes(value)) {
    return tOptions("energyClassPrefix", { code: value });
  }
  return value;
}

function resolveVentilation(value: string, tOptions: Translate): string {
  if ((VENTILATION_TYPES as readonly string[]).includes(value)) {
    return tOptions(`technicalFields.dom.ventilation.options.${value}`);
  }
  return value;
}

function resolveHeatSource(value: string, tOptions: Translate): string {
  if ((HEAT_SOURCES as readonly string[]).includes(value)) {
    return tOptions(`technicalFields.dom.heatSource.options.${value}`);
  }
  return value;
}

// "Klasa A"/"Mechaniczna nawiewno-wywiewna" na własną rękę nie odpowiadają na
// pytania kafelków ("Jak szczelne...?", "Czy latem będzie duszno?") — to
// etykiety z listy wyboru kreatora, nie zdania. Ten drugi wiersz kafelka
// dopowiada jednym zdaniem, co dana wartość realnie oznacza dla kupującego.
// Żyje pod ProjectTechnicalSpecs (nie ProjectOptions): to interpretacja
// specyficzna dla tego widoku, nie etykieta pola współdzielona z kreatorem
// producenta. Wartość spoza enumu (dane historyczne) nie dostaje dopowiedzenia.
function resolveEnergyClassDetail(value: string, t: Translate): string {
  if ((ENERGY_CLASSES as readonly string[]).includes(value)) {
    return t(`energyClassDetail.${value}`);
  }
  return "";
}

function resolveVentilationDetail(value: string, t: Translate): string {
  if ((VENTILATION_TYPES as readonly string[]).includes(value)) {
    return t(`ventilationDetail.${value}`);
  }
  return "";
}

// Pytanie kafelka to teraz "Jaki jest system wentylacji?" — resolveVentilation
// (etykieta z listy kreatora, np. "Mechaniczna nawiewno-wywiewna") na to pytanie
// nie odpowiada jako zdanie, samo w sobie czyta się jak urwany fragment. To
// osobne tłumaczenie zamienia tę samą wartość w pełne zdanie ("Ten projekt
// zawiera wentylację..."); deklinacja różni się na tyle między opcjami (biernik
// przymiotnika, "z rekuperacją", "nie ma"), że nie da się tego złożyć
// automatycznie z resolveVentilation. Wartość spoza enumu (dane historyczne)
// wraca do starej etykiety zamiast łamać gramatykę zdania.
// "nieznana" nie jest prawdziwą opcją wentylacji z listy kreatora (nie ma jej
// w VENTILATION_TYPES, w przeciwieństwie do ENERGY_CLASSES) — to wartość ze
// starszego importu, bez własnego tłumaczenia w ventilationSummary. Bez tego
// wczesnego zwrotu spadałaby do resolveVentilation i pokazywała surowy klucz
// enumu "nieznana" wprost na karcie klienta, ten sam błąd, którego
// resolveEnergyClass unika swoim wczesnym zwrotem wyżej.
function resolveVentilationSummary(value: string, t: Translate, tOptions: Translate): string {
  if (value === "nieznana") return t("unknownPending");
  if ((VENTILATION_TYPES as readonly string[]).includes(value)) {
    return t(`ventilationSummary.${value}`);
  }
  return resolveVentilation(value, tOptions);
}

// Ten sam zabieg co resolveVentilationSummary, dla "Czym dom jest ogrzewany?":
// "Pompa ciepła powietrze-woda" samo w sobie brzmi jak etykieta z listy, nie
// jak odpowiedź na pytanie. heatSourceSummary zamienia ją w pełne zdanie
// ("Dom jest ogrzewany za pomocą..."), heatSourceDetail dopowiada niżej, na
// czym dane źródło ciepła polega.
function resolveHeatSourceSummary(value: string, t: Translate, tOptions: Translate): string {
  if (value === "nieznana") return t("unknownPending");
  if ((HEAT_SOURCES as readonly string[]).includes(value)) {
    return t(`heatSourceSummary.${value}`);
  }
  return resolveHeatSource(value, tOptions);
}

function resolveHeatSourceDetail(value: string, t: Translate): string {
  if ((HEAT_SOURCES as readonly string[]).includes(value)) {
    return t(`heatSourceDetail.${value}`);
  }
  return "";
}

interface ProjectTechnicalSpecsProps {
  project: Project;
}

type GroupId = "construction" | "energy";

interface SpecRow {
  label: string;
  value: string;
  // Drugie, mniejsze zdanie pod value — patrz komentarz przy
  // resolveEnergyClassDetail/resolveVentilationDetail. Puste = kafelek
  // pokazuje samo value, tak jak wcześniej (constructionSystem/roofType/
  // customizationScope/heatSource mają już pełne, opisowe value same w sobie).
  detail?: string;
  // Ikona pytania, nie grupy: każdy kafelek konstrukcji/energii odpowiada na
  // inne pytanie klienta, więc dostaje własny, dopasowany symbol zamiast
  // powtórzonej ikony grupy z nagłówka.
  icon: ComponentType<SpecIconProps>;
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
// konstrukcja, pomarańcz = parametry energetyczne (grupa "bezpieczeństwo i
// gwarancja" przeniosła się do sekcji "Realizacje i producent", patrz
// ProducerRealizationsSection). Kolor żyje tylko w małej plakietce ikony (ten
// sam rozmiar co inne plakietki na stronie) — nigdy jako wypełnienie całego
// kafelka: StatusPill gdzie indziej w produkcie używa tego samego pomarańczu
// dla statusu "conditional", więc duży pomarańczowy panel czytał się jak
// ostrzeżenie/błąd, nie jak neutralna informacja (DESIGN.md: "Orange... never
// as large-area decoration").
const GROUP_ACCENTS: Record<GroupId, { plaque: string; icon: string; rule: string }> = {
  construction: {
    plaque: "bg-brand-v5-night",
    icon: "text-brand-v5-paper",
    rule: "border-brand-v5-night/30",
  },
  energy: {
    plaque: "bg-brand-v5-amber/15",
    icon: "text-brand-v5-amber-strong",
    rule: "border-brand-v5-amber-strong/40",
  },
};

// Real producer data is uneven (rationale.md: Budman podaje U-value tylko na osobnej
// podstronie, nie w tekście) — każdy wiersz renderuje się tylko, gdy pole źródłowe jest
// niepuste; brak choćby jednego wiersza nigdy nie renderuje pustego placeholdera
// (spec 0020 AC-4, ten sam wzorzec co ProjectCertifications). Pola grupują się w dwa
// pytania, jakie zadaje sobie pierwszy raz kupujący dom transgranicznie (z czego to
// jest, czy będzie tanio w utrzymaniu) zamiast płaskiej listy wierszy — trzecie pytanie
// ("czy to bezpieczne", gwarancja konstrukcyjna) mieszka teraz w sekcji "Realizacje i
// producent" (ProducerRealizationsSection), obok paska z tożsamością producenta, gdzie
// na desktopie było dużo niewykorzystanej przestrzeni po prawej.
export async function ProjectTechnicalSpecs({ project }: ProjectTechnicalSpecsProps) {
  const t = await getTranslations("ProjectTechnicalSpecs");
  const tOptions = await getTranslations("ProjectOptions");
  const groups: SpecGroup[] = [
    {
      id: "construction" as const,
      title: t("groupConstructionTitle"),
      icon: ConstructionIcon,
      // wallBuildUp usunięte (spec 0049 AC-3): rolę przejmuje jeden PDF
      // specyfikacji, patrz sekcja pobierania niżej na stronie. externalDimensions/
      // foundationOptions usunięte stąd: to te same pola co "Wymiary zabudowy"/
      // "Wymagania fundamentu" w ProjectLogistics ("Działka i dostawa" niżej na
      // stronie) — dublowały się dosłownie, ten sam projekt widział dwa razy tę
      // samą wartość pod dwiema różnymi etykietami.
      rows: [
        { label: t("constructionSystem"), value: project.constructionSystem, icon: ConstructionIcon },
        { label: t("roofType"), value: project.roofType, icon: RoofPitchIcon },
        { label: t("customizationScope"), value: project.customizationScope, icon: CustomizationIcon },
      ],
    },
    {
      id: "energy" as const,
      title: t("groupEnergyTitle"),
      icon: EnergyEfficiencyIcon,
      // insulation/windowClass usunięte (spec 0049 AC-3), heatTransferCoefficients/
      // ventilation/heatSource zostają bez zmian (AC-4).
      rows: [
        {
          label: t("heatTransferCoefficients"),
          value: resolveEnergyClass(project.heatTransferCoefficients, t, tOptions),
          detail: resolveEnergyClassDetail(project.heatTransferCoefficients, t),
          icon: WindowSealIcon,
        },
        {
          label: t("ventilation"),
          value: resolveVentilationSummary(project.ventilation, t, tOptions),
          detail: resolveVentilationDetail(project.ventilation, t),
          icon: VentilationIcon,
        },
        {
          label: t("heatSource"),
          value: resolveHeatSourceSummary(project.heatSource, t, tOptions),
          detail: resolveHeatSourceDetail(project.heatSource, t),
          icon: HeatSourceIcon,
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

  // Real producer projects often populate just one group (rationale.md: uneven
  // data means construction or energy rows get filtered out entirely on plenty of
  // projects). With a single group left, the generic page heading plus a second,
  // near-duplicate group heading right under it reads as two headings for one
  // thing — so the group's own title takes over as the page h2, and the group's
  // icon+h3 row (redundant in this case) is skipped.
  const singleGroup = groups.length === 1;

  return (
    <div className="flex flex-col gap-brand-6">
      <Heading level="h2" surface="v5" className="text-h3">
        {singleGroup ? groups[0].title : t("heading")}
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
              {/* Grupa "energy" nie dostaje własnego podtytułu h3: nagłówek strony
                  (h2) mówi teraz to samo ("Efektywność energetyczna"), więc drugi,
                  identyczny nagłówek tuż pod nim byłby czystym duplikatem. */}
              {!singleGroup && group.id !== "energy" && (
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
              )}
              {/* Pytanie to etykieta ramująca odpowiedź, nie sama odpowiedź: mała,
                  stonowana etykieta (jak podpis pod ikoną) nad wartością — teraz
                  pełnym zdaniem, nie surowym parametrem z listy — która jest
                  bohaterem kafelka. Dwa/trzy pytania na grupę = tyle samo kafelków
                  w rzędzie na desktopie (`lg:grid-cols-3`); na mobile jedna kolumna.
                  Od `lg` treść jest wyśrodkowana w poziomie z ikoną nad etykietą
                  zamiast obok niej. Bez `items-start`/`items-stretch` na gridzie:
                  domyślne `stretch` rozciąga każdy kafelek do wysokości najwyższego
                  w rzędzie (wspólna górna I dolna krawędź), a treść w środku zostaje
                  wyrównana do góry (kafelek to `flex flex-col`, bez `justify-center`)
                  — krótsza odpowiedź zostawia pustą przestrzeń pod sobą zamiast się
                  rozciągać. */}
              <div className="grid grid-cols-1 gap-brand-5 lg:grid-cols-3">
                {group.rows.map((row) => (
                  <div
                    key={row.label}
                    className="flex flex-col gap-3 rounded-v5-card border border-brand-v5-line bg-brand-v5-surface p-brand-5 lg:items-center lg:gap-4 lg:text-center"
                  >
                    <div className="flex items-center gap-2.5 lg:flex-col lg:gap-2">
                      <span
                        className={`flex size-7 shrink-0 items-center justify-center rounded-data lg:size-12 ${accent?.plaque ?? "bg-brand-v5-night"}`}
                      >
                        <row.icon className={`size-3.5 lg:size-6 ${accent?.icon ?? "text-brand-v5-paper"}`} />
                      </span>
                      <Text as="h4" variant="label" tone="muted" surface="v5" className="leading-snug">
                        {row.label}
                      </Text>
                    </div>
                    <Text
                      as="p"
                      variant="bodyL"
                      tone="default"
                      surface="v5"
                      className="font-bold leading-snug lg:text-center"
                    >
                      {row.value}
                    </Text>
                    {/* Value sam ("Klasa A", "Mechaniczna nawiewno-wywiewna") to
                        etykieta z listy wyboru kreatora, nie zdanie — nie odpowiada
                        wprost na pytanie tytułu kafelka. Ten drugi wiersz dopowiada
                        jednym zdaniem, co ta wartość znaczy dla kupującego (patrz
                        resolveEnergyClassDetail/resolveVentilationDetail); rowy, gdzie
                        value jest już pełnym opisem producenta (constructionSystem,
                        heatSource, ...), nie mają detail i pokazują tylko value. */}
                    {row.detail && (
                      <Text
                        as="p"
                        variant="body"
                        tone="muted"
                        surface="v5"
                        className="text-data leading-relaxed lg:text-center"
                      >
                        {row.detail}
                      </Text>
                    )}
                  </div>
                ))}
              </div>
            </ScrollReveal>
          );
        })}
      </div>
    </div>
  );
}
