import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";
import "@testing-library/jest-dom/vitest";

// Vite skips .env.local in test mode by design; lib/db/*.test.ts that hit the
// real dev database (spec 0018, AC-5) need DATABASE_URL/DATABASE_URL_UNPOOLED
// from it anyway, so load it here without a dotenv dependency.
function loadEnvLocal(): void {
  const envPath = path.resolve(__dirname, ".env.local");
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, "utf-8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim();
    if (process.env[key] === undefined) process.env[key] = value;
  }
}
loadEnvLocal();

// Integration tests under lib/**/*.test.ts write real rows straight through
// lib/db/client.ts whenever DATABASE_URL is set (spec 0018 AC-5); they must
// never do that against anything but the dev database. Checked once per test
// file, before any test body runs, so a misconfigured .env.local (pointing at
// production or any other project) fails loudly here instead of silently
// writing fixtures for real — see lib/db/dev-database-guard.ts for why this
// checks the Neon project id rather than the connection string.
if (process.env.DATABASE_URL) {
  const { assertDevDatabase } = await import("./lib/db/dev-database-guard");
  await assertDevDatabase();
}

// jsdom has no ResizeObserver; Headless UI's Listbox (components/ui/Select) reads it
// on open/close, so any test that interacts with a Select throws without this stub.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver;

// jsdom has no IntersectionObserver; ProjectStickyPriceBar (spec 0059
// follow-up, 2026-10-02) reads it to show the desktop floating CTA once the
// price card scrolls out of view. Never fires (no real layout/scrolling in
// jsdom), so affected tests only assert the always-visible content, not the
// observer-driven floating bar itself.
class IntersectionObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return [];
  }
}
globalThis.IntersectionObserver ??= IntersectionObserverStub as unknown as typeof IntersectionObserver;

// jsdom has no matchMedia; ThemeProvider (components/ui, spec 0043) reads it
// to detect the system color scheme preference when no theme cookie is set.
// Defaults to "no dark preference" — tests assert against light-mode markup.
window.matchMedia ??= ((query: string) => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: () => {},
  removeListener: () => {},
  addEventListener: () => {},
  removeEventListener: () => {},
  dispatchEvent: () => false,
})) as unknown as typeof window.matchMedia;

afterEach(() => {
  cleanup();
});

// next-intl needs a request context (NextIntlClientProvider for the client hook,
// the "react-server" resolve condition for the server functions) that plain
// Vitest + jsdom never provides — `useTranslations` throws "no context found"
// and `next-intl/server`'s exports resolve to stubs that throw "not supported
// in Client Components" the moment they're called. Rather than wrap every
// render() call in a provider (and reimplement getTranslations' server-only
// resolution) across every test file, mock both entry points here so t(key)
// resolves the SAME strings production would render for the "pl" locale,
// straight out of messages/pl.json — existing tests assert Polish text and
// keep passing unchanged, no per-file provider boilerplate needed.
function loadPlMessages(): Record<string, unknown> {
  const file = path.resolve(__dirname, "messages/pl.json");
  return JSON.parse(readFileSync(file, "utf-8")) as Record<string, unknown>;
}

function getNested(source: unknown, key: string): unknown {
  return key
    .split(".")
    .reduce<unknown>(
      (acc, part) => (acc && typeof acc === "object" && part in acc ? (acc as Record<string, unknown>)[part] : undefined),
      source
    );
}

function interpolate(template: string, values?: Record<string, unknown>): string {
  if (!values) return template;
  return template.replace(/\{(\w+)\}/g, (match, name) => (name in values ? String(values[name]) : match));
}

function createTestTranslator(namespace?: string) {
  const scope = namespace ? getNested(loadPlMessages(), namespace) : loadPlMessages();
  function t(key: string, values?: Record<string, unknown>): string {
    const raw = getNested(scope, key);
    if (typeof raw !== "string") {
      throw new Error(`vitest.setup next-intl mock: no string at "${namespace ? `${namespace}.` : ""}${key}" in messages/pl.json`);
    }
    return interpolate(raw, values);
  }
  t.rich = (key: string) => t(key);
  t.markup = (key: string) => t(key);
  t.raw = (key: string) => getNested(scope, key);
  t.has = (key: string) => getNested(scope, key) !== undefined;
  return t;
}

vi.mock("next-intl", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next-intl")>();
  return {
    ...actual,
    useLocale: () => "pl",
    useTranslations: (namespace?: string) => createTestTranslator(namespace),
  };
});

vi.mock("next-intl/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next-intl/server")>();
  return {
    ...actual,
    getTranslations: async (namespaceOrOptions?: string | { namespace?: string }) =>
      createTestTranslator(typeof namespaceOrOptions === "string" ? namespaceOrOptions : namespaceOrOptions?.namespace),
  };
});
