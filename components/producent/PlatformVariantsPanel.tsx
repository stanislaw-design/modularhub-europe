"use client";

import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { QuoteFormModal } from "@/components/producent/QuoteFormModal";
import { Button, Heading, Stack, Text } from "@/components/ui";
import type { PlatformQuoteVariant } from "@/lib/platform-quote-variants";
import { withdrawProjectQuoteVariant } from "@/lib/platform-project-actions";

const MAX_VARIANTS = 5;

interface PlatformVariantsPanelProps {
  projectRequestId: string;
  variants: PlatformQuoteVariant[];
  locale: string;
  // Czy projekt jeszcze przyjmuje oferty (termin, brak zakończonego wyboru).
  acceptingQuotes: boolean;
}

// Spec 0077 AC-44: lista aktywnych wariantów producenta w projekcie własnym. Producent może poprawić
// wariant (formularz wypełnia się jego danymi, ta sama nazwa zastępuje wersję), wycofać go albo dodać
// nowy (do pięciu). Po zakończeniu wyboru lub terminie panel jest tylko do odczytu.
export function PlatformVariantsPanel({ projectRequestId, variants, locale, acceptingQuotes }: PlatformVariantsPanelProps) {
  const t = useTranslations("ProducerPlatformVariants");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const priceFormatter = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });
  const dateFormatter = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });

  function withdraw(quoteId: string) {
    setError(null);
    startTransition(async () => {
      const result = await withdrawProjectQuoteVariant(quoteId);
      if (!result.ok) {
        setError(result.error ?? t("withdrawError"));
        return;
      }
      router.refresh();
    });
  }

  const canAdd = acceptingQuotes && variants.length < MAX_VARIANTS;

  return (
    <section className="flex flex-col gap-brand-3 border-t border-brand-steel pt-brand-4">
      <Heading level="h3">{t("heading")}</Heading>
      {variants.length === 0 ? (
        <Text tone="muted">{t("empty")}</Text>
      ) : (
        <div className="overflow-x-auto rounded-data border border-brand-steel">
          <table className="w-full min-w-[28rem] border-collapse text-body">
            <thead>
              <tr className="border-b border-brand-steel bg-brand-steel/20 text-left">
                <Text as="th" className="p-brand-2 font-medium">
                  {t("columnVariant")}
                </Text>
                <Text as="th" className="p-brand-2 font-medium">
                  {t("columnPrice")}
                </Text>
                <Text as="th" className="p-brand-2 font-medium">
                  {t("columnSubmitted")}
                </Text>
                <th className="p-brand-2" />
              </tr>
            </thead>
            <tbody>
              {variants.map((variant) => (
                <tr key={variant.id} className="border-b border-brand-steel/50 align-top last:border-b-0">
                  <Text as="td" className="p-brand-2 font-medium">
                    {variant.variantLabel}
                  </Text>
                  <Text as="td" className="p-brand-2">
                    {priceFormatter.format(variant.totalPriceCents / 100)} {variant.currency}
                  </Text>
                  <Text as="td" className="p-brand-2">
                    {dateFormatter.format(variant.submittedAt)}
                  </Text>
                  <td className="p-brand-2">
                    {acceptingQuotes && (
                      <div className="flex flex-wrap justify-end gap-brand-2">
                        <QuoteFormModal
                          key={`${variant.id}-${variant.submittedAt.getTime()}`}
                          projectRequestId={projectRequestId}
                          isRevision
                          requireVariant
                          initialValues={variant.initialValues}
                          triggerLabel={t("edit")}
                          compact
                        />
                        <Button type="button" variant="secondary" size="sm" disabled={isPending} onClick={() => withdraw(variant.id)}>
                          {isPending ? t("withdrawing") : t("withdraw")}
                        </Button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {error && (
        <p role="alert" className="text-body text-status-blocked">
          {error}
        </p>
      )}
      {acceptingQuotes && !canAdd && <Text tone="muted">{t("limitNote")}</Text>}
      {canAdd && (
        <Stack gap={1} className="sm:max-w-xs">
          <QuoteFormModal
            key={`new-${variants.map((variant) => variant.id).join("-")}`}
            projectRequestId={projectRequestId}
            isRevision={false}
            requireVariant
            triggerLabel={t("addVariant")}
          />
        </Stack>
      )}
    </section>
  );
}
