import { CheckCircle2, ImageOff } from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { Card, DataText, Heading, Text } from "@/components/ui";
import type { Project } from "@/lib/data/types";

interface InquiryConfirmationCardProps {
  project: Project;
  sentAt: Date;
}

const priceFormatter = new Intl.NumberFormat("pl-PL", { maximumFractionDigits: 0 });
const dateFormatter = new Intl.DateTimeFormat("pl-PL", { dateStyle: "medium", timeStyle: "short" });

// Only ever rendered from InquiryFlow ("use client"), so it's already part of
// the client bundle regardless of its own directive — useTranslations (client
// safe), never getTranslations (server only, and async function components
// aren't supported by React's client reconciler).
export function InquiryConfirmationCard({ project, sentAt }: InquiryConfirmationCardProps) {
  const t = useTranslations("InquiryConfirmationCard");
  return (
    <Card
      as="article"
      padding="none"
      surface="v5"
      className="flex flex-col gap-brand-3 overflow-hidden sm:flex-row"
    >
      <div className="relative aspect-[3/2] w-full shrink-0 overflow-hidden sm:w-48">
        {project.coverImageUrl ? (
          <Image
            src={project.coverImageUrl}
            alt=""
            fill
            sizes="(min-width: 640px) 12rem, 100vw"
            className="object-cover"
          />
        ) : (
          <div className="flex size-full items-center justify-center bg-brand-v5-line/40">
            <ImageOff className="size-8 text-brand-v5-muted/50" aria-hidden="true" />
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-brand-2 p-brand-3">
        <div className="flex flex-wrap items-baseline justify-between gap-brand-1">
          <Heading level="h3" surface="v5" className="text-body-l">
            {project.name}
          </Heading>
          <DataText surface="v5">
            {priceFormatter.format(project.priceMin)}–{priceFormatter.format(project.priceMax)} €
          </DataText>
        </div>
        <Text tone="muted" surface="v5">
          {project.producerName}
        </Text>
        <Text tone="muted" surface="v5" measure>
          {t("message")}
        </Text>
        <span className="inline-flex w-fit items-center gap-brand-1 rounded-data border border-status-approved/30 bg-status-approved/10 px-brand-2 py-1 text-label font-medium uppercase tracking-[0.1em] text-status-approved">
          <CheckCircle2 className="size-3.5 shrink-0" aria-hidden="true" />
          {t("sentAt", { date: dateFormatter.format(sentAt) })}
        </span>
      </div>
    </Card>
  );
}
