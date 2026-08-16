"use client";

import { FileText } from "lucide-react";
import { useEffect, useState } from "react";
import { Button, Card, FileUpload, Heading, Stack, Text } from "@/components/ui";
import type { MockUploadedFile } from "@/lib/data/types";
import { isVerificationSubmitted, markVerificationSubmitted } from "@/lib/producer-verification";

interface CompanyVerificationViewProps {
  projectId: string;
  projectName: string;
  realizacjaHref: string;
}

const REQUIRED_DOCUMENTS = [
  "Odpis z rejestru przedsiębiorców (KRS lub CEIDG)",
  "Zaświadczenie o niezaleganiu w ZUS i US",
  "Potwierdzenie rachunku bankowego firmy (wyciąg lub przelew weryfikacyjny)",
  "Polisa ubezpieczenia OC działalności",
];

const DISCLAIMER_TEXT =
  "To jest makieta — żadna weryfikacja nie jest tu naprawdę przeprowadzana, a wypłata nie jest realna.";

export function CompanyVerificationView({ projectId, projectName, realizacjaHref }: CompanyVerificationViewProps) {
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
        <Heading level="h1">Weryfikacja firmy — {projectName}</Heading>
        <Text tone="muted" measure>
          {DISCLAIMER_TEXT} Przed pierwszą wypłatą sprawdzamy firmę na podstawie poniższych dokumentów.
        </Text>
      </Stack>

      <Card as="div" padding="md">
        <Stack gap={3} align="start">
          <Heading level="h2">Wymagane dokumenty</Heading>
          <ul className="flex flex-col gap-2">
            {REQUIRED_DOCUMENTS.map((document) => (
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
              <Text>
                Dokumenty przesłane do weryfikacji. Pierwsza wypłata zostanie odblokowana po jej
                zakończeniu (makieta, bez realnej weryfikacji).
              </Text>
              <Button as="a" href={realizacjaHref} variant="secondary" className="w-fit">
                Wróć do realizacji
              </Button>
            </Stack>
          </div>
        ) : (
          <Stack gap={3} align="start">
            <FileUpload
              id="company-verification-files"
              label="Dokumenty do weryfikacji"
              files={files}
              onFilesChange={setFiles}
            />
            <Button type="button" disabled={files.length === 0} onClick={handleSubmit} className="w-fit">
              Wyślij do weryfikacji
            </Button>
          </Stack>
        )}
      </Card>
    </Stack>
  );
}
