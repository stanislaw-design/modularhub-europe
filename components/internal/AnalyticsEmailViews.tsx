import Link from "next/link";
import { Card, DataText, Stack, Text } from "@/components/ui";
import {
  getEmailStatsByProducer,
  getEmailStatsByType,
  getEmailStatsTotals,
  type EmailStatsRange,
  type EmailStatsRow,
} from "@/lib/analytics/email-stats";
import { getProducerNamesByIds, getProductNamesByIds } from "@/lib/db/queries";
import { getProducerTrafficDetail } from "@/lib/observability/posthog-metrics";

// Spec 0079 AC-9, AC-10, AC-11: widok Maile i szczegół jednego producenta. Każde źródło pada
// osobno: widok Maile czyta tylko Neon (działa bez PostHog), ruch w szczególe producenta czyta
// PostHog i sam pokazuje "niedostępne".

const TYPE_LABELS: Record<string, string> = {
  large_order_producer_new_request: "Nowe zapytanie",
  large_order_producer_new_platform_project: "Nowy projekt własny ModularHub",
  large_order_producer_reminder: "Przypomnienie o terminie",
  large_order_producer_request_closed: "Zapytanie zamknięte",
  large_order_producer_not_selected: "Wybrano innego producenta",
  large_order_producer_connected: "Połączenie stron",
  large_order_producer_platform_selection_done: "Wybór w projekcie własnym zakończony",
};

function trackedShare(row: { sent: number; trackedSent: number }): string {
  return row.sent === 0 ? "0" : `${row.trackedSent} (${Math.round((row.trackedSent / row.sent) * 100)}%)`;
}

function Unavailable({ source }: { source: string }) {
  return (
    <Text as="p" tone="muted">
      Niedostępne ({source} nie odpowiada). Pozostałe źródła działają normalnie.
    </Text>
  );
}

