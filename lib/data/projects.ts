import { and, desc, eq, gte, inArray, isNull, lte, ne, or, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  costLineItem,
  costLineItemLabelTranslation,
  document,
  favorite,
  producer,
  producerCapacityProfile,
  producerDeliveryCountry,
  product,
  productCountryEligibility,
  productTimelineStage,
  productTranslation,
  productVariant,
  productVariantTranslation,
} from "@/lib/db/schema";
import type { Locale } from "@/lib/i18n/routing";
import type { EnergyClass, VentilationType } from "@/lib/product-technical-specs";
import { captureError } from "@/lib/observability/errors";
import { resolveFamilies, type FamilyFilterValue } from "@/lib/product-family-groups";
import { resolveHeatSourceValues, type HeatSourceFilterValue, type PriceThreshold, type StoreysFilter } from "@/lib/results-filters";
import { buildPublicUrl } from "@/lib/storage/r2-client";
import type {
  ContainerSubcategory,
  CostLineItem,
  CountryCode,
  EligibilityByCountry,
  Project,
  ProjectDocument,
  ProjectDocumentPurpose,
  ProjectFaqItem,
  ProjectVariant,
  ProductFamily,
  ProductTechnicalSpecsDraft,
  RoomLayoutEntry,
  SpaSubcategory,
  TimelineStage,
  TimelineStageKey,
} from "./types";

// Kolejność stała, niezależna od sort_order w bazie (spec 0042 AC-6):
// formalności, produkcja, transport, montaż, wykończenie.
const TIMELINE_STAGE_ORDER: TimelineStageKey[] = [
  "formalnosci",
  "produkcja",
  "transport",
  "montaz",
  "wykonczenie",
];

// Tylko te wartości document_purpose dotyczą karty projektu klienta (spec
// 0041 AC-9, spec 0042 AC-7, spec 0049 AC-9); document_purpose ma też
// order_stage, company_verification, producer_photo, ai_source_pdf, które
// żyją poza tym ekranem.
const CLIENT_DOCUMENT_PURPOSES: ProjectDocumentPurpose[] = [
  "product_photo",
  "product_floor_plan",
  "product_realization_photo",
  "product_specification",
];

interface ResolveVariantsOptions {
  /** Pozycje kosztowe i etapy harmonogramu są potrzebne tylko na stronie
   * szczegółów pojedynczego projektu (spec 0042 AC-2, AC-6); karty/listy
   * czytają wyłącznie completionStandard/cenę/isDefault, więc pomijają obie
   * dodatkowe zapytania (domyślnie false). */
  withDetails?: boolean;
  /** scopeSummary rozwiązywany z product_variant_translation dla en/nl/de,
   * ten sam wzorzec fallbacku do polskiego co product.name/description
   * (spec 0028 AC-6), rozszerzony na tę tabelę 2026-09-22 (dotąd czytana
   * przez nikogo — spec 0028 Follow-up celowo zostawił to jako osobną
   * decyzję, patrz komentarz przy resolveTranslatedOptionalText).
   * costLineItem.label nie ma odpowiednika: brak tabeli tłumaczeń, poza
   * zakresem tej zmiany, patrz docs/scope/produkcja.md. */
  locale?: Locale;
}

// Ten sam wzorzec co resolveTranslatedText wyżej, ale zwraca `undefined`
// zamiast pustego stringa gdy nic nie ma — dopasowane do ProjectVariant.
// scopeSummary?: string (opcjonalne pole, nie zawsze obecny tekst źródłowy).
function resolveTranslatedOptionalText(base: string | null, translated: string | null | undefined): string | undefined {
  if (translated && translated.trim().length > 0) return translated;
  return base ?? undefined;
}

