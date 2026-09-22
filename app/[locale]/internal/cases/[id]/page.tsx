import { notFound, redirect } from "next/navigation";
import { auth } from "@/auth";
import { AssignToMeButton } from "@/components/klient/AssignToMeButton";
import { CaseChat } from "@/components/klient/CaseChat";
import { CaseStatusPanel } from "@/components/klient/CaseStatusPanel";
import { Container, Stack, Text } from "@/components/ui";
import { getCaseActor } from "@/lib/cases/actor";
import { getCaseView } from "@/lib/cases/queries";

const dateFormatter = new Intl.DateTimeFormat("pl-PL", { dateStyle: "medium", timeStyle: "short" });

// Widok sprawy dla doradcy (spec 0048 AC-30, w zakresie kroku 4): dane
// zapytania, przypisanie i rozmowa z klientem. Pozostałe kanały, brief,
// zaproszenia i oferty dochodzą w kolejnych krokach.
export default async function InternalCasePage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params;
  const session = await auth();
  const selfHref = `/${locale}/internal/cases/${id}`;

  if (!session) redirect(`/${locale}/login?callbackUrl=${encodeURIComponent(selfHref)}`);
  if (session.user.role !== "admin") redirect(`/${locale}`);

  const actor = await getCaseActor();
  const view = actor ? await getCaseView(actor, id) : null;
  if (!view) notFound();

  return (
    <Container className="py-brand-6">
      <Stack gap={4}>
        <CaseStatusPanel view={view} dateLabel={dateFormatter.format(view.receivedAt)} />
        <Stack direction="row" gap={2} className="items-center">
          <Text>Doradca: {view.advisorName ?? "nieprzypisana"}</Text>
          {view.advisorId !== session.user.id && <AssignToMeButton inquiryId={view.id} />}
        </Stack>
        <Text tone="muted">Klient: {view.clientName}</Text>
        <CaseChat inquiryId={view.id} channelId={view.channelId} viewer="advisor" initialMessages={view.messages} />
      </Stack>
    </Container>
  );
}
