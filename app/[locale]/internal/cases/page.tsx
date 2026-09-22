import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Container, Heading, Stack, Text } from "@/components/ui";
import { getCaseActor } from "@/lib/cases/actor";
import { listCasesForAdvisor } from "@/lib/cases/queries";

const dateFormatter = new Intl.DateTimeFormat("pl-PL", { dateStyle: "medium", timeStyle: "short" });

// Lista spraw zarządzanego przepływu doradczego (spec 0048). To najcieńsza
// wersja widoku doradcy: wszystkie sprawy, kto ma następny ruch, czas od
// ostatniego kontaktu. Kolejka pogrupowana według następnej czynności dochodzi
// w kroku 13 planu.
export default async function InternalCasesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const session = await auth();
  const selfHref = `/${locale}/internal/cases`;

  if (!session) redirect(`/${locale}/login?callbackUrl=${encodeURIComponent(selfHref)}`);
  if (session.user.role !== "admin") redirect(`/${locale}`);

  const actor = await getCaseActor();
  const [cases, t] = await Promise.all([actor ? listCasesForAdvisor(actor) : [], getTranslations("CaseStatus")]);

  return (
    <Container className="py-brand-6">
      <Stack gap={4}>
        <Heading level="h1">Sprawy doradcze</Heading>
        <Text tone="muted">
          Wcześniejsze, bezpośrednie zapytania są na osobnej liście: <Link href={`/${locale}/internal/inquiries`} className="focus-ring text-brand-passage-blue underline">Zapytania</Link>.
        </Text>
        {cases.length === 0 ? (
          <Text tone="muted">Brak spraw.</Text>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[48rem] border-collapse text-body">
              <thead>
                <tr className="border-b border-brand-steel text-left">
                  <th className="p-brand-2 font-medium">Klient</th>
                  <th className="p-brand-2 font-medium">Domy</th>
                  <th className="p-brand-2 font-medium">Etap</th>
                  <th className="p-brand-2 font-medium">Kto czeka</th>
                  <th className="p-brand-2 font-medium">Doradca</th>
                  <th className="p-brand-2 font-medium">Ostatni kontakt klienta</th>
                </tr>
              </thead>
              <tbody>
                {cases.map((row) => (
                  <tr key={row.id} className="border-b border-brand-steel/50 align-top">
                    <td className="p-brand-2">
                      <Link
                        href={`/${locale}/internal/cases/${row.id}`}
                        className="focus-ring rounded-data font-medium text-brand-passage-blue hover:underline"
                      >
                        {row.clientName}
                      </Link>
                    </td>
                    <td className="p-brand-2">{row.productNames.join(", ") || "—"}</td>
                    <td className="p-brand-2">{t(`stage.${row.stage}`)}</td>
                    <td className="p-brand-2">{row.waitingOn ? t(`waitingShort.${row.waitingOn}`) : "—"}</td>
                    <td className="p-brand-2">{row.advisorName ?? "Nieprzypisana"}</td>
                    <td className="p-brand-2">
                      {row.lastClientActivityAt ? dateFormatter.format(row.lastClientActivityAt) : "—"}
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
