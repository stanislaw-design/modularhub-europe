import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";
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

// jsdom has no ResizeObserver; Headless UI's Listbox (components/ui/Select) reads it
// on open/close, so any test that interacts with a Select throws without this stub.
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver;

afterEach(() => {
  cleanup();
});
