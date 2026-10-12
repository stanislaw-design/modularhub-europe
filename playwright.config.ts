import { defineConfig, devices } from "@playwright/test";

// W pipeline (funkcja 3, CI/CD i środowiska) PLAYWRIGHT_BASE_URL celuje w URL
// wdrożonego środowiska staging zamiast lokalnego builda; wtedy nie ma sensu
// odpalać lokalnego `next dev`.
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";
// Ciasteczko obejścia ochrony wdrożeń Vercel dla stagingu, tworzone w e2e/global-setup.ts.
const useBypass = Boolean(process.env.PLAYWRIGHT_BASE_URL && process.env.VERCEL_AUTOMATION_BYPASS_SECRET);

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  globalSetup: "./e2e/global-setup.ts",
  use: {
    baseURL,
    ...(useBypass ? { storageState: "e2e/.auth/vercel-bypass.json" } : {}),
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command: "npm run dev",
        url: "http://localhost:3000",
        reuseExistingServer: true,
        timeout: 120_000,
      },
});
