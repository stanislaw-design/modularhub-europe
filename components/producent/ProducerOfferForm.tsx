"use client";

import { useEffect, useState } from "react";
import { Button, Card, DataText, Heading, Input, Label, Stack, Text } from "@/components/ui";
import type { Project, ProducerInquiry } from "@/lib/data/types";
import { getMockTransportPriceEur } from "@/lib/pricing";
import { getStoredOffer, saveOffer, type StoredProducerOffer } from "@/lib/producer-offers";

interface ProducerOfferFormProps {
  inquiry: ProducerInquiry;
  project: Project;
  countryName: string;
  listHref: string;
}

const priceFormatter = new Intl.NumberFormat("pl-PL", { maximumFractionDigits: 0 });
const dateFormatter = new Intl.DateTimeFormat("pl-PL", { dateStyle: "medium", timeStyle: "short" });

const MOCK_INSTALLATION_PRICE_EUR = 8000;

// Fixed, platform imposed message — same text every producer sees for this
// inquiry, mirroring ProducerInquiryRow / InquiryConfirmationCard.
const MESSAGE_TEXT =
  "Klient prosi o przygotowanie oferty na ten projekt, uwzględniającej dom, transport i montaż.";

export function ProducerOfferForm({ inquiry, project, countryName, listHref }: ProducerOfferFormProps) {
  const transportPriceEur = getMockTransportPriceEur(inquiry.deliveryCountry);

  const [housePriceEur, setHousePriceEur] = useState(project.priceMin);
  const [installationPriceEur, setInstallationPriceEur] = useState(MOCK_INSTALLATION_PRICE_EUR);
  // Odczyt localStorage po zamontowaniu — patrz precedens lib/gap-closure.ts
  // (możliwe krótkie mignięcie formularza przy pierwszym renderze).
  const [stored, setStored] = useState<StoredProducerOffer | null>(null);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- synchronizacja z localStorage po hydracji, patrz komentarz wyżej
    setStored(getStoredOffer(inquiry.id));
  }, [inquiry.id]);

  function handleSubmit() {
    const offer: StoredProducerOffer = {
      housePriceEur,
      installationPriceEur,
      submittedAt: new Date().toISOString(),
    };
    saveOffer(inquiry.id, offer);
    setStored(offer);
  }

  const summary = (
    <Stack gap={2} align="start">
      <Text tone="muted">
        {inquiry.clientName} · {countryName} · {inquiry.clientEmail}
      </Text>
      <Text tone="muted" measure>
        {MESSAGE_TEXT}
      </Text>
    </Stack>
  );

  if (stored) {
    const total = stored.housePriceEur + transportPriceEur + stored.installationPriceEur;
    return (
      <Stack gap={4}>
        <Heading level="h1">Oferta — {project.name}</Heading>
        {summary}
        <Card as="div" padding="md">
          <Stack gap={3} align="start">
            <Text className="font-medium text-status-approved">
              Oferta wysłana do klienta {dateFormatter.format(new Date(stored.submittedAt))}.
            </Text>
            <dl className="grid gap-brand-2 sm:grid-cols-3">
              <div>
                <Text as="dt" variant="label" tone="muted">
                  Cena domu
                </Text>
                <dd>
                  <DataText>{priceFormatter.format(stored.housePriceEur)} €</DataText>
                </dd>
              </div>
              <div>
                <Text as="dt" variant="label" tone="muted">
                  Transport
                </Text>
                <dd>
                  <DataText>{priceFormatter.format(transportPriceEur)} €</DataText>
                </dd>
              </div>
              <div>
                <Text as="dt" variant="label" tone="muted">
                  Montaż
                </Text>
                <dd>
                  <DataText>{priceFormatter.format(stored.installationPriceEur)} €</DataText>
                </dd>
              </div>
            </dl>
            <Text as="span" variant="label" tone="muted">
              Razem
            </Text>
            <DataText className="text-h2">{priceFormatter.format(total)} €</DataText>
            <Button as="a" href={listHref} variant="secondary" className="w-fit">
              Wróć do zapytań
            </Button>
          </Stack>
        </Card>
      </Stack>
    );
  }

  const total = housePriceEur + transportPriceEur + installationPriceEur;

  return (
    <Stack gap={4}>
      <Heading level="h1">Oferta — {project.name}</Heading>
      {summary}
      <Card as="div" padding="md">
        <Stack gap={3} align="start">
          <Heading level="h2">Szablon oferty</Heading>
          <Text tone="muted" measure>
            Ten sam szablon obowiązuje każdego producenta na platformie.
          </Text>
          <Stack gap={1} className="w-full max-w-xs">
            <Label htmlFor="offer-house-price" required>
              Cena domu (€)
            </Label>
            <Input
              id="offer-house-price"
              type="number"
              min={0}
              required
              value={housePriceEur}
              onChange={(event) => setHousePriceEur(Number(event.target.value) || 0)}
            />
          </Stack>
          <Stack gap={1} className="w-full max-w-xs">
            <Label htmlFor="offer-transport-price">Transport (€)</Label>
            <Input id="offer-transport-price" type="number" value={transportPriceEur} disabled readOnly />
            <Text tone="muted" variant="label">
              Wyliczone automatycznie dla kraju dostawy ({countryName}) — pole tylko do odczytu.
            </Text>
          </Stack>
          <Stack gap={1} className="w-full max-w-xs">
            <Label htmlFor="offer-installation-price" required>
              Montaż (€)
            </Label>
            <Input
              id="offer-installation-price"
              type="number"
              min={0}
              required
              value={installationPriceEur}
              onChange={(event) => setInstallationPriceEur(Number(event.target.value) || 0)}
            />
          </Stack>
          <Text as="span" variant="label" tone="muted">
            Razem
          </Text>
          <DataText className="text-h2">{priceFormatter.format(total)} €</DataText>
          <Button type="button" onClick={handleSubmit} className="w-fit">
            Wyślij ofertę
          </Button>
        </Stack>
      </Card>
      <Button as="a" href={listHref} variant="secondary" className="w-fit">
        Wróć do zapytań
      </Button>
    </Stack>
  );
}
