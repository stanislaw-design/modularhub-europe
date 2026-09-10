import { Info } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Text } from "@/components/ui";

// Oznaczenie "wersja demonstracyjna" (spec 0032 AC-11): cztery ekrany
// producenta (gotowość eksportowa, weryfikacja firmy, realizacje/domykanie
// luk/realizacja, zapytania mock) czytają dziś globalne, niescopowane
// fixture'y, nie dane akurat zalogowanego producenta. Zwykły tekst, nie
// nagłówek, żeby nie naruszyć zasady jednego prawdziwego H1 na stronę (AC-15).
export async function DemoScreenNotice() {
  const t = await getTranslations("DemoScreenNotice");
  return (
    <div className="flex items-start gap-brand-2 rounded-data border border-brand-steel bg-brand-steel/20 px-brand-3 py-brand-2">
      <Info className="mt-0.5 size-4 shrink-0 text-brand-technical-graphite" aria-hidden="true" />
      <Text tone="muted">{t("message")}</Text>
    </div>
  );
}
