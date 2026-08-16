"use client";

import { ChevronDown } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { Button, Card, StatusPill, Stack, Text } from "@/components/ui";
import type { ExportReadinessCountryStatus } from "@/lib/data/types";
import { isCountryResolved } from "@/lib/gap-closure";

interface ExportReadinessCountryRowProps {
  locale: string;
  countryName: string;
  projectName: string | null;
  entry: ExportReadinessCountryStatus;
}

const statusLabel: Record<ExportReadinessCountryStatus["status"], string> = {
  approved: "Dopuszczone",
  conditional: "Warunkowo dopuszczone",
  blocked: "Niedopuszczone",
};

const RESOLVED_REASON_TEXT =
  "Luki domknięte poprzez zakup pakietu domykania luk (zapisane w tej przeglądarce).";

export function ExportReadinessCountryRow({
  locale,
  countryName,
  projectName,
  entry,
}: ExportReadinessCountryRowProps) {
  const [expanded, setExpanded] = useState(false);
  // Odczyt localStorage tylko po stronie klienta, po zamontowaniu — patrz spec
  // 0010, Consequences (możliwe krótkie mignięcie akordeonu przy pierwszym renderze).
  const [resolved, setResolved] = useState(false);
  const triggerId = useId();
  const contentId = useId();
  const contentRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (entry.status === "conditional") {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- synchronizacja z localStorage po hydracji, patrz komentarz wyżej
      setResolved(isCountryResolved(entry.countryCode));
    }
  }, [entry.status, entry.countryCode]);

  useEffect(() => {
    if (expanded) contentRef.current?.focus();
  }, [expanded]);

  const effectiveStatus = resolved ? "approved" : entry.status;
  const effectiveReason = resolved ? RESOLVED_REASON_TEXT : entry.reason;

  if (effectiveStatus !== "conditional") {
    return (
      <Card as="div" padding="md">
        <Stack gap={2} align="start">
          <Text as="span" variant="bodyL" className="font-medium">
            {countryName}
          </Text>
          <StatusPill status={effectiveStatus}>{statusLabel[effectiveStatus]}</StatusPill>
          <Text tone="muted">{effectiveReason}</Text>
        </Stack>
      </Card>
    );
  }

  const gapClosureHref = `/${locale}/producent/domykanie-luk?kraj=${entry.countryCode}${
    projectName ? `&nazwa=${encodeURIComponent(projectName)}` : ""
  }`;

  return (
    <Card as="div" padding="none" className="overflow-hidden">
      <button
        type="button"
        id={triggerId}
        aria-expanded={expanded}
        aria-controls={contentId}
        onClick={() => setExpanded((prev) => !prev)}
        className="focus-ring flex w-full items-center justify-between gap-brand-2 p-brand-3 text-left"
      >
        <span className="flex min-w-0 flex-1 flex-col gap-2">
          <Text as="span" variant="bodyL" className="font-medium">
            {countryName}
          </Text>
          <StatusPill status={entry.status}>{statusLabel[entry.status]}</StatusPill>
          <Text tone="muted">{entry.reason}</Text>
        </span>
        <ChevronDown
          className={`size-4 shrink-0 transition-transform ${expanded ? "rotate-180" : ""}`}
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
          className="focus-ring border-t border-brand-steel p-brand-3"
        >
          <Stack gap={2}>
            <Text as="span" variant="label" tone="muted">
              Czego brakuje
            </Text>
            <ul className="flex flex-col gap-2">
              {entry.gaps.map((gap) => (
                <li key={gap} className="flex gap-brand-2">
                  <Text as="span">{gap}</Text>
                </li>
              ))}
            </ul>
            <Button as="a" href={gapClosureHref} className="w-fit">
              Domknij luki
            </Button>
          </Stack>
        </div>
      )}
    </Card>
  );
}
