import { redirect } from "next/navigation";
import { ProductEditWizard } from "@/components/producent/ProductEditWizard";
import { getCountries } from "@/lib/data/countries";
import type { ProductTechnicalSpecsDraft, ProjectDraft } from "@/lib/data/types";
import { getProducerIdForUser, getProducerProductForEdit, getProductPhotosForAdmin, type ProducerProductForEdit } from "@/lib/db/queries";
import { requirePanelProducerSession } from "@/lib/panel-session";

// Odwrotność zapisu w lib/producer-product-actions.ts: pole po polu, żeby
// createdAt/id/status nie trafiły do stanu formularza edycji (mirror
// savedProductToDraft, dawny lib/producer-products.ts).
function producerProductToDraft(row: ProducerProductForEdit): ProjectDraft {
  return {
    name: row.name,
    floorAreaM2: row.floorAreaM2,
    bedrooms: row.bedrooms,
    countryOfProduction: (row.countryOfProduction as ProjectDraft["countryOfProduction"]) ?? null,
    description: row.description ?? "",
    nameEn: row.nameEn ?? "",
    nameNl: row.nameNl ?? "",
    descriptionEn: row.descriptionEn ?? "",
    descriptionNl: row.descriptionNl ?? "",
    family: row.family,
    category: row.category,
    spaSubcategory: row.spaSubcategory,
    containerSubcategory: row.containerSubcategory,
    technicalSpecs: (row.technicalSpecs ?? {}) as ProductTechnicalSpecsDraft,
    floorPlanFiles: [],
    photoFiles: [],
    housePriceMinEur: row.housePriceMinCents !== null ? row.housePriceMinCents / 100 : null,
    housePriceMaxEur: row.housePriceMaxCents !== null ? row.housePriceMaxCents / 100 : null,
    completionStandard: row.completionStandard,
    productionLeadTimeWeeksMin: row.productionLeadTimeWeeksMin,
    productionLeadTimeWeeksMax: row.productionLeadTimeWeeksMax,
    onSiteAssemblyDaysMin: row.onSiteAssemblyDaysMin,
    onSiteAssemblyDaysMax: row.onSiteAssemblyDaysMax,
    structuralWarrantyYears: row.structuralWarrantyYears,
  };
}

// Ownership sprawdzony tu, po stronie serwera, zanim cokolwiek się wyrenderuje
// (spec 0032 AC-5, AC-13): cudzy/nieistniejący id -> przekierowanie do listy,
// bez rozróżniania tych dwóch przypadków (getProducerProductForEdit zwraca
// null dla obu).
export default async function ProducerPanelEdytujProduktPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const selfHref = `/${locale}/producer/panel/products/${id}/edytuj`;
  const session = await requirePanelProducerSession(locale, selfHref);

  const producerId = await getProducerIdForUser(session.user.id);
  const productRow = producerId ? await getProducerProductForEdit(producerId, id) : null;
  if (!productRow) {
    redirect(`/${locale}/producer/panel/products`);
  }

  const [countries, photos] = await Promise.all([getCountries(), getProductPhotosForAdmin(id)]);
  const draft = producerProductToDraft(productRow);
  draft.photoFiles = photos.map((photo) => ({ name: photo.filename, sizeBytes: 0 }));

  return (
    <ProductEditWizard
      locale={locale}
      productId={id}
      initialDraft={draft}
      initialPhotos={photos.map((photo) => ({ id: photo.id, url: photo.url, filename: photo.filename, isCover: photo.isCover }))}
      countries={countries}
    />
  );
}
