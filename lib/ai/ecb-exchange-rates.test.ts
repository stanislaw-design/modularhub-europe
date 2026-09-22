import { describe, expect, it, vi } from "vitest";
import {
  convertNetAmountToEur,
  EcbRateUnavailableError,
  fetchLatestEcbReferenceRate,
} from "@/lib/ai/ecb-exchange-rates";

const csv = `KEY,FREQ,CURRENCY,CURRENCY_DENOM,EXR_TYPE,EXR_SUFFIX,TIME_PERIOD,OBS_VALUE
EXR.D.PLN.EUR.SP00.A,D,PLN,EUR,SP00,A,2026-09-18,4.5000`;

describe("ECB exchange rates", () => {
  it("converts a net source amount to euro cents with decimal half up arithmetic", () => {
    const result = convertNetAmountToEur("454149.00", {
      provider: "ECB",
      series: "EXR.D.PLN.EUR.SP00.A",
      sourceCurrency: "PLN",
      targetCurrency: "EUR",
      rate: "4.5000",
      rateDate: "2026-09-18",
      retrievedAt: "2026-09-20T10:00:00.000Z",
    });

    expect(result.eurCents).toBe(10_092_200);
    expect(result.metadata).toMatchObject({
      sourceAmount: "454149.00",
      sourceCurrency: "PLN",
      targetCurrency: "EUR",
      rate: "4.5000",
      rounding: "HALF_UP_2",
    });
  });

  it("rounds only the final euro cent", () => {
    const result = convertNetAmountToEur("1.00", {
      provider: "ECB",
      series: "EXR.D.PLN.EUR.SP00.A",
      sourceCurrency: "PLN",
      targetCurrency: "EUR",
      rate: "3",
      rateDate: "2026-09-18",
      retrievedAt: "2026-09-20T10:00:00.000Z",
    });
    expect(result.eurCents).toBe(33);
  });

  it("reads the latest official ECB CSV observation", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(new Response(csv, { status: 200 }));
    const snapshot = await fetchLatestEcbReferenceRate("pln", {
      fetchImpl,
      now: new Date("2026-09-20T10:00:00.000Z"),
    });

    expect(snapshot).toMatchObject({
      series: "EXR.D.PLN.EUR.SP00.A",
      sourceCurrency: "PLN",
      rate: "4.5000",
      rateDate: "2026-09-18",
    });
    expect(fetchImpl).toHaveBeenCalledOnce();
  });

  it("uses rate one for EUR without a network request", async () => {
    const fetchImpl = vi.fn<typeof fetch>();
    const snapshot = await fetchLatestEcbReferenceRate("EUR", {
      fetchImpl,
      now: new Date("2026-09-20T10:00:00.000Z"),
    });
    expect(snapshot.rate).toBe("1");
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("rejects a reference rate older than seven calendar days", async () => {
    const fetchImpl = vi.fn<typeof fetch>().mockResolvedValue(new Response(csv, { status: 200 }));
    await expect(fetchLatestEcbReferenceRate("PLN", {
      fetchImpl,
      now: new Date("2026-09-26T10:00:00.000Z"),
    })).rejects.toBeInstanceOf(EcbRateUnavailableError);
  });
});