// Warianty produktu, zgrupowane po product_id (spec 0041/0042): jedno
// zapytanie dla wielu produktów naraz (ten sam wzorzec wsadowy co
// resolveProductDocumentPhotos), nie fanout na wywołanie mapRowToProject.
export async function resolveProductVariants(
  productIds: string[],
  options?: ResolveVariantsOptions,
): Promise<Map<string, ProjectVariant[]>> {
  if (productIds.length === 0) return new Map();

  const locale = options?.locale ?? "pl";
  const translateScopeSummary = locale === "en" || locale === "nl" || locale === "de";

  const variantRows = translateScopeSummary
    ? await db
        .select({
          id: productVariant.id,
          productId: productVariant.productId,
          completionStandard: productVariant.completionStandard,
          variantLabel: productVariant.variantLabel,
          priceMinCents: productVariant.priceMinCents,
          priceMaxCents: productVariant.priceMaxCents,
          scopeSummary: productVariant.scopeSummary,
          translatedScopeSummary: productVariantTranslation.scopeSummary,
          isDefault: productVariant.isDefault,
          sortOrder: productVariant.sortOrder,
        })
        .from(productVariant)
        .leftJoin(
          productVariantTranslation,
          and(
            eq(productVariantTranslation.productVariantId, productVariant.id),
            eq(productVariantTranslation.locale, locale),
          ),
        )
        .where(and(inArray(productVariant.productId, productIds), isNull(productVariant.deletedAt)))
    : await db
        .select({
          id: productVariant.id,
          productId: productVariant.productId,
          completionStandard: productVariant.completionStandard,
          variantLabel: productVariant.variantLabel,
          priceMinCents: productVariant.priceMinCents,
          priceMaxCents: productVariant.priceMaxCents,
          scopeSummary: productVariant.scopeSummary,
          translatedScopeSummary: sql<string | null>`NULL`,
          isDefault: productVariant.isDefault,
          sortOrder: productVariant.sortOrder,
        })
        .from(productVariant)
        .where(and(inArray(productVariant.productId, productIds), isNull(productVariant.deletedAt)));

  const variantIds = variantRows.map((row) => row.id);
  const costLineItemsByVariant = new Map<string, CostLineItem[]>();
  const timelineStagesByVariant = new Map<string, TimelineStage[]>();

  if (options?.withDetails && variantIds.length > 0) {
    const [costRows, stageRows] = await Promise.all([
      translateScopeSummary
        ? db
            .select({
              id: costLineItem.id,
              productVariantId: costLineItem.productVariantId,
              label: costLineItem.label,
              translatedLabel: costLineItemLabelTranslation.translatedLabel,
              status: costLineItem.status,
              responsibleParty: costLineItem.responsibleParty,
              sortOrder: costLineItem.sortOrder,
            })
            .from(costLineItem)
            .leftJoin(
              costLineItemLabelTranslation,
              and(
                eq(costLineItemLabelTranslation.labelPl, costLineItem.label),
                eq(costLineItemLabelTranslation.locale, locale),
              ),
            )
            .where(inArray(costLineItem.productVariantId, variantIds))
        : db
            .select({
              id: costLineItem.id,
              productVariantId: costLineItem.productVariantId,
              label: costLineItem.label,
              translatedLabel: sql<string | null>`NULL`,
              status: costLineItem.status,
              responsibleParty: costLineItem.responsibleParty,
              sortOrder: costLineItem.sortOrder,
            })
            .from(costLineItem)
            .where(inArray(costLineItem.productVariantId, variantIds)),
      db
        .select({
          productVariantId: productTimelineStage.productVariantId,
          stageKey: productTimelineStage.stageKey,
          durationMinDays: productTimelineStage.durationMinDays,
          durationMaxDays: productTimelineStage.durationMaxDays,
          startsFromLabel: productTimelineStage.startsFromLabel,
          responsibleParty: productTimelineStage.responsibleParty,
        })
        .from(productTimelineStage)
        .where(inArray(productTimelineStage.productVariantId, variantIds)),
    ]);

    const costRowsByVariant = new Map<string, typeof costRows>();
    for (const row of costRows) {
      const list = costRowsByVariant.get(row.productVariantId) ?? [];
      list.push(row);
      costRowsByVariant.set(row.productVariantId, list);
    }
    for (const [variantId, rows] of costRowsByVariant) {
      const sorted = [...rows].sort(
        (a, b) => (a.sortOrder ?? Number.MAX_SAFE_INTEGER) - (b.sortOrder ?? Number.MAX_SAFE_INTEGER),
      );
      costLineItemsByVariant.set(
        variantId,
        sorted.map((row) => ({
          id: row.id,
          label: resolveTranslatedText(row.label, row.translatedLabel),
          status: row.status,
          responsibleParty: row.responsibleParty ?? undefined,
        })),
      );
    }

    const stageRowsByVariant = new Map<string, typeof stageRows>();
    for (const row of stageRows) {
      const list = stageRowsByVariant.get(row.productVariantId) ?? [];
      list.push(row);
      stageRowsByVariant.set(row.productVariantId, list);
    }
    for (const [variantId, rows] of stageRowsByVariant) {
      const sorted = [...rows].sort(
        (a, b) => TIMELINE_STAGE_ORDER.indexOf(a.stageKey) - TIMELINE_STAGE_ORDER.indexOf(b.stageKey),
      );
      timelineStagesByVariant.set(
        variantId,
        sorted.map((row) => ({
          stageKey: row.stageKey,
          durationMinDays: row.durationMinDays ?? undefined,
          durationMaxDays: row.durationMaxDays ?? undefined,
          startsFromLabel: row.startsFromLabel ?? undefined,
          responsibleParty: row.responsibleParty ?? undefined,
        })),
      );
    }
  }

  const byProduct = new Map<string, typeof variantRows>();
  for (const row of variantRows) {
    const list = byProduct.get(row.productId) ?? [];
    list.push(row);
    byProduct.set(row.productId, list);
  }

  const result = new Map<string, ProjectVariant[]>();
  for (const [productId, rows] of byProduct) {
    const sorted = [...rows].sort(
      (a, b) => (a.sortOrder ?? Number.MAX_SAFE_INTEGER) - (b.sortOrder ?? Number.MAX_SAFE_INTEGER),
    );
    result.set(
      productId,
      sorted.map((row) => ({
        id: row.id,
        completionStandard: row.completionStandard,
        variantLabel: row.variantLabel ?? undefined,
        priceMin: row.priceMinCents !== null ? row.priceMinCents / 100 : undefined,
        priceMax: row.priceMaxCents !== null ? row.priceMaxCents / 100 : undefined,
        currency: "EUR",
        scopeSummary: resolveTranslatedOptionalText(row.scopeSummary, row.translatedScopeSummary),
        isDefault: row.isDefault,
        costLineItems: costLineItemsByVariant.get(row.id) ?? [],
        timelineStages: timelineStagesByVariant.get(row.id) ?? [],
      })),
    );
  }
  return result;
}

// Dokumenty produktu (zdjęcia/rzuty) z ich purpose i opcjonalnym wariantem
// (spec 0042 AC-7, AC-8): zasila zakładki galerii na stronie projektu, osobno
// od resolveProductDocumentPhotos (która tylko wybiera okładkę/galerię
// product_photo dla kart listy, bez rozróżnienia purpose/wariantu).
export async function resolveProductDocuments(productIds: string[]): Promise<Map<string, ProjectDocument[]>> {
  if (productIds.length === 0) return new Map();

  try {
    const rows = await db
      .select({
        productId: document.productId,
        r2Key: document.r2Key,
        purpose: document.purpose,
        productVariantId: document.productVariantId,
        sortOrder: document.sortOrder,
      })
      .from(document)
      .where(
        and(
          inArray(document.productId, productIds),
          inArray(document.purpose, CLIENT_DOCUMENT_PURPOSES),
          isNull(document.deletedAt),
        ),
      );

    const byProduct = new Map<string, typeof rows>();
    for (const row of rows) {
      if (!row.productId) continue;
      const list = byProduct.get(row.productId) ?? [];
      list.push(row);
      byProduct.set(row.productId, list);
    }

    const result = new Map<string, ProjectDocument[]>();
    for (const [productId, docs] of byProduct) {
      const sorted = [...docs].sort(
        (a, b) => (a.sortOrder ?? Number.MAX_SAFE_INTEGER) - (b.sortOrder ?? Number.MAX_SAFE_INTEGER),
      );
      result.set(
        productId,
        sorted.map((row) => ({
          url: buildPublicUrl(row.r2Key),
          purpose: row.purpose as ProjectDocumentPurpose,
          productVariantId: row.productVariantId ?? undefined,
        })),
      );
    }
    return result;
  } catch (error) {
    captureError(error, { path: "resolveProductDocuments" });
    return new Map();
  }
}

