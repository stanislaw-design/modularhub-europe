import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { FilterGroup, FilterLink } from "@/components/internal/FilterChips";
import { VerificationDecisionControl } from "@/components/internal/VerificationDecisionControl";
import { Heading, Stack, Text } from "@/components/ui";
import { getClientsForB2bVerification } from "@/lib/db/queries";

const STATUS_FILTERS = [
  { value: "pending", label: "Oczekujące" },
  { value: "approved", label: "Zatwierdzone" },
  { value: "rejected", label: "Odrzucone" },
] as const;

// Weryfikacja B2B klientów (spec 0070 część A, AC-4): NIP i nazwa firmy obok
// przycisków decyzji. W części B ta akcja dostanie dodatkowy skutek (połączenie
// oczekujących wyborów klienta), tu tylko ustawia status.
export default async function InternalB2bVerificationPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  const { locale } = await params;
  const { status: statusParam } = await searchParams;
  const session = await auth();
  const selfHref = `/${locale}/internal/clients/b2b-verification`;

  if (!session) {
    redirect(`/${locale}/login?callbackUrl=${encodeURIComponent(selfHref)}`);
  }
  if (session.user.role !== "admin") {
    redirect(`/${locale}`);
  }

  const status = STATUS_FILTERS.find((filter) => filter.value === statusParam)?.value ?? "pending";
  const items = await getClientsForB2bVerification(status);

  return (
    <Stack gap={5}>
      <div className="flex flex-wrap items-center justify-between gap-x-brand-5 gap-y-brand-3">
        <Heading level="h1">Weryfikacja B2B klientów</Heading>
        <FilterGroup label="Status">
          {STATUS_FILTERS.map((filter) => (
            <FilterLink key={filter.value} href={`${selfHref}?status=${filter.value}`} active={filter.value === status} label={filter.label} />
          ))}
        </FilterGroup>
      </div>
      {items.length === 0 ? (
        <Text tone="muted">Brak klientów w tym statusie.</Text>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[48rem] border-collapse text-body">
            <thead>
              <tr className="border-b border-brand-steel text-left text-label uppercase tracking-[0.08em] text-brand-technical-graphite">
                <th scope="col" className="p-brand-2 font-medium">Klient</th>
                <th scope="col" className="p-brand-2 font-medium">E-mail</th>
                <th scope="col" className="p-brand-2 font-medium">Telefon</th>
                <th scope="col" className="p-brand-2 font-medium">Firma</th>
                <th scope="col" className="p-brand-2 font-medium">NIP lub VAT UE</th>
                <th scope="col" className="p-brand-2 font-medium">Decyzja</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.clientId} className="border-b border-brand-steel/50 align-middle">
                  <td className="p-brand-2 font-medium">{item.name ?? "brak"}</td>
                  <td className="p-brand-2">
                    <a href={`mailto:${item.email}`} className="focus-ring rounded-data hover:underline">
                      {item.email}
                    </a>
                  </td>
                  <td className="whitespace-nowrap p-brand-2">
                    {item.phone ? (
                      <a href={`tel:${item.phone.replace(/[^\d+]/g, "")}`} className="focus-ring rounded-data hover:underline">
                        {item.phone}
                      </a>
                    ) : (
                      "brak"
                    )}
                  </td>
                  <td className="p-brand-2">{item.companyName ?? "brak"}</td>
                  <td className="p-brand-2">{item.nip ?? "brak"}</td>
                  <td className="p-brand-2">
                    <VerificationDecisionControl target="client" targetId={item.clientId} currentStatus={item.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Stack>
  );
}
