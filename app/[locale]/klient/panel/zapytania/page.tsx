import { PanelEmptyState } from "@/components/klient/PanelEmptyState";
import { Heading, Stack } from "@/components/ui";
import { getClientIdForUser, getInquiriesForClient, type InquiryWithItems } from "@/lib/db/queries";
import { requirePanelClientSession } from "@/lib/panel-session";

const dateFormatter = new Intl.DateTimeFormat("pl-PL", { dateStyle: "medium", timeStyle: "short" });

const statusLabel: Record<InquiryWithItems["status"], string> = {
  open: "Oczekuje na odpowiedź",
  offered: "Otrzymano ofertę",
  closed: "Zamknięte",
};

// Tylko własne zapytania zalogowanego klienta (spec 0024 AC-1, AC-10):
// getInquiriesForClient filtruje po client.id wyprowadzonym z sesji.
export default async function ZapytaniaPanelPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const selfHref = `/${locale}/klient/panel/zapytania`;
  const session = await requirePanelClientSession(locale, selfHref);

  const clientId = await getClientIdForUser(session.user.id);
  const inquiries = clientId ? await getInquiriesForClient(clientId) : [];

  return (
    <Stack gap={4}>
      <Heading level="h1">Zapytania</Heading>
      {inquiries.length === 0 ? (
        <PanelEmptyState
          locale={locale}
          title="Nie masz jeszcze żadnych wysłanych zapytań"
          description="Wybierz dom na wynikach wyszukiwania i wyślij zapytanie, żeby zobaczyć je tutaj wraz ze statusem."
        />
      ) : (
        <div className="overflow-x-auto rounded-card border border-brand-steel">
          <table className="w-full min-w-[36rem] border-collapse text-body">
            <thead>
              <tr className="border-b border-brand-steel bg-brand-steel/10 text-left">
                <th className="p-brand-2 font-medium">Produkty</th>
                <th className="p-brand-2 font-medium">Status</th>
                <th className="p-brand-2 font-medium">Data</th>
              </tr>
            </thead>
            <tbody>
              {inquiries.map((row) => (
                <tr key={row.id} className="border-b border-brand-steel/50 align-top last:border-b-0">
                  <td className="p-brand-2">{row.productNames.join(", ") || "—"}</td>
                  <td className="p-brand-2">{statusLabel[row.status]}</td>
                  <td className="p-brand-2">{dateFormatter.format(row.receivedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Stack>
  );
}
