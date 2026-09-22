import { HousePdfImportFlow } from "@/components/producent/HousePdfImportFlow";
import { getHouseAiImportReview, getHouseAiReviewFixture } from "@/lib/data/house-ai-import";
import { getProducerIdForUser } from "@/lib/db/queries";
import { requirePanelProducerSession } from "@/lib/panel-session";
import { notFound } from "next/navigation";
import { z } from "zod";
import { resolveHousePdfImportView } from "@/lib/house-ai-import-contract";

export const metadata = { title: "Import projektu domu z PDF | ModularHub" };

export default async function HousePdfImportPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ scenario?: string; sessionId?: string }>;
}) {
  const { locale } = await params;
  const { scenario, sessionId } = await searchParams;
  const selfHref = `/${locale}/producer/panel/project/import`;
  const session = await requirePanelProducerSession(locale, selfHref);
  const producerId = await getProducerIdForUser(session.user.id);
  if (!producerId) notFound();

  if (sessionId) {
    const parsedSessionId = z.string().uuid().safeParse(sessionId);
    if (!parsedSessionId.success) notFound();
    const review = await getHouseAiImportReview(parsedSessionId.data, producerId);
    if (!review) notFound();
    const initialView = resolveHousePdfImportView(review.status);
    return <HousePdfImportFlow key={`${review.sessionId}:${review.status}:${review.decisionRevision}`} locale={locale} initialView={initialView} fixtures={{ processing: review, review, error: review }} persisted />;
  }

  const [processing, review, error] = await Promise.all([
    getHouseAiReviewFixture("processing"),
    getHouseAiReviewFixture("review"),
    getHouseAiReviewFixture("error"),
  ]);
  const initialView = scenario === "processing" || scenario === "review" || scenario === "error" ? scenario : "upload";

  return <HousePdfImportFlow locale={locale} initialView={initialView} fixtures={{ processing, review, error }} />;
}