interface GetProjectsFilters {
  // Polski jest tekstem źródłowym i nigdy nie wymaga JOIN-a na product_translation
  // (spec 0028 Decision); domyślnie "pl", więc wywołujący, które nie znają jeszcze
  // aktywnego locale, zachowują dzisiejsze zachowanie bez zmian.
  locale?: Locale;
  countryCode?: CountryCode;
  sizeMin?: number;
  sizeMax?: number;
  // Domyślnie "dom" (spec 0023 AC-4), tak samo jak getProjects() dawniej
  // zawsze filtrowało do family "dom" na sztywno. Poza trzema prawdziwymi
  // rodzinami dopuszcza sentinel grupy "wiecej-niz-dom" (spec 0035 AC-2),
  // rozwiązywany niżej przez FAMILY_GROUPS na WHERE ... IN (...).
  family?: FamilyFilterValue;
  // Poniższe cztery mają zastosowanie tylko gdy family === "dom" (spec 0026 Key
  // invariants); getProjects() sam pilnuje tej granicy, nie polega na wywołującym.
  heatSource?: HeatSourceFilterValue;
  ventilation?: VentilationType;
  energyClass?: EnergyClass;
  storeys?: StoreysFilter;
  priceMin?: PriceThreshold;
  priceMax?: PriceThreshold;
  // Znaczące tylko dla family dopasowanej do ich nazwy (ta sama granica co category, spec 0022).
  spaSubcategory?: SpaSubcategory;
  containerSubcategory?: ContainerSubcategory;
  q?: string;
}

// Sanityzuje wpisany tekst na bezpieczny prefiksowy to_tsquery (spec 0026 AC-6,
// Key invariants): każdy token traci znaki spoza liter/cyfr (żeby operatory
// tsquery, np. "|"/"&"/"!", wpisane przez użytkownika nigdy nie zmieniły
// znaczenia zapytania) i dostaje sufiks `:*` dla dopasowania prefiksowego.
// Pusta lista tokenów po sanityzacji (np. q złożone z samej interpunkcji)
// zwraca null — wywołujący wtedy pomija filtr wyszukiwania całkowicie.
export function buildPrefixTsQuery(q: string): string | null {
  const tokens = q
    .split(/\s+/)
    .map((token) => token.replace(/[^\p{L}\p{N}]/gu, ""))
    .filter((token) => token.length > 0);
  return tokens.length > 0 ? tokens.map((token) => `${token}:*`).join(" & ") : null;
}

// Mapuje wiersz product+nazwa producenta na dzisiejszy typ Project (spec 0023
// Key invariants): sprawdzone tylko dla family "dom" — jedyne realne, zasiane
// dane. Pola specyficzne dla domu bez odpowiednika w technicalSpecs innej
// rodziny zostają puste, nie rzucają błędu (Follow-up: pełne mapowanie
// spa/kontenery-modulowe, gdy realne dane tych rodzin powstaną).
// Bridge fields for spec 0020's Project.priceOnRequest/galleryImageUrls: the real
// `product` table has no column for either yet (0023 never wired them — every
// DB-seeded product until now always had a fixed price and only a cover photo).
// Stashed inside technicalSpecs under an underscore prefix so they survive the
// dom `.strict()` Zod schema's own reads (which only look up its 8 named keys),
// without a schema migration. Follow-up: promote to real `product` columns
// (same shape as priceIncludes/priceExcludes) once more than one producer needs this.
interface TechnicalSpecsBridgeFields {
  _priceOnRequest?: boolean;
  _extraImageUrls?: string[];
}

// pl jest tekstem źródłowym (AC-5); en/nl/de pokazują tłumaczenie producenta,
// jeśli istnieje i nie jest puste, inaczej spadają na polski (AC-6) — nigdy
// pusty string na stronie klienta.
interface ProductTranslationText {
  name: string | null;
  description: string | null;
  // Tłumaczenie nazw pomieszczeń (product_translation.room_layout, AC-10),
  // dodane 2026-09-22: dotąd czytane tylko przez kreator producenta
  // (lib/producer-project-draft.ts#alignRoomLayoutTranslation, dopasowanie po
  // `id`), nigdy przez stronę klienta. Surowy jsonb, kształt sprawdzany w
  // resolveTranslatedRoomLayout niżej — wiersze sprzed spec 0045 (ręczny
  // insert przez Neon MCP) mogą nie mieć `id`, więc dopasowanie tam spada na
  // pozycję w tablicy zamiast na `id` (patrz komentarz przy tej funkcji).
  roomLayout: unknown;
}

function resolveTranslatedText(base: string | null, translated: string | null | undefined): string {
  return translated && translated.trim().length > 0 ? translated : (base ?? "");
}

// floorLevel zastępuje isMezzanine (spec 0050 AC-8): migracja jednorazowa, na
// granicy aplikacji, tego samego typu co roomLayoutRowSchema w
// lib/product-room-layout.ts, ale bez .strict() Zod — ten odczyt (w
// odróżnieniu od strony edycji producenta) musi tolerować stare wiersze bez
// stabilnego `id` (patrz komentarz przy ProjectRow.roomLayout), które strict
// parse odrzuciłby w całości.
function migrateRoomLayoutEntry(room: RoomLayoutEntry & { isMezzanine?: boolean }): RoomLayoutEntry {
  if (room.floorLevel) return room;
  const { isMezzanine, ...rest } = room;
  return { ...rest, floorLevel: isMezzanine ? "poddasze" : "parter" };
}

