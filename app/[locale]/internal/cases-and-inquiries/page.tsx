import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Heading, Text } from "@/components/ui";
import { CASES_AND_INQUIRIES_PAGE_SIZE, listCasesAndInquiriesForAdmin } from "@/lib/cases/queries";

const dateFormatter = new Intl.DateTimeFormat("pl-PL", { dateStyle: "medium", timeStyle: "short" });

const kindLabel: Record<string, string> = {
  case: "Sprawa",
  legacy_inquiry: "Zapytanie bezpośrednie",
};

// Lista wspólna dla spraw (spec 0048) i dawnych zapytań bezpośrednich (spec
// 0023), zastępuje osobne /internal/cases i /internal/inquiries (spec 0055
// AC-14, Build plan zadanie 10): oba adresy trwale przekierowują tutaj
// (proxy.ts). Jedno zapytanie nad wspólną tabelą inquiry (lib/cases/queries.ts
// listCasesAndInquiriesForAdmin), sortowanie po dacie działa na całym
// scalonym zbiorze. Każdy wiersz pokazuje własny, natywny status (etap+kto
// czeka dla spraw, status wprost dla dawnych zapytań) — oba słowniki są różne,
// ta spec ich nie ujednolica. Link do szczegółów tylko dla spraw
// (/internal/cases/[id]): dawne zapytania bezpośrednie nigdy nie miały
// osobnej strony szczegółów i evaluateCaseAccess (lib/cases/access.ts) świadomie
// odmawia dostępu do sprawy dla stage "legacy_direct" (spec 0048 Key
// invariants), więc link prowadziłby donikąd.
export default async function InternalCasesAndInquiriesPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { locale } = await params;
  const { page: pageParam } = await searchParams;
  const session = await auth();
  const selfHref = `/${locale}/internal/cases-and-inquiries`;

  if (!session) {
    redirect(`/${locale}/login?callbackUrl=${encodeURIComponent(selfHref)}`);
  }
  if (session.user.role !== "admin") {
    redirect(`/${locale}`);
  }

  const page = Math.max(1, Number.parseInt(pageParam ?? "1", 10) || 1);
  const [{ items, totalCount }, t] = await Promise.all([
    listCasesAndInquiriesForAdmin(page),
    getTranslations("CaseStatus"),
  ]);
  const totalPages = Math.max(1, Math.ceil(totalCount / CASES_AND_INQUIRIES_PAGE_SIZE));

  function pageHref(targetPage: number): string {
    return `${selfHref}?page=${targetPage}`;
  }

  return (
    <>
      <Heading level="h1">Projekty i zapytania</Heading>
      {items.length === 0 ? (
        <Text tone="muted">Brak spraw ani zapytań.</Text>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[52rem] border-collapse text-body">
            <thead>
              <tr className="border-b border-brand-steel text-left">
                <th className="p-brand-2 font-medium">Typ</th>
                <th className="p-brand-2 font-medium">Klient</th>
                <th className="p-brand-2 font-medium">Domy</th>
                <th className="p-brand-2 font-medium">Status</th>
                <th className="p-brand-2 font-medium">Doradca</th>
                <th className="p-brand-2 font-medium">Data</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr key={row.id} className="border-b border-brand-steel/50 align-top">
                  <td className="p-brand-2 text-brand-technical-graphite">{kindLabel[row.kind]}</td>
                  <td className="p-brand-2">
                    {row.kind === "case" ? (
                      <Link
                        href={`/${locale}/internal/cases/${row.id}`}
                        className="focus-ring rounded-data font-medium text-brand-passage-blue hover:underline"
                      >
                        {row.clientName}
                      </Link>
                    ) : (
                      row.clientName
                    )}
                  </td>
                  <td className="p-brand-2">{row.productNames.join(", ") || "—"}</td>
                  <td className="p-brand-2">
                    {row.kind === "case" ? (
                      <>
                        {t(`stage.${row.stage}`)}
                        {row.waitingOn ? ` · ${t(`waitingShort.${row.waitingOn}`)}` : ""}
                      </>
                    ) : (
                      row.status
                    )}
                  </td>
                  <td className="p-brand-2">{row.advisorName ?? "Nieprzypisana"}</td>
                  <td className="p-brand-2">{dateFormatter.format(row.receivedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {totalPages > 1 && (
        <nav aria-label="Strony listy projektów i zapytań" className="flex items-center gap-brand-3">
          {page > 1 ? (
            <a href={pageHref(page - 1)} className="focus-ring rounded-data text-brand-passage-blue underline">
              Poprzednia
            </a>
          ) : (
            <span className="text-brand-technical-graphite">Poprzednia</span>
          )}
          <Text as="span" tone="muted">
            Strona {page} z {totalPages}
          </Text>
          {page < totalPages ? (
            <a href={pageHref(page + 1)} className="focus-ring rounded-data text-brand-passage-blue underline">
              Następna
            </a>
          ) : (
            <span className="text-brand-technical-graphite">Następna</span>
          )}
        </nav>
      )}
    </>
  );
}
