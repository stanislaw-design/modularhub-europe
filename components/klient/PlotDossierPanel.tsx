"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button, Heading, Input, Label, ScrollReveal, Stack, Text } from "@/components/ui";
import type { Project } from "@/lib/data/types";
import { PlotAnalysisRow } from "./PlotAnalysisRow";

export interface PlotAnalysisRequest {
  plotAreaM2: number | null;
  phase: "idle" | "paying" | "result";
  paidAddress: string | null;
  paidAt: Date | null;
}

function initialRequest(): PlotAnalysisRequest {
  return { plotAreaM2: null, phase: "idle", paidAddress: null, paidAt: null };
}

interface PlotDossierPanelProps {
  locale: string;
  projects: Project[];
  resultsHref: string;
}

export function PlotDossierPanel({ locale, projects, resultsHref }: PlotDossierPanelProps) {
  const t = useTranslations("PlotDossierPanel");
  const [address, setAddress] = useState("");
  const [requests, setRequests] = useState<Record<string, PlotAnalysisRequest>>(() =>
    Object.fromEntries(projects.map((project) => [project.id, initialRequest()]))
  );

  // Each project keeps its own PlotAnalysisRequest slice; updating one never
  // touches another (spec 0006 AC-8).
  function updateRequest(projectId: string, patch: Partial<PlotAnalysisRequest>) {
    setRequests((prev) => ({ ...prev, [projectId]: { ...prev[projectId], ...patch } }));
  }

  return (
    <Stack gap={4}>
      <Heading level="h1" surface="v5">
        {t("heading")}
      </Heading>
      <Text tone="muted" surface="v5" measure>
        {t("intro")}
      </Text>
      <Stack gap={1} className="max-w-md">
        <Label htmlFor="plot-address" required surface="v5">
          {t("addressLabel")}
        </Label>
        <Input
          id="plot-address"
          name="address"
          type="text"
          autoComplete="street-address"
          required
          surface="v5"
          value={address}
          onChange={(event) => setAddress(event.target.value)}
        />
      </Stack>
      <Stack gap={3}>
        {projects.map((project, index) => (
          <ScrollReveal key={project.id} style={{ transitionDelay: `${Math.min(index * 80, 480)}ms` }}>
            <PlotAnalysisRow
              locale={locale}
              project={project}
              address={address}
              request={requests[project.id]}
              onChangeRequest={(patch) => updateRequest(project.id, patch)}
            />
          </ScrollReveal>
        ))}
      </Stack>
      <Button as="a" href={resultsHref} variant="secondary" surface="v5" className="w-fit">
        {t("backToResults")}
      </Button>
    </Stack>
  );
}