// Tylko `name` jest tłumaczony (areaM2/function/floorLevel nie są
// językozależne, ten sam wzorzec co roomLayoutTranslationRowSchema w
// lib/product-room-layout.ts). Dopasowanie preferuje `id` (kreator producenta
// zawsze go pisze od spec 0045), z fallbackiem na pozycję w tablicy dla
// starszych wierszy bez `id` (patrz komentarz przy ProductTranslationText) —
// bezpieczne tu, bo ten odczyt nigdy nie przechodzi przez Zod jak strona
// edycji producenta, tylko przez to proste dopasowanie.
function resolveTranslatedRoomLayout(base: RoomLayoutEntry[], translated: unknown): RoomLayoutEntry[] {
  if (!Array.isArray(translated) || translated.length === 0) return base;
  return base.map((room, index) => {
    const roomId = (room as { id?: unknown }).id;
    const byId =
      typeof roomId === "string"
        ? translated.find((entry) => entry && typeof entry === "object" && (entry as { id?: unknown }).id === roomId)
        : undefined;
    const candidate = byId ?? translated[index];
    const translatedName =
      candidate && typeof candidate === "object" && typeof (candidate as { name?: unknown }).name === "string"
        ? ((candidate as { name: string }).name.trim())
        : "";
    return translatedName ? { ...room, name: translatedName } : room;
  });
}

interface ProductDocumentPhotos {
  coverUrl: string | null;
  galleryUrls: string[];
}

// AC-7, AC-8: jedno zagregowane query dla wielu produktów naraz (nie fanout na
// wywołanie mapRowToProject), łagodny fallback w obie strony do
// coverImageUrl/_extraImageUrls dopóki produkt nie ma żadnego wiersza document
// (strangler, spec 0031 Migration plan) — okładka i galeria nigdy się nie psują
// w trakcie migracji.
// Wrapped end to end: a broken/missing R2 config (buildPublicUrl throws, see
// lib/storage/r2-client.ts) must degrade to the mock/legacy cover images
// applyDocumentPhotos() already falls back to for a product with no entry in
// the returned map, never take down every screen that lists projects.
export async function resolveProductDocumentPhotos(productIds: string[]): Promise<Map<string, ProductDocumentPhotos>> {
  if (productIds.length === 0) return new Map();

  try {
    const rows = await db
      .select({
        productId: document.productId,
        r2Key: document.r2Key,
        isCover: document.isCover,
        sortOrder: document.sortOrder,
      })
      .from(document)
      .where(
        and(inArray(document.productId, productIds), eq(document.purpose, "product_photo"), isNull(document.deletedAt)),
      );

    const byProduct = new Map<string, typeof rows>();
    for (const row of rows) {
      if (!row.productId) continue;
      const bucket = byProduct.get(row.productId) ?? [];
      bucket.push(row);
      byProduct.set(row.productId, bucket);
    }

    const result = new Map<string, ProductDocumentPhotos>();
    for (const [productId, docs] of byProduct) {
      const sorted = [...docs].sort(
        (a, b) => (a.sortOrder ?? Number.MAX_SAFE_INTEGER) - (b.sortOrder ?? Number.MAX_SAFE_INTEGER),
      );
      const cover = sorted.find((doc) => doc.isCover) ?? null;
      result.set(productId, {
        coverUrl: cover ? buildPublicUrl(cover.r2Key) : null,
        galleryUrls: sorted.filter((doc) => !doc.isCover).map((doc) => buildPublicUrl(doc.r2Key)),
      });
    }
    return result;
  } catch (error) {
    captureError(error, { path: "resolveProductDocumentPhotos" });
    return new Map();
  }
}

// Nadpisuje okładkę/galerię danymi z document tylko gdy produkt ma już
// przynajmniej jeden zmigrowany/wgrany wiersz (AC-8); bez żadnego wiersza
// project zostaje bez zmian (dzisiejszy mock/mostek, patrz mapRowToProject).
function applyDocumentPhotos(projectItem: Project, photos: ProductDocumentPhotos | undefined): Project {
  if (!photos) return projectItem;
  return {
    ...projectItem,
    coverImageUrl: photos.coverUrl ?? projectItem.coverImageUrl,
    galleryImageUrls: photos.galleryUrls.length > 0 ? photos.galleryUrls : projectItem.galleryImageUrls,
  };
}

function applyVariants(projectItem: Project, variants: ProjectVariant[] | undefined): Project {
  return { ...projectItem, variants: variants ?? [] };
}

function applyDocuments(projectItem: Project, documents: ProjectDocument[] | undefined): Project {
  return { ...projectItem, documents: documents ?? [] };
}

function applyCertifications(projectItem: Project, certifications: string[] | undefined): Project {
  return { ...projectItem, certifications: certifications && certifications.length > 0 ? certifications : undefined };
}

// Certyfikaty czytane z producer_capacity_profile.certifications (spec 0045
// AC-9): dane producenta, nie per-projektowe — kreator nie zbiera żadnego
// nowego pola, karta klienta czyta wprost stąd. LEFT JOIN przez batch (nie
// INNER w resolveVerifiedVolumeManufacturerProjects powyżej): większość
// producentów nie ma jeszcze wiersza producer_capacity_profile (dostają go
// dopiero przy weryfikacji wolumenowej, spec 0038), więc brak wiersza musi
// znaczyć "brak certyfikatów", nie "usuń produkt z wyniku".
async function resolveProducerCertifications(producerIds: string[]): Promise<Map<string, string[]>> {
  if (producerIds.length === 0) return new Map();
  const rows = await db
    .select({ producerId: producerCapacityProfile.producerId, certifications: producerCapacityProfile.certifications })
    .from(producerCapacityProfile)
    .where(inArray(producerCapacityProfile.producerId, producerIds));
  return new Map(rows.map((row) => [row.producerId, row.certifications]));
}

interface ProjectRelatedRows {
  variants?: ProjectVariant[];
  documents?: ProjectDocument[];
}

