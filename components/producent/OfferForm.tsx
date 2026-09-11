"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { Button, Card, DataText, Input, Label, Stack, Text } from "@/components/ui";
import { submitOffer } from "@/lib/offer-actions";

export interface OfferFormProduct {
  productId: string;
  productName: string;
  available: boolean;
  defaultHousePriceEur: number;
}

interface OfferFormProps {
  inquiryId: string;
  products: OfferFormProduct[];
  initialTransportPriceEur: number;
  initialInstallationPriceEur: number;
  isRevision: boolean;
}

const priceFormatter = new Intl.NumberFormat("pl-PL", { maximumFractionDigits: 0 });

// Formularz realnej oferty (spec 0033 AC-1, AC-2, AC-5, AC-15): cena domu
// osobno per produkt tego producenta w zapytaniu, plus transport i montaż
// wpisywane ręcznie (funkcja 15 zastąpi transport realnym wyliczeniem
// później, patrz spec Follow-up). Produkt niedostępny (AC-5) zostaje
// wyceniany, tylko oznaczony ostrzeżeniem zamiast ukryty.
export function OfferForm({ inquiryId, products, initialTransportPriceEur, initialInstallationPriceEur, isRevision }: OfferFormProps) {
  const t = useTranslations("OfferForm");
  const [prices, setPrices] = useState<Record<string, number>>(() =>
    Object.fromEntries(products.map((product) => [product.productId, product.defaultHousePriceEur])),
  );
  const [transportPriceEur, setTransportPriceEur] = useState(initialTransportPriceEur);
  const [installationPriceEur, setInstallationPriceEur] = useState(initialInstallationPriceEur);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [isPending, startTransition] = useTransition();

  const total = Object.values(prices).reduce((sum, price) => sum + price, 0) + transportPriceEur + installationPriceEur;

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      const result = await submitOffer({
        inquiryId,
        items: products.map((product) => ({ productId: product.productId, housePriceEur: prices[product.productId] ?? 0 })),
        transportPriceEur,
        installationPriceEur,
      });
      if (!result.ok) {
        setError(result.error ?? t("genericError"));
        return;
      }
      setSubmitted(true);
    });
  }

  if (submitted) {
    return (
      <Card as="div" padding="md">
        <Text className="font-medium text-status-approved">{t("submittedMessage")}</Text>
      </Card>
    );
  }

  return (
    <Card as="div" padding="md">
      <Stack gap={3} align="start">
        <Text tone="muted" measure>
          {isRevision ? t("revisionIntro") : t("intro")}
        </Text>
        {products.map((product) => (
          <Stack key={product.productId} gap={1} className="w-full max-w-xs">
            <Label htmlFor={`offer-house-price-${product.productId}`} required>
              {t("housePriceInputLabel", { name: product.productName })}
            </Label>
            {!product.available && (
              <Text tone="muted" variant="label" className="text-status-conditional">
                {t("productUnavailable")}
              </Text>
            )}
            <Input
              id={`offer-house-price-${product.productId}`}
              type="number"
              min={0}
              required
              value={prices[product.productId] ?? 0}
              onChange={(event) =>
                setPrices((prev) => ({ ...prev, [product.productId]: Math.max(0, Number(event.target.value) || 0) }))
              }
            />
          </Stack>
        ))}
        <Stack gap={1} className="w-full max-w-xs">
          <Label htmlFor="offer-transport-price" required>
            {t("transportInputLabel")}
          </Label>
          <Input
            id="offer-transport-price"
            type="number"
            min={0}
            required
            value={transportPriceEur}
            onChange={(event) => setTransportPriceEur(Math.max(0, Number(event.target.value) || 0))}
          />
        </Stack>
        <Stack gap={1} className="w-full max-w-xs">
          <Label htmlFor="offer-installation-price" required>
            {t("installationInputLabel")}
          </Label>
          <Input
            id="offer-installation-price"
            type="number"
            min={0}
            required
            value={installationPriceEur}
            onChange={(event) => setInstallationPriceEur(Math.max(0, Number(event.target.value) || 0))}
          />
        </Stack>
        <Text as="span" variant="label" tone="muted">
          {t("totalLabel")}
        </Text>
        <DataText className="text-h2">{priceFormatter.format(total)} €</DataText>
        {error && (
          <p className="font-sans text-body text-status-blocked" role="alert">
            {error}
          </p>
        )}
        <Button type="button" onClick={handleSubmit} disabled={isPending} className="w-fit">
          {isPending ? t("submitting") : isRevision ? t("submitRevision") : t("submitOffer")}
        </Button>
      </Stack>
    </Card>
  );
}
