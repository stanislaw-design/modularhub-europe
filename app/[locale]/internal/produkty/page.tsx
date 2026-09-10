import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Container, Heading, Stack, Text } from "@/components/ui";
import { getAllProductsForAdmin } from "@/lib/db/queries";

// Widok wewnętrzny dla roli administratora (spec 0031 AC-9), ten sam wzorzec co
// /internal/zapytania (spec 0023): lista produktów, link do zarządzania
// zdjęciami każdego z osobna.
export default async function InternalProduktyPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await auth();
  const selfHref = `/${locale}/internal/produkty`;

  if (!session) {
    redirect(`/${locale}/logowanie?callbackUrl=${encodeURIComponent(selfHref)}`);
  }
  if (session.user.role !== "admin") {
    redirect(`/${locale}/klient`);
  }

  const products = await getAllProductsForAdmin();

  return (
    <Container className="py-brand-6">
      <Stack gap={4}>
        <Heading level="h1">Produkty i zdjęcia</Heading>
        {products.length === 0 ? (
          <Text tone="muted">Brak produktów.</Text>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[36rem] border-collapse text-body">
              <thead>
                <tr className="border-b border-brand-steel text-left">
                  <th className="p-brand-2 font-medium">Produkt</th>
                  <th className="p-brand-2 font-medium">Producent</th>
                  <th className="p-brand-2 font-medium">Zdjęcia</th>
                  <th className="p-brand-2 font-medium" />
                </tr>
              </thead>
              <tbody>
                {products.map((productRow) => (
                  <tr key={productRow.id} className="border-b border-brand-steel/50 align-top">
                    <td className="p-brand-2">{productRow.name}</td>
                    <td className="p-brand-2 text-brand-technical-graphite">{productRow.producerName}</td>
                    <td className="p-brand-2">
                      {productRow.photoCount > 0 ? (
                        `${productRow.photoCount}`
                      ) : (
                        <Text as="span" variant="label" tone="muted">
                          brak (okładka z mocka)
                        </Text>
                      )}
                    </td>
                    <td className="p-brand-2">
                      <Link
                        href={`/${locale}/internal/produkty/${productRow.id}`}
                        className="focus-ring rounded-data text-brand-passage-blue underline"
                      >
                        Zarządzaj zdjęciami
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Stack>
    </Container>
  );
}
