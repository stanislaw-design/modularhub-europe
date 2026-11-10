import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { describe, expect, it } from "vitest";
import { MARKET_COUNTRY_CODES } from "./countries";

// Spec 0082 AC-1, AC-14: lista krajów rynku żyje tylko w lib/countries.ts. Test szuka w kodzie
// aplikacji (bez plików testowych i fikstur) tablic z co najmniej trzema kodami krajów rynku
// oraz map o tylu kluczach, które nie są typowane jako Record<..., ...> (te pilnuje tsc).
// Dane per producent w fiksturach (`deliveryCountries: ["PL", "DE"]`) nie są listą rynku.

const ROOT = join(__dirname, "..");
const SCAN_DIRS = ["app", "components", "lib", "scripts"];
const SKIP_DIRS = new Set(["node_modules", ".next", "fixtures"]);
const ALLOWED = new Set([join("lib", "countries.ts")]);
const CODES = MARKET_COUNTRY_CODES.join("|");
const MIN_CODES = 3;

function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...sourceFiles(full));
    } else if (/\.(ts|tsx|mjs)$/.test(entry) && !/\.(test|spec)\.(ts|tsx)$/.test(entry)) {
      out.push(full);
    }
  }
  return out;
}

function findArrays(text: string): number[] {
  const hits: number[] = [];
  const arrayPattern = /\[([^\[\]]*)\]/g;
  const codePattern = new RegExp(`["'](${CODES})["']`, "g");
  for (const match of text.matchAll(arrayPattern)) {
    const codes = new Set([...match[1].matchAll(codePattern)].map((m) => m[1]));
    if (codes.size >= MIN_CODES) hits.push(match.index ?? 0);
  }
  return hits;
}

function findMaps(text: string): number[] {
  const hits: number[] = [];
  const objectPattern = /\{([^{}]*)\}/g;
  const keyPattern = new RegExp(String.raw`(?:^|[\s,])["']?(${CODES})["']?\s*:`, "g");
  for (const match of text.matchAll(objectPattern)) {
    const keys = new Set([...match[1].matchAll(keyPattern)].map((m) => m[1]));
    if (keys.size < MIN_CODES) continue;
    const start = match.index ?? 0;
    const before = text.slice(Math.max(0, start - 200), start);
    // Mapa typowana jako Record<CountryCode, ...> jest wyczerpująca dzięki tsc (AC-2).
    if (/Record<[^>]*>\s*=\s*$/.test(before)) continue;
    hits.push(start);
  }
  return hits;
}

describe("country list has a single source (spec 0082 AC-1, AC-14)", () => {
  it("keeps the six market countries in lib/countries.ts", () => {
    expect([...MARKET_COUNTRY_CODES]).toEqual(["PL", "DE", "NL", "BE", "IT", "FR"]);
  });

  it("finds no separate list or map of market country codes in app code", () => {
    const offenders: string[] = [];
    for (const dir of SCAN_DIRS) {
      for (const file of sourceFiles(join(ROOT, dir))) {
        const rel = relative(ROOT, file);
        if (ALLOWED.has(rel.split(sep).join(sep))) continue;
        const text = readFileSync(file, "utf8");
        for (const index of [...findArrays(text), ...findMaps(text)]) {
          const line = text.slice(0, index).split("\n").length;
          offenders.push(`${rel.split(sep).join("/")}:${line}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it("catches an array and an untyped map of market codes (the guard itself works)", () => {
    expect(findArrays('const a = ["PL", "DE", "FR"];').length).toBe(1);
    expect(findArrays('deliveryCountries: ["PL", "DE"]').length).toBe(0);
    expect(findMaps("const m = { PL: 1, DE: 2, NL: 3 };").length).toBe(1);
    expect(findMaps("const m: Record<CountryCode, number> = { PL: 1, DE: 2, NL: 3 };").length).toBe(0);
  });
});
