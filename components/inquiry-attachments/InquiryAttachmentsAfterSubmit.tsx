"use client";

import { Card, Heading, Text } from "@/components/ui";
import type { InquiryKind } from "@/lib/inquiry-attachment-specs";
import { InquiryAttachmentUploader } from "./InquiryAttachmentUploader";
import { useInquiryAttachmentLabels } from "./useInquiryAttachmentLabels";

interface InquiryAttachmentsAfterSubmitProps {
  kind: InquiryKind;
  inquiryId: string;
  // Brak tokenu (np. brak AUTH_SECRET) wyłącza krok: zapytanie jest złożone, a pliki
  // klient dodaje po zalogowaniu (AC-29).
  uploadToken?: string;
  surface?: "v5" | "v3";
  // Admin składający zapytanie w imieniu klienta: bez tokenu i bez pola zgody (AC-34).
  staff?: boolean;
  initialFiles?: File[];
}

// Krok "Dodaj pliki" po zapisie zapytania (zadanie 22). Zapytanie już istnieje, więc
// pominięcie kroku albo błąd wgrania niczego nie cofa.
export function InquiryAttachmentsAfterSubmit({
  kind,
  inquiryId,
  uploadToken,
  surface = "v5",
  staff = false,
  initialFiles,
}: InquiryAttachmentsAfterSubmitProps) {
  const labels = useInquiryAttachmentLabels();
  if (!staff && !uploadToken) return null;

  return (
    <Card as="section" surface={surface} padding="lg" className="flex flex-col gap-brand-3">
      <Heading level="h2" surface={surface} className="text-h3">
        {labels.heading}
      </Heading>
      <Text tone="muted" surface={surface}>
        {staff ? labels.adminIntro : labels.afterSubmitHint}
      </Text>
      <InquiryAttachmentUploader
        kind={kind}
        inquiryId={inquiryId}
        labels={labels}
        uploadToken={uploadToken}
        staff={staff}
        initialFiles={initialFiles}
        surface={surface}
      />
    </Card>
  );
}
