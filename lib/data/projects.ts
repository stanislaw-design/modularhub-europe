import { and, desc, eq, gte, inArray, isNull, lte, ne, or, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  document,
  favorite,
  producer,
  producerCapacityProfile,
  producerDeliveryCountry,
  product,
  productCountryEligibility,
  productTranslation,
} from "@/lib/db/schema";
import type { Locale } from "@/lib/i18n/routing";
import type { EnergyClass, VentilationType } from "@/lib/product-technical-specs";
import { captureError } from "@/lib/observability/errors";
import { resolveFamilies, type FamilyFilterValue } from "@/lib/product-family-groups";
import { resolveHeatSourceValues, type HeatSourceFilterValue, type PriceThreshold, type StoreysFilter } from "@/lib/results-filters";
import { buildPublicUrl } from "@/lib/storage/r2-client";
import type {
  ContainerSubcategory,
  CountryCode,
  EligibilityByCountry,
  Project,
  ProductFamily,
  ProductTechnicalSpecsDraft,
  SpaSubcategory,
} from "./types";

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

function mapRowToProject(
  row: typeof product.$inferSelect,
  producerName: string,
  translation?: ProductTranslationText,
): Project {
  const specs = (row.technicalSpecs ?? {}) as ProductTechnicalSpecsDraft & TechnicalSpecsBridgeFields;
  const priceMinCents = row.priceMinCents ?? row.housePriceMinCents ?? 0;
  const priceMaxCents = row.priceMaxCents ?? row.housePriceMaxCents ?? 0;
  const housePriceMinCents = row.housePriceMinCents ?? priceMinCents;
  const housePriceMaxCents = row.housePriceMaxCents ?? priceMaxCents;

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
    priceMin: priceMinCents / 100,
    priceMax: priceMaxCents / 100,
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
    commercial: {
      housePriceMinEur: housePriceMinCents / 100,
      housePriceMaxEur: housePriceMaxCents / 100,
      completionStandard: row.completionStandard ?? "surowy-zamkniety",
      productionLeadTimeWeeksMin: row.productionLeadTimeWeeksMin ?? 0,
      productionLeadTimeWeeksMax: row.productionLeadTimeWeeksMax ?? 0,
      onSiteAssemblyDaysMin: row.onSiteAssemblyDaysMin ?? 0,
      onSiteAssemblyDaysMax: row.onSiteAssemblyDaysMax ?? 0,
      priceIncludes: row.priceIncludes ?? [],
      priceExcludes: row.priceExcludes ?? [],
    },
    featured: row.featured,
    priceOnRequest: specs._priceOnRequest,
    galleryImageUrls: specs._extraImageUrls,
  };
}

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

  const documentPhotos = await resolveProductDocumentPhotos(projects.map((project) => project.id));
  return projects.map((project) => applyDocumentPhotos(project, documentPhotos.get(project.id)));
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
    const documentPhotos = await resolveProductDocumentPhotos([id]);
    return applyDocumentPhotos(
      mapRowToProject(row.product, row.producerName, {
        name: row.translationName,
        description: row.translationDescription,
      }),
      documentPhotos.get(id),
    );
  }

  const [row] = await db
    .select({ product, producerName: producer.name })
    .from(product)
    .innerJoin(producer, eq(product.producerId, producer.id))
    .where(eq(product.id, id));

  if (!row) return null;
  const documentPhotos = await resolveProductDocumentPhotos([id]);
  return applyDocumentPhotos(mapRowToProject(row.product, row.producerName), documentPhotos.get(id));
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
    const documentPhotos = await resolveProductDocumentPhotos([row.product.id]);
    return applyDocumentPhotos(
      mapRowToProject(row.product, row.producerName, {
        name: row.translationName,
        description: row.translationDescription,
      }),
      documentPhotos.get(row.product.id),
    );
  }

  const [row] = await db
    .select({ product, producerName: producer.name })
    .from(product)
    .innerJoin(producer, eq(product.producerId, producer.id))
    .where(and(eq(product.family, family), eq(product.featured, true), eq(product.status, "published")));

  if (!row) return null;
  const documentPhotos = await resolveProductDocumentPhotos([row.product.id]);
  return applyDocumentPhotos(mapRowToProject(row.product, row.producerName), documentPhotos.get(row.product.id));
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

  const documentPhotos = await resolveProductDocumentPhotos(rows.map((row) => row.product.id));

  return rows.map((row) => ({
    project: applyDocumentPhotos(mapRowToProject(row.product, row.producerName), documentPhotos.get(row.product.id)),
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
  const documentPhotos = await resolveProductDocumentPhotos(allProjectIds);
  for (const [producerId, list] of projectsByProducer) {
    projectsByProducer.set(
      producerId,
      list.map((project) => applyDocumentPhotos(project, documentPhotos.get(project.id))),
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
