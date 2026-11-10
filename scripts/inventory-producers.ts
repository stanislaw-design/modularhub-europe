import { mkdirSync, writeFileSync } from "node:fs";
import { Pool } from "@neondatabase/serverless";

// Inwentaryzacja producentów i ich produktów, TYLKO ODCZYT (transakcja READ ONLY, same SELECT-y).
// Adres bazy z SQL_TARGET_URL, celowo nie z .env.local (ten sam wzorzec co run-sql-file.ts),
// żeby nie pomylić dev z prod. Wynik: podsumowanie w konsoli + CSV w tmp/inventory/.
//
// Użycie: SQL_TARGET_URL=<adres bazy> npx tsx scripts/inventory-producers.ts

type Row = Record<string, unknown>;

const CONTACT_RE = String.raw`(@|https?://|www\.|\+?[0-9][0-9 \-]{7,}[0-9])`;

const PRODUCERS_SQL = `
SELECT
  pr.id::text                         AS producer_id,
  pr.name                             AS producer,
  pr.nip,
  pr.country_code                     AS country,
  pr.verification_status::text        AS verification,
  u.email,
  u.role::text                        AS role,
  (u."emailVerified" IS NOT NULL)     AS logged_in_ever,
  (u.blocked_at IS NOT NULL)          AS blocked,
  (u.deleted_at IS NOT NULL)          AS user_deleted,
  (SELECT count(*)::int FROM producer_member m WHERE m.producer_id = pr.id) AS members,
  coalesce(length(btrim(pr.description)), 0)::int AS description_len,
  (pr.description ~* $1)              AS description_has_contact,
  (pr.technology IS NULL)             AS no_technology,
  (SELECT count(*)::int FROM producer_translation t
     WHERE t.producer_id = pr.id AND coalesce(btrim(t.description), '') <> '') AS description_translations,
  (SELECT count(*)::int FROM producer_certification c WHERE c.producer_id = pr.id) AS certifications,
  (SELECT count(*)::int FROM producer_delivery_country d WHERE d.producer_id = pr.id) AS delivery_countries,
  (SELECT count(*)::int FROM product p WHERE p.producer_id = pr.id AND p.deleted_at IS NULL) AS products,
  (SELECT count(*)::int FROM product p WHERE p.producer_id = pr.id AND p.deleted_at IS NULL AND p.status = 'published') AS published,
  (SELECT count(*)::int FROM document d WHERE d.producer_id = pr.id AND d.deleted_at IS NULL) AS producer_documents
FROM producer pr
JOIN users u ON u.id = pr.user_id
WHERE pr.deleted_at IS NULL
ORDER BY pr.name`;

const PRODUCTS_SQL = `
SELECT
  p.id::text                          AS product_id,
  pr.name                             AS producer,
  p.name                              AS product,
  p.slug,
  p.family::text                      AS family,
  p.status::text                      AS status,
  p.price_min_cents                   AS price_min_cents,
  p.currency,
  (SELECT count(*)::int FROM product_variant v WHERE v.product_id = p.id AND v.deleted_at IS NULL) AS variants,
  (SELECT count(*)::int FROM product_variant v WHERE v.product_id = p.id AND v.deleted_at IS NULL AND v.is_default) AS default_variants,
  (SELECT count(*)::int FROM product_variant v WHERE v.product_id = p.id AND v.deleted_at IS NULL
      AND v.price_min_cents IS NULL AND NOT v.price_on_request) AS variants_without_price,
  (SELECT count(*)::int FROM product_variant v WHERE v.product_id = p.id AND v.deleted_at IS NULL AND v.price_on_request) AS variants_on_request,
  p.floor_area_m2,
  coalesce(length(btrim(p.description)), 0)::int AS description_len,
  (p.technical_specs IS NULL OR p.technical_specs::text IN ('{}', 'null')) AS no_specs,
  (SELECT count(*)::int FROM document d WHERE d.product_id = p.id AND d.purpose = 'product_photo' AND d.deleted_at IS NULL) AS photos,
  (SELECT count(*)::int FROM document d WHERE d.product_id = p.id AND d.purpose = 'product_photo' AND d.deleted_at IS NULL AND d.is_cover) AS covers,
  (p.cover_image_url IS NOT NULL)     AS legacy_cover_url,
  (SELECT count(*)::int FROM product_option_group_assignment a WHERE a.product_id = p.id) AS option_groups,
  EXISTS (SELECT 1 FROM product_translation t WHERE t.product_id = p.id AND t.locale = 'en'
            AND coalesce(btrim(t.name), '') <> '' AND coalesce(btrim(t.description), '') <> '') AS tr_en,
  EXISTS (SELECT 1 FROM product_translation t WHERE t.product_id = p.id AND t.locale = 'de'
            AND coalesce(btrim(t.name), '') <> '' AND coalesce(btrim(t.description), '') <> '') AS tr_de,
  EXISTS (SELECT 1 FROM product_translation t WHERE t.product_id = p.id AND t.locale = 'nl'
            AND coalesce(btrim(t.name), '') <> '' AND coalesce(btrim(t.description), '') <> '') AS tr_nl
FROM product p
JOIN producer pr ON pr.id = p.producer_id
WHERE p.deleted_at IS NULL AND pr.deleted_at IS NULL
ORDER BY pr.name, p.family, p.name`;

