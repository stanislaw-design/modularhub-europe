import type { ObservabilityEnvironment } from "./types";

// Custom Environments (Vercel's "staging" target) require a Pro plan not yet purchased
// (spec 0019 Follow-up), so a staging deploy currently reports VERCEL_ENV=preview like any
// other preview deployment; treat "preview" as staging until Custom Environments is live.
export function resolveEnvironment(): ObservabilityEnvironment {
  const vercelEnv = process.env.VERCEL_ENV || process.env.NEXT_PUBLIC_VERCEL_ENV;
  if (vercelEnv === "production") return "production";
  if (vercelEnv === "preview") return "staging";
  return "development";
}