function mapRowToProject(
  row: typeof product.$inferSelect,
  producerName: string,
  translation?: ProductTranslationText,
  related?: ProjectRelatedRows,
): Project {
  const specs = (row.technicalSpecs ?? {}) as ProductTechnicalSpecsDraft & TechnicalSpecsBridgeFields;
  // price_min/max_cents są od spec 0041 pochodną wyzwalacza synchronizacji
  // ceny (lib/db/AGENTS.md): NULL gdy produkt nie ma aktywnego wariantu
  // domyślnego. AC-11 traktuje to dokładnie jak priceOnRequest, nigdy jako
  // "od undefined €".
  const priceOnRequest = Boolean(specs._priceOnRequest) || row.priceMinCents === null;
  const rawRoomLayout = (row.roomLayout as (RoomLayoutEntry & { isMezzanine?: boolean })[] | null) ?? undefined;
  const baseRoomLayout = rawRoomLayout?.map(migrateRoomLayoutEntry);
  const roomLayout = baseRoomLayout ? resolveTranslatedRoomLayout(baseRoomLayout, translation?.roomLayout) : undefined;
  const faq = (row.faq as ProjectFaqItem[] | null) ?? undefined;

  return {
    id: row.id,
    producerId: row.producerId,
    producerName,
    name: resolveTranslatedText(row.name, translation?.name),
    countryOfProduction: (row.countryOfProduction ?? "PL") as CountryCode,
    floorAreaM2: row.floorAreaM2 ?? 0,
    builtUpAreaM2: row.builtUpAreaM2 ?? 0,
    rooms: row.rooms ?? 0,
    bedrooms: row.bedrooms ?? 0,
    bathrooms: row.bathrooms ?? 0,
    storeys: row.storeys ?? 0,
    externalDimensions: row.externalDimensions ?? "",
    roofType: row.roofType ?? "",
    family: row.family,
    category: row.category ?? "caloroczny",
    constructionSystem: row.constructionSystem ?? "",
    foundationOptions: row.foundationOptions ?? "",
    customizationScope: row.customizationScope ?? "",
    structuralWarrantyYears: row.structuralWarrantyYears ?? 0,
    priceMin: (row.priceMinCents ?? 0) / 100,
    priceMax: (row.priceMaxCents ?? 0) / 100,
    currency: "EUR",
    coverImageUrl: row.coverImageUrl ?? "",
    description: resolveTranslatedText(row.description, translation?.description),
    wallBuildUp: specs.wallBuildUp ?? "",
    insulation: specs.insulation ?? "",
    heatTransferCoefficients: specs.heatTransferCoefficients ?? "",
    windowClass: specs.windowClass ?? "",
    ventilation: specs.ventilation ?? "",
    heatSource: specs.heatSource ?? "",
    fireResistance: specs.fireResistance ?? "",
    windResistance: specs.windResistance ?? "",
    variants: related?.variants ?? [],
    roomLayout: roomLayout && roomLayout.length > 0 ? roomLayout : undefined,
    documents: related?.documents ?? [],
    faq: faq && faq.length > 0 ? faq : undefined,
    installationWarrantyYears: row.installationWarrantyYears ?? undefined,
    serviceScopeDescription: row.serviceScopeDescription ?? undefined,
    transportDimensions: row.transportDimensions ?? undefined,
    craneRequirements: row.craneRequirements ?? undefined,
    minPlotWidthM: row.minPlotWidthM ?? undefined,
    featured: row.featured,
    priceOnRequest,
    galleryImageUrls: specs._extraImageUrls,
  };
}

// Re-exportowane z lib/data/project-variants.ts (moduł bez zależności na
// lib/db/client), żeby dzisiejsi odbiorcy importujący z tego pliku nie musieli
// zmieniać ścieżki importu; komponenty prezentacyjne importują bezpośrednio
// z project-variants.ts, patrz komentarz tam.
export { getDefaultProjectVariant, getDisplayProjectVariants } from "./project-variants";

