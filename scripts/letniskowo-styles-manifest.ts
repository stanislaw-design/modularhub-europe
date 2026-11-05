// Zapisuje tmp/letniskowo-styles/manifest.json z danych stylistyk, żeby skrypt Pythona (letniskowo-prepare-styles.py)
// użył tych samych slugów kafelków co import. Uruchomienie: npx tsx scripts/letniskowo-styles-manifest.ts
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { STYLES, tileSlug } from "./data/letniskowo-styles";

async function main(): Promise<void> {
  const out = path.join(process.cwd(), "tmp", "letniskowo-styles");
  await mkdir(out, { recursive: true });
  const manifest = STYLES.map((style) => ({
    key: style.key,
    boardFile: style.boardFile,
    vizPage: style.vizPage,
    rows: style.rows.map((row) => row.map(([name, code]) => tileSlug(name, code))),
  }));
  await writeFile(path.join(out, "manifest.json"), JSON.stringify(manifest, null, 2));
  console.log(`Manifest: ${manifest.length} stylistyk`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
