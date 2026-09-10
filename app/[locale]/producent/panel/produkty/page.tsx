import { ProducerProductList } from "@/components/producent/ProducerProductList";
import { getProducerIdForUser, getProductsForProducer } from "@/lib/db/queries";
import { requirePanelProducerSession } from "@/lib/panel-session";

// Katalog własny producenta (spec 0032 AC-3): produkty pobrane z tabeli
// product filtrowanej po producerId z sesji, nigdy po wartości z przeglądarki.
export default async function ProducerPanelProduktyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const selfHref = `/${locale}/producent/panel/produkty`;
  const session = await requirePanelProducerSession(locale, selfHref);

  const producerId = await getProducerIdForUser(session.user.id);
  const products = producerId ? await getProductsForProducer(producerId) : [];

  return (
    <ProducerProductList
      locale={locale}
      products={products.map((productRow) => ({
        id: productRow.id,
        name: productRow.name ?? "",
        family: productRow.family,
        status: productRow.status,
        createdAt: productRow.createdAt,
      }))}
    />
  );
}
