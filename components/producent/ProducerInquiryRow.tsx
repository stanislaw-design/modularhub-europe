"use client";

import { useEffect, useState } from "react";
import { Button, Card, DataText, Heading, Stack, StatusPill, Text } from "@/components/ui";
import type { Project, ProducerInquiry } from "@/lib/data/types";
import { getStoredOffer } from "@/lib/producer-offers";

interface ProducerInquiryRowProps {
  locale: string;
  inquiry: ProducerInquiry;
  project: Project;
  countryName: string;
}

const dateFormatter = new Intl.DateTimeFormat("pl-PL", { dateStyle: "medium" });

// Fixed, platform imposed message — every producer sees the same request
// text for every inquiry, mirroring lib InquiryConfirmationCard's MESSAGE_TEXT
// on the client side (spec 0005's "narzucony szablon").
const MESSAGE_TEXT =
  "Klient prosi o przygotowanie oferty na ten projekt, uwzględniającej dom, transport i montaż.";

export function ProducerInquiryRow({ locale, inquiry, project, countryName }: ProducerInquiryRowProps) {
  // Odczyt localStorage po zamontowaniu — patrz precedens lib/gap-closure.ts /
  // ExportReadinessCountryRow (możliwe krótkie mignięcie przy pierwszym renderze).
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- synchronizacja z localStorage po hydracji, patrz komentarz wyżej
    setSubmitted(getStoredOffer(inquiry.id) !== null);
  }, [inquiry.id]);

  const offerHref = `/${locale}/producent/zapytania/oferta?zapytanie=${inquiry.id}`;

  return (
    <Card as="div" padding="md">
      <Stack gap={2} align="start">
        <div className="flex w-full flex-wrap items-baseline justify-between gap-brand-2">
          <Heading level="h2">{project.name}</Heading>
          <DataText tone="muted">{dateFormatter.format(new Date(inquiry.receivedAt))}</DataText>
        </div>
        <Text tone="muted">
          {inquiry.clientName} · {countryName} · {inquiry.clientEmail}
        </Text>
        <Text tone="muted" measure>
          {MESSAGE_TEXT}
        </Text>
        <StatusPill status={submitted ? "approved" : "conditional"}>
          {submitted ? "Oferta złożona" : "Nowe zapytanie"}
        </StatusPill>
        <Button as="a" href={offerHref} variant={submitted ? "secondary" : "primary"} className="w-fit">
          {submitted ? "Zobacz ofertę" : "Przygotuj ofertę"}
        </Button>
      </Stack>
    </Card>
  );
}
