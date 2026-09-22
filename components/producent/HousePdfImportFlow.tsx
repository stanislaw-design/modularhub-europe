"use client";

import { AlertTriangle, FileCheck2, ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card, FileUpload, Heading, Stack, Text } from "@/components/ui";
import type { HouseAiReviewFixture } from "@/lib/data/fixtures/house-ai-import";
import {
  createAiProductDraft,
  createAiSourceUpload,
  discardAiSourceUpload,
  finalizeAiSourceUpload,
  startAiExtraction,
} from "@/lib/house-ai-import-actions";
import { resolveHousePdfImportView, type HousePdfImportView } from "@/lib/house-ai-import-contract";
import { getHouseAiIdentityKey, getHouseAiReviewGate, normalizeHouseAiValue, type HouseAiReviewBlockCode } from "@/lib/house-ai-rules";
import type { HouseAiCandidate, HouseAiDecision } from "@/lib/house-ai-schemas";
import { groupHouseAiReviewFields } from "@/lib/house-ai-review-groups";
import { acknowledgeAiDocumentIssue, applyAiExtraction, getAiReviewGate, saveAiFieldDecision } from "@/lib/house-ai-actions";
import { HouseAiEvidencePanel } from "./HouseAiEvidencePanel";
import { HouseAiFieldReview } from "./HouseAiFieldReview";
import { HouseAiReviewGate } from "./HouseAiReviewGate";
import { HousePdfImportProgress } from "./HousePdfImportProgress";

