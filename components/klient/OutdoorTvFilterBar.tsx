import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { Search } from "lucide-react";
import {
  OUTDOOR_TV_MOUNTINGS,
  OUTDOOR_TV_PURPOSES,
  toggleOutdoorTvValue,
  type OutdoorTvMounting,
  type OutdoorTvPurpose,
} from "@/lib/outdoor-tv-filters";
import { buildResultsHref, type ResultsFilter } from "@/lib/results-filters";

interface OutdoorTvFilterBarProps {
  locale: string;
  filter: ResultsFilter;
}

function chipClass(active: boolean): string {
  return `focus-ring whitespace-nowrap rounded-full border px-brand-3 py-1 text-body transition-colors ${
    active
      ? "border-brand-v5-amber-strong bg-brand-v5-amber/10 text-brand-v5-ink"
      : "border-brand-v5-line text-brand-v5-muted hover:text-brand-v5-ink"
  }`;
}

// Pasek wyników dla family=outdoor-tv zamiast ResultsFilterBar (spec 0071): dwie
// grupy chipów wielokrotnego wyboru (sposób montażu, przeznaczenie) jako prawdziwe
// linki i pole słowa kluczowego jako zwykły formularz GET. Cały stan siedzi w
// adresie, więc to komponent serwerowy bez stanu klienta. Chipy zawijają się,
// więc na telefonie nie ma poziomego przewijania strony (AC-13).
export async function OutdoorTvFilterBar({
  locale,
  filter,
}: OutdoorTvFilterBarProps) {
  const t = await getTranslations("OutdoorTvFilterBar");
  const mounting = filter.mounting ?? [];
  const purpose = filter.purpose ?? [];

  return (
    <div className="flex flex-col gap-brand-3 rounded-v5-card border border-brand-v5-line bg-brand-v5-surface p-brand-3 shadow-sm">
      <nav
        aria-label={t("navAriaLabel")}
        className="flex flex-col gap-brand-3 sm:flex-row sm:gap-brand-5"
      >
        <div
          role="group"
          aria-label={t("mountingAriaLabel")}
          className="flex flex-col gap-brand-1"
        >
          <span className="text-label font-semibold text-brand-v5-ink">
            {t("mountingLabel")}
          </span>
          <div className="flex flex-wrap gap-brand-2">
            {OUTDOOR_TV_MOUNTINGS.map((value: OutdoorTvMounting) => {
              const active = mounting.includes(value);
              return (
                <Link
                  key={value}
                  href={buildResultsHref(
                    locale,
                    toggleOutdoorTvValue(filter, "mounting", value),
                  )}
                  aria-current={active ? "true" : undefined}
                  className={chipClass(active)}
                >
                  {t(`mounting.${value}`)}
                </Link>
              );
            })}
          </div>
        </div>
        <div
          role="group"
          aria-label={t("purposeAriaLabel")}
          className="flex flex-col gap-brand-1"
        >
          <span className="text-label font-semibold text-brand-v5-ink">
            {t("purposeLabel")}
          </span>
          <div className="flex flex-wrap gap-brand-2">
            {OUTDOOR_TV_PURPOSES.map((value: OutdoorTvPurpose) => {
              const active = purpose.includes(value);
              return (
                <Link
                  key={value}
                  href={buildResultsHref(
                    locale,
                    toggleOutdoorTvValue(filter, "purpose", value),
                  )}
                  aria-current={active ? "true" : undefined}
                  className={chipClass(active)}
                >
                  {t(`purpose.${value}`)}
                </Link>
              );
            })}
          </div>
        </div>
      </nav>
      <form
        method="get"
        action={`/${locale}/results`}
        className="flex items-end gap-brand-2"
      >
        <input type="hidden" name="family" value="outdoor-tv" />
        {mounting.map((value) => (
          <input key={value} type="hidden" name="mounting" value={value} />
        ))}
        {purpose.map((value) => (
          <input key={value} type="hidden" name="purpose" value={value} />
        ))}
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <label
            htmlFor="outdoor-tv-search-q"
            className="text-label font-semibold text-brand-v5-ink"
          >
            {t("keywordLabel")}
          </label>
          <input
            id="outdoor-tv-search-q"
            type="text"
            name="q"
            defaultValue={filter.q ?? ""}
            placeholder={t("keywordPlaceholder")}
            className="focus-ring w-full rounded-data border border-brand-v5-line bg-transparent px-brand-2 py-1 text-body text-brand-v5-ink placeholder:text-brand-v5-muted/70"
          />
        </div>
        <button
          type="submit"
          aria-label={t("searchAriaLabel")}
          className="focus-ring flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-v5-amber text-brand-v5-amber-foreground transition-colors hover:bg-brand-v5-amber-strong"
        >
          <Search className="size-5" aria-hidden="true" />
        </button>
      </form>
    </div>
  );
}
