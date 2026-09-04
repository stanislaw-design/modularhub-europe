import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Container, Heading, Stack, Text } from "@/components/ui";
import { getAllInquiriesWithItems } from "@/lib/db/queries";

const dateFormatter = new Intl.DateTimeFormat("pl-PL", { dateStyle: "medium", timeStyle: "short" });

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

  const inquiries = await getAllInquiriesWithItems();

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
                </tr>
              </thead>
              <tbody>
                {inquiries.map((row) => (
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
