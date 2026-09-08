import { useTranslations } from "next-intl";
import { DataText, Text } from "@/components/ui";
import type { FavoriteListEntry } from "@/lib/data/projects";

interface FavoriteCompareTableProps {
  favorites: FavoriteListEntry[];
}

const priceFormatter = new Intl.NumberFormat("pl-PL", { maximumFractionDigits: 0 });

// Tabela porównawcza dla 2 lub więcej zaznaczonych ulubionych (spec 0024
// AC-6): metraż, cena, czas produkcji, standard wykończenia. Produkt
// niedostępny zaznaczony do porównania dostaje to samo oznaczenie co na
// głównej liście (Key invariants: nigdy nie znika po cichu z żadnego widoku).
// Only ever rendered from FavoritesGrid ("use client"): useTranslations, not
// getTranslations (same reason as FavoriteCard).
export function FavoriteCompareTable({ favorites }: FavoriteCompareTableProps) {
  const t = useTranslations("FavoriteCompareTable");
  const standardLabel = {
    "surowy-zamkniety": t("completionStandard.surowy-zamkniety"),
    deweloperski: t("completionStandard.deweloperski"),
    "pod-klucz": t("completionStandard.pod-klucz"),
  } as const;
  return (
    <div className="overflow-x-auto rounded-v5-card border border-brand-v5-line">
      <table className="w-full min-w-[36rem] border-collapse text-body">
        <thead>
          <tr className="border-b border-brand-v5-line bg-brand-v5-line/10 text-left">
            <th className="p-brand-2 font-medium">{t("house")}</th>
            {favorites.map(({ project, available }) => (
              <th key={project.id} className="p-brand-2 font-medium">
                {project.name}
                {!available && (
                  <span className="ml-1 text-data font-normal text-status-blocked">{t("unavailableSuffix")}</span>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr className="border-b border-brand-v5-line/50">
            <Text as="td" tone="muted" surface="v5" className="p-brand-2">
              {t("floorArea")}
            </Text>
            {favorites.map(({ project }) => (
              <DataText as="td" key={project.id} surface="v5" className="p-brand-2">
                {project.floorAreaM2} m²
              </DataText>
            ))}
          </tr>
          <tr className="border-b border-brand-v5-line/50">
            <Text as="td" tone="muted" surface="v5" className="p-brand-2">
              {t("price")}
            </Text>
            {favorites.map(({ project }) => (
              <DataText as="td" key={project.id} surface="v5" className="p-brand-2">
                {priceFormatter.format(project.priceMin)}–{priceFormatter.format(project.priceMax)} €
              </DataText>
            ))}
          </tr>
          <tr className="border-b border-brand-v5-line/50">
            <Text as="td" tone="muted" surface="v5" className="p-brand-2">
              {t("productionTime")}
            </Text>
            {favorites.map(({ project }) => (
              <DataText as="td" key={project.id} surface="v5" className="p-brand-2">
                {project.commercial.productionLeadTimeWeeksMax > 0
                  ? t("weeksRange", {
                      min: project.commercial.productionLeadTimeWeeksMin,
                      max: project.commercial.productionLeadTimeWeeksMax,
                    })
                  : "—"}
              </DataText>
            ))}
          </tr>
          <tr>
            <Text as="td" tone="muted" surface="v5" className="p-brand-2">
              {t("completionStandardLabel")}
            </Text>
            {favorites.map(({ project }) => (
              <DataText as="td" key={project.id} surface="v5" className="p-brand-2">
                {standardLabel[project.commercial.completionStandard]}
              </DataText>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}
