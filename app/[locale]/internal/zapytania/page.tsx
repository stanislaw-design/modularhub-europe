import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Container, DataText, Heading, Stack, Text } from "@/components/ui";
import { getAllInquiriesWithItems, getOffersByInquiryIdForAdmin } from "@/lib/db/queries";

const dateFormatter = new Intl.DateTimeFormat("pl-PL", { dateStyle: "medium", timeStyle: "short" });
const priceFormatter = new Intl.NumberFormat("pl-PL", { maximumFractionDigits: 0 });

const offerStatusLabel: Record<string, string> = {
  active: "Aktywna",
  accepted: "Przyjęta",
  rejected: "Odrzucona",
  superseded: "Zastąpiona",
};

// Widok wewnętrzny dla roli administratora (spec 0023 AC-9): pełny panel
// admina jest osobną, późniejszą funkcją (scope feature 18) — to tylko lista
// do odczytu, na co odpowiedzieć ręcznie.
export default async function InternalZapytaniaPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await auth();
  const selfHref = `/${locale}/internal/zapytania`;

  if (!session) {
    redirect(`/${locale}/logowanie?callbackUrl=${encodeURIComponent(selfHref)}`);
  }
  if (session.user.role !== "admin") {
    redirect(`/${locale}/klient`);
  }

  const [inquiries, offersByInquiryId] = await Promise.all([getAllInquiriesWithItems(), getOffersByInquiryIdForAdmin()]);

  return (
    <Container className="py-brand-6">
      <Stack gap={4}>
        <Heading level="h1">Zapytania</Heading>
        {inquiries.length === 0 ? (
          <Text tone="muted">Brak wysłanych zapytań.</Text>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[48rem] border-collapse text-body">
              <thead>
                <tr className="border-b border-brand-steel text-left">
                  <th className="p-brand-2 font-medium">Kontakt</th>
                  <th className="p-brand-2 font-medium">Produkty</th>
                  <th className="p-brand-2 font-medium">Kraj dostawy</th>
                  <th className="p-brand-2 font-medium">Status</th>
                  <th className="p-brand-2 font-medium">Data</th>
                  <th className="p-brand-2 font-medium">Oferty</th>
                </tr>
              </thead>
              <tbody>
                {inquiries.map((row) => {
                  const offers = offersByInquiryId.get(row.id) ?? [];
                  return (
                    <tr key={row.id} className="border-b border-brand-steel/50 align-top">
                      <td className="p-brand-2">
                        <div>{row.name}</div>
                        <div className="text-brand-technical-graphite">{row.email}</div>
                        <div className="text-brand-technical-graphite">{row.phone}</div>
                      </td>
                      <td className="p-brand-2">{row.productNames.join(", ") || "—"}</td>
                      <td className="p-brand-2">{row.deliveryCountryCode}</td>
                      <td className="p-brand-2">{row.status}</td>
                      <td className="p-brand-2">{dateFormatter.format(row.receivedAt)}</td>
                      <td className="p-brand-2">
                        {offers.length === 0 ? (
                          "—"
                        ) : (
                          <details>
                            <summary className="focus-ring cursor-pointer text-brand-passage-blue">
                              {offers.length} {offers.length === 1 ? "oferta" : "oferty"}
                            </summary>
                            <ul className="mt-brand-2 flex flex-col gap-brand-2">
                              {offers.map((offer) => {
                                const total =
                                  offer.items.reduce((sum, item) => sum + item.housePriceCents, 0) +
                                  offer.transportPriceCents +
                                  offer.installationPriceCents;
                                return (
                                  <li key={offer.id} className="rounded-data border border-brand-steel/50 p-brand-2">
                                    <div className="font-medium">{offer.producerName}</div>
                                    <div className="text-brand-technical-graphite">{offerStatusLabel[offer.status] ?? offer.status}</div>
                                    <ul>
                                      {offer.items.map((item) => (
                                        <li key={item.productId}>
                                          {item.productName}: <DataText as="span">{priceFormatter.format(item.housePriceCents / 100)} €</DataText>
                                        </li>
                                      ))}
                                    </ul>
                                    <div>
                                      Transport: <DataText as="span">{priceFormatter.format(offer.transportPriceCents / 100)} €</DataText>
                                    </div>
                                    <div>
                                      Montaż: <DataText as="span">{priceFormatter.format(offer.installationPriceCents / 100)} €</DataText>
                                    </div>
                                    <div className="font-medium">
                                      Razem: <DataText as="span">{priceFormatter.format(total / 100)} €</DataText>
                                    </div>
                                  </li>
                                );
                              })}
                            </ul>
                          </details>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Stack>
    </Container>
  );
}
