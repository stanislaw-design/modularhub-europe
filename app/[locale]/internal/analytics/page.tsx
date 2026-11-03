import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { EmailsView, ProducerDetailView } from "@/components/internal/AnalyticsEmailViews";
import { Card, DataText, Heading, Stack, Text } from "@/components/ui";
import { getProducerNamesByIds } from "@/lib/db/queries";
import {
  getPagesReport,
  getProducerTraffic,
  getTrafficSummary,
  type AnalyticsRange,
  type PageCount,
} from "@/lib/observability/posthog-metrics";

// @next-codemod-ignore Cache Components adoption: this segment temporarily allows blocking.
// Remove this opt-out after verifying the segment passes validation without it.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components
export const instant = false;

const RANGES: AnalyticsRange[] = [7, 30, 90];
const VIEWS = [
  { key: "traffic", label: "Ruch" },
  { key: "pages", label: "Strony" },
  { key: "producers", label: "Producenci" },
  { key: "emails", label: "Maile" },
] as const;
type ViewKey = (typeof VIEWS)[number]["key"];

function parseRange(value: string | undefined): AnalyticsRange {
  const parsed = Number(value);
  return parsed === 7 || parsed === 90 ? parsed : 30;
}

function parseView(value: string | undefined): ViewKey {
  return VIEWS.find((view) => view.key === value)?.key ?? "traffic";
}

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function formatDuration(seconds: number): string {
  const rounded = Math.round(seconds);
  return `${Math.floor(rounded / 60)} min ${String(rounded % 60).padStart(2, "0")} s`;
}

function Unavailable() {
  return (
    <Text as="p" tone="muted">
      Niedostępne (PostHog nie odpowiada). Pozostałe źródła działają normalnie.
    </Text>
  );
}

function PageTable({ title, rows }: { title: string; rows: PageCount[] }) {
  return (
    <Card>
      <Stack gap={2}>
        <Text as="span" variant="label" tone="muted">
          {title}
        </Text>
        {rows.length === 0 ? (
          <Text tone="muted">Brak danych.</Text>
        ) : (
          <ul className="flex flex-col gap-1">
            {rows.map((row) => (
              <li key={row.path} className="flex items-baseline justify-between gap-brand-2 border-b border-brand-steel/50 pb-1">
                <span className="break-all">{row.path || "(brak)"}</span>
                <DataText as="span">{row.count}</DataText>
              </li>
            ))}
          </ul>
        )}
      </Stack>
    </Card>
  );
}

const pillClass = (active: boolean) =>
  `focus-ring rounded-marketing border px-brand-2 py-1 text-body ${active ? "border-brand-passage-blue bg-brand-passage-blue/10 font-semibold" : "border-brand-steel"}`;

// Spec 0079 AC-7 do AC-9, AC-11: ruch z PostHog, każde źródło osobno. Ta sama
// inline bramka sesji co inne ekrany /internal (kopia, nie wspólny layout).
export default async function InternalAnalyticsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ range?: string; view?: string; producer?: string }>;
}) {
  const { locale } = await params;
  const query = await searchParams;
  const session = await auth();
  const selfHref = `/${locale}/internal/analytics`;

  if (!session) {
    redirect(`/${locale}/login?callbackUrl=${encodeURIComponent(selfHref)}`);
  }
  if (session.user.role !== "admin") {
    redirect(`/${locale}`);
  }

  const range = parseRange(query.range);
  const view = parseView(query.view);
  const href = (nextView: ViewKey, nextRange: AnalyticsRange) => `${selfHref}?view=${nextView}&range=${nextRange}`;
  // AC-9: szczegół jednego producenta; rozpoznajemy go tylko po poprawnym uuid.
  const producerId = query.producer && UUID_PATTERN.test(query.producer) ? query.producer : null;
  const producerHref = (id: string) => `${selfHref}?view=producers&range=${range}&producer=${id}`;

  return (
    <>
      <Heading level="h1">Analityka</Heading>
      <Text as="p" tone="muted">
        Liczby obejmują tylko odwiedzających, którzy kliknęli „Akceptuję” w banerze zgody, więc są niższe niż prawdziwy ruch.
        Służą do trendów i porównań, nie do bezwzględnej liczby gości.
      </Text>

      <nav aria-label="Widoki analityki" className="flex flex-wrap items-center gap-brand-2">
        {VIEWS.map((item) => (
          <Link
            key={item.key}
            href={href(item.key, range)}
            aria-current={item.key === view ? "page" : undefined}
            className={pillClass(item.key === view)}
          >
            {item.label}
          </Link>
        ))}
        <span className="mx-brand-1 text-brand-technical-graphite" aria-hidden="true">
          |
        </span>
        {RANGES.map((value) => (
          <Link
            key={value}
            href={href(view, value)}
            aria-current={value === range ? "true" : undefined}
            className={pillClass(value === range)}
          >
            {value} dni
          </Link>
        ))}
      </nav>

      {view === "traffic" && <TrafficView range={range} />}
      {view === "pages" && <PagesView range={range} />}
      {view === "producers" &&
        (producerId ? (
          <ProducerDetailView producerId={producerId} range={range} backHref={href("producers", range)} />
        ) : (
          <ProducersView range={range} producerHref={producerHref} />
        ))}
      {view === "emails" && <EmailsView range={range} producerHref={producerHref} />}
    </>
  );
}

