"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Stack, Text } from "@/components/ui";
import { deleteInquiryAttachment, type InquiryAttachmentItem } from "@/lib/inquiry-attachment-actions";
import type { InquiryKind } from "@/lib/inquiry-attachment-specs";
import { InquiryAttachmentList, type AttachmentViewer } from "./InquiryAttachmentList";
import { InquiryAttachmentUploader } from "./InquiryAttachmentUploader";
import type { InquiryAttachmentLabels } from "./labels";

interface InquiryAttachmentsPanelProps {
  kind: InquiryKind;
  inquiryId: string;
  items: InquiryAttachmentItem[];
  viewer: AttachmentViewer;
  labels: InquiryAttachmentLabels;
  locale: string;
  // Klient i admin dodają i usuwają. Klient tylko, gdy zapytanie nie jest zablokowane
  // (termin, publikacja, wybór oferty); producent tylko czyta.
  canChange?: boolean;
  // Producent z aktywną ofertą, której pliki zmieniły się po jej złożeniu (AC-33).
  changedAfterQuote?: boolean;
  surface?: "v5" | "v3";
}

// Sekcja plików w szczegółach zapytania: panel klienta, producenta i admina (zadanie 22).
// Dla klienta i admina łączy listę z wgrywaniem; "Zamień" to wgranie nowego pliku i
// usunięcie starego jednym przyciskiem (AC-33).
export function InquiryAttachmentsPanel({
  kind,
  inquiryId,
  items,
  viewer,
  labels,
  locale,
  canChange = false,
  changedAfterQuote = false,
  surface = "v5",
}: InquiryAttachmentsPanelProps) {
  const router = useRouter();
  const [replacingId, setReplacingId] = useState<string | null>(null);
  const uploaderRef = useRef<HTMLDivElement>(null);

  const heading = viewer === "client" ? labels.heading : labels.investorFilesHeading;
  const intro = viewer === "producer" ? labels.producerIntro : viewer === "admin" ? labels.adminIntro : null;

  function handleReplace(attachmentId: string) {
    setReplacingId(attachmentId);
    uploaderRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  async function handleUploaded() {
    if (!replacingId) return;
    const target = replacingId;
    setReplacingId(null);
    await deleteInquiryAttachment(target);
    router.refresh();
  }

  return (
    <section aria-labelledby={`attachments-${inquiryId}`}>
      <Stack gap={3}>
        <h3 id={`attachments-${inquiryId}`} className="font-sans text-lg font-semibold">
          {heading}
        </h3>
        {intro && (
          <Text tone="muted" surface={surface}>
            {intro}
          </Text>
        )}
        {changedAfterQuote && (
          <p className="rounded-data border border-status-conditional/40 bg-status-conditional/10 px-brand-3 py-brand-2 text-data" role="status">
            {labels.changedAfterQuote}
          </p>
        )}
        <InquiryAttachmentList
          items={items}
          viewer={viewer}
          labels={labels}
          locale={locale}
          surface={surface}
          canRemove={canChange}
          canModerate={viewer === "admin"}
          onReplace={canChange ? handleReplace : undefined}
        />
        {canChange && (
          <div ref={uploaderRef}>
            <InquiryAttachmentUploader
              kind={kind}
              inquiryId={inquiryId}
              labels={labels}
              staff={viewer === "admin"}
              surface={surface}
              compact
              refreshOnUploaded
              onUploaded={replacingId ? handleUploaded : undefined}
            />
          </div>
        )}
        {viewer === "client" && !canChange && (
          <Text tone="muted" surface={surface} className="text-data">
            {labels.lockedNote}
          </Text>
        )}
      </Stack>
    </section>
  );
}
