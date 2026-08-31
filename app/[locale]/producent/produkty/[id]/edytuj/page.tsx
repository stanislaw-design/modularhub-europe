import { redirect } from "next/navigation";
import { ProductEditWizard } from "@/components/producent/ProductEditWizard";
import { getCountries } from "@/lib/data/countries";
import { NIP_PATTERN } from "@/lib/producer-registration";

export default async function EdytujProduktPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string; id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const [{ locale, id }, rawSearchParams] = await Promise.all([params, searchParams]);
  const nipRaw = rawSearchParams.nip;

  // Tylko format NIP jest sprawdzany tu; czy `id` faktycznie wskazuje na istniejący
  // produkt tego producenta sprawdza ProductEditWizard po stronie przeglądarki, bo
  // localStorage jest niedostępny na serwerze (spec 0016, AC-7, Key invariants).
  if (typeof nipRaw !== "string" || !NIP_PATTERN.test(nipRaw)) {
    redirect(`/${locale}/producent`);
  }

  const countries = await getCountries();

  return <ProductEditWizard locale={locale} nip={nipRaw} productId={id} countries={countries} />;
}
