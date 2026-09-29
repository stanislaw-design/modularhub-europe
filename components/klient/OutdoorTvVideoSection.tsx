import { getTranslations } from "next-intl/server";
import { Heading, Text } from "@/components/ui";

interface OutdoorTvVideoSectionProps {
  productName: string;
  videoUrl?: string | null;
  usageNote?: string;
}

// Pierwszy element po hero, przed paskiem nawigacji sekcji — świadome
// złamanie standardowego wzorca nagłówka reszty strony (tam wszędzie
// `level="h2"` + `text-h3`): tu nagłówek zostaje semantycznie h2 (jedno
// prawdziwe <h1> na stronie to nazwa produktu w hero), ale wizualnie większy
// (`text-h1`) i cała sekcja wyśrodkowana — mocniejsze otwarcie strony niż
// kolejna sekcja w szeregu. Puste wideo → sekcja znika całkowicie (spec 0056
// AC-4, ten sam wzorzec co reszta strony); usageNote bez wideo też się nie
// pokazuje, bo bez wideo nie ma czego zapowiadać.
export async function OutdoorTvVideoSection({ productName, videoUrl, usageNote }: OutdoorTvVideoSectionProps) {
  if (!videoUrl) return null;

  const t = await getTranslations("OutdoorTvPage");

  return (
    <div className="flex flex-col items-center gap-brand-4 text-center">
      <Heading level="h2" surface="v5" className="text-h1">
        {t("realUseHeading")}
      </Heading>
      {usageNote && (
        <div className="flex flex-col items-center gap-2">
          <Text as="span" variant="label" surface="v5" className="text-brand-v5-amber-strong">
            {t("usageNoteEyebrow")}
          </Text>
          <Text as="p" variant="bodyL" surface="v5" className="mx-auto max-w-[65ch] leading-relaxed">
            {usageNote}
          </Text>
        </div>
      )}
      <div className="w-full overflow-hidden rounded-v5-card border border-brand-v5-line">
        <video
          src={videoUrl}
          controls
          className="aspect-video w-full bg-brand-v5-night"
          aria-label={t("videoLabel", { name: productName })}
        />
      </div>
    </div>
  );
}
