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
    // Kreator producenta ma teraz siedem kroków (spec 0016); pełne przejście przez
    // wszystkie w jednym teście bywa wolniejsze niż domyślne 5s pod obciążeniem
    // równoległego uruchomienia całego zestawu.
    testTimeout: 10000,
  },
});
