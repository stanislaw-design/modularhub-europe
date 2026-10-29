"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import type { ModularProjectStatus } from "@/lib/data/modularprojects";

export interface ModularProjectsBrowserItem {
  slug: string;
  title: string;
  lead: string;
  status: ModularProjectStatus;
  /** data ISO dodania wpisu */
  publishedAt: string;
  /** karta wyrenderowana po stronie serwera */
  card: ReactNode;
  /** ta sama realizacja jako duży wpis na górze listy */
  featuredCard: ReactNode;
}

type SortKey = "newest" | "oldest" | "title";

const STATUSES: ModularProjectStatus[] = ["planned", "in_production", "delivered"];
const FIELD =
  "focus-ring h-11 w-full rounded-data border border-brand-v5-line bg-brand-v5-surface px-brand-2 text-body text-brand-v5-ink placeholder:text-brand-v5-muted/70";
const LABEL = "flex flex-col gap-1 text-data font-semibold text-brand-v5-ink";

// Wyszukiwarka i filtry listy realizacji (tytuł/opis, status, data dodania); filtrowanie w przeglądarce, bo lista jest mała.
export function ModularProjectsBrowser({ items, locale }: { items: ModularProjectsBrowserItem[]; locale: string }) {
  const t = useTranslations("ModularProjectsPage");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<ModularProjectStatus | "all">("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [sort, setSort] = useState<SortKey>("newest");

  const visible = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase(locale);
    return items
      .filter((item) => {
        if (status !== "all" && item.status !== status) return false;
        if (from && item.publishedAt < from) return false;
        if (to && item.publishedAt > to) return false;
        return !needle || `${item.title} ${item.lead}`.toLocaleLowerCase(locale).includes(needle);
      })
      .sort((a, b) =>
        sort === "title"
          ? a.title.localeCompare(b.title, locale)
          : sort === "oldest"
            ? a.publishedAt.localeCompare(b.publishedAt)
            : b.publishedAt.localeCompare(a.publishedAt),
      );
  }, [items, locale, query, status, from, to, sort]);

  const dirty = query !== "" || status !== "all" || from !== "" || to !== "" || sort !== "newest";
  // Bez filtrów najnowsza (przy sortowaniu "najnowsze") dostaje duży wpis, reszta idzie do siatki.
  const showFeatured = !dirty && visible.length > 0;
  const gridItems = showFeatured ? visible.slice(1) : visible;
  const reset = () => {
    setQuery("");
    setStatus("all");
    setFrom("");
    setTo("");
    setSort("newest");
  };

  return (
    <div className="flex flex-col gap-brand-3">
      <div role="group" aria-label={t("filters.statusLabel")} className="flex flex-wrap gap-brand-1">
        {(["all", ...STATUSES] as const).map((value) => {
          const count = value === "all" ? items.length : items.filter((item) => item.status === value).length;
          const active = status === value;
          return (
            <button
              key={value}
              type="button"
              aria-pressed={active}
              onClick={() => setStatus(value)}
              className={`focus-ring inline-flex items-center gap-2 rounded-v5-pill border px-brand-3 py-2 text-data font-semibold transition-colors ${
                active
                  ? "border-brand-v5-ink bg-brand-v5-ink text-brand-v5-surface"
                  : "border-brand-v5-line bg-brand-v5-surface text-brand-v5-ink hover:border-brand-v5-ink"
              }`}
            >
              {value === "all" ? t("filters.statusAll") : t(`status.${value}`)}
              <span className={active ? "opacity-80" : "text-brand-v5-muted"}>{count}</span>
            </button>
          );
        })}
      </div>

      <form
        role="search"
        onSubmit={(event) => event.preventDefault()}
        className="grid grid-cols-1 gap-brand-2 rounded-v5-card border border-brand-v5-line bg-brand-v5-surface p-brand-3 sm:grid-cols-2 lg:grid-cols-5"
      >
        <label className={`${LABEL} lg:col-span-2`}>
          {t("filters.searchLabel")}
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t("filters.searchPlaceholder")}
            className={FIELD}
          />
        </label>
        <label className={LABEL}>
          {t("filters.addedFrom")}
          <input type="date" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} className={FIELD} />
        </label>
        <label className={LABEL}>
          {t("filters.addedTo")}
          <input type="date" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} className={FIELD} />
        </label>
        <label className={LABEL}>
          {t("filters.sortLabel")}
          <select value={sort} onChange={(event) => setSort(event.target.value as SortKey)} className={FIELD}>
            <option value="newest">{t("filters.sortNewest")}</option>
            <option value="oldest">{t("filters.sortOldest")}</option>
            <option value="title">{t("filters.sortTitle")}</option>
          </select>
        </label>
      </form>

      <div className="flex items-center justify-between gap-brand-2">
        <p role="status" className="text-data text-brand-v5-muted">
          {t("filters.count", { shown: visible.length, total: items.length })}
        </p>
        {dirty ? (
          <button type="button" onClick={reset} className="focus-ring text-data font-semibold text-brand-v5-ink underline">
            {t("filters.reset")}
          </button>
        ) : null}
      </div>

      {visible.length === 0 ? (
        <p className="text-body text-brand-v5-ink">{t("filters.noResults")}</p>
      ) : (
        <>
          {showFeatured ? <div>{visible[0].featuredCard}</div> : null}
          {gridItems.length > 0 ? (
            <ul
              aria-label={t("listLabel")}
              className="grid grid-cols-1 gap-brand-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4"
            >
              {gridItems.map((item) => (
                <li key={item.slug}>{item.card}</li>
              ))}
            </ul>
          ) : null}
        </>
      )}
    </div>
  );
}
