import { readFileSync } from "node:fs";
import { Pool } from "@neondatabase/serverless";

// Uruchamia pliki SQL po kolei na bazie z zmiennej SQL_TARGET_URL, każdy plik w jednej transakcji
// (błąd w pliku cofa cały plik i zatrzymuje kolejne). Używane do ręcznych plików drizzle/_promote_*.
// Adres bazy celowo NIE jest brany z .env.local, żeby nie pomylić dev z prod.
async function main() {
  const url = process.env.SQL_TARGET_URL;
  const files = process.argv.slice(2);
  if (!url || files.length === 0) {
    console.error("Użycie: SQL_TARGET_URL=<adres bazy> npx tsx scripts/run-sql-file.ts plik1.sql plik2.sql ...");
    process.exit(1);
  }
  console.log(`Baza: ${new URL(url).host}`);
  const pool = new Pool({ connectionString: url });
  try {
    for (const file of files) {
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await client.query(readFileSync(file, "utf8"));
        await client.query("COMMIT");
        console.log(`OK    ${file}`);
      } catch (error) {
        await client.query("ROLLBACK").catch(() => undefined);
        console.error(`BŁĄD  ${file}: ${error instanceof Error ? error.message : String(error)}`);
        process.exitCode = 1;
        return;
      } finally {
        client.release();
      }
    }
  } finally {
    await pool.end();
  }
}

main();
