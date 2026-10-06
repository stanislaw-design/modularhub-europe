import {
  AirVent,
  AppWindow,
  Blinds,
  Check,
  ChefHat,
  type LucideIcon,
  Settings2,
  Thermometer,
  Toilet,
  Warehouse,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { Heading } from "@/components/ui";
import type { ProductOptionGroup, ProductOptionGroupOption } from "@/lib/db/queries";

interface ProjectOptionsConfiguratorProps {
  groups: ProductOptionGroup[];
  selectedOptionIds: string[];
  hrefFor: (groupId: string, optionId: string) => string;
  heading: string;
  ariaLabel: string;
  includedLabel: string;
  priceOnRequestLabel: string;
}

const priceFormatter = new Intl.NumberFormat("pl-PL", { maximumFractionDigits: 0 });

// group.name jest wolnym tekstem producenta (patrz komentarz niżej), więc
// dopasowanie po słowie kluczowym, nie dokładnej wartości — dość odporne na
// drobne różnice zapisu ("Klimatyzacja" vs "klimatyzacja domu"), a nietrafione
// grupy dostają neutralny Settings2, nigdy ImageOff: te opcje nigdy nie będą
// miały prawdziwego zdjęcia (to konfiguracja, nie katalogowy produkt), więc
// fallback nie powinien wyglądać jak błąd/brak treści.
const GROUP_ICON_RULES: { test: (normalizedName: string) => boolean; Icon: LucideIcon }[] = [
  { test: (n) => n.includes("ociepl"), Icon: Thermometer },
  { test: (n) => n.includes("konstruk"), Icon: Warehouse },
  { test: (n) => n.includes("klimatyzacj"), Icon: AirVent },
  { test: (n) => n.includes("przeszklen") || n.includes("okno") || n.includes("szyb"), Icon: AppWindow },
  { test: (n) => n.includes("roleta") || n.includes("zaluzj"), Icon: Blinds },
  { test: (n) => n.includes("kuchen"), Icon: ChefHat },
  { test: (n) => n.includes("wc") || n.includes("toalet") || n.includes("lazienk"), Icon: Toilet },
];

function getGroupIcon(groupName: string): LucideIcon {
  const normalized = groupName
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
  return GROUP_ICON_RULES.find((rule) => rule.test(normalized))?.Icon ?? Settings2;
}

function OptionPriceLabel({
  option,
  includedLabel,
  priceOnRequestLabel,
}: {
  option: ProductOptionGroupOption;
  includedLabel: string;
  priceOnRequestLabel: string;
}) {
  if (option.priceOnRequest) return <>{priceOnRequestLabel}</>;
  if (!option.priceCents) return <>{includedLabel}</>;
  return <>+{priceFormatter.format(option.priceCents / 100)} €</>;
}

// Serwerowy konfigurator płatnych opcji (spec 0059 AC-1, AC-2, AC-5; siatka
// kart na pełną szerokość i zdjęcia opcji dodane 2026-10-01 na życzenie
// inżyniera): linki `?opcje=...` zamiast stanu klienckiego, ten sam wzorzec co
// ProjectVariantPicker/CategoryFilterBar — zaznaczenie zmienia URL przez
// nawigację Next.js, nigdy przez onChange/useState. group.name/option.label są
// wolnym tekstem producenta (wpisywanym ręcznie przez Neon MCP), nie tłumaczone
// przez next-intl. Brak przypisanych grup → brak renderu (AC-5), żeby produkt
// bez opcji wyglądał identycznie jak przed tym spec'em. Renderowana jako osobna
// sekcja na pełną szerokość strony (nie wąska kolumna obok ceny), siatka kart
// 2–4 w rzędzie, ten sam wzorzec zdjęcia co ResultCard (aspect ratio + fallback
// ikona zamiast pustego <Image>). scroll={false} (2026-10-02): zaznaczenie
// opcji zmienia tylko ?opcje= na tej samej stronie, ten sam powód co
// ProjectVariantPicker.tsx. option.imageUrl puste → karta bez zdjęcia,
// zamiast tego dopasowana do group.name ikona (getGroupIcon wyżej, 2026-10-01
// na życzenie inżyniera) — te grupy (poziom ocieplenia, konstrukcja, WC, ...)
// nigdy nie dostaną prawdziwego zdjęcia, bo to binarne/wielokrotne wybory, nie
// katalogowe produkty do sfotografowania.
export function ProjectOptionsConfigurator({
  groups,
  selectedOptionIds,
  hrefFor,
  heading,
  ariaLabel,
  includedLabel,
  priceOnRequestLabel,
}: ProjectOptionsConfiguratorProps) {
  if (groups.length === 0) return null;
  const selectedIdSet = new Set(selectedOptionIds);

  return (
    <div className="flex flex-col gap-brand-4">
      <Heading level="h2" surface="v5" className="text-h3">
        {heading}
      </Heading>
      <div aria-label={ariaLabel} className="flex flex-col gap-brand-5">
        {groups.map((group) => {
          const isSingle = group.selectionType === "single";
          const GroupIcon = getGroupIcon(group.sourceName);
          // Grupa dwuopcyjna bez żadnego zdjęcia (np. "Tak"/"Nie" sterowania WiFi,
          // systemu audio, pakietu świetlnego — spec 0061) nigdy nie skorzysta z
          // dużej karty ze zdjęciem/ikoną myślanej pod katalog wizualnych opcji
          // (poziom ocieplenia, kolor, piec): dwa rzędy pustego miejsca na ikonę dla
          // samego "tak"/"nie" to czysty koszt wysokości strony, bez żadnej
          // dodatkowej informacji. Taka grupa dostaje zamiast tego zwarty,
          // dwukolumnowy rząd przełączników (inżynier, 2026-10-02) — każda inna
          // grupa (wielowyborowa, z obrazkami, więcej niż dwie opcje) zostaje na
          // dotychczasowej siatce kart bez zmian.
          const isCompactToggle = group.options.length === 2 && group.options.every((option) => !option.imageUrl);
          if (isCompactToggle) {
            return (
              <div key={group.id} role={isSingle ? "radiogroup" : "group"} aria-label={group.name} className="flex flex-col gap-brand-2">
                <Heading level="h3" surface="v5" className="text-body-l">
                  {group.name}
                </Heading>
                <div className="grid grid-cols-2 gap-brand-2">
                  {group.options.map((option) => {
                    const checked = selectedIdSet.has(option.id);
                    return (
                      <Link
                        key={option.id}
                        href={hrefFor(group.id, option.id)}
                        scroll={false}
                        role={isSingle ? "radio" : "checkbox"}
                        aria-checked={checked}
                        className={`focus-ring flex items-center justify-between gap-brand-2 rounded-v5-card border px-brand-3 py-brand-3 text-left transition-colors ${
                          checked
                            ? "border-brand-v5-amber-strong bg-brand-v5-amber/10"
                            : "border-brand-v5-line hover:border-brand-v5-muted"
                        }`}
                      >
                        <span className="flex flex-col gap-0.5">
                          <span
                            className={`text-data font-medium ${checked ? "text-brand-v5-ink" : "text-brand-v5-muted group-hover:text-brand-v5-ink"}`}
                          >
                            {option.label}
                          </span>
                          <span className="text-data font-semibold text-brand-v5-ink">
                            <OptionPriceLabel
                              option={option}
                              includedLabel={includedLabel}
                              priceOnRequestLabel={priceOnRequestLabel}
                            />
                          </span>
                        </span>
                        <span
                          aria-hidden="true"
                          className={`flex size-6 shrink-0 items-center justify-center rounded-full border ${
                            checked
                              ? "border-brand-v5-amber-strong bg-brand-v5-amber-strong"
                              : "border-brand-v5-line bg-brand-v5-surface/90"
                          }`}
                        >
                          {checked && <Check className="size-4 text-white" aria-hidden="true" />}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          }
          return (
            <div key={group.id} role={isSingle ? "radiogroup" : "group"} aria-label={group.name} className="flex flex-col gap-brand-2">
              <Heading level="h3" surface="v5" className="text-body-l">
                {group.name}
              </Heading>
              <div className="grid grid-cols-2 gap-brand-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {group.options.map((option) => {
                  const checked = selectedIdSet.has(option.id);
                  const indicatorShape = isSingle ? "rounded-full" : "rounded-data";
                  // "Nie" dzieli dziś identyczną ikonę grupy z "Tak"/pozostałymi opcjami tej
                  // samej grupy (ikona jest per-grupa, nie per-opcja, patrz getGroupIcon) —
                  // bez zdjęcia nie było więc żadnej wizualnej różnicy między odrzuceniem
                  // dodatku a jego wyborem. Przekreślenie tylko na tę jedną, dosłowną
                  // wartość (nie np. "Brak" w Klimatyzacji, która ma własną, już odróżniającą
                  // się ikonę) (inżynier, 2026-10-01).
                  const isNegativeOption = option.sourceLabel.trim().toLowerCase() === "nie";
                  return (
                    <Link
                      key={option.id}
                      href={hrefFor(group.id, option.id)}
                      scroll={false}
                      role={isSingle ? "radio" : "checkbox"}
                      aria-checked={checked}
                      className={`focus-ring group relative flex flex-col overflow-hidden rounded-v5-card border text-left transition-colors ${
                        checked
                          ? "border-brand-v5-amber-strong bg-brand-v5-amber/10"
                          : "border-brand-v5-line hover:border-brand-v5-muted"
                      }`}
                    >
                      <div className="relative aspect-[4/3] w-full overflow-hidden bg-brand-v5-surface">
                        {option.imageUrl ? (
                          <Image
                            src={option.imageUrl}
                            alt=""
                            fill
                            sizes="(min-width: 1280px) 20vw, (min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
                            className="object-contain p-brand-2"
                          />
                        ) : (
                          <div className="relative flex size-full items-center justify-center">
                            <GroupIcon className="size-8 text-brand-v5-muted" aria-hidden="true" />
                            {isNegativeOption && (
                              <span
                                aria-hidden="true"
                                className="absolute inset-0 m-auto h-px w-10 rotate-45 bg-brand-v5-muted"
                              />
                            )}
                          </div>
                        )}
                        <span
                          aria-hidden="true"
                          className={`absolute right-2 top-2 flex size-6 shrink-0 items-center justify-center border ${indicatorShape} ${
                            checked
                              ? "border-brand-v5-amber-strong bg-brand-v5-amber-strong"
                              : "border-brand-v5-line bg-brand-v5-surface/90"
                          }`}
                        >
                          {checked && <Check className="size-4 text-white" aria-hidden="true" />}
                        </span>
                      </div>
                      <div className="flex flex-1 flex-col gap-0.5 px-brand-2 py-brand-2">
                        <span
                          className={`text-data font-medium ${checked ? "text-brand-v5-ink" : "text-brand-v5-muted group-hover:text-brand-v5-ink"}`}
                        >
                          {option.label}
                        </span>
                        <span className="text-data font-semibold text-brand-v5-ink">
                          <OptionPriceLabel
                            option={option}
                            includedLabel={includedLabel}
                            priceOnRequestLabel={priceOnRequestLabel}
                          />
                        </span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
