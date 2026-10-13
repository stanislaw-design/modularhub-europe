import { sql } from "drizzle-orm";
import { db } from "./client";

// Neon project "modularhub-dev" (lib/db/AGENTS.md): the only database
// integration tests (spec 0018 AC-5) may ever write to. Identified via the
// `neon.project_id` GUC Neon exposes on every connection, not by parsing the
// connection string's hostname — the GUC survives the branch/endpoint being
// recreated, a hostname wouldn't. This guards against a developer's
// `.env.local` accidentally pointing DATABASE_URL at the production project
// ("modularhub") or anywhere else: without it, test fixtures (e.g. the
// "Create Order Product" / "Case Field Product" rows from
// lib/cases/create.test.ts and lib/cases/cards.test.ts) would get written for
// real, including into the published catalog.
const DEV_PROJECT_ID = "bold-tree-78265613";

export async function assertDevDatabase(): Promise<void> {
  const result = await db.execute<{ project_id: string | null }>(
    sql`select current_setting('neon.project_id', true) as project_id`,
  );
  const projectId = result.rows[0]?.project_id;
  if (projectId !== DEV_PROJECT_ID) {
    throw new Error(
      `Refusing to run DB integration tests: DATABASE_URL points at Neon project "${projectId ?? "unknown"}", ` +
        `not the dev project "modularhub-dev" (${DEV_PROJECT_ID}). Check .env.local.`,
    );
  }
}

// Gałąź `staging` w projekcie produkcyjnym "modularhub" (spec 0019): baza, na którą
// wdrożona jest aplikacja stagingu. Testy e2e z deploy-production.yml uderzają w
// żywą aplikację stagingu i zakładają dane testowe w TEJ SAMEJ bazie, więc potrzebują
// własnego strażnika. Rozpoznawana po `neon.branch_id` (projekt prod ma też gałąź
// `production`, której ten strażnik nigdy nie przepuści) i dodatkowo po projekcie.
// Strażnik testów Vitest (assertDevDatabase wyżej) pozostaje bez zmian.
const PROD_PROJECT_ID = "spring-rain-58383710";
const STAGING_BRANCH_ID = "br-dawn-tree-b1n3f9lb";

export async function assertDevOrStagingDatabase(): Promise<void> {
  const result = await db.execute<{ project_id: string | null; branch_id: string | null }>(
    sql`select current_setting('neon.project_id', true) as project_id, current_setting('neon.branch_id', true) as branch_id`,
  );
  const { project_id: projectId, branch_id: branchId } = result.rows[0] ?? { project_id: null, branch_id: null };
  const isDev = projectId === DEV_PROJECT_ID;
  const isStaging = projectId === PROD_PROJECT_ID && branchId === STAGING_BRANCH_ID;
  if (!isDev && !isStaging) {
    throw new Error(
      `Refusing to run e2e fixtures: DATABASE_URL points at Neon project "${projectId ?? "unknown"}" branch "${branchId ?? "unknown"}", ` +
        `not the dev project (${DEV_PROJECT_ID}) or the staging branch (${STAGING_BRANCH_ID}). Check DATABASE_URL.`,
    );
  }
}
