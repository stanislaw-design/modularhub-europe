import { AlertCircle, CheckCircle2, LockKeyhole } from "lucide-react";
import { Button, Card, Heading, Stack, Text } from "@/components/ui";
import type { HouseAiReviewBlockCode } from "@/lib/house-ai-rules";

const blockLabel: Record<HouseAiReviewBlockCode, string> = {
  SESSION_NOT_REVIEWABLE: "Analiza nie jest jeszcze gotowa do przeglądu.",
  UNRESOLVED_CONFLICT: "Wybierz wartość dla każdego konfliktu.",
  LOW_CONFIDENCE_UNREVIEWED: "Przejrzyj każdą wartość o niskiej pewności.",
  DOCUMENT_ISSUE_UNACKNOWLEDGED: "Potwierdź wszystkie nieodczytane strony dokumentów.",
  PRODUCT_FIELD_CHANGED: "Rozstrzygnij zmiany wykonane w szkicu po rozpoczęciu analizy.",
  TRANSLATION_PENDING: "Poczekaj na przygotowanie tłumaczeń.",
  TRANSLATION_FAILED: "Ponów albo pomiń nieudane tłumaczenie.",
  INVALID_ENTITY_GRAPH: "Popraw przypisanie pozycji do wariantu projektu.",
  SCHEMA_VERSION_MISMATCH: "Uruchom analizę ponownie z aktualnym katalogiem pól.",
  DECISION_VALIDATION_ERROR: "Popraw wartość, która nie przechodzi walidacji.",
};

export function HouseAiReviewGate({ isReady, blockCodes, applied, applyEnabled = true, isApplying = false, onApply }: { isReady: boolean; blockCodes: HouseAiReviewBlockCode[]; applied: boolean; applyEnabled?: boolean; isApplying?: boolean; onApply: () => void }) {
  return (
    <Card as="section" padding="lg" className={isReady ? "border-status-approved" : "border-status-conditional"}>
      <Stack gap={3}>
        <div className="flex items-start gap-brand-2">
          {isReady ? <CheckCircle2 className="size-6 shrink-0 text-status-approved" aria-hidden="true" /> : <LockKeyhole className="size-6 shrink-0 text-status-conditional" aria-hidden="true" />}
          <div>
            <Heading level="h2">{applied ? "Dane zastosowane do szkicu" : isReady ? "Wynik gotowy do zastosowania" : "Zostały kroki do zamknięcia"}</Heading>
            <Text tone="muted">Zastosowanie aktualizuje wyłącznie szkic. Projekt nie zostanie opublikowany.</Text>
          </div>
        </div>
        {!isReady && (
          <ul className="grid gap-brand-1" aria-label="Blokady zastosowania">
            {blockCodes.map((code) => <li key={code} className="flex gap-brand-1"><AlertCircle className="mt-0.5 size-4 shrink-0 text-status-conditional" aria-hidden="true" /><Text as="span">{blockLabel[code]}</Text></li>)}
          </ul>
        )}
        <Button type="button" className="w-fit" disabled={!isReady || applied || !applyEnabled || isApplying} onClick={onApply}>
          {applied ? "Zastosowano" : !applyEnabled ? "Zapis atomowy jest jeszcze wyłączony" : isApplying ? "Zapisujemy…" : "Zastosuj zaakceptowane dane"}
        </Button>
      </Stack>
    </Card>
  );
}
