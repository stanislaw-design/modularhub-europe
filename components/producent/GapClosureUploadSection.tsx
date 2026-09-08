"use client";

import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button, Card, FileUpload, Heading, Stack, Text } from "@/components/ui";
import type { MockUploadedFile } from "@/lib/data/types";

interface GapClosureUploadSectionProps {
  mapHref: string;
}

export function GapClosureUploadSection({ mapHref }: GapClosureUploadSectionProps) {
  const t = useTranslations("GapClosureUploadSection");
  const [files, setFiles] = useState<MockUploadedFile[]>([]);
  const [submitted, setSubmitted] = useState(false);

  return (
    <Card as="div" padding="md">
      <Stack gap={3} align="start">
        <Heading level="h2">{t("heading")}</Heading>
        {submitted ? (
          <div aria-live="polite">
            <Stack gap={2} align="start">
              <Text>{t("submittedMessage")}</Text>
              <Button as="a" href={mapHref} variant="secondary" className="w-fit">
                {t("backToMap")}
              </Button>
            </Stack>
          </div>
        ) : (
          <>
            <Text tone="muted" measure>
              {t("intro")}
            </Text>
            <FileUpload id="gap-closure-files" label={t("uploadLabel")} files={files} onFilesChange={setFiles} />
            <Button type="button" disabled={files.length === 0} onClick={() => setSubmitted(true)} className="w-fit">
              {t("submitButton")}
            </Button>
          </>
        )}
      </Stack>
    </Card>
  );
}
