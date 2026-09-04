import { and, desc, eq, ne } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { favorite, producer, product, productCountryEligibility } from "@/lib/db/schema";
import type {
  CountryCode,
  EligibilityByCountry,
  Project,
  ProductFamily,
  ProductTechnicalSpecsDraft,
} from "./types";

interface GetProjectsFilters {
  countryCode?: CountryCode;
  sizeMin?: number;
  sizeMax?: number;
  // Domyślnie "dom" (spec 0023 AC-4), tak samo jak getProjects() dawniej
  // zawsze filtrowało do family "dom" na sztywno.
  family?: ProductFamily;
}

// Mapuje wiersz product+nazwa producenta na dzisiejszy typ Project (spec 0023
// Key invariants): sprawdzone tylko dla family "dom" — jedyne realne, zasiane
// dane. Pola specyficzne dla domu bez odpowiednika w technicalSpecs innej
// rodziny zostają puste, nie rzucają błędu (Follow-up: pełne mapowanie
// spa/pergola, gdy realne dane tych rodzin powstaną).
function mapRowToProject(row: typeof product.$inferSelect, producerName: string): Project {
  const specs = (row.technicalSpecs ?? {}) as ProductTechnicalSpecsDraft;
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
  };
}

// countryCode filter: a project surfaces for a country when it has an
// eligibility row there and that row is not "blocked" ("approved" and
// "conditional" both count as usable, per brand-guidelines-v3.md section 12,
// which treats a conditional status as a valid, displayable outcome, not a
// hidden one). Boundary confirmed as spec 0004's Decision (Option 1).
// sizeMin/sizeMax filter floorAreaM2 on a closed interval, independently.
// family defaults to "dom" (spec 0023 AC-4): this feeds house search/results
// (/wyniki, Popularne domy, Porównaj domy) by default, with a URL switch to
// the other two families.
export async function getProjects(filters?: GetProjectsFilters): Promise<Project[]> {
  const { countryCode, sizeMin, sizeMax, family = "dom" } = filters ?? {};

  const rows = await db
    .select({ product, producerName: producer.name })
    .from(product)
    .innerJoin(producer, eq(product.producerId, producer.id))
    .where(and(eq(product.status, "published"), eq(product.family, family)));

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

  if (sizeMin !== undefined) projects = projects.filter((project) => project.floorAreaM2 >= sizeMin);
  if (sizeMax !== undefined) projects = projects.filter((project) => project.floorAreaM2 <= sizeMax);

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