export function HousePdfImportFlow({
  locale,
  initialView,
  fixtures,
  persisted = false,
}: {
  locale: string;
  initialView: HousePdfImportView;
  fixtures: { processing: HouseAiReviewFixture; review: HouseAiReviewFixture; error: HouseAiReviewFixture };
  persisted?: boolean;
}) {
  const router = useRouter();
  const tFieldReview = useTranslations("HouseAiFieldReview");
  const [view, setView] = useState(initialView);
  const [files, setFiles] = useState<File[]>([]);
  const [declaredSafe, setDeclaredSafe] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [decisions, setDecisions] = useState<HouseAiDecision[]>(fixtures.review.decisions);
  const [decisionRevision, setDecisionRevision] = useState(fixtures.review.decisionRevision);
  const [acknowledgedIssues, setAcknowledgedIssues] = useState<string[]>(fixtures.review.documentIssues.filter((issue) => issue.acknowledged).map((issue) => issue.id));
  const [activeCandidate, setActiveCandidate] = useState<HouseAiCandidate | null>(null);
  const [applied, setApplied] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [persistenceError, setPersistenceError] = useState<string | null>(null);
  const [serverBlockCodes, setServerBlockCodes] = useState<HouseAiReviewBlockCode[] | undefined>(undefined);

  const reviewFixture = fixtures.review;
  const hasFinalizedDocuments = persisted && reviewFixture.documents.length > 0;
  const effectiveView: HousePdfImportView = persisted ? resolveHousePdfImportView(reviewFixture.status) : view;
  const reviewIssues = reviewFixture.documentIssues.map((issue) => ({ ...issue, acknowledged: acknowledgedIssues.includes(issue.id) }));
  const localGate = getHouseAiReviewGate({ status: reviewFixture.status, candidates: reviewFixture.fields.flatMap((field) => field.candidates), decisions, documentIssues: reviewIssues, conflictingIdentityKeys: reviewFixture.conflictingIdentityKeys });
  const gate = serverBlockCodes ? { isApplyReady: serverBlockCodes.length === 0, blockCodes: serverBlockCodes } : localGate;

  useEffect(() => {
    if (!persisted || effectiveView !== "processing") return;
    const interval = window.setInterval(() => router.refresh(), 5000);
    return () => window.clearInterval(interval);
  }, [effectiveView, persisted, router]);

  async function refreshServerGate() {
    if (!persisted) return;
    const result = await getAiReviewGate(reviewFixture.sessionId);
    if (result.ok) setServerBlockCodes(result.blockCodes ?? []);
  }

  function handleFilesChange(nextFiles: File[]) {
    if (nextFiles.length > 5) {
      setUploadError("Jedna analiza może zawierać najwyżej pięć plików PDF.");
      return;
    }
    if (nextFiles.some((file) => !file.name.toLocaleLowerCase("pl").endsWith(".pdf") || file.type !== "application/pdf")) {
      setUploadError("Wybierz wyłącznie pliki PDF.");
      return;
    }
    if (nextFiles.some((file) => file.size > 25 * 1024 * 1024)) {
      setUploadError("Każdy plik może mieć najwyżej 25 MB.");
      return;
    }
    setUploadError(null);
    setFiles(nextFiles);
  }

  async function startAnalysis() {
    if (files.length === 0 && !hasFinalizedDocuments) {
      setUploadError("Dodaj co najmniej jeden plik PDF.");
      return;
    }
    if (!declaredSafe) {
      setUploadError("Potwierdź deklarację dotyczącą danych osobowych i sekretów.");
      return;
    }
    setUploadError(null);
    setIsStarting(true);
    try {
      setUploadStatus("Tworzymy pusty szkic projektu i prywatną sesję.");
      const draft = await createAiProductDraft();
      if (!draft.ok || !draft.sessionId) throw new Error(draft.error ?? "Nie udało się utworzyć szkicu.");

      for (const [index, file] of files.entries()) {
        setUploadStatus(`Wgrywamy i sprawdzamy plik ${index + 1} z ${files.length}.`);
        const reservation = await createAiSourceUpload({
          sessionId: draft.sessionId,
          filename: file.name,
          sizeBytes: file.size,
          contentType: file.type,
        });
        if (!reservation.ok || !reservation.sourceDocumentId || !reservation.uploadUrl || !reservation.uploadHeaders) {
          throw new Error(reservation.error ?? "Nie udało się przygotować uploadu.");
        }
        let response: Response;
        try {
          response = await fetch(reservation.uploadUrl, {
            method: "PUT",
            headers: reservation.uploadHeaders,
            body: file,
          });
        } catch {
          await discardAiSourceUpload({ sessionId: draft.sessionId, sourceDocumentId: reservation.sourceDocumentId });
          throw new Error("Nie udało się przesłać pliku do prywatnego magazynu.");
        }
        if (!response.ok) {
          await discardAiSourceUpload({ sessionId: draft.sessionId, sourceDocumentId: reservation.sourceDocumentId });
          throw new Error("Nie udało się przesłać pliku do prywatnego magazynu.");
        }
        const finalized = await finalizeAiSourceUpload({
          sessionId: draft.sessionId,
          sourceDocumentId: reservation.sourceDocumentId,
        });
        if (!finalized.ok) throw new Error(finalized.error ?? "Plik PDF nie przeszedł walidacji.");
      }

      setUploadStatus("Przekazujemy sesję do bezpiecznej kolejki analizy.");
      const started = await startAiExtraction({ sessionId: draft.sessionId, declarationConfirmed: true });
      if (!started.ok) throw new Error(started.error ?? "Nie udało się uruchomić analizy.");
      setView("processing");
      router.replace(`/${locale}/producer/panel/project/import?sessionId=${draft.sessionId}`);
      router.refresh();
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Nie udało się rozpocząć analizy.");
      setUploadStatus(null);
    } finally {
      setIsStarting(false);
    }
  }

  async function submitFieldDecision(
    identity: { fieldPath: HouseAiCandidate["fieldPath"]; entityKey: string | null; parentEntityKey: string | null },
    input: { selectedCandidateId: string | null; finalValue: unknown; decisionType: HouseAiDecision["decisionType"] },
  ) {
    const identityKey = getHouseAiIdentityKey(identity);
    const previous = decisions.find((decision) => getHouseAiIdentityKey(decision) === identityKey);
    if (persisted) {
      const result = await saveAiFieldDecision({
        sessionId: reviewFixture.sessionId,
        fieldPath: identity.fieldPath,
        entityKey: identity.entityKey,
        parentEntityKey: identity.parentEntityKey,
        selectedCandidateId: input.selectedCandidateId,
        finalValue: input.finalValue,
        decisionType: input.decisionType,
        expectedFieldVersion: previous?.version ?? 0,
        expectedDecisionRevision: decisionRevision,
        comparedValueHash: null,
      });
      if (!result.ok || result.fieldVersion === undefined || result.decisionRevision === undefined) {
        setPersistenceError(result.error ?? "Nie udało się zapisać decyzji.");
        return;
      }
      setDecisionRevision(result.decisionRevision);
      setPersistenceError(null);
    }
    setDecisions((current) => [
      ...current.filter((decision) => getHouseAiIdentityKey(decision) !== identityKey),
      { fieldPath: identity.fieldPath, entityKey: identity.entityKey, parentEntityKey: identity.parentEntityKey, selectedCandidateId: input.selectedCandidateId, finalValue: input.finalValue, decisionType: input.decisionType, version: previous?.version ? previous.version + 1 : 1 },
    ]);
    await refreshServerGate();
  }

  async function selectCandidate(candidate: HouseAiCandidate) {
    setActiveCandidate(candidate);
    await submitFieldDecision(candidate, { selectedCandidateId: candidate.id, finalValue: candidate.normalizedValue, decisionType: "accepted" });
  }

  async function submitManualValue(field: HouseAiReviewFixture["fields"][number], rawValue: unknown) {
    const firstCandidate = field.candidates[0];
    if (!firstCandidate) return;
    const finalValue = normalizeHouseAiValue(field.fieldPath, rawValue);
    await submitFieldDecision(firstCandidate, { selectedCandidateId: null, finalValue, decisionType: "manual" });
  }

  async function rejectField(field: HouseAiReviewFixture["fields"][number]) {
    const firstCandidate = field.candidates[0];
    if (!firstCandidate) return;
    await submitFieldDecision(firstCandidate, { selectedCandidateId: null, finalValue: null, decisionType: "not_applicable" });
  }

  async function acknowledgeIssue(issueId: string) {
    if (acknowledgedIssues.includes(issueId)) return;
    if (persisted) {
      const result = await acknowledgeAiDocumentIssue({ sessionId: reviewFixture.sessionId, issueId });
      if (!result.ok) {
        setPersistenceError(result.error ?? "Nie udało się zapisać potwierdzenia.");
        return;
      }
    }
    setAcknowledgedIssues((current) => [...current, issueId]);
    setPersistenceError(null);
    await refreshServerGate();
  }

  async function handleApply() {
    if (!persisted) {
      setApplied(true);
      return;
    }
    setIsApplying(true);
    setPersistenceError(null);
    const result = await applyAiExtraction({ sessionId: reviewFixture.sessionId, expectedDecisionRevision: decisionRevision });
    setIsApplying(false);
    if (!result.ok) {
      setPersistenceError(result.error ?? "Nie udało się zastosować wyniku do szkicu.");
      return;
    }
    setApplied(true);
    if (result.productId) router.push(`/${locale}/producer/panel/products/${result.productId}/edit`);
    router.refresh();
  }

  const decisionByIdentity = new Map(decisions.map((decision) => [getHouseAiIdentityKey(decision), decision]));
  const { standaloneFields, roomGroups, variantGroups } = groupHouseAiReviewFields(reviewFixture.fields);

  function renderReviewField(field: HouseAiReviewFixture["fields"][number], headingLevel: "h3" | "h4" = "h3") {
    const firstCandidate = field.candidates[0];
    const identity = firstCandidate ? getHouseAiIdentityKey(firstCandidate) : null;
    return (
      <HouseAiFieldReview
        key={identity ?? field.fieldPath}
        field={field}
        decision={identity ? decisionByIdentity.get(identity) ?? null : null}
        hasConflict={identity ? reviewFixture.conflictingIdentityKeys.includes(identity) : false}
        headingLevel={headingLevel}
        onInspect={setActiveCandidate}
        onSelect={selectCandidate}
        onManualValue={(rawValue) => void submitManualValue(field, rawValue)}
        onReject={() => void rejectField(field)}
      />
    );
  }

  function variantGroupTitle(group: (typeof variantGroups)[number], index: number): string {
    const labelField = group.fields.find((field) => field.fieldPath === "variants[].variantLabel");
    const firstCandidate = labelField?.candidates[0];
    if (!labelField || !firstCandidate) return tFieldReview("variantGroupFallback", { number: index + 1 });
    const identity = getHouseAiIdentityKey(firstCandidate);
    const groupDecision = decisionByIdentity.get(identity);
    const selected = labelField.candidates.find((candidate) => candidate.id === groupDecision?.selectedCandidateId);
    const unambiguous = labelField.candidates.length === 1 ? firstCandidate : null;
    const manualValue = groupDecision?.decisionType === "manual" ? groupDecision.finalValue : undefined;
    const value = manualValue ?? selected?.normalizedValue ?? unambiguous?.normalizedValue;
    return value === undefined || value === null
      ? tFieldReview("variantGroupFallback", { number: index + 1 })
      : tFieldReview("variantGroupTitle", { label: String(value) });
  }

  function roomGroupTitle(group: (typeof roomGroups)[number], index: number): string {
    const nameField = group.fields.find((field) => field.fieldPath === "rooms[].name");
    const firstCandidate = nameField?.candidates[0];
    if (!nameField || !firstCandidate) return tFieldReview("roomGroupFallback", { number: index + 1 });
    const identity = getHouseAiIdentityKey(firstCandidate);
    const groupDecision = decisionByIdentity.get(identity);
    const selected = nameField.candidates.find((candidate) => candidate.id === groupDecision?.selectedCandidateId);
    const unambiguous = nameField.candidates.length === 1 ? firstCandidate : null;
    const manualValue = groupDecision?.decisionType === "manual" ? groupDecision.finalValue : undefined;
    const value = manualValue ?? selected?.normalizedValue ?? unambiguous?.normalizedValue;
    return value === undefined || value === null
      ? tFieldReview("roomGroupFallback", { number: index + 1 })
      : tFieldReview("roomGroupTitle", { label: String(value) });
  }

  return (
    <Stack gap={5}>
      <header className="grid gap-brand-3 border-b border-brand-steel pb-brand-4 lg:grid-cols-12">
        <div className="lg:col-span-8">
          <Text as="p" variant="label" tone="muted">Kreator projektu domu</Text>
          <Heading level="h1">Uzupełnij szkic na podstawie PDF</Heading>
          <Text variant="bodyL" tone="muted" measure>Asystent przygotuje propozycje pól wraz z dokumentem, stroną i fragmentem. Ty rozstrzygasz każdą niepewną wartość, a wynik pozostaje szkicem.</Text>
        </div>
        <Card as="div" padding="md" className="lg:col-span-4">
          <Stack gap={2}>
            <div className="flex items-center gap-brand-1"><ShieldCheck className="size-5 text-status-approved" aria-hidden="true" /><Text as="strong">Prywatny proces przeglądu</Text></div>
            <Text tone="muted">Dokument nie ma publicznego adresu. Do kolejki trafia wyłącznie identyfikator sesji.</Text>
          </Stack>
        </Card>
      </header>

      {effectiveView === "upload" && (
        <div className="grid gap-brand-4 lg:grid-cols-12">
          <Card as="section" padding="lg" className="lg:col-span-8">
            <Stack gap={4}>
              <div><Heading level="h2">Dodaj dokumenty ofertowe</Heading><Text tone="muted">Od 1 do 5 PDF, do 25 MB każdy i maksymalnie 200 stron łącznie.</Text></div>
              <FileUpload
                id="house-pdf-files"
                label="Pliki PDF"
                files={files.map((file) => ({ name: file.name, sizeBytes: file.size }))}
                onFilesChange={() => undefined}
                nativeFiles={files}
                onNativeFilesChange={handleFilesChange}
                accept="application/pdf,.pdf"
                required={!hasFinalizedDocuments}
                notice="Pliki trafią do prywatnego magazynu dopiero po uruchomieniu analizy."
              />
              {hasFinalizedDocuments && (
                <div className="rounded-data border border-brand-steel p-brand-2">
                  <Text as="p" variant="label" tone="muted">Już zweryfikowane w tej sesji</Text>
                  <ul className="mt-brand-1 grid gap-1">
                    {reviewFixture.documents.map((item) => (
                      <li key={item.id}><Text as="span">{item.name}, {item.pages} str.</Text></li>
                    ))}
                  </ul>
                </div>
              )}
              <label className="focus-within:focus-ring flex cursor-pointer items-start gap-brand-2 rounded-data border border-brand-steel p-brand-2">
                <input type="checkbox" className="focus-ring mt-1 size-5 accent-brand-passage-blue" checked={declaredSafe} onChange={(event) => setDeclaredSafe(event.target.checked)} />
                <span><Text as="strong">Potwierdzam, że dokumenty nie zawierają danych osobowych ani sekretów.</Text><Text as="span" tone="muted" className="block">W przypadku skanu kontrola treści obrazu nastąpi dopiero podczas OCR w europejskim środowisku Azure.</Text></span>
              </label>
              {uploadError && <p role="alert" className="rounded-data bg-status-blocked/10 p-brand-2 text-body text-status-blocked">{uploadError}</p>}
              {uploadStatus && <p role="status" className="rounded-data bg-brand-passage-blue/10 p-brand-2 text-body text-brand-foundation-navy">{uploadStatus}</p>}
              <div className="flex flex-wrap gap-brand-2">
                <Button type="button" onClick={() => void startAnalysis()} disabled={isStarting}>{isStarting ? "Uruchamiamy analizę…" : "Rozpocznij bezpieczną analizę"}</Button>
                <Button as="a" href={`/${locale}/producer/panel/project`} variant="secondary">Wróć do ręcznego kreatora</Button>
              </div>
            </Stack>
          </Card>
          <aside className="lg:col-span-4">
            <Stack gap={3}>
              <Heading level="h2">Co wydarzy się dalej</Heading>
              <ol className="grid gap-brand-2">
                {["Sprawdzimy format, bezpieczeństwo i liczbę stron.", "Rozpoznamy tekst, tabele i strukturę każdej strony.", "Pokażemy propozycje do Twojej decyzji, bez publikacji."].map((item, index) => <li key={item} className="flex gap-brand-2"><span className="flex size-8 shrink-0 items-center justify-center rounded-data bg-brand-foundation-navy text-label text-brand-warm-white">{index + 1}</span><Text as="span">{item}</Text></li>)}
              </ol>
            </Stack>
          </aside>
        </div>
      )}

      {effectiveView === "processing" && (
        <Stack gap={4}>
          <HousePdfImportProgress progress={fixtures.processing.progress} currentStage={fixtures.processing.currentStage} />
          <Card as="section" padding="lg">
            <Stack gap={3} align="start">
              <FileCheck2 className="size-8 text-brand-passage-blue" aria-hidden="true" />
              <Heading level="h2">Możesz wrócić do panelu</Heading>
              <Text tone="muted" measure>Analiza działa w tle. Zamknięcie tej strony jej nie anuluje. Gdy sesja osiągnie stan review_ready, ekran automatycznie przejdzie do przeglądu propozycji.</Text>
              <Button as="a" href={`/${locale}/producer/panel/products`} variant="secondary">Wróć do produktów</Button>
            </Stack>
          </Card>
        </Stack>
      )}

      {effectiveView === "error" && (
        <Card as="section" padding="lg" className="border-status-blocked">
          <Stack gap={3} align="start"><AlertTriangle className="size-8 text-status-blocked" aria-hidden="true" /><Heading level="h2">Nie udało się zakończyć analizy</Heading><Text tone="muted">Bezpieczny kod: OCR_UNAVAILABLE. Dokument pozostał prywatny, a żadne niezwalidowane dane nie trafiły do szkicu.</Text><Button type="button" variant="secondary" onClick={() => setView("upload")}>Wybierz dokumenty ponownie</Button></Stack>
        </Card>
      )}

      {effectiveView === "review" && (
        <Stack gap={4}>
          <HousePdfImportProgress progress={100} currentStage={reviewFixture.currentStage} />
          <div><Heading level="h2">Przejrzyj propozycje pól</Heading><Text tone="muted">Każdy konflikt i każda wartość o niskiej pewności wymaga Twojej jawnej decyzji.</Text></div>
          {persistenceError && <p role="alert" className="rounded-data bg-status-blocked/10 p-brand-2 text-body text-status-blocked">{persistenceError}</p>}
          <div className="grid gap-brand-4 lg:grid-cols-12">
            <div className="grid gap-brand-3 lg:col-span-8">
              {standaloneFields.map((field) => renderReviewField(field))}
              {roomGroups.map((group, index) => (
                <section key={group.entityKey} className="grid gap-brand-3 rounded-card border-2 border-brand-steel bg-brand-foundation-navy/20 p-brand-3" aria-labelledby={`room-group-${index}`}>
                  <div>
                    <Text as="p" variant="label" tone="muted">{tFieldReview("roomGroupEyebrow")}</Text>
                    <div id={`room-group-${index}`}><Heading level="h3">{roomGroupTitle(group, index)}</Heading></div>
                  </div>
                  {group.fields.map((field) => renderReviewField(field, "h4"))}
                </section>
              ))}
              {variantGroups.map((group, index) => (
                <section key={group.entityKey} className="grid gap-brand-3 rounded-card border-2 border-brand-passage-blue/40 bg-brand-passage-blue/5 p-brand-3" aria-labelledby={`variant-group-${index}`}>
                  <div>
                    <Text as="p" variant="label" tone="muted">{tFieldReview("variantGroupEyebrow")}</Text>
                    <div id={`variant-group-${index}`}><Heading level="h3">{variantGroupTitle(group, index)}</Heading></div>
                  </div>
                  {group.fields.map((field) => renderReviewField(field, "h4"))}
                </section>
              ))}
              {reviewIssues.map((issue) => (
                <label key={issue.id} className="focus-within:focus-ring flex cursor-pointer items-start gap-brand-2 rounded-card border border-status-conditional bg-status-conditional/10 p-brand-3">
                  <input type="checkbox" className="focus-ring mt-1 size-5 accent-brand-passage-blue" checked={issue.acknowledged} onChange={(event) => { if (event.target.checked) void acknowledgeIssue(issue.id); }} />
                  <span><Text as="strong">Nie odczytano strony {issue.pageFrom} w {issue.documentName}</Text><Text as="span" tone="muted" className="block">Potwierdzam, że rozumiem brak i chcę kontynuować z pozostałymi danymi.</Text></span>
                </label>
              ))}
            </div>
            <div className="lg:col-span-4"><HouseAiEvidencePanel candidate={activeCandidate} /></div>
          </div>
          <HouseAiReviewGate isReady={gate.isApplyReady} blockCodes={gate.blockCodes} applied={applied} isApplying={isApplying} onApply={() => void handleApply()} />
        </Stack>
      )}
    </Stack>
  );
}
