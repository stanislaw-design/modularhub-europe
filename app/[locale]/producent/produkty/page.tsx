import { redirect } from "next/navigation";
import { ProductCatalogList } from "@/components/producent/ProductCatalogList";
import { getCountries } from "@/lib/data/countries";
import { NIP_PATTERN } from "@/lib/producer-registration";

export default async function ProduktyPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const [{ locale }, rawSearchParams] = await Promise.all([params, searchParams]);
  const nipRaw = rawSearchParams.nip;

  // Tylko format NIP jest sprawdzany tu, po stronie serwera (tani, natychmiastowy
  // redirect na oczywisty błąd); czy dane rejestracji faktycznie istnieją dla tego NIP
  // sprawdza dopiero ProductCatalogList po stronie przeglądarki, bo localStorage jest
  // niedostępny na serwerze (spec 0016, AC-1, Key invariants).
  if (typeof nipRaw !== "string" || !NIP_PATTERN.test(nipRaw)) {
    redirect(`/${locale}/producent`);
  }

  const countries = await getCountries();

  return <ProductCatalogList locale={locale} nip={nipRaw} countries={countries} />;
}
