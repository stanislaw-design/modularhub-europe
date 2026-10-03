import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    // .agents/.claude: vendored agent skill packages ship their own test
    // fixtures (e.g. bun:test imports Vitest can't bundle); tmp/outputs:
    // gitignored scratch/scraping output that can contain stray
    // node_modules. None of it belongs to this app's test run.
    exclude: ["node_modules/**", "e2e/**", ".agents/**", ".claude/**", "tmp/**", "outputs/**"],
    // next-intl's ESM build re-exports bare, extensionless `next/navigation`
    // imports; Vitest externalizes node_modules to Node's own ESM loader by
    // default, which (unlike Vite's resolver) does not auto-resolve missing
    // extensions and fails to find the module. Inlining next-intl routes it
    // through Vite's resolver instead, where extensionless resolution works.
    server: {
      deps: {
        inline: [/next-intl/],
      },
    },
    // Kreator producenta ma teraz siedem kroków (spec 0016); pełne przejście przez
    // wszystkie w jednym teście bywa wolniejsze niż domyślne 5s pod obciążeniem
    // równoległego uruchomienia całego zestawu.
    testTimeout: 10000,
  },
});
