import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { ProducerCertificationAdminSection } from "@/components/internal/ProducerCertificationAdminSection";
import { ProductComplianceAdminSection } from "@/components/internal/ProductComplianceAdminSection";
import { Heading, Stack, Text } from "@/components/ui";
import {
  getProducerCertificationsForAdmin,
  getProducerProductsWithAssessmentsForAdmin,
  getProducerProfile,
} from "@/lib/db/queries";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Szczegóły producenta dla administratora (spec 0065 AC-10): certyfikaty firmy
// do potwierdzenia oraz oceny zgodności każdego produktu tego producenta.
// Ten sam inline wzorzec auth co pozostałe ekrany /internal (patrz internal/AGENTS.md).
export default async function InternalProducerDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const session = await auth();
  const selfHref = `/${locale}/internal/producers/${id}`;

  if (!session) {
    redirect(`/${locale}/login?callbackUrl=${encodeURIComponent(selfHref)}`);
  }
  if (session.user.role !== "admin") {
    redirect(`/${locale}`);
  }

  if (!UUID_PATTERN.test(id)) notFound();
  const profile = await getProducerProfile(id);
  if (!profile) notFound();

  const [certifications, products] = await Promise.all([
    getProducerCertificationsForAdmin(id),
    getProducerProductsWithAssessmentsForAdmin(id),
  ]);

  return (
    <Stack gap={5}>
      <Link href={`/${locale}/internal/producers`} className="focus-ring w-fit rounded-data text-brand-passage-blue underline">
        Wszyscy producenci
      </Link>
      <Heading level="h1">{profile.name}</Heading>
      <Text tone="muted">NIP {profile.nip}</Text>

      <ProducerCertificationAdminSection certifications={certifications} />

      <section aria-labelledby="producer-products-heading" className="flex flex-col gap-brand-3">
        <h2 id="producer-products-heading" className="text-h3 font-semibold">
          Oceny zgodności produktów
        </h2>
        {products.length === 0 ? (
          <Text tone="muted">Producent nie ma jeszcze produktów.</Text>
        ) : (
          products.map((product) => <ProductComplianceAdminSection key={product.id} product={product} />)
        )}
      </section>
    </Stack>
  );
}