// countryCode filter: a project surfaces for a country when it has an
// eligibility row there and that row is not "blocked" ("approved" and
// "conditional" both count as usable, per brand-guidelines-v3.md section 12,
// which treats a conditional status as a valid, displayable outcome, not a
// hidden one). Boundary confirmed as spec 0004's Decision (Option 1).
// family defaults to "dom" (spec 0023 AC-4): this feeds house search/results
// (/wyniki, Popularne domy, Porównaj domy) by default, with a URL switch to
// the other two families.
// Wszystkie pozostałe filtry (spec 0026 AC-1, AC-2, AC-4, AC-6, AC-10) trafiają
// do jednego WHERE po stronie SQL, łączone logicznym ORAZ; sizeMin/sizeMax
// przeniesione tu z dawnego filtrowania w JS. Funkcja nigdy nie sortuje wyniku
// (patrz sortResults() w lib/results-filters.ts, jedyne miejsce sortowania).
export async function getProjects(filters?: GetProjectsFilters): Promise<Project[]> {
  const {
    locale = "pl",
    countryCode,
    sizeMin,
    sizeMax,
    family = "dom",
    heatSource,
    ventilation,
    energyClass,
    storeys,
    priceMin,
    priceMax,
    spaSubcategory,
    containerSubcategory,
    q,
  } = filters ?? {};

  // "wiecej-niz-dom" rozwija się na >1 prawdziwą rodzinę (spec 0035 AC-2, AC-4):
  // WHERE ... IN (...) zamiast równości, jedyne miejsce, gdzie ta gałąź się rozgałęzia.
  const filterFamilies = resolveFamilies(family);
  const conditions = [
    eq(product.status, "published"),
    filterFamilies.length > 1 ? inArray(product.family, filterFamilies) : eq(product.family, filterFamilies[0]),
  ];

  if (sizeMin !== undefined) conditions.push(gte(product.floorAreaM2, sizeMin));
  if (sizeMax !== undefined) conditions.push(lte(product.floorAreaM2, sizeMax));

  // heatSource/ventilation/energyClass/storeys are dom-only (spec 0026 Key invariants).
  if (family === "dom") {
    if (heatSource !== undefined) {
      const values = resolveHeatSourceValues(heatSource);
      const heatSourceCondition = or(
        ...values.map((value) => sql`(${product.technicalSpecs}->>'heatSource') = ${value}`)
      );
      if (heatSourceCondition) conditions.push(heatSourceCondition);
    }
    if (ventilation !== undefined) {
      conditions.push(sql`(${product.technicalSpecs}->>'ventilation') = ${ventilation}`);
    }
    if (energyClass !== undefined) {
      conditions.push(sql`(${product.technicalSpecs}->>'heatTransferCoefficients') = ${energyClass}`);
    }
    if (storeys === "parterowy") conditions.push(eq(product.storeys, 1));
    if (storeys === "pietrowy") conditions.push(gte(product.storeys, 2));
  }

  // spaSubcategory/containerSubcategory are each scoped to their own family
  // (same boundary as `category`, spec 0022).
  if (family === "spa-modulowe" && spaSubcategory !== undefined) {
    conditions.push(eq(product.spaSubcategory, spaSubcategory));
  }
  if (family === "kontenery-modulowe" && containerSubcategory !== undefined) {
    conditions.push(eq(product.containerSubcategory, containerSubcategory));
  }

  // Compares against the product's priceMin ("od"), never a range (spec 0026 AC-4);
  // priceOnRequest never matches once a price bound is present.
  if (priceMin !== undefined || priceMax !== undefined) {
    conditions.push(sql`(${product.technicalSpecs}->>'_priceOnRequest') IS DISTINCT FROM 'true'`);
    if (priceMin !== undefined) conditions.push(gte(product.priceMinCents, priceMin * 100));
    if (priceMax !== undefined) conditions.push(lte(product.priceMinCents, priceMax * 100));
  }

  if (q !== undefined) {
    const tsQuery = buildPrefixTsQuery(q);
    if (tsQuery !== null) conditions.push(sql`${product.searchVector} @@ to_tsquery('simple', ${tsQuery})`);
  }

  let projects: Project[];
  if (locale === "en" || locale === "nl" || locale === "de") {
    const rows = await db
      .select({
        product,
        producerName: producer.name,
        translationName: productTranslation.name,
        translationDescription: productTranslation.description,
        translationRoomLayout: productTranslation.roomLayout,
      })
      .from(product)
      .innerJoin(producer, eq(product.producerId, producer.id))
      .leftJoin(
        productTranslation,
        and(eq(productTranslation.productId, product.id), eq(productTranslation.locale, locale)),
      )
      .where(and(...conditions));
    projects = rows.map((row) =>
      mapRowToProject(row.product, row.producerName, {
        name: row.translationName,
        description: row.translationDescription,
        roomLayout: row.translationRoomLayout,
      }),
    );
  } else {
    const rows = await db
      .select({ product, producerName: producer.name })
      .from(product)
      .innerJoin(producer, eq(product.producerId, producer.id))
      .where(and(...conditions));
    projects = rows.map((row) => mapRowToProject(row.product, row.producerName));
  }

  if (countryCode) {
    const eligibleRows = await db
      .select({ productId: productCountryEligibility.productId })
      .from(productCountryEligibility)
      .where(
        and(
          eq(productCountryEligibility.countryCode, countryCode),
          ne(productCountryEligibility.status, "blocked")
        )
      );
    const eligibleIds = new Set(eligibleRows.map((row) => row.productId));
    projects = projects.filter((project) => eligibleIds.has(project.id));
  }

  const projectIds = projects.map((project) => project.id);
  const producerIds = [...new Set(projects.map((project) => project.producerId))];
  const [documentPhotos, variantsByProduct, certificationsByProducer] = await Promise.all([
    resolveProductDocumentPhotos(projectIds),
    resolveProductVariants(projectIds, { locale }),
    resolveProducerCertifications(producerIds),
  ]);
  return projects.map((project) =>
    applyCertifications(
      applyVariants(applyDocumentPhotos(project, documentPhotos.get(project.id)), variantsByProduct.get(project.id)),
      certificationsByProducer.get(project.producerId),
    ),
  );
}

// Id existence check for the zapytanie/dzialka flows (spec 0023 AC-... /
// spec 0006): those flows accept a product id picked from *any* family
// (`/wyniki?family=spa-modulowe` selection included, not just the dom
// default), so validation must not filter by family the way getProjects()
// does. Was a bug: both pages used to build knownIds from getProjects({ locale })
// alone, which defaults to family "dom" and silently dropped every non-dom
// selection, bouncing the client back to results with no error.
export async function getPublishedProductIds(): Promise<Set<string>> {
  const rows = await db.select({ id: product.id }).from(product).where(eq(product.status, "published"));
  return new Set(rows.map((row) => row.id));
}

// product.id jest kolumną uuid w Postgresie: porównanie z niepoprawnym uuid
// (np. starym mockowym slugiem "prj-xxx" albo dowolnym literałem z adresu)
// rzuca błędem bazy zamiast zwrócić brak wiersza, więc strona kończyła się
// 500 zamiast standardowego notFound() (spec 0020 AC-6). Wczesny return na
// kształt id, przed zapytaniem do bazy, naprawia to bez zmiany reszty funkcji.
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function getProjectById(id: string, locale: Locale = "pl"): Promise<Project | null> {
  if (!UUID_PATTERN.test(id)) return null;

  if (locale === "en" || locale === "nl" || locale === "de") {
    const [row] = await db
      .select({
        product,
        producerName: producer.name,
        translationName: productTranslation.name,
        translationDescription: productTranslation.description,
        translationRoomLayout: productTranslation.roomLayout,
      })
      .from(product)
      .innerJoin(producer, eq(product.producerId, producer.id))
      .leftJoin(
        productTranslation,
        and(eq(productTranslation.productId, product.id), eq(productTranslation.locale, locale)),
      )
      .where(eq(product.id, id));

    if (!row) return null;
    const [documentPhotos, variantsByProduct, documentsByProduct, certificationsByProducer] = await Promise.all([
      resolveProductDocumentPhotos([id]),
      resolveProductVariants([id], { withDetails: true, locale }),
      resolveProductDocuments([id]),
      resolveProducerCertifications([row.product.producerId]),
    ]);
    return applyCertifications(
      applyDocuments(
        applyVariants(
          applyDocumentPhotos(
            mapRowToProject(row.product, row.producerName, {
              name: row.translationName,
              description: row.translationDescription,
              roomLayout: row.translationRoomLayout,
            }),
            documentPhotos.get(id),
          ),
          variantsByProduct.get(id),
        ),
        documentsByProduct.get(id),
      ),
      certificationsByProducer.get(row.product.producerId),
    );
  }

  const [row] = await db
    .select({ product, producerName: producer.name })
    .from(product)
    .innerJoin(producer, eq(product.producerId, producer.id))
    .where(eq(product.id, id));

  if (!row) return null;
  const [documentPhotos, variantsByProduct, documentsByProduct, certificationsByProducer] = await Promise.all([
    resolveProductDocumentPhotos([id]),
    resolveProductVariants([id], { withDetails: true, locale }),
    resolveProductDocuments([id]),
    resolveProducerCertifications([row.product.producerId]),
  ]);
  return applyCertifications(
    applyDocuments(
      applyVariants(
        applyDocumentPhotos(mapRowToProject(row.product, row.producerName), documentPhotos.get(id)),
        variantsByProduct.get(id),
      ),
      documentsByProduct.get(id),
    ),
    certificationsByProducer.get(row.product.producerId),
  );
}

