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
    exclude: ["node_modules/**", "e2e/**"],
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
