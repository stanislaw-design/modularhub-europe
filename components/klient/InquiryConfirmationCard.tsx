import { CheckCircle2, ImageOff } from "lucide-react";
import Image from "next/image";
import { Card, DataText, Heading, Text } from "@/components/ui";
import type { Project } from "@/lib/data/types";

interface InquiryConfirmationCardProps {
  project: Project;
  sentAt: Date;
}

const priceFormatter = new Intl.NumberFormat("pl-PL", { maximumFractionDigits: 0 });
const dateFormatter = new Intl.DateTimeFormat("pl-PL", { dateStyle: "medium", timeStyle: "short" });

// Fixed, platform imposed message: every producer sees the same request text
// for every inquiry, per spec 0005's "narzucony szablon" (AC-7).
const MESSAGE_TEXT =
  "Klient prosi o przygotowanie oferty na ten projekt, uwzględniającej dom, transport i montaż.";

export function InquiryConfirmationCard({ project, sentAt }: InquiryConfirmationCardProps) {
  return (
    <Card as="article" padding="none" className="flex flex-col gap-brand-3 overflow-hidden sm:flex-row">
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
          <div className="flex size-full items-center justify-center bg-brand-steel/20">
            <ImageOff className="size-8 text-brand-technical-graphite/50" aria-hidden="true" />
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-brand-2 p-brand-3">
        <div className="flex flex-wrap items-baseline justify-between gap-brand-1">
          <Heading level="h3" className="text-body-l">
            {project.name}
          </Heading>
          <DataText>
            {priceFormatter.format(project.priceMin)}–{priceFormatter.format(project.priceMax)} €
          </DataText>
        </div>
        <Text tone="muted">{project.producerName}</Text>
        <Text tone="muted" measure>
          {MESSAGE_TEXT}
        </Text>
        <span className="inline-flex w-fit items-center gap-brand-1 rounded-data border border-status-approved/30 bg-status-approved/10 px-brand-2 py-1 text-label font-medium uppercase tracking-[0.1em] text-status-approved">
          <CheckCircle2 className="size-3.5 shrink-0" aria-hidden="true" />
          Wysłano {dateFormatter.format(sentAt)}
        </span>
      </div>
    </Card>
  );
}
