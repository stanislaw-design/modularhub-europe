import { captureError } from "./errors";

// Odczyt HogQL Query API PostHog dla dashboardu /internal (spec 0055 AC-6,
// AC-9, AC-17): jedyne miejsce poza events.ts, gdzie ten katalog wie o
// PostHog (posthog-node to klient do zapisu zdarzeń, nie do zapytań, więc
// zwykły fetch do REST API tego samego dostawcy, ten sam wzorzec co
// sentry-issues.ts). NEXT_PUBLIC_POSTHOG_HOST (host, nie sekret) plus osobny
// POSTHOG_PERSONAL_API_KEY (odczyt), nie NEXT_PUBLIC_POSTHOG_KEY (ten drugi
// jest tylko do zapisu zdarzeń z przeglądarki i nie nadaje się do odczytu,
// spec Configuration required). Limit czasu 5s (AC-9), cache ~60s, błąd/timeout
// -> captureError i stan "niedostępne", reszta dashboardu renderuje się normalnie.

export type PageviewsResult = { ok: true; count: number } | { ok: false };

export async function getPageviewsLast30Days(): Promise<PageviewsResult> {
  const apiKey = process.env.POSTHOG_PERSONAL_API_KEY;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;

  if (!apiKey || !host) {
    captureError(new Error("PostHog monitoring misconfigured: POSTHOG_PERSONAL_API_KEY/NEXT_PUBLIC_POSTHOG_HOST missing"), {
      path: "getPageviewsLast30Days",
    });
    return { ok: false };
  }

  try {
    const response = await fetch(`${host}/api/projects/@current/query/`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        query: {
          kind: "HogQLQuery",
          query: "select count() from events where event = '$pageview' and timestamp >= now() - interval 30 day",
        },
      }),
      signal: AbortSignal.timeout(5000),
      next: { revalidate: 60 },
    });
    if (!response.ok) throw new Error(`PostHog query request failed with ${response.status}`);

    const data = (await response.json()) as { results?: Array<[number]> };
    const count = data.results?.[0]?.[0];
    if (typeof count !== "number") throw new Error("PostHog query response missing a numeric count");

    return { ok: true, count };
  } catch (error) {
    captureError(error, { path: "getPageviewsLast30Days" });
    return { ok: false };
  }
}

// Spec 0079 AC-7 do AC-9: zapytania HogQL dla /internal/analytics. Każde
// źródło pada osobno (AC-11): błąd lub brak konfiguracji daje `{ ok: false }`,
// a widok pokazuje "niedostępne". Cache około 15 minut.

export type AnalyticsRange = 7 | 30 | 90;
export type QueryResult<T> = { ok: true; data: T } | { ok: false };

async function runHogQL(query: string, path: string): Promise<unknown[][]> {
  const apiKey = process.env.POSTHOG_PERSONAL_API_KEY;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST;
  if (!apiKey || !host) throw new Error("PostHog monitoring misconfigured: POSTHOG_PERSONAL_API_KEY/NEXT_PUBLIC_POSTHOG_HOST missing");

  const response = await fetch(`${host}/api/projects/@current/query/`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query: { kind: "HogQLQuery", query } }),
    signal: AbortSignal.timeout(5000),
    next: { revalidate: 900 },
  });
  if (!response.ok) throw new Error(`PostHog query ${path} failed with ${response.status}`);
  const data = (await response.json()) as { results?: unknown[][] };
  if (!Array.isArray(data.results)) throw new Error(`PostHog query ${path} returned no results`);
  return data.results;
}

async function safeQuery<T>(path: string, query: string, map: (rows: unknown[][]) => T): Promise<QueryResult<T>> {
  try {
    return { ok: true, data: map(await runHogQL(query, path)) };
  } catch (error) {
    captureError(error, { path });
    return { ok: false };
  }
}

// `days` pochodzi z typu AnalyticsRange (7, 30 albo 90), nie z wejścia użytkownika.
const since = (days: AnalyticsRange) => `timestamp >= now() - interval ${days} day`;
const num = (value: unknown) => (typeof value === "number" ? value : Number(value) || 0);

