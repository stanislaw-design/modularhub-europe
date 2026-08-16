"use client";

import { useState } from "react";
import { Button, Heading, Input, Label, Stack, Text } from "@/components/ui";
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
      <Heading level="h1">Panel działki</Heading>
      <Text tone="muted" measure>
        Podaj adres swojej działki raz, a potem sprawdź osobno każdy dom, o który wcześniej pytałeś —
        cena, płatność i wynik liczą się niezależnie dla każdego z nich.
      </Text>
      <Stack gap={1} className="max-w-md">
        <Label htmlFor="plot-address" required>
          Adres działki
        </Label>
        <Input
          id="plot-address"
          name="address"
          type="text"
          autoComplete="street-address"
          required
          value={address}
          onChange={(event) => setAddress(event.target.value)}
        />
      </Stack>
      <Stack gap={3}>
        {projects.map((project) => (
          <PlotAnalysisRow
            key={project.id}
            locale={locale}
            project={project}
            address={address}
            request={requests[project.id]}
            onChangeRequest={(patch) => updateRequest(project.id, patch)}
          />
        ))}
      </Stack>
      <Button as="a" href={resultsHref} variant="secondary" className="w-fit">
        Wróć do wyników
      </Button>
    </Stack>
  );
}
