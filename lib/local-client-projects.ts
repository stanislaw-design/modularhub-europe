import type { EligibilityByCountry, Project, SavedProduct } from "./data/types";
import { PRODUCER_TECHNOLOGIES } from "./producer-technologies";
import type { RegistrationDetails } from "./producer-registration";
import { loadRegistrationDetails } from "./producer-registration-storage";
import { getMockAssemblyPriceEur, getMockTransportPriceEur } from "./pricing";

// Przedrostek na ID doklejonych lokalnie kart, żeby wykluczyć kolizję z ID z pliku
// danych przykładowych, i pozwolić je rozpoznać jako podgląd (spec 0016, Key invariants).
export const LOCAL_PROJECT_ID_PREFIX = "local-";

export function isLocalProjectId(id: string): boolean {
  return id.startsWith(LOCAL_PROJECT_ID_PREFIX);
}

// Pola, których kreator producenta nie zbiera, wyliczane tylko tutaj, przy
// przekształceniu na potrzeby lokalnego podglądu u klienta; nigdy zapisywane do
// SavedProduct samego (spec 0016, Key invariants).
export function mapSavedProductToProject(
  product: SavedProduct,
  registration: RegistrationDetails
): { project: Project; eligibility: EligibilityByCountry[] } {
  const { nip, countries, technology } = registration;
  const id = `${LOCAL_PROJECT_ID_PREFIX}${nip}-${product.id}`;
  const constructionSystem =
    PRODUCER_TECHNOLOGIES.find((entry) => entry.value === technology)?.label ?? technology;
  const primaryDeliveryCountry = countries[0];
  const packagePrice =
    product.housePriceMinEur +
    getMockTransportPriceEur(primaryDeliveryCountry) +
    getMockAssemblyPriceEur(primaryDeliveryCountry);
  const packagePriceMax =
    product.housePriceMaxEur +
    getMockTransportPriceEur(primaryDeliveryCountry) +
    getMockAssemblyPriceEur(primaryDeliveryCountry);

  // Project (klient) reprezentuje dziś wyłącznie domy i zachowuje 8 płaskich pól
  // technicznych bez zmian (spec 0022, Build plan zadanie 6 dotyka tylko
  // ProjectDraft/SavedProduct). Dla family = "dom" te pola pochodzą z
  // technicalSpecs; dla spa/pergola nie mają odpowiednika na Project, więc
  // zostają puste — ProjectTechnicalSpecs pomija wiersze z pustą wartością.
  const domSpecs = product.family === "dom" ? product.technicalSpecs : {};

  const project: Project = {
    id,
    producerId: `local-producer-${nip}`,
    producerName: `Producent (NIP ${nip})`,
    name: product.name,
    countryOfProduction: product.countryOfProduction,
    floorAreaM2: product.floorAreaM2,
    builtUpAreaM2: Math.round(product.floorAreaM2 * 1.15),
    rooms: product.bedrooms + 1,
    bedrooms: product.bedrooms,
    bathrooms: product.bedrooms <= 2 ? 1 : 2,
    storeys: 1,
    externalDimensions: "Do potwierdzenia z producentem",
    roofType: "Do potwierdzenia z producentem",
    family: product.family,
    category: product.category ?? "caloroczny",
    constructionSystem,
    foundationOptions: "Do ustalenia z producentem",
    customizationScope: "Zakres do ustalenia z producentem",
    structuralWarrantyYears: product.structuralWarrantyYears,
    priceMin: packagePrice,
    priceMax: packagePriceMax,
    currency: "EUR",
    coverImageUrl: `https://picsum.photos/seed/${product.id}/800/600`,
    description: product.description,
    wallBuildUp: domSpecs.wallBuildUp ?? "",
    insulation: domSpecs.insulation ?? "",
    heatTransferCoefficients: domSpecs.heatTransferCoefficients ?? "",
    windowClass: domSpecs.windowClass ?? "",
    ventilation: domSpecs.ventilation ?? "",
    heatSource: domSpecs.heatSource ?? "",
    fireResistance: domSpecs.fireResistance ?? "",
    windResistance: domSpecs.windResistance ?? "",
    commercial: {
      housePriceMinEur: product.housePriceMinEur,
      housePriceMaxEur: product.housePriceMaxEur,
      completionStandard: product.completionStandard,
      productionLeadTimeWeeksMin: product.productionLeadTimeWeeksMin,
      productionLeadTimeWeeksMax: product.productionLeadTimeWeeksMax,
      onSiteAssemblyDaysMin: product.onSiteAssemblyDaysMin,
      onSiteAssemblyDaysMax: product.onSiteAssemblyDaysMax,
      priceIncludes: ["budynek w wybranym standardzie", "transport standardowy", "montaż bryły"],
      priceExcludes: ["fundament", "przyłącza i roboty ziemne", "wykończenie pod klucz"],
    },
    featured: false,
  };

  const eligibility: EligibilityByCountry[] = countries.map((countryCode) => ({
    projectId: id,
    countryCode,
    status: "approved",
    reason: "Kraj dostawy zarejestrowany przez producenta.",
  }));

  return { project, eligibility };
}

// Skan wszystkich zapisów producentów w tej przeglądarce (spec 0016, AC-11): dopasowuje
// wyłącznie klucze kończące się dokładnie na `:produkty`, żeby nie pomylić ich z kluczem
// szkicu (`:projekt-szkic`) albo edycji (`:edycja:${id}`). Kliencki, wymaga `window`.
export function getAllLocalProducerProjects(): { projects: Project[]; eligibility: EligibilityByCountry[] } {
  if (typeof window === "undefined") return { projects: [], eligibility: [] };

  const projects: Project[] = [];
  const eligibility: EligibilityByCountry[] = [];

  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (!key || !key.startsWith("producent:") || !key.endsWith(":produkty")) continue;
      const nip = key.slice("producent:".length, key.length - ":produkty".length);
      if (!nip) continue;

      const registration = loadRegistrationDetails(nip);
      if (!registration) continue;

      const products = readProductsSafely(key);
      for (const product of products) {
        const mapped = mapSavedProductToProject(product, registration);
        projects.push(mapped.project);
        eligibility.push(...mapped.eligibility);
      }
    }
  } catch {
    // fail soft — brak dostępu do localStorage (np. tryb prywatny), brak podglądu lokalnego
    return { projects: [], eligibility: [] };
  }

  return { projects, eligibility };
}

function readProductsSafely(key: string): SavedProduct[] {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (entry): entry is SavedProduct =>
        typeof entry === "object" && entry !== null && typeof entry.id === "string"
    );
  } catch {
    return [];
  }
}
