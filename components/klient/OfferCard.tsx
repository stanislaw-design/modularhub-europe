"use client";

import { CheckCircle2, XCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { Button, Card, DataText, Heading, Text } from "@/components/ui";
import { respondToOffer } from "@/lib/offer-actions";
import type { ClientOfferSummary } from "@/lib/db/queries";

interface OfferCardProps {
  offer: ClientOfferSummary;
}

const priceFormatter = new Intl.NumberFormat("pl-PL", { maximumFractionDigits: 0 });
const dateFormatter = new Intl.DateTimeFormat("pl-PL", { dateStyle: "medium", timeStyle: "short" });

// Jedna oferta na /klient/panel/zapytania/[id] (spec 0033 AC-6, AC-7, AC-8):
// rozbicie ceny (dom per produkt, transport, montaż, razem) i przyciski
// przyjmij/odrzuć wyłącznie dla ofert status='active'. Przyjęcie/odrzucenie
// są ostateczne (AC-9) — po sukcesie karta przechodzi w tryb tylko do
// odczytu bez ponownego pytania.
export function OfferCard({ offer }: OfferCardProps) {
  const t = useTranslations("OfferCard");
  const [status, setStatus] = useState(offer.status);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const total = offer.items.reduce((sum, item) => sum + item.housePriceCents, 0) + offer.transportPriceCents + offer.installationPriceCents;

  function handleRespond(decision: "accepted" | "rejected") {
    setError(null);
    startTransition(async () => {
      const result = await respondToOffer(offer.id, decision);
      if (!result.ok) {
        setError(result.error ?? t("genericError"));
        return;
      }
      setStatus(decision);
    });
  }

  return (
    <Card as="article" padding="md" surface="v5">
      <div className="flex flex-col gap-brand-2">
        <div className="flex flex-wrap items-baseline justify-between gap-brand-2">
          <Heading level="h3" surface="v5" className="text-body-l">
            {offer.producerName}
          </Heading>
          <Text tone="muted" surface="v5" variant="label">
            {dateFormatter.format(offer.submittedAt)}
          </Text>
        </div>

        <dl className="grid gap-brand-2 sm:grid-cols-2">
          {offer.items.map((item) => (
            <div key={item.productId}>
              <Text as="dt" variant="label" tone="muted" surface="v5">
                {item.productName}
              </Text>
              <dd>
                <DataText surface="v5">{priceFormatter.format(item.housePriceCents / 100)} €</DataText>
              </dd>
            </div>
          ))}
          <div>
            <Text as="dt" variant="label" tone="muted" surface="v5">
              {t("transportLabel")}
            </Text>
            <dd>
              <DataText surface="v5">{priceFormatter.format(offer.transportPriceCents / 100)} €</DataText>
            </dd>
          </div>
          <div>
            <Text as="dt" variant="label" tone="muted" surface="v5">
              {t("installationLabel")}
            </Text>
            <dd>
              <DataText surface="v5">{priceFormatter.format(offer.installationPriceCents / 100)} €</DataText>
            </dd>
          </div>
        </dl>

        <Text as="span" variant="label" tone="muted" surface="v5">
          {t("totalLabel")}
        </Text>
        <DataText surface="v5" className="text-h2">
          {priceFormatter.format(total / 100)} €
        </DataText>

        {error && (
          <p className="font-sans text-body text-status-blocked" role="alert">
            {error}
          </p>
        )}

        {status === "active" && (
          <div className="flex flex-wrap gap-brand-2">
            <Button type="button" onClick={() => handleRespond("accepted")} disabled={isPending} surface="v5" className="w-fit">
              {t("accept")}
            </Button>
            <Button
              type="button"
              onClick={() => handleRespond("rejected")}
              disabled={isPending}
              variant="secondary"
              surface="v5"
              className="w-fit"
            >
              {t("reject")}
            </Button>
          </div>
        )}
        {status === "accepted" && (
          <span className="inline-flex w-fit items-center gap-brand-1 rounded-data border border-status-approved/30 bg-status-approved/10 px-brand-2 py-1 text-label font-medium uppercase tracking-[0.1em] text-status-approved">
            <CheckCircle2 className="size-3.5 shrink-0" aria-hidden="true" />
            {t("accepted")}
          </span>
        )}
        {status === "rejected" && (
          <span className="inline-flex w-fit items-center gap-brand-1 rounded-data border border-status-blocked/30 bg-status-blocked/10 px-brand-2 py-1 text-label font-medium uppercase tracking-[0.1em] text-status-blocked">
            <XCircle className="size-3.5 shrink-0" aria-hidden="true" />
            {t("rejected")}
          </span>
        )}
      </div>
    </Card>
  );
}
