import { ProducerProductList } from "@/components/producent/ProducerProductList";
import { getProducerIdForUser, getProductsForProducer } from "@/lib/db/queries";
import { requirePanelProducerSession } from "@/lib/panel-session";
import { getProductCompleteness } from "@/lib/producer-panel-summary";

// Katalog własny producenta (spec 0032 AC-3): produkty pobrane z tabeli
// product filtrowanej po producerId z sesji, nigdy po wartości z przeglądarki.
// Kompletność (spec 0074 AC-10) liczy jedno zapytanie dla wszystkich produktów,
// bez N+1; produkty z brakami idą na górę.
export default async function ProducerPanelProduktyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const selfHref = `/${locale}/producer/panel/products`;
  const session = await requirePanelProducerSession(locale, selfHref);

  const producerId = await getProducerIdForUser(session.user.id);
  const [products, completeness] = producerId
    ? await Promise.all([getProductsForProducer(producerId), getProductCompleteness(producerId)])
    : [[], []];
  const missingById = new Map(completeness.map((entry) => [entry.productId, entry.missing]));

  const items = products
    .map((productRow) => ({
      id: productRow.id,
      name: productRow.name ?? "",
      family: productRow.family,
      status: productRow.status,
      createdAt: productRow.createdAt,
      missing: missingById.get(productRow.id) ?? [],
    }))
    // Braki na górze, w obrębie grupy najnowsze pierwsze.
    .sort((a, b) => {
      const aMissing = a.missing.length > 0;
      const bMissing = b.missing.length > 0;
      if (aMissing !== bMissing) return aMissing ? -1 : 1;
      return b.createdAt.getTime() - a.createdAt.getTime();
    });

  return <ProducerProductList locale={locale} products={items} />;
}