// Public: feeds CategoryShowcase on the home page with one real, clickable
// project per family instead of a generic unfiltered /wyniki link.
export async function getFeaturedProjectByFamily(
  family: ProductFamily,
  locale: Locale = "pl",
): Promise<Project | null> {
  if (locale === "en" || locale === "nl" || locale === "de") {
    const [row] = await db
      .select({
        product,
        producerName: producer.name,
        translationName: productTranslation.name,
        translationDescription: productTranslation.description,
        translationRoomLayout: productTranslation.roomLayout,
      })
      .from(product)
      .innerJoin(producer, eq(product.producerId, producer.id))
      .leftJoin(
        productTranslation,
        and(eq(productTranslation.productId, product.id), eq(productTranslation.locale, locale)),
      )
      .where(and(eq(product.family, family), eq(product.featured, true), eq(product.status, "published")));

    if (!row) return null;
    const [documentPhotos, variantsByProduct] = await Promise.all([
      resolveProductDocumentPhotos([row.product.id]),
      resolveProductVariants([row.product.id], { locale }),
    ]);
    return applyVariants(
      applyDocumentPhotos(
        mapRowToProject(row.product, row.producerName, {
          name: row.translationName,
          description: row.translationDescription,
          roomLayout: row.translationRoomLayout,
        }),
        documentPhotos.get(row.product.id),
      ),
      variantsByProduct.get(row.product.id),
    );
  }

  const [row] = await db
    .select({ product, producerName: producer.name })
    .from(product)
    .innerJoin(producer, eq(product.producerId, producer.id))
    .where(and(eq(product.family, family), eq(product.featured, true), eq(product.status, "published")));

  if (!row) return null;
  const [documentPhotos, variantsByProduct] = await Promise.all([
    resolveProductDocumentPhotos([row.product.id]),
    resolveProductVariants([row.product.id], { locale }),
  ]);
  return applyVariants(
    applyDocumentPhotos(mapRowToProject(row.product, row.producerName), documentPhotos.get(row.product.id)),
    variantsByProduct.get(row.product.id),
  );
}

export async function getEligibilityByCountry(
  countryCode: CountryCode
): Promise<EligibilityByCountry[]> {
  const rows = await db
    .select()
    .from(productCountryEligibility)
    .where(eq(productCountryEligibility.countryCode, countryCode));

  return rows.map((row) => ({
    projectId: row.productId,
    countryCode: row.countryCode as CountryCode,
    status: row.status,
    reason: row.reason,
  }));
}

export interface FavoriteListEntry {
  project: Project;
  // Produkt wycofany (status inny niż published) lub usunięty (deletedAt
  // ustawiony) zostaje na liście, oznaczony jako niedostępny, nie znika po
  // cichu (spec 0024 AC-3, Key invariants).
  available: boolean;
}

// Zasila /klient/panel/ulubione (spec 0024 AC-2, AC-3): wszystkie ulubione
// zalogowanego klienta, najnowsze pierwsze. Mapowanie na Project ten sam
// wzorzec co reszta tego pliku (sprawdzony tylko dla family "dom").
export async function getFavoritesForClient(clientId: string): Promise<FavoriteListEntry[]> {
  const rows = await db
    .select({ product, producerName: producer.name })
    .from(favorite)
    .innerJoin(product, eq(favorite.productId, product.id))
    .innerJoin(producer, eq(product.producerId, producer.id))
    .where(eq(favorite.clientId, clientId))
    .orderBy(desc(favorite.createdAt));

  const favoriteIds = rows.map((row) => row.product.id);
  const [documentPhotos, variantsByProduct] = await Promise.all([
    resolveProductDocumentPhotos(favoriteIds),
    resolveProductVariants(favoriteIds),
  ]);

  return rows.map((row) => ({
    project: applyVariants(
      applyDocumentPhotos(mapRowToProject(row.product, row.producerName), documentPhotos.get(row.product.id)),
      variantsByProduct.get(row.product.id),
    ),
    available: row.product.status === "published" && row.product.deletedAt === null,
  }));
}

export interface VerifiedVolumeManufacturer {
  producerId: string;
  producerName: string;
  unitsPerMonth: number | null;
  certifications: string[];
  deliveryCountries: CountryCode[];
  projects: Project[];
}

async function loadDeliveryCountriesByProducer(producerIds: string[]): Promise<Map<string, CountryCode[]>> {
  if (producerIds.length === 0) return new Map();
  const rows = await db
    .select({ producerId: producerDeliveryCountry.producerId, countryCode: producerDeliveryCountry.countryCode })
    .from(producerDeliveryCountry)
    .where(inArray(producerDeliveryCountry.producerId, producerIds));
  const map = new Map<string, CountryCode[]>();
  for (const row of rows) {
    const list = map.get(row.producerId) ?? [];
    list.push(row.countryCode as CountryCode);
    map.set(row.producerId, list);
  }
  return map;
}

// Rozszerzenie paskiem wyszukiwania (spec 0038 AC-19 do AC-23, aktualizacja
// 2026-09-14): kraj dostawy zawęża listę PRODUCENTÓW (nie tylko ich
// projektów) przed zapytaniem o produkty, bo producent bez wiersza
// producerDeliveryCountry dla tego kraju ma zniknąć ze strony całkowicie,
// nawet jeśli ma opublikowane produkty (AC-20). Metraż i słowo kluczowe
// zawężają samo zapytanie o produkty, tymi samymi warunkami co getProjects()
// (AC-21, AC-22).
export interface VerifiedVolumeManufacturerFilter {
  countryCode?: CountryCode;
  sizeMin?: number;
  sizeMax?: number;
  q?: string;
}

