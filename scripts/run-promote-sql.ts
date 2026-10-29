// Uruchamia pliki SQL z folderu drizzle/_promote_*/ po kolei (00-*, 01-*, ...) na wskazanej bazie, zamiast wklejać je
// ręcznie do Neon SQL Editor. Każdy plik ma własne BEGIN/COMMIT, więc błąd w pliku wycofuje tylko ten plik, a skrypt
// się zatrzymuje.
//
// Użycie (adres PROD podajesz tylko w tej jednej komendzie, nie zapisujesz go w .env.local):
//   PowerShell: $env:TARGET_DATABASE_URL = "postgresql://..."; npx tsx scripts/run-promote-sql.ts drizzle/_promote_wencel_to_prod --yes
//   bash:       TARGET_DATABASE_URL="postgresql://..." npx tsx scripts/run-promote-sql.ts drizzle/_promote_wencel_to_prod --yes
// Bez --yes tylko pokazuje, na jaką bazę i jakie pliki by poszły. Baza dev jest odrzucana (próba na dev: --allow-dev).
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";

neonConfig.webSocketConstructor = ws;

const DEV_PROJECT_ID = "bold-tree-78265613";

async function main(): Promise<void> {
  const folder = process.argv[2];
  const confirmed = process.argv.includes("--yes");
  const allowDev = process.argv.includes("--allow-dev");
  const url = process.env.TARGET_DATABASE_URL;
  if (!folder || !url) throw new Error("Podaj folder jako pierwszy argument i adres bazy w TARGET_DATABASE_URL.");

  const files = readdirSync(folder)
    .filter((file) => /^\d\d-.*\.sql$/.test(file))
    .sort();
  if (files.length === 0) throw new Error(`Brak plików NN-*.sql w ${folder}`);

  const pool = new Pool({ connectionString: url });
  try {
    const info = await pool.query(`select current_setting('neon.project_id', true) as project_id, current_database() as db`);
    const projectId = info.rows[0].project_id as string | null;
    console.log(`Baza: projekt Neon "${projectId ?? "nieznany"}", baza "${info.rows[0].db}".`);
    console.log(`Pliki: ${files.join(", ")}`);
    if (projectId === DEV_PROJECT_ID && !allowDev) throw new Error("To baza dev. Dla produkcji podaj adres PROD (dev tylko z --allow-dev).");
    if (!confirmed) {
      console.log("Tryb podglądu: nic nie uruchomiono. Dodaj --yes, żeby wykonać pliki.");
      return;
    }

    for (const file of files) {
      const text = readFileSync(path.join(folder, file), "utf8");
      try {
        // Zapytanie bez parametrów idzie prostym protokołem, więc plik z wieloma instrukcjami wykonuje się w całości.
        await pool.query(text);
        console.log(`OK   ${file}`);
      } catch (error) {
        // Plik z BEGIN... przy błędzie zostawia transakcję otwartą na połączeniu, a to połączenie i tak zamykamy.
        console.error(`BŁĄD ${file}: ${error instanceof Error ? error.message : String(error)}`);
        process.exitCode = 1;
        return;
      }
    }
    console.log("Wszystkie pliki wykonane.");
  } finally {
    await pool.end();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