function StatsTable({
  title,
  keyLabel,
  rows,
  renderKey,
}: {
  title: string;
  keyLabel: string;
  rows: EmailStatsRow[];
  renderKey: (key: string) => React.ReactNode;
}) {
  return (
    <Card>
      <Stack gap={2}>
        <Text as="span" variant="label" tone="muted">
          {title}
        </Text>
        {rows.length === 0 ? (
          <Text tone="muted">Brak wysłanych maili w tym okresie.</Text>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-body">
              <thead>
                <tr className="border-b border-brand-steel text-data text-brand-technical-graphite">
                  <th className="py-1 pr-brand-2 font-medium">{keyLabel}</th>
                  <th className="py-1 pr-brand-2 text-right font-medium">Wysłane</th>
                  <th className="py-1 pr-brand-2 text-right font-medium">Unikalne zapytania</th>
                  <th className="py-1 pr-brand-2 text-right font-medium">Dostarczone</th>
                  <th className="py-1 pr-brand-2 text-right font-medium">Odbite</th>
                  <th className="py-1 pr-brand-2 text-right font-medium">Skargi</th>
                  <th className="py-1 pr-brand-2 text-right font-medium">Śledzone</th>
                  <th className="py-1 pr-brand-2 text-right font-medium">Unikalne kliknięcia</th>
                  <th className="py-1 text-right font-medium">Otwarcia (ludzkie)</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.key} className="border-b border-brand-steel/50">
                    <td className="py-1 pr-brand-2">{renderKey(row.key)}</td>
                    <td className="py-1 pr-brand-2 text-right">{row.sent}</td>
                    <td className="py-1 pr-brand-2 text-right">{row.uniqueRequests}</td>
                    <td className="py-1 pr-brand-2 text-right">{row.delivered}</td>
                    <td className="py-1 pr-brand-2 text-right">{row.bounced}</td>
                    <td className="py-1 pr-brand-2 text-right">{row.complained}</td>
                    <td className="py-1 pr-brand-2 text-right">{trackedShare(row)}</td>
                    <td className="py-1 pr-brand-2 text-right">{row.uniqueClicks}</td>
                    <td className="py-1 text-right">{row.humanOpens}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Stack>
    </Card>
  );
}

const NOTE =
  "Jeden wiersz to jeden odbiorca (producent z kilkoma użytkownikami daje kilka). „Dostarczone”, „Odbite” i „Skargi” przychodzą z webhooka Resend, więc tuż po wysyłce mogą być jeszcze zerem. „Śledzone” to maile wysłane do odbiorców, którzy dobrowolnie zgodzili się na pomiar. Kliknięcia i otwarcia dotyczą tylko ich, więc to próbka, nie całość. Otwarcia bywają zawyżone (skanery, ochrona prywatności w poczcie), dlatego główną miarą są kliknięcia; obie liczby pomijają ruch wyglądający na automat.";

export async function EmailsView({ range, producerHref }: { range: EmailStatsRange; producerHref: (producerId: string) => string }) {
  const [totals, byType, byProducer] = await Promise.all([
    getEmailStatsTotals(range),
    getEmailStatsByType(range),
    getEmailStatsByProducer(range),
  ]);
  if (!totals.ok && !byType.ok && !byProducer.ok) return <Unavailable source="baza danych" />;
  const names = byProducer.ok
    ? await getProducerNamesByIds(byProducer.data.map((row) => row.key)).catch(() => new Map<string, string>())
    : new Map<string, string>();

  return (
    <>
      <Text as="p" tone="muted">
        {NOTE}
      </Text>
      {totals.ok && (
        <div className="grid grid-cols-2 gap-brand-4 sm:grid-cols-4 lg:grid-cols-8">
          {[
            { label: "Wysłane", value: totals.data.sent },
            { label: "Unikalne zapytania", value: totals.data.uniqueRequests },
            { label: "Dostarczone", value: totals.data.delivered },
            { label: "Odbite", value: totals.data.bounced },
            { label: "Skargi", value: totals.data.complained },
            { label: "Śledzone", value: trackedShare(totals.data) },
            { label: "Unikalne kliknięcia", value: totals.data.uniqueClicks },
            { label: "Otwarcia (ludzkie)", value: totals.data.humanOpens },
          ].map((tile) => (
            <Card key={tile.label}>
              <Text as="span" variant="label" tone="muted">
                {tile.label}
              </Text>
              <DataText as="p" className="text-h2">
                {tile.value}
              </DataText>
            </Card>
          ))}
        </div>
      )}
      {byType.ok ? (
        <StatsTable title="Według typu maila" keyLabel="Typ maila" rows={byType.data} renderKey={(key) => TYPE_LABELS[key] ?? key} />
      ) : (
        <Unavailable source="baza danych" />
      )}
      {byProducer.ok ? (
        <StatsTable
          title="Według producenta"
          keyLabel="Producent"
          rows={byProducer.data}
          renderKey={(key) => (
            <Link href={producerHref(key)} className="underline">
              {names.get(key) ?? key}
            </Link>
          )}
        />
      ) : (
        <Unavailable source="baza danych" />
      )}
    </>
  );
}

export async function ProducerDetailView({
  producerId,
  range,
  backHref,
}: {
  producerId: string;
  range: EmailStatsRange;
  backHref: string;
}) {
  const [traffic, emailsByType, emailTotals, producerNames] = await Promise.all([
    getProducerTrafficDetail(producerId, range),
    getEmailStatsByType(range, producerId),
    getEmailStatsTotals(range, producerId),
    getProducerNamesByIds([producerId]).catch(() => new Map<string, string>()),
  ]);
  const productNames = traffic.ok
    ? await getProductNamesByIds(traffic.data.products.map((item) => item.productId)).catch(() => new Map<string, string>())
    : new Map<string, string>();
  const maxViews = traffic.ok ? Math.max(1, ...traffic.data.daily.map((point) => point.pageviews)) : 1;

  return (
    <>
      <Link href={backHref} className="underline">
        Wróć do rankingu producentów
      </Link>
      <Text as="p" variant="label" tone="muted">
        Producent
      </Text>
      <DataText as="p" className="text-h2">
        {producerNames.get(producerId) ?? producerId}
      </DataText>

      {traffic.ok ? (
        <>
          <div className="grid grid-cols-1 gap-brand-4 sm:grid-cols-3">
            {[
              { label: "Wyśw. produktów", value: traffic.data.productViews },
              { label: "Wyśw. strony producenta", value: traffic.data.producerPageViews },
              { label: "Goście", value: traffic.data.visitors },
            ].map((tile) => (
              <Card key={tile.label}>
                <Text as="span" variant="label" tone="muted">
                  {tile.label}
                </Text>
                <DataText as="p" className="text-h2">
                  {tile.value}
                </DataText>
              </Card>
            ))}
          </div>
          <Card>
            <Stack gap={2}>
              <Text as="span" variant="label" tone="muted">
                Trend dzienny
              </Text>
              {traffic.data.daily.length === 0 ? (
                <Text tone="muted">Brak danych w tym okresie.</Text>
              ) : (
                <ul className="flex flex-col gap-1">
                  {traffic.data.daily.map((point) => (
                    <li key={point.day} className="grid grid-cols-[6rem_1fr_9rem] items-center gap-brand-2 text-data">
                      <span>{point.day}</span>
                      <span
                        className="h-3 rounded-data bg-brand-passage-blue"
                        style={{ width: `${Math.max(2, (point.pageviews / maxViews) * 100)}%` }}
                        aria-hidden="true"
                      />
                      <span className="text-right">
                        {point.pageviews} wyśw. / {point.visitors} gości
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Stack>
          </Card>
          <Card>
            <Stack gap={2}>
              <Text as="span" variant="label" tone="muted">
                Produkty po wyświetleniach
              </Text>
              {traffic.data.products.length === 0 ? (
                <Text tone="muted">Brak danych w tym okresie.</Text>
              ) : (
                <ul className="flex flex-col gap-1">
                  {traffic.data.products.map((item) => (
                    <li key={item.productId} className="flex items-baseline justify-between gap-brand-2 border-b border-brand-steel/50 pb-1">
                      <span>{productNames.get(item.productId) ?? item.productId}</span>
                      <DataText as="span">{item.views}</DataText>
                    </li>
                  ))}
                </ul>
              )}
            </Stack>
          </Card>
        </>
      ) : (
        <Unavailable source="PostHog" />
      )}

      {emailTotals.ok && (
        <Text as="p" tone="muted">
          Maile w tym okresie: wysłane {emailTotals.data.sent}, dostarczone {emailTotals.data.delivered}, odbite{" "}
          {emailTotals.data.bounced}, skargi {emailTotals.data.complained}, śledzone {trackedShare(emailTotals.data)}, unikalne kliknięcia{" "}
          {emailTotals.data.uniqueClicks}, otwarcia (ludzkie) {emailTotals.data.humanOpens}.
        </Text>
      )}
      {emailsByType.ok ? (
        <StatsTable title="Maile do tego producenta" keyLabel="Typ maila" rows={emailsByType.data} renderKey={(key) => TYPE_LABELS[key] ?? key} />
      ) : (
        <Unavailable source="baza danych" />
      )}
    </>
  );
}
