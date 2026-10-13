import { getTranslations } from "next-intl/server";
import { Stack, Text } from "@/components/ui";
import type { ClientRequestWithQuotes } from "@/lib/db/queries";

interface RequestHeaderProps {
  item: ClientRequestWithQuotes;
  locale: string;
}

// Spec 0070 AC-41: czytelny nagłówek zapytania na /panel/quotes. Każde zapytanie ma własny
// tytuł (kraj albo nazwa produktu), liczbę domów, datę złożenia, termin ofert i stan, żeby
// kilka zapytań nie wyglądało jak jedno. Zostaje nad tabelą porównawczą z zadania 12.
export async function RequestHeader({ item, locale }: RequestHeaderProps) {
  const t = await getTranslations({ locale, namespace: "RequestHeader" });
  const dateFormatter = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });
  const country = new Intl.DisplayNames([locale], { type: "region" }).of(item.countryCode) ?? item.countryCode;

  const title = item.source === "project_request" ? `${t("projectTitle")}: ${country}` : t("productTitle", { name: item.productName });
  const statusLabel =
    item.status === "closed"
      ? `${t("statusClosed")}${item.closedReason ? `: ${t(`closedReason.${item.closedReason}`)}` : ""}`
      : item.status === "published"
        ? t("statusPublished")
        : item.status === "accepted"
          ? t("statusAccepted")
          : t("statusCollecting");

  return (
    <Stack gap={1}>
      <Text className="font-medium" surface="v5">
        {title}
      </Text>
      <Text tone="muted" surface="v5" variant="label">
        {[
          item.source === "bulk_product_inquiry" ? country : null,
          t("units", { count: item.unitCount }),
          `${t("submittedLabel")} ${dateFormatter.format(item.createdAt)}`,
          `${t("deadlineLabel")} ${dateFormatter.format(item.deadlineAt)}`,
          item.closedAt ? `${t("closedLabel")} ${dateFormatter.format(item.closedAt)}` : null,
        ]
          .filter((part): part is string => part !== null)
          .join(" · ")}
      </Text>
      <Text surface="v5" variant="label" className="font-medium">
        {statusLabel}
      </Text>
    </Stack>
  );
}
