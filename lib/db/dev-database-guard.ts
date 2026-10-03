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