// Feeds /verified-manufacturers (spec 0038 AC-13): "who qualifies" is the
// exact same condition autoTargetProducers already uses in
// lib/project-request-actions.ts (volumeVerificationStatus = 'approved'),
// so this screen and the auto-matching engine never disagree on the list.
export async function getVerifiedVolumeManufacturerProjects(
  locale: Locale = "pl",
  filter?: VerifiedVolumeManufacturerFilter,
): Promise<VerifiedVolumeManufacturer[]> {
  const approvedProducers = await db
    .select({
      producerId: producer.id,
      producerName: producer.name,
      unitsPerMonth: producerCapacityProfile.unitsPerMonth,
      certifications: producerCapacityProfile.certifications,
    })
    .from(producer)
    .innerJoin(producerCapacityProfile, eq(producerCapacityProfile.producerId, producer.id))
    .where(and(eq(producerCapacityProfile.volumeVerificationStatus, "approved"), isNull(producer.deletedAt)));

  if (approvedProducers.length === 0) return [];

  let producerIds = approvedProducers.map((row) => row.producerId);

  if (filter?.countryCode) {
    const deliveryRows = await db
      .select({ producerId: producerDeliveryCountry.producerId })
      .from(producerDeliveryCountry)
      .where(
        and(
          inArray(producerDeliveryCountry.producerId, producerIds),
          eq(producerDeliveryCountry.countryCode, filter.countryCode),
        ),
      );
    const deliveringIds = new Set(deliveryRows.map((row) => row.producerId));
    producerIds = producerIds.filter((id) => deliveringIds.has(id));
  }

  if (producerIds.length === 0) return [];

  const productConditions = [eq(product.status, "published"), inArray(product.producerId, producerIds)];
  if (filter?.sizeMin !== undefined) productConditions.push(gte(product.floorAreaM2, filter.sizeMin));
  if (filter?.sizeMax !== undefined) productConditions.push(lte(product.floorAreaM2, filter.sizeMax));
  if (filter?.q !== undefined) {
    const tsQuery = buildPrefixTsQuery(filter.q);
    if (tsQuery !== null) productConditions.push(sql`${product.searchVector} @@ to_tsquery('simple', ${tsQuery})`);
  }

  const projectsByProducer = new Map<string, Project[]>();
  if (locale === "en" || locale === "nl" || locale === "de") {
    const rows = await db
      .select({
        product,
        producerName: producer.name,
        translationName: productTranslation.name,
        translationDescription: productTranslation.description,
        translationRoomLayout: productTranslation.roomLayout,
      })
      .from(product)
      .innerJoin(producer, eq(product.producerId, producer.id))
      .leftJoin(
        productTranslation,
        and(eq(productTranslation.productId, product.id), eq(productTranslation.locale, locale)),
      )
      .where(and(...productConditions));
    for (const row of rows) {
      const list = projectsByProducer.get(row.product.producerId) ?? [];
      list.push(
        mapRowToProject(row.product, row.producerName, {
          name: row.translationName,
          description: row.translationDescription,
          roomLayout: row.translationRoomLayout,
        }),
      );
      projectsByProducer.set(row.product.producerId, list);
    }
  } else {
    const rows = await db
      .select({ product, producerName: producer.name })
      .from(product)
      .innerJoin(producer, eq(product.producerId, producer.id))
      .where(and(...productConditions));
    for (const row of rows) {
      const list = projectsByProducer.get(row.product.producerId) ?? [];
      list.push(mapRowToProject(row.product, row.producerName));
      projectsByProducer.set(row.product.producerId, list);
    }
  }

  const allProjectIds = [...projectsByProducer.values()].flat().map((project) => project.id);
  const [documentPhotos, variantsByProduct] = await Promise.all([
    resolveProductDocumentPhotos(allProjectIds),
    resolveProductVariants(allProjectIds, { locale }),
  ]);
  for (const [producerId, list] of projectsByProducer) {
    projectsByProducer.set(
      producerId,
      list.map((project) =>
        applyVariants(applyDocumentPhotos(project, documentPhotos.get(project.id)), variantsByProduct.get(project.id)),
      ),
    );
  }

  const deliveryMap = await loadDeliveryCountriesByProducer(producerIds);
  const eligibleProducerIds = new Set(producerIds);

  // Producent bez ani jednego pasującego projektu znika z listy razem z
  // nagłówkiem (AC-23): dotyczy zarówno wykluczenia po kraju wyżej, jak i
  // zera dopasowań po metrażu/słowie kluczowym poniżej — żadna sekcja
  // producenta nie renderuje się pusta.
  return approvedProducers
    .filter((row) => eligibleProducerIds.has(row.producerId))
    .map((row) => ({
      producerId: row.producerId,
      producerName: row.producerName,
      unitsPerMonth: row.unitsPerMonth,
      certifications: row.certifications ?? [],
      deliveryCountries: deliveryMap.get(row.producerId) ?? [],
      projects: projectsByProducer.get(row.producerId) ?? [],
    }))
    .filter((manufacturer) => manufacturer.projects.length > 0);
}

// Gates the "Zapytaj o większą ilość" block on /project/[id] (spec 0038
// AC-15): null unless this producer has an approved capacity profile, same
// 'approved' condition as getVerifiedVolumeManufacturerProjects above.
export async function getProducerVolumeProfile(
  producerId: string,
): Promise<Omit<VerifiedVolumeManufacturer, "projects"> | null> {
  if (!UUID_PATTERN.test(producerId)) return null;

  const [row] = await db
    .select({
      producerId: producer.id,
      producerName: producer.name,
      unitsPerMonth: producerCapacityProfile.unitsPerMonth,
      certifications: producerCapacityProfile.certifications,
    })
    .from(producer)
    .innerJoin(producerCapacityProfile, eq(producerCapacityProfile.producerId, producer.id))
    .where(
      and(
        eq(producer.id, producerId),
        eq(producerCapacityProfile.volumeVerificationStatus, "approved"),
        isNull(producer.deletedAt),
      ),
    );
  if (!row) return null;

  const deliveryMap = await loadDeliveryCountriesByProducer([producerId]);

  return {
    producerId: row.producerId,
    producerName: row.producerName,
    unitsPerMonth: row.unitsPerMonth,
    certifications: row.certifications ?? [],
    deliveryCountries: deliveryMap.get(producerId) ?? [],
  };
}
