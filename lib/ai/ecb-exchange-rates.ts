const ECB_DATA_API_BASE_URL = "https://data-api.ecb.europa.eu/service/data/EXR";
const MAX_RATE_AGE_DAYS = 7;
const MILLISECONDS_PER_DAY = 86_400_000;

export interface EcbReferenceRateSnapshot {
  provider: "ECB";
  series: string;
  sourceCurrency: string;
  targetCurrency: "EUR";
  rate: string;
  rateDate: string;
  retrievedAt: string;
}

export interface FxNormalizationMetadata {
  kind: "fx";
  provider: "ECB";
  series: string;
  sourceAmount: string;
  sourceCurrency: string;
  targetCurrency: "EUR";
  rate: string;
  rateDate: string;
  retrievedAt: string;
  rounding: "HALF_UP_2";
}

export class EcbRateUnavailableError extends Error {
  readonly code = "FX_RATE_UNAVAILABLE";

  constructor(readonly sourceCurrency: string, options?: ErrorOptions) {
    super(`FX rate unavailable for ${sourceCurrency}`, options);
    this.name = "EcbRateUnavailableError";
  }
}

interface DecimalParts {
  integer: bigint;
  scale: number;
  canonical: string;
}

function parsePositiveDecimal(value: string | number, label: string): DecimalParts {
  const raw = typeof value === "number" ? String(value) : value.trim();
  const match = /^(\d+)(?:[.,](\d+))?$/.exec(raw.replace(/\s/g, ""));
  if (!match) throw new RangeError(`${label} must be a positive decimal`);
  const fraction = match[2] ?? "";
  const integer = BigInt(`${match[1]}${fraction}`);
  if (integer <= BigInt(0)) throw new RangeError(`${label} must be greater than zero`);
  return {
    integer,
    scale: fraction.length,
    canonical: fraction.length ? `${match[1]}.${fraction}` : match[1],
  };
}

function powerOfTen(exponent: number): bigint {
  return BigInt(10) ** BigInt(exponent);
}

function divideHalfUp(numerator: bigint, denominator: bigint): bigint {
  return (numerator * BigInt(2) + denominator) / (denominator * BigInt(2));
}

function parseCsvRows(csv: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < csv.length; index += 1) {
    const character = csv[index];
    if (character === '"') {
      if (quoted && csv[index + 1] === '"') {
        field += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === "," && !quoted) {
      row.push(field);
      field = "";
    } else if ((character === "\n" || character === "\r") && !quoted) {
      if (character === "\r" && csv[index + 1] === "\n") index += 1;
      row.push(field);
      if (row.some((item) => item.length > 0)) rows.push(row);
      row = [];
      field = "";
    } else {
      field += character;
    }
  }

  row.push(field);
  if (row.some((item) => item.length > 0)) rows.push(row);
  return rows;
}

function csvValue(record: Map<string, string>, names: readonly string[]): string | undefined {
  for (const name of names) {
    const value = record.get(name);
    if (value) return value;
  }
  return undefined;
}

function parseLatestObservation(csv: string): { rate: string; rateDate: string } {
  const [headers, ...rows] = parseCsvRows(csv);
  if (!headers || rows.length === 0) throw new Error("ECB response has no observations");
  const populatedRows = rows.filter((row) => row.some((item) => item.length > 0));
  const lastRow = populatedRows.at(-1);
  if (!lastRow) throw new Error("ECB response has no observation row");
  const record = new Map(headers.map((header, index) => [header.trim(), lastRow[index]?.trim() ?? ""]));
  const rate = csvValue(record, ["OBS_VALUE", "OBS.VALUE"]);
  const rateDate = csvValue(record, ["TIME_PERIOD", "TIME.PERIOD"]);
  if (!rate || !rateDate || !/^\d{4}-\d{2}-\d{2}$/.test(rateDate)) {
    throw new Error("ECB response is missing rate fields");
  }
  parsePositiveDecimal(rate, "ECB rate");
  return { rate, rateDate };
}

function normalizeCurrency(currency: string): string {
  const normalized = currency.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(normalized)) throw new EcbRateUnavailableError(normalized || currency);
  return normalized;
}

function rateAgeDays(rateDate: string, now: Date): number {
  const rateTimestamp = Date.parse(`${rateDate}T00:00:00.000Z`);
  if (!Number.isFinite(rateTimestamp)) return Number.POSITIVE_INFINITY;
  return Math.floor((now.getTime() - rateTimestamp) / MILLISECONDS_PER_DAY);
}

export async function fetchLatestEcbReferenceRate(
  sourceCurrency: string,
  options: { fetchImpl?: typeof fetch; now?: Date } = {},
): Promise<EcbReferenceRateSnapshot> {
  const currency = normalizeCurrency(sourceCurrency);
  const now = options.now ?? new Date();
  const retrievedAt = now.toISOString();
  if (currency === "EUR") {
    return {
      provider: "ECB",
      series: "EUR/EUR",
      sourceCurrency: "EUR",
      targetCurrency: "EUR",
      rate: "1",
      rateDate: retrievedAt.slice(0, 10),
      retrievedAt,
    };
  }

  const series = `EXR.D.${currency}.EUR.SP00.A`;
  const url = `${ECB_DATA_API_BASE_URL}/D.${currency}.EUR.SP00.A?lastNObservations=1&format=csvdata&detail=dataonly`;
  try {
    const response = await (options.fetchImpl ?? fetch)(url, {
      headers: { accept: "text/csv" },
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new Error(`ECB request failed with status ${response.status}`);
    const { rate, rateDate } = parseLatestObservation(await response.text());
    const ageDays = rateAgeDays(rateDate, now);
    if (ageDays < 0 || ageDays > MAX_RATE_AGE_DAYS) throw new Error("ECB rate is stale");
    return {
      provider: "ECB",
      series,
      sourceCurrency: currency,
      targetCurrency: "EUR",
      rate,
      rateDate,
      retrievedAt,
    };
  } catch (error) {
    throw new EcbRateUnavailableError(currency, { cause: error });
  }
}

export function convertNetAmountToEur(
  sourceAmount: string | number,
  snapshot: EcbReferenceRateSnapshot,
): { eurCents: number; metadata: FxNormalizationMetadata } {
  const amount = parsePositiveDecimal(sourceAmount, "source amount");
  const rate = parsePositiveDecimal(snapshot.rate, "ECB rate");
  const numerator = amount.integer * powerOfTen(rate.scale) * BigInt(100);
  const denominator = powerOfTen(amount.scale) * rate.integer;
  const eurCents = divideHalfUp(numerator, denominator);
  if (eurCents > BigInt(Number.MAX_SAFE_INTEGER)) throw new RangeError("converted amount exceeds safe integer range");

  return {
    eurCents: Number(eurCents),
    metadata: {
      kind: "fx",
      provider: "ECB",
      series: snapshot.series,
      sourceAmount: amount.canonical,
      sourceCurrency: snapshot.sourceCurrency,
      targetCurrency: "EUR",
      rate: rate.canonical,
      rateDate: snapshot.rateDate,
      retrievedAt: snapshot.retrievedAt,
      rounding: "HALF_UP_2",
    },
  };
}
