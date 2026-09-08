"use client";

import { FileText } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Button, Card, FileUpload, Heading, Stack, Text } from "@/components/ui";
import type { MockUploadedFile } from "@/lib/data/types";
import { isVerificationSubmitted, markVerificationSubmitted } from "@/lib/producer-verification";

interface CompanyVerificationViewProps {
  projectId: string;
  projectName: string;
  realizacjaHref: string;
}

export function CompanyVerificationView({ projectId, projectName, realizacjaHref }: CompanyVerificationViewProps) {
  const t = useTranslations("CompanyVerificationView");
  const requiredDocuments = [t("doc1"), t("doc2"), t("doc3"), t("doc4")];
  const [files, setFiles] = useState<MockUploadedFile[]>([]);
  // Odczyt localStorage po zamontowaniu — patrz precedens lib/gap-closure.ts /
  // GapClosureView (możliwe krótkie mignięcie formularza przy pierwszym renderze).
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- synchronizacja z localStorage po hydracji, patrz komentarz wyżej
    setSubmitted(isVerificationSubmitted(projectId));
  }, [projectId]);

  function handleSubmit() {
    markVerificationSubmitted(projectId);
    setSubmitted(true);
  }

  return (
    <Stack gap={4}>
      <Stack gap={2}>
        <Heading level="h1">{t("heading", { name: projectName })}</Heading>
        <Text tone="muted" measure>
          {t("disclaimer")} {t("disclaimerSuffix")}
        </Text>
      </Stack>

      <Card as="div" padding="md">
        <Stack gap={3} align="start">
          <Heading level="h2">{t("requiredDocsHeading")}</Heading>
          <ul className="flex flex-col gap-2">
            {requiredDocuments.map((document) => (
              <li key={document} className="flex items-center gap-brand-2">
                <FileText className="size-4 shrink-0 text-brand-technical-graphite" aria-hidden="true" />
                <Text as="span">{document}</Text>
              </li>
            ))}
          </ul>
        </Stack>
      </Card>

      <Card as="div" padding="md">
        {submitted ? (
          <div aria-live="polite">
            <Stack gap={2} align="start">
              <Text>{t("submittedMessage")}</Text>
              <Button as="a" href={realizacjaHref} variant="secondary" className="w-fit">
                {t("backToFulfillment")}
              </Button>
            </Stack>
          </div>
        ) : (
          <Stack gap={3} align="start">
            <FileUpload
              id="company-verification-files"
              label={t("uploadLabel")}
              files={files}
              onFilesChange={setFiles}
            />
            <Button type="button" disabled={files.length === 0} onClick={handleSubmit} className="w-fit">
              {t("submitButton")}
            </Button>
          </Stack>
        )}
      </Card>
    </Stack>
  );
}