// Okno bezpośrednio przed bieżącym (te same `days` dni, przesunięte wstecz), do delt "vs poprzedni okres".
const previousWindow = (days: AnalyticsRange) =>
  `timestamp >= now() - interval ${days * 2} day and timestamp < now() - interval ${days} day`;

export interface TrafficTotals {
  visitors: number;
  sessions: number;
  pageviews: number;
  avgSessionSeconds: number;
}

export interface DailyTraffic {
  day: string;
  visitors: number;
  pageviews: number;
}

export interface TrafficSummary extends TrafficTotals {
  previous: TrafficTotals;
  /** Dokładnie `days` punktów, dni bez ruchu uzupełnione zerami. */
  daily: DailyTraffic[];
  /** Dokładnie `days` punktów, na tym samym indeksie co `daily` (dzień k okresu poprzedniego). */
  previousDaily: DailyTraffic[];
}

// PostHog pomija dni bez zdarzeń; oś czasu wykresu nie może przez to kłamać.
function fillDays(rows: DailyTraffic[], days: number, offsetDays: number): DailyTraffic[] {
  const byDay = new Map(rows.map((row) => [row.day, row]));
  const today = new Date();
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
    date.setUTCDate(date.getUTCDate() - (days - 1 - index) - offsetDays);
    const day = date.toISOString().slice(0, 10);
    return byDay.get(day) ?? { day, visitors: 0, pageviews: 0 };
  });
}

const toDaily = (rows: unknown[][]): DailyTraffic[] =>
  rows.map((row) => ({ day: String(row[0]).slice(0, 10), visitors: num(row[1]), pageviews: num(row[2]) }));

export async function getTrafficSummary(days: AnalyticsRange): Promise<QueryResult<TrafficSummary>> {
  const totalsQuery = (path: string, window: string) =>
    safeQuery(
      path,
      `select uniq(distinct_id), uniq(properties.$session_id), count() from events where event = '$pageview' and ${window}`,
      (rows) => ({ visitors: num(rows[0]?.[0]), sessions: num(rows[0]?.[1]), pageviews: num(rows[0]?.[2]) }),
    );
  const durationQuery = (path: string, window: string) =>
    safeQuery(path, `select avg($session_duration) from sessions where ${window}`, (rows) => num(rows[0]?.[0]));
  const dailyQuery = (path: string, window: string) =>
    safeQuery(
      path,
      `select toDate(timestamp) as day, uniq(distinct_id), count() from events where event = '$pageview' and ${window} group by day order by day`,
      toDaily,
    );

  const [totals, previousTotals, duration, previousDuration, daily, previousDaily] = await Promise.all([
    totalsQuery("getTrafficSummary.totals", since(days)),
    totalsQuery("getTrafficSummary.previousTotals", previousWindow(days)),
    durationQuery("getTrafficSummary.duration", `$start_timestamp >= now() - interval ${days} day`),
    durationQuery(
      "getTrafficSummary.previousDuration",
      `$start_timestamp >= now() - interval ${days * 2} day and $start_timestamp < now() - interval ${days} day`,
    ),
    dailyQuery("getTrafficSummary.daily", since(days)),
    dailyQuery("getTrafficSummary.previousDaily", previousWindow(days)),
  ]);
  if (!totals.ok || !previousTotals.ok || !duration.ok || !previousDuration.ok || !daily.ok || !previousDaily.ok) {
    return { ok: false };
  }
  return {
    ok: true,
    data: {
      ...totals.data,
      avgSessionSeconds: duration.data,
      previous: { ...previousTotals.data, avgSessionSeconds: previousDuration.data },
      daily: fillDays(daily.data, days, 0),
      previousDaily: fillDays(previousDaily.data, days, days),
    },
  };
}

export interface PageCount {
  path: string;
  count: number;
}

const toPageCounts = (rows: unknown[][]): PageCount[] => rows.map((row) => ({ path: String(row[0] ?? ""), count: num(row[1]) }));

export interface PagesReport {
  top: PageCount[];
  entry: PageCount[];
  exit: PageCount[];
  /** Wyświetlenia według `page_type` (home, sauna, project, ...), malejąco. */
  types: PageCount[];
}

