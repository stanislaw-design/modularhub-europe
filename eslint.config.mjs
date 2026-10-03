import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// spec 0021 AC-5: no feature code talks to Sentry or PostHog directly, only through
// lib/observability/. The SDK init files themselves (root instrumentation*, sentry.*.config,
// next.config.ts) are the wrapper's own setup layer, not feature code, so they're exempt below.
const noDirectObservabilitySdkImports = {
  "no-restricted-imports": [
    "error",
    {
      paths: [
        {
          name: "@sentry/nextjs",
          message: "Import from lib/observability/ instead of the Sentry SDK directly.",
        },
        {
          name: "posthog-js",
          message: "Import from lib/observability/ instead of the PostHog SDK directly.",
        },
        {
          name: "posthog-node",
          message: "Import from lib/observability/ instead of the PostHog SDK directly.",
        },
      ],
    },
  ],
};

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: noDirectObservabilitySdkImports,
  },
  {
    files: [
      "lib/observability/**",
      "instrumentation.ts",
      "instrumentation-client.ts",
      "sentry.server.config.ts",
      "sentry.edge.config.ts",
      "next.config.ts",
    ],
    rules: {
      "no-restricted-imports": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Vendored agent skill packages (see AGENTS.md "Agent skills"): third
    // party template/reference code, not part of the app. Without this,
    // their own lint violations drown out real findings in this repo.
    ".agents/**",
    ".claude/**",
    // Scratch/scraping output, already gitignored but not excluded from lint.
    "tmp/**",
    "outputs/**",
  ]),
]);

export default eslintConfig;
