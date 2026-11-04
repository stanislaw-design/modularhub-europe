import Link from "next/link";
import { BarList } from "@/components/internal/analytics/BarList";
import { StatTile } from "@/components/internal/analytics/StatTile";
import { TrafficTrendChart } from "@/components/internal/analytics/TrafficTrendChart";
import { Card, DataText, Stack, Text } from "@/components/ui";
import {
  getEmailStatsByProducer,
  getEmailStatsByType,
  getEmailStatsTotals,
  type EmailStatsRange,
  type EmailStatsRow,
  type EmailStatsTotals,
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

const pct = (part: number, whole: number) => (whole === 0 ? 0 : Math.round((part / whole) * 100));

// Kafelki i dwa wykresy odpowiadające na dwa pytania: czy maile docierają (Resend)
// i czy producenci reagują (tylko maile śledzone, za zgodą odbiorcy).
function EmailSummary({ totals }: { totals: EmailStatsTotals }) {
  const problems = totals.bounced + totals.complained;
  return (
    <>
      <div className="grid grid-cols-1 gap-brand-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Wysłane maile"
          value={String(totals.sent)}
          hint={`Do producentów, w ${totals.uniqueRequests} unikalnych zapytaniach. Jeden odbiorca to jeden mail.`}
        />
        <StatTile
          label="Dostarczone"
          value={String(totals.delivered)}
          hint={`${pct(totals.delivered, totals.sent)}% wysłanych trafiło do skrzynki odbiorcy.`}
        />
        <StatTile
          label="Odbite i skargi"
          value={String(problems)}
          emphasis={problems > 0 ? "danger" : undefined}
          hint={`Odbite: ${totals.bounced}, skargi: ${totals.complained}. Zero to dobry wynik.`}
        />
        <StatTile
          label="Maile śledzone"
          value={`${pct(totals.trackedSent, totals.sent)}%`}
          hint={`${totals.trackedSent} z ${totals.sent}: odbiorcy, którzy zgodzili się na pomiar otwarć i kliknięć.`}
        />
      </div>
      <div className="grid grid-cols-1 gap-brand-4 lg:grid-cols-2">
        <Card>
          <Stack gap={2}>
            <Text as="span" variant="label" tone="muted">
              Czy maile docierają?
            </Text>
            <BarList
              max={totals.sent}
              emptyText="Brak wysłanych maili w tym okresie."
              rows={
                totals.sent === 0
                  ? []
                  : [
                      { key: "sent", label: "Wysłane", value: totals.sent },
                      { key: "delivered", label: "Dostarczone", value: totals.delivered, detail: `${pct(totals.delivered, totals.sent)}% wysłanych` },
                      { key: "bounced", label: "Odbite", value: totals.bounced, tone: "danger", detail: `${pct(totals.bounced, totals.sent)}% wysłanych` },
                      { key: "complained", label: "Skargi", value: totals.complained, tone: "danger", detail: `${pct(totals.complained, totals.sent)}% wysłanych` },
                    ]
              }
            />
          </Stack>
        </Card>
        <Card>
          <Stack gap={2}>
            <Text as="span" variant="label" tone="muted">
              Czy producenci reagują?
            </Text>
            <Text as="p" tone="muted">
              „Śledzone” to maile wysłane do odbiorców, którzy dobrowolnie zgodzili się na pomiar. Kliknięcia i otwarcia dotyczą tylko
              ich, więc to próbka, nie całość.
            </Text>
            <BarList
              max={totals.trackedSent}
              rows={[
                { key: "tracked", label: "Maile śledzone", value: totals.trackedSent, tone: "muted" },
                { key: "clicked", label: "Z kliknięciem w link", value: totals.uniqueClicks, detail: `${pct(totals.uniqueClicks, totals.trackedSent)}% śledzonych (główna miara)` },
                { key: "opened", label: "Z otwarciem (ludzkim)", value: totals.humanOpens, detail: `${pct(totals.humanOpens, totals.trackedSent)}% śledzonych (bywa zawyżone)` },
              ]}
            />
            {totals.trackedSent === 0 && (
              <Text as="p" tone="muted">
                W tym okresie żaden odbiorca ze zgodą na pomiar nie dostał maila, więc nie ma jeszcze kliknięć ani otwarć.
              </Text>
            )}
          </Stack>
        </Card>
      </div>
    </>
  );
}

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
      {totals.ok && <EmailSummary totals={totals.data} />}
      <details className="rounded-card border border-brand-steel p-brand-2 text-body">
        <summary className="focus-ring cursor-pointer rounded-data font-medium">Jak czytać te liczby?</summary>
        <p className="mt-brand-1 text-brand-technical-graphite">
          „Dostarczone”, „Odbite” i „Skargi” przychodzą z webhooka Resend, więc tuż po wysyłce mogą być jeszcze zerem. Otwarcia bywają
          zawyżone (skanery, ochrona prywatności w poczcie), dlatego główną miarą są kliknięcia; obie liczby pomijają ruch wyglądający
          na automat. Poniższe tabele pokazują te same liczby w rozbiciu na typ maila i producenta.
        </p>
      </details>
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
            <StatTile
              label="Wyświetlenia produktów"
              value={String(traffic.data.productViews)}
              hint="Ile razy otwarto strony produktów tego producenta."
            />
            <StatTile
              label="Wyświetlenia strony producenta"
              value={String(traffic.data.producerPageViews)}
              hint="Ile razy otwarto jego stronę firmową."
            />
            <StatTile
              label="Unikalni odwiedzający"
              value={String(traffic.data.visitors)}
              hint="Ile różnych osób obejrzało jego produkty lub stronę."
            />
          </div>
          <Card>
            <Stack gap={2}>
              <Text as="span" variant="label" tone="muted">
                Ilu ludzi ogląda tego producenta dzień po dniu?
              </Text>
              <TrafficTrendChart daily={traffic.data.daily} rangeDays={range} />
            </Stack>
          </Card>
          <Card>
            <Stack gap={2}>
              <Text as="span" variant="label" tone="muted">
                Produkty po wyświetleniach
              </Text>
              <BarList
                rows={traffic.data.products.map((item) => ({
                  key: item.productId,
                  label: productNames.get(item.productId) ?? item.productId,
                  value: item.views,
                }))}
              />
            </Stack>
          </Card>
        </>
      ) : (
        <Unavailable source="PostHog" />
      )}

      {emailTotals.ok && <EmailSummary totals={emailTotals.data} />}
      {emailsByType.ok ? (
        <StatsTable title="Maile do tego producenta" keyLabel="Typ maila" rows={emailsByType.data} renderKey={(key) => TYPE_LABELS[key] ?? key} />
      ) : (
        <Unavailable source="baza danych" />
      )}
    </>
  );
}
