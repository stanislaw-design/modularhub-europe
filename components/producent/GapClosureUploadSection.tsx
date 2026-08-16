"use client";

import { useState } from "react";
import { Button, Card, FileUpload, Heading, Stack, Text } from "@/components/ui";
import type { MockUploadedFile } from "@/lib/data/types";

interface GapClosureUploadSectionProps {
  mapHref: string;
}

export function GapClosureUploadSection({ mapHref }: GapClosureUploadSectionProps) {
  const [files, setFiles] = useState<MockUploadedFile[]>([]);
  const [submitted, setSubmitted] = useState(false);

  return (
    <Card as="div" padding="md">
      <Stack gap={3} align="start">
        <Heading level="h2">Wgraj dokumenty samodzielnie</Heading>
        {submitted ? (
          <div aria-live="polite">
            <Stack gap={2} align="start">
              <Text>Dokumenty przesłane do weryfikacji.</Text>
              <Button as="a" href={mapHref} variant="secondary" className="w-fit">
                Wróć do mapy gotowości eksportowej
              </Button>
            </Stack>
          </div>
        ) : (
          <>
            <Text tone="muted" measure>
              Zadeklaruj samodzielnie, że wgrywasz brakujące dokumenty. Ta ścieżka niczego nie weryfikuje
              i nie zmienia statusu kraju na mapie.
            </Text>
            <FileUpload id="gap-closure-files" label="Brakujące dokumenty" files={files} onFilesChange={setFiles} />
            <Button type="button" disabled={files.length === 0} onClick={() => setSubmitted(true)} className="w-fit">
              Wyślij
            </Button>
          </>
        )}
      </Stack>
    </Card>
  );
}
