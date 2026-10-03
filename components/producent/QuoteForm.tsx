"use client";

import { useTranslations } from "next-intl";
import { useState, useTransition } from "react";
import { Button, Card, Input, Label, Stack, Text, Textarea } from "@/components/ui";
import { submitProjectQuote } from "@/lib/project-quote-actions";

interface QuoteFormProps {
  projectRequestId: string;
  isRevision: boolean;
}

// Formularz wyceny na tablicy ogłoszeń (spec 0062 AC-4): jedna cena całkowita
// plus opcjonalna cena za sztukę i czas realizacji, bez rozbicia na
// pozycje/transport/montaż jak OfferForm — tablica nie ma jeszcze konkretnych
// produktów do wycenienia osobno, tylko zagregowane dane zapytania.
export function QuoteForm({ projectRequestId, isRevision }: QuoteFormProps) {
  const t = useTranslations("QuoteForm");
  const [totalPriceEur, setTotalPriceEur] = useState(0);
  const [unitPriceEur, setUnitPriceEur] = useState("");
  const [proposedLeadTimeWeeks, setProposedLeadTimeWeeks] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      const result = await submitProjectQuote({
        projectRequestId,
        totalPriceEur,
        unitPriceEur: unitPriceEur.trim() ? Number(unitPriceEur) : undefined,
        proposedLeadTimeWeeks: proposedLeadTimeWeeks.trim() ? Number(proposedLeadTimeWeeks) : undefined,
        notes: notes.trim() ? notes.trim() : undefined,
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
        <Stack gap={1} className="w-full max-w-xs">
          <Label htmlFor="quote-total-price" required>
            {t("totalPriceLabel")}
          </Label>
          <Input
            id="quote-total-price"
            type="number"
            min={0}
            required
            value={totalPriceEur}
            onChange={(event) => setTotalPriceEur(Math.max(0, Number(event.target.value) || 0))}
          />
        </Stack>
        <Stack gap={1} className="w-full max-w-xs">
          <Label htmlFor="quote-unit-price">{t("unitPriceLabel")}</Label>
          <Input id="quote-unit-price" type="number" min={0} value={unitPriceEur} onChange={(event) => setUnitPriceEur(event.target.value)} />
        </Stack>
        <Stack gap={1} className="w-full max-w-xs">
          <Label htmlFor="quote-lead-time">{t("leadTimeLabel")}</Label>
          <Input id="quote-lead-time" type="number" min={1} value={proposedLeadTimeWeeks} onChange={(event) => setProposedLeadTimeWeeks(event.target.value)} />
        </Stack>
        <Stack gap={1} className="w-full max-w-sm">
          <Label htmlFor="quote-notes">{t("notesLabel")}</Label>
          <Textarea id="quote-notes" value={notes} onChange={(event) => setNotes(event.target.value)} />
        </Stack>
        {error && (
          <p className="font-sans text-body text-status-blocked" role="alert">
            {error}
          </p>
        )}
        <Button type="button" onClick={handleSubmit} disabled={isPending || totalPriceEur <= 0} className="w-fit">
          {isPending ? t("submitting") : isRevision ? t("submitRevision") : t("submitQuote")}
        </Button>
      </Stack>
    </Card>
  );
}
