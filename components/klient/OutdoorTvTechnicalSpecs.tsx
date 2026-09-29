import { getTranslations } from "next-intl/server";
import { Heading, Text } from "@/components/ui";

interface OutdoorTvTechnicalSpecsProps {
  specs?: Record<string, string>;
}

// Etykieta z surowego klucza jsonb (np. "screenSizeInches" -> "Screen Size
// Inches"): outdoor-tv nie ma jeszcze własnego schematu Zod (spec 0056 AC-7),
// więc nie ma też katalogu tłumaczonych etykiet pól jak ProjectOptions dla
// "dom" — to jedyna opcja do czasu, aż follow-up spec ustali prawdziwy kształt
// i słownik etykiet po spotkaniu z MirageVision.
function humanizeKey(key: string): string {
  return key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/^./, (char) => char.toUpperCase())
    .trim();
}

// Puste lub brak specs → sekcja nie renderuje się w ogóle (spec 0056 AC-4),
// ten sam wzorzec co ProjectCertifications/ProjectDocumentsAndFaq.
export async function OutdoorTvTechnicalSpecs({ specs }: OutdoorTvTechnicalSpecsProps) {
  const entries = specs ? Object.entries(specs) : [];
  if (entries.length === 0) return null;

  const t = await getTranslations("OutdoorTvPage");

  return (
    <div className="flex flex-col gap-brand-4">
      <Heading level="h2" surface="v5" className="text-h3">
        {t("specsHeading")}
      </Heading>
      <div className="grid grid-cols-1 gap-brand-3 sm:grid-cols-2 lg:grid-cols-3">
        {entries.map(([key, value]) => (
          <div
            key={key}
            className="flex flex-col gap-1 rounded-v5-card border border-brand-v5-line bg-brand-v5-surface p-brand-4"
          >
            <Text variant="label" tone="muted" surface="v5">
              {humanizeKey(key)}
            </Text>
            <Text as="p" surface="v5" className="font-semibold">
              {value}
            </Text>
          </div>
        ))}
      </div>
    </div>
  );
}
