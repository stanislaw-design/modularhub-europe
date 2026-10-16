import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { LARGE_ORDER_STATUS_LABEL, LargeOrderKindPill, LargeOrderStatusPill } from "@/components/internal/LargeOrderPills";
import { FilterGroup, FilterLink } from "@/components/internal/FilterChips";
import { describeDeadline } from "@/components/internal/largeOrderDeadline";
import { Heading, Stack, Text } from "@/components/ui";
import {
  getLargeOrdersForAdmin,
  LARGE_ORDER_STATUSES,
  LARGE_ORDERS_PAGE_SIZE,
  type LargeOrderKind,
} from "@/lib/db/queries";

const kindLabel: Record<LargeOrderKind, string> = {
  request: "Zapytanie wolne",
  product: "Zapytanie o produkt",
};

// Strona jest renderowana na serwerze przy każdym żądaniu, więc "teraz" jest
// świeże; osobna funkcja tylko dla reguły react-hooks/purity.
const getNow = () => Date.now();

const dateFormatter = new Intl.DateTimeFormat("pl-PL", { dateStyle: "medium" });

// Lista dużych zamówień dla administratora (spec 0070 część A, AC-1): oba
// rodzaje zapytań w jednej tabeli, filtr statusu i rodzaju, 25 na stronę. Ten
// sam inline wzorzec sesji co pozostałe ekrany /internal (internal/AGENTS.md).
export default async function InternalLargeOrdersPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ status?: string; kind?: string; page?: string }>;
}) {
  const { locale } = await params;
  const { status: statusParam, kind: kindParam, page: pageParam } = await searchParams;
  const session = await auth();
  const selfHref = `/${locale}/internal/large-orders`;

  if (!session) {
    redirect(`/${locale}/login?callbackUrl=${encodeURIComponent(selfHref)}`);
  }
  if (session.user.role !== "admin") {
    redirect(`/${locale}`);
  }

  const status = LARGE_ORDER_STATUSES.find((value) => value === statusParam);
  const kind: LargeOrderKind | undefined = kindParam === "request" || kindParam === "product" ? kindParam : undefined;
  const page = Math.max(1, Number.parseInt(pageParam ?? "1", 10) || 1);
  const { items, totalCount } = await getLargeOrdersForAdmin({ status, kind, page });
  const now = getNow();
  const totalPages = Math.max(1, Math.ceil(totalCount / LARGE_ORDERS_PAGE_SIZE));

  function hrefWith(overrides: { status?: string | null; kind?: string | null; page?: number }): string {
    const next = new URLSearchParams();
    const nextStatus = overrides.status === undefined ? status : overrides.status;
    const nextKind = overrides.kind === undefined ? kind : overrides.kind;
    if (nextStatus) next.set("status", nextStatus);
    if (nextKind) next.set("kind", nextKind);
    if (overrides.page && overrides.page > 1) next.set("page", String(overrides.page));
    const query = next.toString();
    return query ? `${selfHref}?${query}` : selfHref;
  }

  return (
    <Stack gap={5}>
      <div className="flex flex-wrap items-center justify-between gap-brand-3">
        <Heading level="h1">Duże zamówienia</Heading>
        <Link
          href={`${selfHref}/new`}
          className="focus-ring inline-flex h-10 items-center rounded-data border border-brand-steel px-brand-3 text-body font-medium hover:bg-brand-steel/30"
        >
          Złóż zapytanie w imieniu klienta
        </Link>
      </div>
      <div className="flex flex-wrap gap-x-brand-5 gap-y-brand-3">
        <FilterGroup label="Status">
          <FilterLink href={hrefWith({ status: null })} active={!status} label="Wszystkie" />
          {LARGE_ORDER_STATUSES.map((value) => (
            <FilterLink key={value} href={hrefWith({ status: value })} active={status === value} label={LARGE_ORDER_STATUS_LABEL[value]} />
          ))}
        </FilterGroup>
        <FilterGroup label="Rodzaj">
          <FilterLink href={hrefWith({ kind: null })} active={!kind} label="Wszystkie" />
          <FilterLink href={hrefWith({ kind: "request" })} active={kind === "request"} label={kindLabel.request} />
          <FilterLink href={hrefWith({ kind: "product" })} active={kind === "product"} label={kindLabel.product} />
        </FilterGroup>
      </div>
      {items.length === 0 ? (
        <Text tone="muted">Brak zapytań{status || kind ? " dla wybranych filtrów" : ""}.</Text>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[56rem] border-collapse text-body">
            <thead>
              <tr className="border-b border-brand-steel text-left text-label uppercase tracking-[0.08em] text-brand-technical-graphite">
                <th scope="col" className="p-brand-2 font-medium">Inwestor</th>
                <th scope="col" className="p-brand-2 font-medium">Rodzaj</th>
                <th scope="col" className="p-brand-2 font-medium">Status</th>
                <th scope="col" className="p-brand-2 text-right font-medium">Domy</th>
                <th scope="col" className="p-brand-2 font-medium">Termin ofert</th>
                <th scope="col" className="p-brand-2 font-medium">Kraj</th>
                <th scope="col" className="p-brand-2 font-medium">Oferty</th>
                <th scope="col" className="p-brand-2 font-medium"><span className="sr-only">Akcje</span></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const deadline = describeDeadline(item.deadlineAt, item.status, now);
                return (
                  <tr key={`${item.kind}-${item.id}`} className="relative cursor-pointer border-b border-brand-steel/50 align-middle hover:bg-brand-steel/10">
                    <td className="max-w-[20rem] p-brand-2">
                      <Link
                        href={`${selfHref}/${item.id}?kind=${item.kind}`}
                        className="focus-ring block rounded-data font-medium text-brand-foundation-navy after:absolute after:inset-0 after:content-[''] hover:underline"
                      >
                        {item.investorName}
                      </Link>
                      {item.investorName !== item.investorEmail && (
                        <span className="block truncate text-label text-brand-technical-graphite">{item.investorEmail}</span>
                      )}
                    </td>
                    <td className="p-brand-2">
                      <LargeOrderKindPill kind={item.kind} />
                    </td>
                    <td className="p-brand-2">
                      <LargeOrderStatusPill status={item.status} />
                    </td>
                    <td className="p-brand-2 text-right tabular-nums">{item.unitCount}</td>
                    <td className="p-brand-2 whitespace-nowrap">
                      <span className="block">{dateFormatter.format(item.deadlineAt)}</span>
                      {deadline && (
                        <span className={`block text-label ${deadline.urgent ? "font-medium text-status-conditional" : "text-brand-technical-graphite"}`}>
                          {deadline.text}
                        </span>
                      )}
                    </td>
                    <td className="p-brand-2 text-brand-technical-graphite">{item.countryCode}</td>
                    <td className="p-brand-2 whitespace-nowrap tabular-nums">
                      <span className={item.quoteCount === 0 ? "text-brand-technical-graphite" : undefined}>{item.quoteCount}</span>
                      {item.pendingPublicationCount > 0 && (
                        <span className="text-label font-medium text-status-conditional">
                          {" "}
                          ({item.pendingPublicationCount} do publikacji)
                        </span>
                      )}
                    </td>
                    <td className="p-brand-2 text-right">
                      <Link
                        href={`${selfHref}/${item.id}?kind=${item.kind}`}
                        aria-label={`Szczegóły: ${item.investorName}`}
                        className="focus-ring relative z-10 inline-flex h-9 items-center rounded-data border border-brand-steel px-brand-3 text-body font-medium hover:bg-brand-steel/30"
                      >
                        Szczegóły
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {totalPages > 1 && (
        <nav aria-label="Strony listy dużych zamówień" className="flex items-center gap-brand-3">
          {page > 1 ? (
            <a href={hrefWith({ page: page - 1 })} className="focus-ring rounded-data text-brand-passage-blue underline">
              Poprzednia
            </a>
          ) : (
            <span className="text-brand-technical-graphite">Poprzednia</span>
          )}
          <Text as="span" tone="muted">
            Strona {page} z {totalPages}
          </Text>
          {page < totalPages ? (
            <a href={hrefWith({ page: page + 1 })} className="focus-ring rounded-data text-brand-passage-blue underline">
              Następna
            </a>
          ) : (
            <span className="text-brand-technical-graphite">Następna</span>
          )}
        </nav>
      )}
    </Stack>
  );
}
