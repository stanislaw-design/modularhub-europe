import { and, desc, eq, gte, inArray, isNull, lte, ne, or, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  costLineItem,
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

// Tylko te trzy wartości document_purpose dotyczą karty projektu klienta
// (spec 0041 AC-9, spec 0042 AC-7); document_purpose ma też order_stage,
// company_verification, producer_photo, które żyją poza tym ekranem.
const CLIENT_DOCUMENT_PURPOSES: ProjectDocumentPurpose[] = [
  "product_photo",
  "product_floor_plan",
  "product_realization_photo",
];

interface ResolveVariantsOptions {
  /** Pozycje kosztowe i etapy harmonogramu są potrzebne tylko na stronie
   * szczegółów pojedynczego projektu (spec 0042 AC-2, AC-6); karty/listy
   * czytają wyłącznie completionStandard/cenę/isDefault, więc pomijają obie
   * dodatkowe zapytania (domyślnie false). */
  withDetails?: boolean;
}

// Warianty produktu, zgrupowane po product_id (spec 0041/0042): jedno
// zapytanie dla wielu produktów naraz (ten sam wzorzec wsadowy co
// resolveProductDocumentPhotos), nie fanout na wywołanie mapRowToProject.
export async function resolveProductVariants(
  productIds: string[],
  options?: ResolveVariantsOptions,
): Promise<Map<string, ProjectVariant[]>> {
  if (productIds.length === 0) return new Map();

  const variantRows = await db
    .select({
      id: productVariant.id,
      productId: productVariant.productId,
      completionStandard: productVariant.completionStandard,
      variantLabel: productVariant.variantLabel,
      priceMinCents: productVariant.priceMinCents,
      priceMaxCents: productVariant.priceMaxCents,
      scopeSummary: productVariant.scopeSummary,
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
      db
        .select({
          id: costLineItem.id,
          productVariantId: costLineItem.productVariantId,
          label: costLineItem.label,
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
          label: row.label,
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
        scopeSummary: row.scopeSummary ?? undefined,
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
}

function resolveTranslatedText(base: string | null, translated: string | null | undefined): string {
  return translated && translated.trim().length > 0 ? translated : (base ?? "");
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
  const roomLayout = (row.roomLayout as RoomLayoutEntry[] | null) ?? undefined;

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
  const [documentPhotos, variantsByProduct] = await Promise.all([
    resolveProductDocumentPhotos(projectIds),
    resolveProductVariants(projectIds),
  ]);
  return projects.map((project) =>
    applyVariants(applyDocumentPhotos(project, documentPhotos.get(project.id)), variantsByProduct.get(project.id)),
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
      })
      .from(product)
      .innerJoin(producer, eq(product.producerId, producer.id))
      .leftJoin(
        productTranslation,
        and(eq(productTranslation.productId, product.id), eq(productTranslation.locale, locale)),
      )
      .where(eq(product.id, id));

    if (!row) return null;
    const [documentPhotos, variantsByProduct, documentsByProduct] = await Promise.all([
      resolveProductDocumentPhotos([id]),
      resolveProductVariants([id], { withDetails: true }),
      resolveProductDocuments([id]),
    ]);
    return applyDocuments(
      applyVariants(
        applyDocumentPhotos(
          mapRowToProject(row.product, row.producerName, {
            name: row.translationName,
            description: row.translationDescription,
          }),
          documentPhotos.get(id),
        ),
        variantsByProduct.get(id),
      ),
      documentsByProduct.get(id),
    );
  }

  const [row] = await db
    .select({ product, producerName: producer.name })
    .from(product)
    .innerJoin(producer, eq(product.producerId, producer.id))
    .where(eq(product.id, id));

  if (!row) return null;
  const [documentPhotos, variantsByProduct, documentsByProduct] = await Promise.all([
    resolveProductDocumentPhotos([id]),
    resolveProductVariants([id], { withDetails: true }),
    resolveProductDocuments([id]),
  ]);
  return applyDocuments(
    applyVariants(
      applyDocumentPhotos(mapRowToProject(row.product, row.producerName), documentPhotos.get(id)),
      variantsByProduct.get(id),
    ),
    documentsByProduct.get(id),
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
      resolveProductVariants([row.product.id]),
    ]);
    return applyVariants(
      applyDocumentPhotos(
        mapRowToProject(row.product, row.producerName, {
          name: row.translationName,
          description: row.translationDescription,
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
    resolveProductVariants([row.product.id]),
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
    resolveProductVariants(allProjectIds),
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