export async function getPagesReport(days: AnalyticsRange): Promise<QueryResult<PagesReport>> {
  const bySession = (agg: "argMin" | "argMax") =>
    `select p, count() from (select ${agg}(properties.page_path, timestamp) as p from events where event = '$pageview' and ${since(days)} group by properties.$session_id) group by p order by count() desc limit 15`;
  const [top, entry, exit, types] = await Promise.all([
    safeQuery(
      "getPagesReport.top",
      `select properties.page_path as p, count() from events where event = '$pageview' and ${since(days)} group by p order by count() desc limit 15`,
      toPageCounts,
    ),
    safeQuery("getPagesReport.entry", bySession("argMin"), toPageCounts),
    safeQuery("getPagesReport.exit", bySession("argMax"), toPageCounts),
    safeQuery(
      "getPagesReport.types",
      `select properties.page_type as t, count() from events where event = '$pageview' and ${since(days)} group by t order by count() desc`,
      toPageCounts,
    ),
  ]);
  if (!top.ok || !entry.ok || !exit.ok || !types.ok) return { ok: false };
  return { ok: true, data: { top: top.data, entry: entry.data, exit: exit.data, types: types.data } };
}

export interface ProducerTrafficRow {
  producerId: string;
  producerPageViews: number;
  productViews: number;
  visitors: number;
}

export async function getProducerTraffic(days: AnalyticsRange): Promise<QueryResult<ProducerTrafficRow[]>> {
  return safeQuery(
    "getProducerTraffic",
    `select properties.producer_id as pid, countIf(properties.page_type = 'producer'), countIf(properties.page_type != 'producer'), uniq(distinct_id) from events where event = '$pageview' and ${since(days)} and isNotNull(properties.producer_id) and properties.producer_id != '' group by pid order by count() desc limit 100`,
    (rows) =>
      rows.map((row) => ({
        producerId: String(row[0]),
        producerPageViews: num(row[1]),
        productViews: num(row[2]),
        visitors: num(row[3]),
      })),
  );
}

// Spec 0079 AC-9: szczegół jednego producenta. `producerId` trafia do zapytania HogQL, więc
// przechodzi przez ścisły wzorzec uuid; cokolwiek innego to "niedostępne", nie wstrzyknięcie.
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface ProducerTrafficDetail {
  producerPageViews: number;
  productViews: number;
  visitors: number;
  daily: Array<{ day: string; visitors: number; pageviews: number }>;
  products: Array<{ productId: string; views: number }>;
}

export async function getProducerTrafficDetail(
  producerId: string,
  days: AnalyticsRange,
): Promise<QueryResult<ProducerTrafficDetail>> {
  if (!UUID_PATTERN.test(producerId)) return { ok: false };
  const forProducer = `event = '$pageview' and ${since(days)} and properties.producer_id = '${producerId}'`;
  const [totals, daily, products] = await Promise.all([
    safeQuery(
      "getProducerTrafficDetail.totals",
      `select countIf(properties.page_type = 'producer'), countIf(properties.page_type != 'producer'), uniq(distinct_id) from events where ${forProducer}`,
      (rows) => ({ producerPageViews: num(rows[0]?.[0]), productViews: num(rows[0]?.[1]), visitors: num(rows[0]?.[2]) }),
    ),
    safeQuery(
      "getProducerTrafficDetail.daily",
      `select toDate(timestamp) as day, uniq(distinct_id), count() from events where ${forProducer} group by day order by day`,
      toDaily,
    ),
    safeQuery(
      "getProducerTrafficDetail.products",
      `select properties.product_id as pid, count() from events where ${forProducer} and isNotNull(properties.product_id) and properties.product_id != '' group by pid order by count() desc limit 20`,
      (rows) => rows.map((row) => ({ productId: String(row[0]), views: num(row[1]) })),
    ),
  ]);
  if (!totals.ok || !daily.ok || !products.ok) return { ok: false };
  return { ok: true, data: { ...totals.data, daily: fillDays(daily.data, days, 0), products: products.data } };
}
