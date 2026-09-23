import { redirect } from "next/navigation";
import { ProductEditWizard } from "@/components/producent/ProductEditWizard";
import { getCountries } from "@/lib/data/countries";
import type { ProductTechnicalSpecsDraft, ProjectDraft } from "@/lib/data/types";
import {
  getProducerIdForUser,
  getProducerProductForEdit,
  getProducerVariantsForEdit,
  getProductFloorPlansForAdmin,
  getProductPhotosForAdmin,
  getProductSalesPdfForAdmin,
  getProductSpecificationPdfForAdmin,
  type ProducerProductForEdit,
  type ProducerVariantForEdit,
} from "@/lib/db/queries";
import { requirePanelProducerSession } from "@/lib/panel-session";
import { alignClientRequirementsTranslation, alignFaqTranslation, alignRoomLayoutTranslation } from "@/lib/producer-project-draft";
import { clientRequirementsSchema, clientRequirementTranslationSchema } from "@/lib/product-client-requirements";
import { faqSchema, faqTranslationSchema } from "@/lib/product-faq";
import { roomLayoutSchema, roomLayoutTranslationSchema } from "@/lib/product-room-layout";

// Odwrotność zapisu w lib/producer-product-actions.ts: pole po polu, żeby
// createdAt/id/status nie trafiły do stanu formularza edycji (mirror
// savedProductToDraft, dawny lib/producer-products.ts). roomLayout/faq
// dostają safeParse z fallbackiem do pustej tablicy: dawne, sprzed spec 0045,
// wiersze wpisane ręcznie przez Neon MCP mogły nie mieć jeszcze stabilnego
// `id` na wpisie (walidacja Zod tego pola była otwartym Follow-up aż do tego
// spec) — kreator ma wtedy po prostu czystą listę do wypełnienia, zamiast
// wywalać całą stronę edycji błędem parsowania.
function producerProductToDraft(row: ProducerProductForEdit, variants: ProducerVariantForEdit[]): ProjectDraft {
  const roomLayoutResult = roomLayoutSchema.safeParse(row.roomLayout ?? []);
  const roomLayout = roomLayoutResult.success ? roomLayoutResult.data : [];
  const roomLayoutEnResult = roomLayoutTranslationSchema.safeParse(row.roomLayoutEn ?? []);
  const roomLayoutNlResult = roomLayoutTranslationSchema.safeParse(row.roomLayoutNl ?? []);
  const roomLayoutDeResult = roomLayoutTranslationSchema.safeParse(row.roomLayoutDe ?? []);
  const faqResult = faqSchema.safeParse(row.faq ?? []);
  const faq = faqResult.success ? faqResult.data : [];
  const faqEnResult = faqTranslationSchema.safeParse(row.faqEn ?? []);
  const faqNlResult = faqTranslationSchema.safeParse(row.faqNl ?? []);
  const faqDeResult = faqTranslationSchema.safeParse(row.faqDe ?? []);
  const clientRequirementsResult = clientRequirementsSchema.safeParse(row.clientRequirements ?? []);
  const clientRequirements = clientRequirementsResult.success ? clientRequirementsResult.data : [];
  const clientRequirementsEnResult = clientRequirementTranslationSchema.safeParse(row.clientRequirementsEn ?? []);
  const clientRequirementsNlResult = clientRequirementTranslationSchema.safeParse(row.clientRequirementsNl ?? []);
  const clientRequirementsDeResult = clientRequirementTranslationSchema.safeParse(row.clientRequirementsDe ?? []);

  return {
    name: row.name,
    floorAreaM2: row.floorAreaM2,
    bedrooms: row.bedrooms,
    countryOfProduction: (row.countryOfProduction as ProjectDraft["countryOfProduction"]) ?? null,
    description: row.description ?? "",
    descriptionEn: row.descriptionEn ?? "",
    descriptionNl: row.descriptionNl ?? "",
    descriptionDe: row.descriptionDe ?? "",
    family: row.family,
    category: row.category,
    spaSubcategory: row.spaSubcategory,
    containerSubcategory: row.containerSubcategory,
    technicalSpecs: (row.technicalSpecs ?? {}) as ProductTechnicalSpecsDraft,
    roomLayout,
    roomLayoutEn: alignRoomLayoutTranslation(roomLayout, roomLayoutEnResult.success ? roomLayoutEnResult.data : []),
    roomLayoutNl: alignRoomLayoutTranslation(roomLayout, roomLayoutNlResult.success ? roomLayoutNlResult.data : []),
    roomLayoutDe: alignRoomLayoutTranslation(roomLayout, roomLayoutDeResult.success ? roomLayoutDeResult.data : []),
    faq,
    faqEn: alignFaqTranslation(faq, faqEnResult.success ? faqEnResult.data : []),
    faqNl: alignFaqTranslation(faq, faqNlResult.success ? faqNlResult.data : []),
    faqDe: alignFaqTranslation(faq, faqDeResult.success ? faqDeResult.data : []),
    clientRequirements,
    clientRequirementsEn: alignClientRequirementsTranslation(
      clientRequirements,
      clientRequirementsEnResult.success ? clientRequirementsEnResult.data : [],
    ),
    clientRequirementsNl: alignClientRequirementsTranslation(
      clientRequirements,
      clientRequirementsNlResult.success ? clientRequirementsNlResult.data : [],
    ),
    clientRequirementsDe: alignClientRequirementsTranslation(
      clientRequirements,
      clientRequirementsDeResult.success ? clientRequirementsDeResult.data : [],
    ),
    floorPlanFiles: [],
    photoFiles: [],
    structuralWarrantyYears: row.structuralWarrantyYears,
    installationWarrantyYears: row.installationWarrantyYears,
    serviceScopeDescription: row.serviceScopeDescription ?? "",
    transportDimensions: row.transportDimensions ?? "",
    craneRequirements: row.craneRequirements ?? "",
    minPlotWidthM: row.minPlotWidthM,
    simplifiedPermitEligible: row.simplifiedPermitEligible,
    variantsSummary: variants.map((variant) => ({ isDefault: variant.isDefault, priceMinCents: variant.priceMinCents })),
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
  const selfHref = `/${locale}/producer/panel/products/${id}/edit`;
  const session = await requirePanelProducerSession(locale, selfHref);

  const producerId = await getProducerIdForUser(session.user.id);
  const productRow = producerId ? await getProducerProductForEdit(producerId, id) : null;
  if (!productRow) {
    redirect(`/${locale}/producer/panel/products`);
  }

  const [countries, photos, floorPlans, specificationPdf, salesPdf, variants] = await Promise.all([
    getCountries(),
    getProductPhotosForAdmin(id),
    getProductFloorPlansForAdmin(id),
    getProductSpecificationPdfForAdmin(id),
    getProductSalesPdfForAdmin(id),
    getProducerVariantsForEdit(id),
  ]);
  const draft = producerProductToDraft(productRow, variants);
  draft.photoFiles = photos.map((photo) => ({ name: photo.filename, sizeBytes: 0 }));
  draft.floorPlanFiles = floorPlans.map((plan) => ({ name: plan.filename, sizeBytes: 0 }));

  return (
    <ProductEditWizard
      locale={locale}
      productId={id}
      initialDraft={draft}
      initialPhotos={photos.map((photo) => ({ id: photo.id, url: photo.url, filename: photo.filename, isCover: photo.isCover }))}
      initialFloorPlans={floorPlans.map((plan) => ({ id: plan.id, url: plan.url, filename: plan.filename, variantId: plan.productVariantId }))}
      initialSpecificationPdf={specificationPdf}
      initialSalesPdf={salesPdf}
      initialVariants={variants}
      countries={countries}
    />
  );
}
