import { and, desc, eq, gte, lte, ne, or, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { favorite, producer, product, productCountryEligibility } from "@/lib/db/schema";
import type { EnergyClass, VentilationType } from "@/lib/product-technical-specs";
import { resolveHeatSourceValues, type HeatSourceFilterValue, type PriceThreshold, type StoreysFilter } from "@/lib/results-filters";
import type {
  CountryCode,
  EligibilityByCountry,
  PergolaSubcategory,
  Project,
  ProductFamily,
  ProductTechnicalSpecsDraft,
  SpaSubcategory,
} from "./types";

interface GetProjectsFilters {
  countryCode?: CountryCode;
  sizeMin?: number;
  sizeMax?: number;
  // Domyślnie "dom" (spec 0023 AC-4), tak samo jak getProjects() dawniej
  // zawsze filtrowało do family "dom" na sztywno.
  family?: ProductFamily;
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
  pergolaSubcategory?: PergolaSubcategory;
  q?: string;
}

// Sanityzuje wpisany tekst na bezpieczny prefiksowy to_tsquery (spec 0026 AC-6,
// Key invariants): każdy token traci znaki spoza liter/cyfr (żeby operatory
// tsquery, np. "|"/"&"/"!", wpisane przez użytkownika nigdy nie zmieniły
// znaczenia zapytania) i dostaje sufiks `:*` dla dopasowania prefiksowego.
// Pusta lista tokenów po sanityzacji (np. q złożone z samej interpunkcji)
// zwraca null — wywołujący wtedy pomija filtr wyszukiwania całkowicie.
function buildPrefixTsQuery(q: string): string | null {
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
// spa/pergola, gdy realne dane tych rodzin powstaną).
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

function mapRowToProject(row: typeof product.$inferSelect, producerName: string): Project {
  const specs = (row.technicalSpecs ?? {}) as ProductTechnicalSpecsDraft & TechnicalSpecsBridgeFields;
  const priceMinCents = row.priceMinCents ?? row.housePriceMinCents ?? 0;
  const priceMaxCents = row.priceMaxCents ?? row.housePriceMaxCents ?? 0;
  const housePriceMinCents = row.housePriceMinCents ?? priceMinCents;
  const housePriceMaxCents = row.housePriceMaxCents ?? priceMaxCents;

  return {
    id: row.id,
    producerId: row.producerId,
    producerName,
    name: row.name ?? "",
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
    description: row.description ?? "",
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
    pergolaSubcategory,
    q,
  } = filters ?? {};

  const conditions = [eq(product.status, "published"), eq(product.family, family)];

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

  // spaSubcategory/pergolaSubcategory are each scoped to their own family (same
  // boundary as `category`, spec 0022).
  if (family === "spa-modulowe" && spaSubcategory !== undefined) {
    conditions.push(eq(product.spaSubcategory, spaSubcategory));
  }
  if (family === "pergola" && pergolaSubcategory !== undefined) {
    conditions.push(eq(product.pergolaSubcategory, pergolaSubcategory));
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

  const rows = await db
    .select({ product, producerName: producer.name })
    .from(product)
    .innerJoin(producer, eq(product.producerId, producer.id))
    .where(and(...conditions));

  let projects = rows.map((row) => mapRowToProject(row.product, row.producerName));

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

  return projects;
}

export async function getProjectById(id: string): Promise<Project | null> {
  const [row] = await db
    .select({ product, producerName: producer.name })
    .from(product)
    .innerJoin(producer, eq(product.producerId, producer.id))
    .where(eq(product.id, id));

  return row ? mapRowToProject(row.product, row.producerName) : null;
}

// Public: feeds CategoryShowcase on the home page with one real, clickable
// project per family instead of a generic unfiltered /wyniki link.
export async function getFeaturedProjectByFamily(family: ProductFamily): Promise<Project | null> {
  const [row] = await db
    .select({ product, producerName: producer.name })
    .from(product)
    .innerJoin(producer, eq(product.producerId, producer.id))
    .where(and(eq(product.family, family), eq(product.featured, true), eq(product.status, "published")));

  return row ? mapRowToProject(row.product, row.producerName) : null;
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

  return rows.map((row) => ({
    project: mapRowToProject(row.product, row.producerName),
    available: row.product.status === "published" && row.product.deletedAt === null,
  }));
}
