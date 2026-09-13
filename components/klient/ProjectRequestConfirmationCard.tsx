import { CheckCircle2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Card, Heading, Text } from "@/components/ui";

interface ProjectRequestConfirmationCardProps {
  contactEmail: string;
}

// Only ever rendered from ProjectRequestFlow ("use client"), so it's already
// part of the client bundle regardless of its own directive — useTranslations
// (client safe), never getTranslations (server only), same reasoning as
// InquiryConfirmationCard.
export function ProjectRequestConfirmationCard({ contactEmail }: ProjectRequestConfirmationCardProps) {
  const t = useTranslations("ProjectRequestConfirmationCard");
  return (
    <Card as="article" surface="v5" padding="lg" className="flex flex-col gap-brand-3">
      <span className="inline-flex w-fit items-center gap-brand-1 rounded-data border border-status-approved/30 bg-status-approved/10 px-brand-2 py-1 text-label font-medium uppercase tracking-[0.1em] text-status-approved">
        <CheckCircle2 className="size-3.5 shrink-0" aria-hidden="true" />
        {t("statusLabel")}
      </span>
      <Heading level="h2" surface="v5" className="text-h2">
        {t("heading")}
      </Heading>
      <Text tone="muted" surface="v5" measure>
        {t("message")}
      </Text>
      <Text tone="muted" surface="v5" className="text-data">
        {t("emailNote", { email: contactEmail })}
      </Text>
    </Card>
  );
}
