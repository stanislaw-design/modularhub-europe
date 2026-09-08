"use client";

import { ChevronDown, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useId, useRef, useState } from "react";
import { Button, Card, DataText, Input, Label, StatusPill, Stack, Text } from "@/components/ui";
import { getPlotAnalysisResult } from "@/lib/data/plot-analysis";
import type { EligibilityStatus, PlotAnalysisResult, Project } from "@/lib/data/types";
import { PLOT_ANALYSIS_PRICE_EUR } from "@/lib/pricing";
import type { PlotAnalysisRequest } from "./PlotDossierPanel";

interface PlotAnalysisRowProps {
  locale: string;
  project: Project;
  address: string;
  request: PlotAnalysisRequest;
  onChangeRequest: (patch: Partial<PlotAnalysisRequest>) => void;
}

const PLOT_AREA_MIN = 100;
const PLOT_AREA_MAX = 100_000;
const PAYMENT_DELAY_MS = 1200;

const priceFormatter = new Intl.NumberFormat("pl-PL", { maximumFractionDigits: 0 });

function isAreaValid(value: number | null): value is number {
  return value !== null && value >= PLOT_AREA_MIN && value <= PLOT_AREA_MAX;
}

export function PlotAnalysisRow({ locale, project, address, request, onChangeRequest }: PlotAnalysisRowProps) {
  const t = useTranslations("PlotAnalysisRow");
  const statusLabel: Record<EligibilityStatus, string> = {
    approved: t("status.approved"),
    conditional: t("status.conditional"),
    blocked: t("status.blocked"),
  };
  const [expanded, setExpanded] = useState(false);
  const [areaTouched, setAreaTouched] = useState(false);
  const [result, setResult] = useState<PlotAnalysisResult | null>(null);

  const triggerId = useId();
  const contentId = useId();
  const areaId = useId();
  const contentRef = useRef<HTMLDivElement | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (expanded) contentRef.current?.focus();
  }, [expanded]);

  useEffect(() => {
    if (request.phase !== "paying") return;
    timerRef.current = setTimeout(async () => {
      const analysis = await getPlotAnalysisResult(project.id);
      setResult(
        analysis ?? {
          projectId: project.id,
          status: "blocked",
          reason: t("noAnalysisData"),
        }
      );
      onChangeRequest({ phase: "result" });
    }, PAYMENT_DELAY_MS);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [request.phase, project.id]);

  const areaValid = isAreaValid(request.plotAreaM2);
  const canPay = address.trim().length > 0 && areaValid && request.phase === "idle";
  const offerHref = `/${locale}/klient/oferta?project=${project.id}&address=${encodeURIComponent(request.paidAddress ?? "")}`;

  function handlePay() {
    if (!canPay) return;
    setAreaTouched(true);
    onChangeRequest({ phase: "paying", paidAddress: address, paidAt: new Date() });
  }

  return (
    <Card as="div" padding="none" surface="v5" className="overflow-hidden">
      <button
        type="button"
        id={triggerId}
        aria-expanded={expanded}
        aria-controls={contentId}
        onClick={() => setExpanded((prev) => !prev)}
        className="focus-ring flex w-full items-center justify-between gap-brand-2 p-brand-3 text-left transition-colors hover:bg-brand-v5-line/20"
      >
        <span className="flex min-w-0 flex-1 flex-col gap-1">
          <Text as="span" variant="bodyL" surface="v5" className="font-medium">
            {project.name}
          </Text>
          <Text as="span" tone="muted" surface="v5">
            {project.producerName} · {project.floorAreaM2} m²
          </Text>
        </span>
        <ChevronDown
          className={`size-4 shrink-0 text-brand-v5-muted transition-transform ${expanded ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>
      {expanded && (
        <div
          id={contentId}
          role="region"
          aria-labelledby={triggerId}
          ref={contentRef}
          tabIndex={-1}
          className="focus-ring border-t border-brand-v5-line p-brand-3"
        >
          <Stack gap={3}>
            <Text tone="muted" surface="v5" measure>
              {t("scopeDescription")}
            </Text>
            <div className="flex items-baseline justify-between gap-brand-2">
              <Text as="span" variant="label" tone="muted" surface="v5">
                {t("servicePrice")}
              </Text>
              <DataText surface="v5">{priceFormatter.format(PLOT_ANALYSIS_PRICE_EUR)} €</DataText>
            </div>

            {request.phase === "idle" && (
              <Stack gap={2} align="start">
                <Stack gap={1} className="max-w-xs">
                  <Label htmlFor={areaId} required surface="v5">
                    {t("plotAreaLabel")}
                  </Label>
                  <Input
                    id={areaId}
                    name="plotAreaM2"
                    type="number"
                    min={PLOT_AREA_MIN}
                    max={PLOT_AREA_MAX}
                    required
                    surface="v5"
                    invalid={areaTouched && !areaValid}
                    aria-describedby={areaTouched && !areaValid ? `${areaId}-error` : undefined}
                    value={request.plotAreaM2 ?? ""}
                    onChange={(event) =>
                      onChangeRequest({
                        plotAreaM2: event.target.value === "" ? null : Number(event.target.value),
                      })
                    }
                    onBlur={() => setAreaTouched(true)}
                  />
                  {areaTouched && !areaValid && (
                    <p id={`${areaId}-error`} className="font-sans text-body text-status-blocked">
                      {t("plotAreaError", { min: PLOT_AREA_MIN, max: PLOT_AREA_MAX })}
                    </p>
                  )}
                </Stack>
                <Button
                  type="button"
                  onClick={handlePay}
                  disabled={address.trim().length === 0 || !areaValid}
                  surface="v5"
                  className="w-fit"
                >
                  {t("pay")}
                </Button>
              </Stack>
            )}

            {request.phase === "paying" && (
              <div aria-live="polite" className="flex items-center gap-brand-2">
                <Loader2 className="size-4 shrink-0 animate-spin" aria-hidden="true" />
                <Text tone="muted" surface="v5">
                  {t("processingPayment")}
                </Text>
              </div>
            )}

            {request.phase === "result" && result && (
              <div aria-live="polite">
                <Stack gap={2} align="start">
                  <StatusPill status={result.status}>{statusLabel[result.status]}</StatusPill>
                  <Text surface="v5">{result.reason}</Text>
                  <Text tone="muted" surface="v5" className="text-label normal-case tracking-normal">
                    {t("disclaimer")}
                  </Text>
                  {result.status !== "blocked" && (
                    <Button as="a" href={offerHref} surface="v5" className="w-fit">
                      {t("goToOffer")}
                    </Button>
                  )}
                </Stack>
              </div>
            )}
          </Stack>
        </div>
      )}
    </Card>
  );
}
