import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const captureErrorMock = vi.hoisted(() => vi.fn());
vi.mock("./errors", () => ({ captureError: captureErrorMock }));

import { getProducerTrafficDetail } from "./posthog-metrics";

const ORIGINAL_ENV = { ...process.env };
const PRODUCER_ID = "6f1c3a52-0d7e-4c55-9b8e-1f2a3b4c5d6e";

function hogqlResponder(results: Record<string, unknown[][]>) {
  return vi.fn(async (_url: string, init: RequestInit) => {
    const query = JSON.parse(init.body as string).query.query as string;
    const key = Object.keys(results).find((marker) => query.includes(marker));
    return { ok: true, status: 200, json: async () => ({ results: key ? results[key] : [] }) } as Response;
  });
}

// Spec 0079 AC-9, AC-11: szczegół producenta czyta PostHog, każde źródło pada osobno.
describe("getProducerTrafficDetail", () => {
  beforeEach(() => {
    process.env.POSTHOG_PERSONAL_API_KEY = "key";
    process.env.NEXT_PUBLIC_POSTHOG_HOST = "https://posthog.example.test";
    captureErrorMock.mockClear();
  });
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    vi.unstubAllGlobals();
  });

  it("maps totals, daily trend and top products for one producer (AC-9)", async () => {
    const fetchMock = hogqlResponder({
      "countIf(properties.page_type = 'producer')": [[4, 9, 7]],
      "toDate(timestamp)": [["2026-11-01T00:00:00Z", 3, 5], ["2026-11-02", 4, 8]],
      "properties.product_id as pid": [["prod-1", 6], ["prod-2", 3]],
    });
    vi.stubGlobal("fetch", fetchMock);
    vi.useFakeTimers({ toFake: ["Date"], now: new Date("2026-11-03T12:00:00Z") });

    const result = await getProducerTrafficDetail(PRODUCER_ID, 30);
    vi.useRealTimers();

    expect(result.ok && { ...result.data, daily: result.data.daily.slice(-3) }).toEqual({
      producerPageViews: 4,
      productViews: 9,
      visitors: 7,
      // Dni bez ruchu są uzupełnione zerami: dokładnie 30 punktów, ostatni to dziś.
      daily: [
        { day: "2026-11-01", visitors: 3, pageviews: 5 },
        { day: "2026-11-02", visitors: 4, pageviews: 8 },
        { day: "2026-11-03", visitors: 0, pageviews: 0 },
      ],
      products: [
        { productId: "prod-1", views: 6 },
        { productId: "prod-2", views: 3 },
      ],
    });
    expect(result.ok && result.data.daily).toHaveLength(30);
    for (const call of fetchMock.mock.calls) {
      const query = JSON.parse(call[1].body as string).query.query as string;
      expect(query).toContain(`properties.producer_id = '${PRODUCER_ID}'`);
      expect(query).toContain("interval 30 day");
    }
  });

  it("refuses an id that is not a uuid and never calls PostHog (no HogQL injection)", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    expect(await getProducerTrafficDetail("x' or 1=1 --", 7)).toEqual({ ok: false });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("reports unavailable and tells Sentry when PostHog answers with an error (AC-11)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 401 } as Response));

    expect(await getProducerTrafficDetail(PRODUCER_ID, 90)).toEqual({ ok: false });
    expect(captureErrorMock).toHaveBeenCalled();
  });

  it("reports unavailable when the PostHog key is not configured", async () => {
    delete process.env.POSTHOG_PERSONAL_API_KEY;
    vi.stubGlobal("fetch", vi.fn());

    expect(await getProducerTrafficDetail(PRODUCER_ID, 30)).toEqual({ ok: false });
  });
});
