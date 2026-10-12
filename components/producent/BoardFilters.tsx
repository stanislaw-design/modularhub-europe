"use client";

import { useTranslations } from "next-intl";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button, Select, type SelectOption } from "@/components/ui";

const ALL = "all";

interface BoardFiltersProps {
  countries: { code: string; name: string }[];
  projectTypes: string[];
  families: string[];
  statuses: string[];
  labels: {
    projectType: Record<string, string>;
    family: Record<string, string>;
    status: Record<string, string>;
  };
}

// Filtry tablicy ogłoszeń (URL search params, nie stan komponentu): zmiana
// filtra zeruje stronę, a widok można wkleić jako link.
export function BoardFilters({ countries, projectTypes, families, statuses, labels }: BoardFiltersProps) {
  const t = useTranslations("ProducerPanelBoardPage");
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setParam(key: string, value: string) {
    const next = new URLSearchParams(searchParams.toString());
    if (value === ALL) next.delete(key);
    else next.set(key, value);
    next.delete("page");
    const query = next.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  function build(label: string, key: string, options: SelectOption<string>[]) {
    return (
      <div className="flex min-w-48 flex-1 flex-col gap-brand-1">
        <span id={`board-filter-${key}`} className="text-label text-brand-technical-graphite">
          {label}
        </span>
        <Select
          aria-labelledby={`board-filter-${key}`}
          value={searchParams.get(key) ?? ALL}
          onChange={(value) => setParam(key, value)}
          options={[{ value: ALL, label: t("filterAll") }, ...options]}
        />
      </div>
    );
  }

  const hasFilters = ["country", "type", "family", "status"].some((key) => searchParams.has(key));

  return (
    <div role="group" aria-label={t("filtersAriaLabel")} className="flex flex-wrap items-end gap-brand-3">
      {build(t("columnCountry"), "country", countries.map((c) => ({ value: c.code, label: c.name })))}
      {build(t("columnProjectType"), "type", projectTypes.map((v) => ({ value: v, label: labels.projectType[v] ?? v })))}
      {build(t("columnFamilies"), "family", families.map((v) => ({ value: v, label: labels.family[v] ?? v })))}
      {build(t("columnStatus"), "status", statuses.map((v) => ({ value: v, label: labels.status[v] ?? v })))}
      {hasFilters && (
        <Button type="button" surface="v5" size="sm" onClick={() => router.push(pathname)}>
          {t("filterClear")}
        </Button>
      )}
    </div>
  );
}
