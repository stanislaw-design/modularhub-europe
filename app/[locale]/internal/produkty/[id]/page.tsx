import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { Container, Heading, Stack, Text } from "@/components/ui";
import { getProductForAdmin, getProductPhotosForAdmin } from "@/lib/db/queries";
import { ProductPhotoManager } from "./ProductPhotoManager";

// Widok wewnętrzny dla roli administratora (spec 0031 AC-2, AC-4, AC-5, AC-6,
// AC-9), ten sam wzorzec auth co /internal/zapytania i /internal/produkty.
export default async function InternalProduktDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const session = await auth();
  const selfHref = `/${locale}/internal/produkty/${id}`;

  if (!session) {
    redirect(`/${locale}/logowanie?callbackUrl=${encodeURIComponent(selfHref)}`);
  }
  if (session.user.role !== "admin") {
    redirect(`/${locale}/klient`);
  }

  const productRow = await getProductForAdmin(id);
  if (!productRow) notFound();

  const photos = await getProductPhotosForAdmin(id);

  return (
    <Container className="py-brand-6">
      <Stack gap={4}>
        <Link href={`/${locale}/internal/produkty`} className="focus-ring w-fit text-body text-brand-passage-blue underline">
          ← Wszystkie produkty
        </Link>
        <div>
          <Heading level="h1">{productRow.name}</Heading>
          <Text tone="muted">{productRow.producerName}</Text>
        </div>
        <ProductPhotoManager productId={id} initialPhotos={photos} />
      </Stack>
    </Container>
  );
}
