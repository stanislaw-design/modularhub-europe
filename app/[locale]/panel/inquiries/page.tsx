import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { PanelEmptyState } from "@/components/klient/PanelEmptyState";
import { Heading, Stack, Text } from "@/components/ui";
import {
  getClientIdForUser,
  getInquiriesForClient,
  getUnreadOfferInquiryIds,
  type InquiryWithItems,
} from "@/lib/db/queries";
import { listCasesForClient } from "@/lib/cases/queries";
import { requirePanelClientSession } from "@/lib/panel-session";

const dateFormatter = new Intl.DateTimeFormat("pl-PL", { dateStyle: "medium", timeStyle: "short" });

// Tylko własne zapytania zalogowanego klienta (spec 0024 AC-1, AC-10):
// getInquiriesForClient filtruje po client.id wyprowadzonym z sesji.
export default async function ZapytaniaPanelPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const selfHref = `/${locale}/panel/inquiries`;
  const [session, t] = await Promise.all([
    requirePanelClientSession(locale, selfHref),
    getTranslations("KlientPanelZapytaniaPage"),
  ]);

  const statusLabel: Record<InquiryWithItems["status"], string> = {
    open: t("statusOpen"),
    offered: t("statusOffered"),
    closed: t("statusClosed"),
  };

  const clientId = await getClientIdForUser(session.user.id);
  const [inquiries, unreadOfferIds, cases] = clientId
    ? await Promise.all([getInquiriesForClient(clientId), getUnreadOfferInquiryIds(clientId), listCasesForClient(clientId)])
    : [[], new Set<string>(), []];

  return (
    <Stack gap={4}>
      <Heading level="h1" surface="v5">
        {t("heading")}
      </Heading>
      {cases.length > 0 && (
        <Stack gap={2}>
          <Heading level="h2" surface="v5">
            {t("advisoryHeading")}
          </Heading>
          <ul className="flex flex-col gap-brand-2">
            {cases.map((row) => (
              <li key={row.id} className="rounded-v5-card border border-brand-v5-line p-brand-2">
                <Link
                  href={`/${locale}/panel/inquiries/${row.id}`}
                  className="focus-ring rounded-data font-medium text-brand-v5-amber-strong hover:underline"
                >
                  {row.productNames.join(", ") || "—"}
                </Link>
                <Text surface="v5" tone="muted">
                  {t(`caseStage.${row.stage}`)} · {dateFormatter.format(row.receivedAt)}
                </Text>
              </li>
            ))}
          </ul>
        </Stack>
      )}
      {inquiries.length === 0 && cases.length > 0 ? null : inquiries.length === 0 ? (
        <PanelEmptyState locale={locale} title={t("emptyTitle")} description={t("emptyDescription")} />
      ) : (
        <div className="overflow-x-auto rounded-v5-card border border-brand-v5-line">
          <table className="w-full min-w-[36rem] border-collapse text-body">
            <thead>
              <tr className="border-b border-brand-v5-line bg-brand-v5-line/10 text-left">
                <Text as="th" surface="v5" className="p-brand-2 font-medium">
                  {t("columnProducts")}
                </Text>
                <Text as="th" surface="v5" className="p-brand-2 font-medium">
                  {t("columnStatus")}
                </Text>
                <Text as="th" surface="v5" className="p-brand-2 font-medium">
                  {t("columnDate")}
                </Text>
              </tr>
            </thead>
            <tbody>
              {inquiries.map((row) => (
                <tr key={row.id} className="border-b border-brand-v5-line/50 align-top last:border-b-0">
                  <td className="p-brand-2">
                    <Link
                      href={`/${locale}/panel/inquiries/${row.id}`}
                      className="focus-ring rounded-data font-medium text-brand-v5-amber-strong hover:underline"
                    >
                      {row.productNames.join(", ") || "—"}
                    </Link>
                    {unreadOfferIds.has(row.id) && (
                      <span
                        className="ml-2 inline-block size-2 rounded-full bg-brand-v5-amber-strong align-middle"
                        role="img"
                        aria-label={t("unreadOfferLabel")}
                      />
                    )}
                  </td>
                  <Text as="td" surface="v5" className="p-brand-2">
                    {statusLabel[row.status]}
                  </Text>
                  <Text as="td" surface="v5" className="p-brand-2">
                    {dateFormatter.format(row.receivedAt)}
                  </Text>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Stack>
  );
}
