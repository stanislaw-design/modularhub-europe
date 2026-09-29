import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { ProducerBlockControl } from "@/components/internal/ProducerBlockControl";
import { Heading, Input, Label, Stack, Text } from "@/components/ui";
import { getAllProducersForAdmin, PRODUCERS_FOR_ADMIN_PAGE_SIZE } from "@/lib/db/queries";

const verificationStatusLabel: Record<string, string> = {
  not_submitted: "Niezłożona",
  pending: "W trakcie",
  approved: "Zatwierdzona",
  rejected: "Odrzucona",
};

// Lista producentów dla administratora (spec 0055 Build plan zadania 8 i 9):
// ten sam wzorzec auth co /internal/products, wyszukiwanie po nazwie i
// paginacja przez URL search params (bez JS, ten sam wzorzec co wyniki
// klienta, patrz root AGENTS.md), blokada/odblokowanie w ProducerBlockControl.
export default async function InternalProducersPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { locale } = await params;
  const { q, page: pageParam } = await searchParams;
  const session = await auth();
  const selfHref = `/${locale}/internal/producers`;

  if (!session) {
    redirect(`/${locale}/login?callbackUrl=${encodeURIComponent(selfHref)}`);
  }
  if (session.user.role !== "admin") {
    redirect(`/${locale}`);
  }

  const page = Math.max(1, Number.parseInt(pageParam ?? "1", 10) || 1);
  const { items, totalCount } = await getAllProducersForAdmin({ search: q, page });
  const totalPages = Math.max(1, Math.ceil(totalCount / PRODUCERS_FOR_ADMIN_PAGE_SIZE));

  function pageHref(targetPage: number): string {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    params.set("page", String(targetPage));
    return `${selfHref}?${params.toString()}`;
  }

  return (
    <>
      <Heading level="h1">Producenci</Heading>
      <form method="get" className="flex max-w-sm items-end gap-brand-2">
        <Stack gap={1} className="flex-1">
          <Label htmlFor="producer-search">Szukaj po nazwie</Label>
          <Input id="producer-search" type="search" name="q" defaultValue={q ?? ""} />
        </Stack>
        <button type="submit" className="focus-ring h-11 rounded-data border border-brand-steel px-brand-3 text-body font-medium hover:bg-brand-steel/30">
          Szukaj
        </button>
      </form>
      {items.length === 0 ? (
        <Text tone="muted">Brak producentów{q ? " pasujących do wyszukiwania" : ""}.</Text>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[42rem] border-collapse text-body">
            <thead>
              <tr className="border-b border-brand-steel text-left">
                <th className="p-brand-2 font-medium">Producent</th>
                <th className="p-brand-2 font-medium">Kraj</th>
                <th className="p-brand-2 font-medium">Weryfikacja</th>
                <th className="p-brand-2 font-medium">Status</th>
                <th className="p-brand-2 font-medium" />
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <tr key={row.producerId} className="border-b border-brand-steel/50 align-top">
                  <td className="p-brand-2">{row.name}</td>
                  <td className="p-brand-2 text-brand-technical-graphite">{row.countryName}</td>
                  <td className="p-brand-2">{verificationStatusLabel[row.verificationStatus] ?? row.verificationStatus}</td>
                  <td className="p-brand-2">
                    {row.blockedAt ? (
                      <Text as="span" className="font-medium text-status-blocked">
                        Zablokowany
                      </Text>
                    ) : (
                      <Text as="span" className="text-status-approved">
                        Aktywny
                      </Text>
                    )}
                  </td>
                  <td className="p-brand-2 text-right">
                    <ProducerBlockControl producerId={row.producerId} isBlocked={row.blockedAt !== null} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {totalPages > 1 && (
        <nav aria-label="Strony listy producentów" className="flex items-center gap-brand-3">
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
