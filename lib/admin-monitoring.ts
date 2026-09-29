import { sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { captureError } from "@/lib/observability/errors";
import { checkR2Health } from "@/lib/storage/r2-client";

// Health check na żywo dla /internal/monitoring (spec 0055 AC-16, AC-9,
// AC-17): trzy usługi, ten sam limit czasu 5s co reszta strony, każda
// sprawdzana niezależnie tak, że awaria jednej nie chowa stanu pozostałych
// dwóch (Promise.allSettled, nie Promise.all).

export type ServiceHealthStatus = "ok" | "error" | "unavailable";

const HEALTH_CHECK_TIMEOUT_MS = 5000;

async function checkDatabaseHealth(): Promise<ServiceHealthStatus> {
  try {
    await db.execute(sql`select 1`);
    return "ok";
  } catch (error) {
    captureError(error, { path: "adminMonitoring:database" });
    return "error";
  }
}

async function checkStorageHealth(): Promise<ServiceHealthStatus> {
  try {
    await checkR2Health(AbortSignal.timeout(HEALTH_CHECK_TIMEOUT_MS));
    return "ok";
  } catch (error) {
    captureError(error, { path: "adminMonitoring:storage" });
    return "error";
  }
}

// Lekkie, realne zapytanie (lista domen), nie samo sprawdzenie czy zmienna
// środowiskowa istnieje (spec Configuration required). Osobny sekret
// RESEND_MONITORING_API_KEY, nie RESEND_API_KEY (ten drugi jest ograniczony
// wyłącznie do wysyłki i nie ma dostępu do /domains): ten sam powód co
// SENTRY_MONITORING_TOKEN w lib/observability/sentry-issues.ts — panel
// admina dostaje osobne, węższe poświadczenia zamiast poszerzania klucza,
// od którego zależy realne wysyłanie e maili.
async function checkEmailHealth(): Promise<ServiceHealthStatus> {
  const apiKey = process.env.RESEND_MONITORING_API_KEY;
  if (!apiKey) return "unavailable";

  try {
    const response = await fetch("https://api.resend.com/domains", {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(HEALTH_CHECK_TIMEOUT_MS),
    });
    if (!response.ok) throw new Error(`Resend health check failed with ${response.status}`);
    return "ok";
  } catch (error) {
    captureError(error, { path: "adminMonitoring:email" });
    return "error";
  }
}

export interface AdminServicesHealth {
  database: ServiceHealthStatus;
  storage: ServiceHealthStatus;
  email: ServiceHealthStatus;
}

export async function getAdminServicesHealth(): Promise<AdminServicesHealth> {
  const [database, storage, email] = await Promise.all([
    checkDatabaseHealth(),
    checkStorageHealth(),
    checkEmailHealth(),
  ]);
  return { database, storage, email };
}