async function TrafficView({ range }: { range: AnalyticsRange }) {
  const result = await getTrafficSummary(range);
  if (!result.ok) return <Unavailable />;
  const { visitors, sessions, avgSessionSeconds, daily } = result.data;
  const maxViews = Math.max(1, ...daily.map((point) => point.pageviews));
  const tiles = [
    { label: "Goście", value: String(visitors) },
    { label: "Sesje", value: String(sessions) },
    { label: "Średni czas sesji", value: formatDuration(avgSessionSeconds) },
  ];

  return (
    <>
      <div className="grid grid-cols-1 gap-brand-4 sm:grid-cols-3">
        {tiles.map((tile) => (
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
            Trend dzienny (wyświetlenia stron i goście)
          </Text>
          {daily.length === 0 ? (
            <Text tone="muted">Brak danych w tym okresie.</Text>
          ) : (
            <ul className="flex flex-col gap-1">
              {daily.map((point) => (
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
    </>
  );
}

async function PagesView({ range }: { range: AnalyticsRange }) {
  const result = await getPagesReport(range);
  if (!result.ok) return <Unavailable />;
  return (
    <div className="grid grid-cols-1 gap-brand-4 lg:grid-cols-3">
      <PageTable title="Najczęściej odwiedzane" rows={result.data.top} />
      <PageTable title="Strony wejścia" rows={result.data.entry} />
      <PageTable title="Strony wyjścia" rows={result.data.exit} />
    </div>
  );
}

async function ProducersView({ range, producerHref }: { range: AnalyticsRange; producerHref: (id: string) => string }) {
  const result = await getProducerTraffic(range);
  if (!result.ok) return <Unavailable />;
  const rows = result.data;
  // Nazwy z Neon; awaria bazy nie psuje rankingu (zostają same identyfikatory).
  const names = await getProducerNamesByIds(rows.map((row) => row.producerId)).catch(() => new Map<string, string>());

  return (
    <Card>
      <Stack gap={2}>
        <Text as="span" variant="label" tone="muted">
          Ranking producentów po wyświetleniach
        </Text>
        {rows.length === 0 ? (
          <Text tone="muted">Brak danych w tym okresie.</Text>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-body">
              <thead>
                <tr className="border-b border-brand-steel text-data text-brand-technical-graphite">
                  <th className="py-1 pr-brand-2 font-medium">Producent</th>
                  <th className="py-1 pr-brand-2 text-right font-medium">Wyśw. produktów</th>
                  <th className="py-1 pr-brand-2 text-right font-medium">Wyśw. strony producenta</th>
                  <th className="py-1 text-right font-medium">Goście</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.producerId} className="border-b border-brand-steel/50">
                    <td className="py-1 pr-brand-2">
                      <Link href={producerHref(row.producerId)} className="underline">
                        {names.get(row.producerId) ?? row.producerId}
                      </Link>
                    </td>
                    <td className="py-1 pr-brand-2 text-right">{row.productViews}</td>
                    <td className="py-1 pr-brand-2 text-right">{row.producerPageViews}</td>
                    <td className="py-1 text-right">{row.visitors}</td>
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
