import { Pool } from "@neondatabase/serverless";
import { readMigrationFiles } from "drizzle-orm/migrator";

// Zamiennik `drizzle-kit migrate`, który wykonuje WSZYSTKIE zaległe migracje w jednej
// transakcji. Postgres nie pozwala użyć nowej wartości enumu w transakcji, która ją
// dodała, więc świeża baza padała na migracjach typu 0028 (ALTER TYPE ... ADD VALUE
// i indeks z tą wartością w jednym pliku), patrz lib/db/AGENTS.md.
//
// Ten skrypt dla każdej zaległej migracji (w kolejności z _journal.json):
//   1. wykonuje jej instrukcje `ALTER TYPE ... ADD VALUE` poza transakcją (z IF NOT EXISTS,
//      więc baza, w której wartość dodano ręcznie, ich nie powtarza),
//   2. resztę pliku wykonuje w jednej transakcji razem z wpisem do drizzle.__drizzle_migrations.
// Format tabeli i wybór zaległych migracji (created_at większe niż ostatni wpis) jest
// taki sam jak w drizzle-orm, więc db:generate, db:studio i drizzle-kit dalej działają.

const ADD_VALUE = /^\s*ALTER\s+TYPE\s[\s\S]+?\sADD\s+VALUE\s/i;

function ifNotExists(statement: string): string {
  return /ADD\s+VALUE\s+IF\s+NOT\s+EXISTS/i.test(statement)
    ? statement
    : statement.replace(/ADD\s+VALUE\s+/i, "ADD VALUE IF NOT EXISTS ");
}

async function main() {
  const connectionString = process.env.DATABASE_URL_UNPOOLED;
  if (!connectionString) throw new Error("DATABASE_URL_UNPOOLED is not set.");

  const migrations = readMigrationFiles({ migrationsFolder: "./drizzle" });
  const pool = new Pool({ connectionString });

  try {
    await pool.query(`CREATE SCHEMA IF NOT EXISTS "drizzle"`);
    await pool.query(
      `CREATE TABLE IF NOT EXISTS "drizzle"."__drizzle_migrations" (id SERIAL PRIMARY KEY, hash text NOT NULL, created_at bigint)`,
    );
    const { rows } = await pool.query<{ created_at: string }>(
      `select created_at from "drizzle"."__drizzle_migrations" order by created_at desc limit 1`,
    );
    const lastApplied = rows[0] ? Number(rows[0].created_at) : null;
    const pending = migrations.filter((migration) => lastApplied === null || lastApplied < migration.folderMillis);

    for (const migration of pending) {
      const enumStatements = migration.sql.filter((statement) => ADD_VALUE.test(statement));
      const rest = migration.sql.filter((statement) => !ADD_VALUE.test(statement));

      for (const statement of enumStatements) await pool.query(ifNotExists(statement));

      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        for (const statement of rest) await client.query(statement);
        await client.query(`insert into "drizzle"."__drizzle_migrations" ("hash", "created_at") values ($1, $2)`, [
          migration.hash,
          migration.folderMillis,
        ]);
        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK").catch(() => undefined);
        console.error(`Migration failed (folderMillis ${migration.folderMillis}):`, error);
        throw error;
      } finally {
        client.release();
      }
      console.log(`applied ${migration.folderMillis} (${enumStatements.length} enum value(s) outside the transaction)`);
    }
    console.log(pending.length === 0 ? "No pending migrations." : `Applied ${pending.length} migration(s).`);
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
