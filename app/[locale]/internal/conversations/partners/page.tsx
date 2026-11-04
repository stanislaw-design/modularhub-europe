import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { FilterGroup, FilterLink } from "@/components/internal/FilterChips";
import { PartnerForm } from "@/components/internal/conversations/PartnerForm";
import { fieldClass, primaryButtonClass } from "@/components/internal/conversations/shared";
import { Heading, Text } from "@/components/ui";
import { PARTNER_KIND_LABELS, PARTNER_KINDS, PARTNERS_PAGE_SIZE, type PartnerKind } from "@/lib/conversations/constants";
import { listCountries, listPartners } from "@/lib/conversations/queries";

// @next-codemod-ignore Cache Components adoption: this segment temporarily allows blocking.
// Remove this opt-out after verifying the segment passes validation without it.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

// Lista firm (spec 0080 AC-4): wyszukiwanie, filtry i numer strony siedzą w adresie, 25 na stronę.
export default async function ConversationsPartnersPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string; kind?: string; country?: string; archived?: string; page?: string }>;
}) {
  const { locale } = await params;
  const { q, kind: kindParam, country, archived: archivedParam, page: pageParam } = await searchParams;
  const session = await auth();
  const selfHref = `/${locale}/internal/conversations/partners`;

  if (!session) {
    redirect(`/${locale}/login?callbackUrl=${encodeURIComponent(selfHref)}`);
  }
  if (session.user.role !== "admin") {
    redirect(`/${locale}`);
  }

  const kind = PARTNER_KINDS.find((value) => value === kindParam);
  const archived = archivedParam === "1";
  const search = q?.trim() || undefined;
  const page = Math.max(1, Number.parseInt(pageParam ?? "1", 10) || 1);

  const [list, countries] = await Promise.all([
    listPartners({ q: search, kind, countryCode: country || undefined, archived, page }),
    listCountries().catch(() => []),
  ]);

  function hrefWith(overrides: { kind?: string | null; archived?: boolean; page?: number }): string {
    const next = new URLSearchParams();
    if (search) next.set("q", search);
    const nextKind = overrides.kind === undefined ? kind : overrides.kind;
    if (nextKind) next.set("kind", nextKind);
    if (country) next.set("country", country);
    const nextArchived = overrides.archived === undefined ? archived : overrides.archived;
    if (nextArchived) next.set("archived", "1");
    if (overrides.page && overrides.page > 1) next.set("page", String(overrides.page));
    const query = next.toString();
    return query ? `${selfHref}?${query}` : selfHref;
  }

  return (
    <div className="flex flex-col gap-brand-5">
      <Heading level="h2">Firmy</Heading>

      <details className="rounded-data border border-brand-steel/60 p-brand-3">
        <summary className="focus-ring cursor-pointer text-body font-medium">Nowa firma</summary>
        <div className="mt-brand-3">
          <PartnerForm locale={locale} countries={countries} />
        </div>
      </details>

      <form action={selfHref} method="get" className="flex flex-wrap items-end gap-brand-2" role="search" aria-label="Szukaj firm">
        <label className="flex min-w-[16rem] flex-1 flex-col gap-brand-1 text-data">
          <span className="text-brand-technical-graphite">Szukaj (nazwa, tagi, notatki)</span>
          <input name="q" defaultValue={search} className={fieldClass} />
        </label>
        <label className="flex flex-col gap-brand-1 text-data">
          <span className="text-brand-technical-graphite">Kraj</span>
          <select name="country" defaultValue={country ?? ""} className={fieldClass}>
            <option value="">Wszystkie</option>
            {countries.map((item) => (
              <option key={item.code} value={item.code}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        {kind && <input type="hidden" name="kind" value={kind} />}
        {archived && <input type="hidden" name="archived" value="1" />}
        <button type="submit" className={primaryButtonClass}>
          Szukaj
        </button>
      </form>

      <div className="flex flex-wrap gap-x-brand-5 gap-y-brand-3">
        <FilterGroup label="Rodzaj">
          <FilterLink href={hrefWith({ kind: null })} active={!kind} label="Wszystkie" />
          {PARTNER_KINDS.map((value) => (
            <FilterLink key={value} href={hrefWith({ kind: value })} active={kind === value} label={PARTNER_KIND_LABELS[value]} />
          ))}
        </FilterGroup>
        <FilterGroup label="Archiwum">
          <FilterLink href={hrefWith({ archived: false })} active={!archived} label="Aktywne" />
          <FilterLink href={hrefWith({ archived: true })} active={archived} label="Archiwalne" />
        </FilterGroup>
      </div>

      {list.rows.length === 0 ? (
        <Text tone="muted">Brak firm dla wybranych filtrów.</Text>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[40rem] border-collapse text-body">
            <thead>
              <tr className="border-b border-brand-steel text-left text-label uppercase tracking-[0.08em] text-brand-technical-graphite">
                <th scope="col" className="p-brand-2 font-medium">Firma</th>
                <th scope="col" className="p-brand-2 font-medium">Rodzaj</th>
                <th scope="col" className="p-brand-2 font-medium">Kraj</th>
                <th scope="col" className="p-brand-2 font-medium">Tagi</th>
                <th scope="col" className="p-brand-2 text-right font-medium">Otwarte sprawy</th>
                <th scope="col" className="p-brand-2 text-right font-medium">Otwarte zadania</th>
              </tr>
            </thead>
            <tbody>
              {list.rows.map((row) => (
                <tr key={row.id} className="border-b border-brand-steel/50 hover:bg-brand-steel/10">
                  <td className="p-brand-2">
                    <Link href={`${selfHref}/${row.id}`} className="focus-ring rounded-data font-medium text-brand-foundation-navy hover:underline">
                      {row.name}
                    </Link>
                  </td>
                  <td className="p-brand-2">{PARTNER_KIND_LABELS[row.kind as PartnerKind]}</td>
                  <td className="p-brand-2 text-brand-technical-graphite">{row.countryCode ?? "–"}</td>
                  <td className="p-brand-2 text-brand-technical-graphite">{row.tags.join(", ") || "–"}</td>
                  <td className="p-brand-2 text-right tabular-nums">{row.openThreads}</td>
                  <td className="p-brand-2 text-right tabular-nums">{row.openTasks}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {list.pageCount > 1 && (
        <nav aria-label="Strony listy firm" className="flex items-center gap-brand-3">
          {list.page > 1 ? (
            <a href={hrefWith({ page: list.page - 1 })} className="focus-ring rounded-data text-brand-passage-blue underline">
              Poprzednia
            </a>
          ) : (
            <span className="text-brand-technical-graphite">Poprzednia</span>
          )}
          <Text as="span" tone="muted">
            Strona {list.page} z {list.pageCount} ({list.total} firm, po {PARTNERS_PAGE_SIZE})
          </Text>
          {list.page < list.pageCount ? (
            <a href={hrefWith({ page: list.page + 1 })} className="focus-ring rounded-data text-brand-passage-blue underline">
              Następna
            </a>
          ) : (
            <span className="text-brand-technical-graphite">Następna</span>
          )}
        </nav>
      )}
    </div>
  );
}