function csv(rows: Row[]): string {
  if (rows.length === 0) return "";
  const cols = Object.keys(rows[0]);
  const esc = (v: unknown) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [cols.join(","), ...rows.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\n");
}

function producerIssues(r: Row): string[] {
  const out: string[] = [];
  if (r.role !== "producer") out.push(`rola=${r.role}`);
  if (r.user_deleted) out.push("konto usunięte");
  if (r.blocked) out.push("konto zablokowane");
  if (!r.logged_in_ever) out.push("nigdy się nie logował");
  if (r.verification !== "approved") out.push(`weryfikacja=${r.verification}`);
  if (Number(r.members) === 0) out.push("brak wiersza producer_member");
  if (Number(r.description_len) === 0) out.push("brak opisu");
  if (r.description_has_contact) out.push("opis zawiera kontakt (mail/telefon/www)");
  if (Number(r.description_len) > 0 && Number(r.description_translations) < 3) {
    out.push(`opis przetłumaczony na ${r.description_translations}/3 języki`);
  }
  if (Number(r.certifications) === 0) out.push("brak certyfikatów");
  if (Number(r.delivery_countries) === 0) out.push("brak krajów dostawy");
  if (Number(r.products) === 0) out.push("brak produktów");
  return out;
}

function productIssues(r: Row): string[] {
  const out: string[] = [];
  const published = r.status === "published";
  if (!r.product) out.push("brak nazwy");
  if (published && (r.price_min_cents === null || Number(r.price_min_cents) <= 0)) {
    out.push(Number(r.variants_on_request) > 0 ? "cena na zapytanie (brak ceny bazowej)" : "brak ceny bazowej");
  }
  if (Number(r.variants) === 0) out.push("brak wariantu");
  else if (Number(r.default_variants) !== 1) out.push(`wariantów domyślnych: ${r.default_variants}`);
  if (Number(r.variants_without_price) > 0) out.push(`${r.variants_without_price} wariant(y) bez ceny`);
  if (Number(r.description_len) === 0) out.push("brak opisu");
  if (r.no_specs) out.push("brak technicalSpecs");
  if (r.family === "dom" && !r.floor_area_m2) out.push("brak metrażu");
  if (Number(r.photos) === 0) out.push(r.legacy_cover_url ? "brak zdjęć w document (tylko stary cover URL)" : "brak zdjęć");
  else if (Number(r.covers) !== 1) out.push(`okładek: ${r.covers}`);
  const missing = (["en", "de", "nl"] as const).filter((l) => !r[`tr_${l}`]);
  if (missing.length) out.push(`brak tłumaczenia: ${missing.join("/")}`);
  return out;
}

async function main() {
  const url = process.env.SQL_TARGET_URL;
  if (!url) {
    console.error("Użycie: SQL_TARGET_URL=<adres bazy> npx tsx scripts/inventory-producers.ts");
    process.exit(1);
  }
  console.log(`Baza: ${new URL(url).host}\n`);

  const pool = new Pool({ connectionString: url });
  const client = await pool.connect();
  let producers: Row[] = [];
  let products: Row[] = [];
  try {
    await client.query("BEGIN READ ONLY");
    producers = (await client.query(PRODUCERS_SQL, [CONTACT_RE])).rows;
    products = (await client.query(PRODUCTS_SQL)).rows;
    await client.query("ROLLBACK");
  } finally {
    client.release();
    await pool.end();
  }

  const dir = "tmp/inventory";
  mkdirSync(dir, { recursive: true });
  const producerOut: Row[] = producers.map((r) => ({ ...r, issues: producerIssues(r).join(" | ") }));
  const productOut: Row[] = products.map((r) => ({ ...r, issues: productIssues(r).join(" | ") }));
  writeFileSync(`${dir}/producers.csv`, "﻿" + csv(producerOut));
  writeFileSync(`${dir}/products.csv`, "﻿" + csv(productOut));

  const byProducer = new Map<string, Row[]>();
  for (const p of productOut) {
    const key = String(p.producer);
    byProducer.set(key, [...(byProducer.get(key) ?? []), p]);
  }

  for (const pr of producerOut) {
    const list = byProducer.get(String(pr.producer)) ?? [];
    const published = list.filter((p) => p.status === "published");
    const complete = published.filter((p) => !p.issues).length;
    console.log(`=== ${pr.producer} (${pr.country}, ${pr.email})`);
    console.log(`    produkty: ${list.length} (opublikowane ${published.length}, kompletne ${complete})`);
    console.log(`    konto/profil: ${pr.issues || "OK"}`);
    const withIssues = list.filter((p) => p.issues);
    for (const p of withIssues.slice(0, 40)) {
      console.log(`      - [${p.status}] ${p.product ?? "(bez nazwy)"}: ${p.issues}`);
    }
    if (withIssues.length > 40) console.log(`      ... i ${withIssues.length - 40} kolejnych (patrz CSV)`);
    console.log();
  }

  const pub = productOut.filter((p) => p.status === "published");
  console.log("--- RAZEM ---");
  console.log(`producenci: ${producerOut.length}, bez uwag: ${producerOut.filter((p) => !p.issues).length}`);
  console.log(`produkty: ${productOut.length}, opublikowane: ${pub.length}, opublikowane kompletne: ${pub.filter((p) => !p.issues).length}`);
  console.log(`CSV: ${dir}/producers.csv, ${dir}/products.csv`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
