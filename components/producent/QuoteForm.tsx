"use client";

import { type ChangeEvent, useRef, useState, useTransition } from "react";
import { Upload } from "lucide-react";
import { useTranslations } from "next-intl";
import { ProjectQuotePdfUploadStep } from "@/components/producent/ProjectQuotePdfUploadStep";
import { Button, Card, Input, Label, Stack, Text, Textarea } from "@/components/ui";
import { submitProjectQuote, uploadProjectQuotePdf } from "@/lib/project-quote-actions";

interface QuoteFormProps {
  projectRequestId: string;
  isRevision: boolean;
}

// Formularz wyceny na tablicy ogłoszeń (spec 0062 AC-4): jedna cena całkowita
// plus opcjonalna cena za sztukę i czas realizacji, bez rozbicia na
// pozycje/transport/montaż jak OfferForm — tablica nie ma jeszcze konkretnych
// produktów do wycenienia osobno, tylko zagregowane dane zapytania.
//
// PDF wyceny (spec 0063 AC-11) jest wybierany w tym samym kroku co cena
// (jeden formularz, jedno kliknięcie), ale wgrywany dopiero po tym, jak
// submitProjectQuote zwróci quoteId: document.projectQuoteId wymaga, żeby
// wiersz project_quote już istniał (FK), więc technicznie to wciąż dwa
// wywołania serwera, tylko oba wykonane w tej samej akcji producenta, bez
// drugiego kliknięcia. Gdy samo wgranie PDF-a się nie powiedzie (np. zbyt
// duży plik), wycena i tak zostaje zapisana -- ProjectQuotePdfUploadStep
// zostaje pokazany jako krok do ponowienia, zamiast cofać udaną wycenę.
export function QuoteForm({ projectRequestId, isRevision }: QuoteFormProps) {
  const t = useTranslations("QuoteForm");
  const tPdf = useTranslations("ProjectQuotePdfUploadStep");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [totalPriceEur, setTotalPriceEur] = useState(0);
  const [unitPriceEur, setUnitPriceEur] = useState("");
  const [proposedLeadTimeWeeks, setProposedLeadTimeWeeks] = useState("");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [quoteId, setQuoteId] = useState<string | null>(null);
  const [uploadedFilename, setUploadedFilename] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;
    setFile(files && files.length > 0 ? files[0]! : null);
  }

  function handleSubmit() {
    setError(null);
    setPdfError(null);
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
      setQuoteId(result.quoteId ?? null);

      if (result.quoteId && file) {
        const uploadResult = await uploadProjectQuotePdf(result.quoteId, file);
        if (!uploadResult.ok) {
          setPdfError(uploadResult.error ?? tPdf("uploadError"));
        } else {
          setUploadedFilename(file.name);
        }
      }

      setSubmitted(true);
    });
  }

  if (submitted) {
    return (
      <Card as="div" padding="md">
        <Stack gap={3} align="start">
          <Text className="font-medium text-status-approved">{t("submittedMessage")}</Text>
          {pdfError && (
            <p className="font-sans text-body text-status-blocked" role="alert">
              {pdfError}
            </p>
          )}
          {quoteId && <ProjectQuotePdfUploadStep quoteId={quoteId} initialFilename={uploadedFilename} />}
        </Stack>
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
        <Stack gap={1} className="w-full max-w-sm">
          <Label htmlFor="quote-pdf-file">{tPdf("label")}</Label>
          <div className="flex items-center gap-brand-2">
            <input
              ref={fileInputRef}
              id="quote-pdf-file"
              type="file"
              accept="application/pdf"
              onChange={handleFileChange}
              className="sr-only"
              disabled={isPending}
            />
            <Button type="button" variant="secondary" size="sm" disabled={isPending} onClick={() => fileInputRef.current?.click()}>
              <Upload className="size-4" aria-hidden="true" />
              {file ? tPdf("replaceFile") : tPdf("chooseFile")}
            </Button>
            <Text as="span" variant="label" tone="muted" className="min-w-0 flex-1 truncate">
              {file ? file.name : tPdf("hint")}
            </Text>
          </div>
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
