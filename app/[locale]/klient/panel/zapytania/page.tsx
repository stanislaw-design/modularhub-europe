import { PanelEmptyState } from "@/components/klient/PanelEmptyState";
import { Heading, Stack, Text } from "@/components/ui";
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
      <Heading level="h1" surface="v5">
        Zapytania
      </Heading>
      {inquiries.length === 0 ? (
        <PanelEmptyState
          locale={locale}
          title="Nie masz jeszcze żadnych wysłanych zapytań"
          description="Wybierz dom na wynikach wyszukiwania i wyślij zapytanie, żeby zobaczyć je tutaj wraz ze statusem."
        />
      ) : (
        <div className="overflow-x-auto rounded-v5-card border border-brand-v5-line">
          <table className="w-full min-w-[36rem] border-collapse text-body">
            <thead>
              <tr className="border-b border-brand-v5-line bg-brand-v5-line/10 text-left">
                <Text as="th" surface="v5" className="p-brand-2 font-medium">
                  Produkty
                </Text>
                <Text as="th" surface="v5" className="p-brand-2 font-medium">
                  Status
                </Text>
                <Text as="th" surface="v5" className="p-brand-2 font-medium">
                  Data
                </Text>
              </tr>
            </thead>
            <tbody>
              {inquiries.map((row) => (
                <tr key={row.id} className="border-b border-brand-v5-line/50 align-top last:border-b-0">
                  <Text as="td" surface="v5" className="p-brand-2">
                    {row.productNames.join(", ") || "—"}
                  </Text>
                  <Text as="td" surface="v5" className="p-brand-2">
                    {statusLabel[row.status]}
                  </Text>
                  <Text as="td" surface="v5" className="p-brand-2">
                    {dateFormatter.format(row.receivedAt)}
                  </Text>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Stack>
  );
}
