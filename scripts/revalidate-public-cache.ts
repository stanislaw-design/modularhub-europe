// Spec 0078 AC-9: unieważnia cache danych publicznych po imporcie lub ręcznym SQL.
//   npm run revalidate                       (produkty i producenci, adres z REVALIDATE_BASE_URL)
//   npm run revalidate -- https://host products
// Wymaga REVALIDATE_SECRET w środowisku (.env.local). Bez niego kończy się błędem.

const [baseArg, ...tagArgs] = process.argv.slice(2);
const baseUrl = baseArg ?? process.env.REVALIDATE_BASE_URL ?? "http://localhost:3000";
const tags = tagArgs.length > 0 ? tagArgs : ["products", "producers"];
const secret = process.env.REVALIDATE_SECRET;

async function main() {
  if (!secret) {
    console.error("Brak REVALIDATE_SECRET w środowisku.");
    process.exit(1);
  }
  const response = await fetch(new URL("/api/revalidate", baseUrl), {
    method: "POST",
    headers: { authorization: `Bearer ${secret}`, "content-type": "application/json" },
    body: JSON.stringify({ tags }),
  });
  console.log(response.status, await response.text());
  if (!response.ok) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
