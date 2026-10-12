import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { VerificationDecisionControl } from "@/components/internal/VerificationDecisionControl";
import { Heading, Stack, Text } from "@/components/ui";
import { getProducersForVolumeVerification } from "@/lib/db/queries";

const STATUS_FILTERS = [
  { value: "pending", label: "Oczekujące" },
  { value: "approved", label: "Zatwierdzone" },
  { value: "rejected", label: "Odrzucone" },
] as const;

// Weryfikacja wolumenowa producentów (spec 0070 część A, AC-3). Ta sama bramka
// sesji co /internal/producers. Profil zdolności jest obok przycisków decyzji,
// brakujące pola są ostrzeżeniem, nie blokadą (admin decyduje).
export default async function InternalVolumeVerificationPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  const { locale } = await params;
  const { status: statusParam } = await searchParams;
  const session = await auth();
  const selfHref = `/${locale}/internal/producers/volume-verification`;

  if (!session) {
    redirect(`/${locale}/login?callbackUrl=${encodeURIComponent(selfHref)}`);
  }
  if (session.user.role !== "admin") {
    redirect(`/${locale}`);
  }

  const status = STATUS_FILTERS.find((filter) => filter.value === statusParam)?.value ?? "pending";
  const items = await getProducersForVolumeVerification(status);

  return (
    <Stack gap={5}>
      <Link href={`/${locale}/internal/producers`} className="focus-ring w-fit rounded-data text-brand-passage-blue underline">
        Wszyscy producenci
      </Link>
      <Heading level="h1">Weryfikacja wolumenowa</Heading>
      <nav aria-label="Filtr statusu" className="flex gap-brand-3">
        {STATUS_FILTERS.map((filter) => (
          <Link
            key={filter.value}
            href={`${selfHref}?status=${filter.value}`}
            aria-current={filter.value === status ? "page" : undefined}
            className={`focus-ring rounded-data underline ${filter.value === status ? "font-medium text-brand-foundation-navy" : "text-brand-passage-blue"}`}
          >
            {filter.label}
          </Link>
        ))}
      </nav>
      {items.length === 0 ? (
        <Text tone="muted">Brak profili w tym statusie.</Text>
      ) : (
        <ul className="flex flex-col gap-brand-4">
          {items.map((item) => (
            <li key={item.producerId} className="flex flex-col gap-brand-2 rounded-data border border-brand-steel p-brand-3">
              <div className="flex flex-wrap items-baseline justify-between gap-brand-2">
                <Link href={`/${locale}/internal/producers/${item.producerId}`} className="focus-ring rounded-data text-h3 font-semibold text-brand-passage-blue underline">
                  {item.name}
                </Link>
                <Text as="span" tone="muted">
                  {item.countryName}
                </Text>
              </div>
              {item.missingFields.length > 0 && (
                <Text className="text-status-pending">Brakuje w profilu: {item.missingFields.join(", ")}.</Text>
              )}
              <dl className="grid grid-cols-1 gap-x-brand-4 gap-y-brand-1 text-body sm:grid-cols-2">
                <Field label="Kraje dostawy" value={item.deliveryCountryCodes.join(", ")} />
                <Field label="Jednostek na miesiąc" value={item.unitsPerMonth} />
                <Field label="Linie produkcyjne" value={item.productionLines} />
                <Field label="Maks. rozmiar modułu (m²)" value={item.maxModuleSizeM2} />
                <Field label="Standardy wykończenia" value={item.completionStandardsSupported.join(", ")} />
                <Field label="Transport" value={item.canHandleTransport ? "Tak" : "Nie"} />
                <Field label="Montaż" value={item.canHandleAssembly ? "Tak" : "Nie"} />
                <Field label="Opis zdolności" value={item.capabilityNote} />
                <Field label="Referencje" value={item.pastProjectReferences.join("; ")} />
              </dl>
              <VerificationDecisionControl target="producer" targetId={item.producerId} currentStatus={item.status} />
            </li>
          ))}
        </ul>
      )}
    </Stack>
  );
}

function Field({ label, value }: { label: string; value: string | number | null }) {
  return (
    <div className="flex gap-brand-2">
      <dt className="text-brand-technical-graphite">{label}:</dt>
      <dd>{value === null || value === "" ? "brak" : value}</dd>
    </div>
  );
}
