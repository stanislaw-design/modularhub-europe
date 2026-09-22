import { FileText, Quote } from "lucide-react";
import { Card, DataText, Heading, Stack, Text } from "@/components/ui";
import type { HouseAiCandidate } from "@/lib/house-ai-schemas";

export function HouseAiEvidencePanel({ candidate }: { candidate: HouseAiCandidate | null }) {
  return (
    <aside aria-labelledby="evidence-heading" className="lg:sticky lg:top-brand-3 lg:self-start">
      <Card as="div" padding="md">
        <Stack gap={3}>
          <div>
            <Text as="p" variant="label" tone="muted">Źródło propozycji</Text>
            <div id="evidence-heading"><Heading level="h2">Dowody z dokumentu</Heading></div>
          </div>
          {candidate === null ? (
            <Text tone="muted">Wybierz propozycję pola, aby zobaczyć jej dokument, stronę i fragment.</Text>
          ) : candidate.evidence.length === 0 ? (
            <Text tone="muted">Ta wartość nie ma fragmentu źródłowego. Jest tłumaczeniem albo treścią wygenerowaną z zatwierdzonego kontekstu.</Text>
          ) : (
            <>
              {candidate.normalizationMetadata && (
                <div className="rounded-data border border-brand-passage-blue/40 bg-brand-passage-blue/5 p-brand-2">
                  <Text as="p" variant="label">Przeliczenie ceny netto</Text>
                  <DataText tone="muted">
                    {candidate.normalizationMetadata.sourceAmount} {candidate.normalizationMetadata.sourceCurrency} ÷ {candidate.normalizationMetadata.rate} = {new Intl.NumberFormat("pl-PL", { style: "currency", currency: "EUR" }).format(Number(candidate.normalizedValue) / 100)}
                  </DataText>
                  <DataText tone="muted">Kurs referencyjny EBC z {new Intl.DateTimeFormat("pl-PL").format(new Date(`${candidate.normalizationMetadata.rateDate}T00:00:00Z`))}. Cena pozostaje edytowalna przed zastosowaniem.</DataText>
                </div>
              )}
              <ul className="flex flex-col gap-brand-2">
                {candidate.evidence.map((evidence) => (
                  <li key={evidence.id} className="rounded-data border border-brand-steel bg-brand-steel/20 p-brand-2">
                    <div className="flex items-center gap-brand-1">
                      <FileText className="size-4 text-brand-passage-blue" aria-hidden="true" />
                      <Text as="span">{evidence.documentName}</Text>
                    </div>
                    {evidence.pageNumber !== null && <DataText tone="muted">Strona {evidence.pageNumber}</DataText>}
                    {evidence.excerpt && (
                      <blockquote className="mt-brand-2 flex gap-brand-1 border-l-2 border-brand-passage-blue pl-brand-2">
                        <Quote className="size-4 shrink-0 text-brand-passage-blue" aria-hidden="true" />
                        <Text as="p">{evidence.excerpt}</Text>
                      </blockquote>
                    )}
                  </li>
                ))}
              </ul>
            </>
          )}
        </Stack>
      </Card>
    </aside>
  );
}
