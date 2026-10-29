// Dopisuje producentów saun z pliku JSON do tmp/sauna-producers/producenci-saun.xlsx.
// Użycie: node .claude/skills/find-sauna-producers/upsert-xlsx.mjs <plik.json> [nazwa.xlsx]  (domyślnie producenci-saun.xlsx)
// JSON: tablica obiektów z kluczami = COLUMNS[].key. Deduplikacja po domenie (pole `strona`).
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const dir = path.join(root, "tmp", "sauna-producers");
const require = createRequire(path.join(dir, "package.json"));
const ExcelJS = require("exceljs");

const COLUMNS = [
  { key: "firma", header: "Firma", width: 28 },
  { key: "strona", header: "Strona", width: 32 },
  { key: "region", header: "Region / miasto", width: 20 },
  { key: "kontakt", header: "Kontakt", width: 30 },
  { key: "typy_saun", header: "Typy produktów", width: 30 },
  { key: "producent", header: "Producent? (tak/nie/niepewne)", width: 16 },
  { key: "skala", header: "Skala produkcji", width: 28 },
  { key: "ocena", header: "Ocena 0-100", width: 11 },
  { key: "ocena_50", header: "50 szt.", width: 9 },
  { key: "ocena_100", header: "100 szt.", width: 9 },
  { key: "ocena_200", header: "200 szt.", width: 9 },
  { key: "uzasadnienie", header: "Uzasadnienie", width: 60 },
  { key: "ryzyka", header: "Ryzyka / braki danych", width: 40 },
  { key: "zrodlo", header: "Źródło (zapytanie / katalog)", width: 28 },
  { key: "data", header: "Data dodania", width: 13 },
  { key: "status", header: "Status kontaktu", width: 16 },
];

const domain = (u) => {
  try {
    return new URL(/^https?:/.test(u) ? u : `https://${u}`).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return String(u ?? "").toLowerCase();
  }
};

const input = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
const file = path.join(dir, process.argv[3] ?? "producenci-saun.xlsx");
const wb = new ExcelJS.Workbook();
if (fs.existsSync(file)) await wb.xlsx.readFile(file);
const ws = wb.getWorksheet("Producenci") ?? wb.addWorksheet("Producenci", { views: [{ state: "frozen", ySplit: 1 }] });
ws.columns = COLUMNS;
ws.getRow(1).font = { bold: true };
ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: COLUMNS.length } };

const seen = new Set();
ws.eachRow((r, i) => { if (i > 1) seen.add(domain(r.getCell(2).value)); });

const today = new Date().toISOString().slice(0, 10);
let added = 0, skipped = 0;
for (const p of input) {
  const d = domain(p.strona);
  if (!d || seen.has(d)) { skipped++; continue; }
  seen.add(d);
  ws.addRow({ status: "nowy", data: today, ...p }).alignment = { vertical: "top", wrapText: true };
  added++;
}
await wb.xlsx.writeFile(file);
console.log(JSON.stringify({ file, added, skipped, total: ws.rowCount - 1 }));
