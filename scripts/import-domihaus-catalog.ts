import path from "node:path";
import { and, eq, isNull } from "drizzle-orm";
import { DOMIHAUS_PROJECTS, type DomiHausProjectSource } from "./data/domihaus-catalog";
import { getTechnicalSpecsSchema, type DomTechnicalSpecs } from "../lib/product-technical-specs";
import { db } from "../lib/db/client";
import {
  country,
  document,
  producer,
  producerDeliveryCountry,
  product,
  productCountryEligibility,
  users,
} from "../lib/db/schema";
import { validateProductPhotoFile } from "../lib/storage/document-validation";
import { buildR2Key, uploadObject } from "../lib/storage/r2-client";

const IMPORT_USER_ID = "catalog-import:domihaus";
const PRODUCER_ID = "d011a000-0000-4000-8000-000000000001";

// Tabela 177/A/NBP/2026 z 2026-09-11, 1 EUR = 4,3228 PLN.
const EUR_PLN_RATE = 4.3228;
const PRICE_RATE_DATE = "2026-09-11";

const cubeTechnicalSpecs = {
  wallBuildUp:
    "Szkielet z deski klejonej 40×100 mm, wełna skalna Rockwool, płyta OSB3 15 mm, membrana wiatroizolacyjna i impregnowane łaty pod elewację.",
  insulation:
    "Wełna skalna Rockwool: 100 mm w ścianach i 150 mm w dachu; zależnie od pakietu dodatkowe ocieplenie podłogi XPS.",
  heatTransferCoefficients: "nieznana",
  windowClass: "Stolarka PCV dwuszybowa; dostępna również stolarka aluminiowa.",
  ventilation: "brak",
  heatSource: "elektryczne",
  constructionTechnology: "szkielet-drewniany",
  fireResistance: "Brak opublikowanej klasy odporności ogniowej.",
  windResistance: "Brak opublikowanej klasy odporności na wiatr.",
} satisfies DomTechnicalSpecs;

const houseTechnicalSpecs = {
  wallBuildUp:
    "Płyta Fermacell, G-K lub boazeria, ruszt instalacyjny 40×60 mm z wełną 50 mm, paroizolacja, konstrukcja 45×145 mm z wełną 140–145 mm, płyta Fermacell, wełna fasadowa 100–150 mm, membrana i wybrana elewacja.",
  insulation:
    "Wełna skalna w szkielecie i ruszcie instalacyjnym oraz wełna fasadowa; warianty producenta podają U=0,16, U=0,14 lub U=0,12 W/(m²·K) zależnie od pakietu.",
  heatTransferCoefficients: "nieznana",
  windowClass: "Stolarka okienna i drzwiowa w zakresie pakietu; szczegóły wymagają potwierdzenia dla zamówienia.",
  ventilation: "grawitacyjna",
  heatSource: "inne",
  constructionTechnology: "szkielet-drewniany",
  fireResistance: "Brak opublikowanej klasy odporności ogniowej.",
  windResistance: "Brak opublikowanej klasy odporności na wiatr.",
} satisfies DomTechnicalSpecs;

for (const [label, specs] of [
  ["CUBE", cubeTechnicalSpecs],
  ["dom", houseTechnicalSpecs],
] as const) {
  const result = getTechnicalSpecsSchema("dom", "published").safeParse(specs);
  if (!result.success) throw new Error(`Niepoprawne dane techniczne ${label}: ${result.error.message}`);
}

function plnToRoundedEurCents(amountPln: number): number {
  return Math.round(amountPln / EUR_PLN_RATE) * 100;
}

function isCube(item: DomiHausProjectSource): boolean {
  return item.name.includes("CUBE");
}

function formatDimensions([length, width, height]: DomiHausProjectSource["dimensions"]): string {
  return `${length.toLocaleString("pl-PL")} × ${width.toLocaleString("pl-PL")} × ${height.toLocaleString("pl-PL")} m`;
}

function sourceMetadata(item: DomiHausProjectSource) {
  const specs = isCube(item) ? cubeTechnicalSpecs : houseTechnicalSpecs;
  return {
    ...specs,
    _extraImageUrls: item.galleryImageUrls,
    _sourceUrl: item.sourceUrl,
    _sourcePricesNetPln: {
      basic: item.pricesNetPln[0],
      comfort: item.pricesNetPln[1],
      premium: item.pricesNetPln[2],
    },
    _sourcePriceVat: "netto",
    _sourceEurPlnRate: EUR_PLN_RATE,
    _sourceEurPlnRateDate: PRICE_RATE_DATE,
    _sourceCheckedAt: "2026-09-14",
  };
}

function productValues(item: DomiHausProjectSource) {
  const cube = isCube(item);
  const priceMinCents = plnToRoundedEurCents(item.pricesNetPln[0]);
  const priceMaxCents = plnToRoundedEurCents(item.pricesNetPln[2]);
  return {
    producerId: PRODUCER_ID,
    status: "published" as const,
    family: "dom" as const,
    name: item.name,
    countryOfProduction: "PL",
    floorAreaM2: item.floorAreaM2,
    builtUpAreaM2: item.builtUpAreaM2,
    description: item.description,
    completionStandard: "deweloperski" as const,
    productionLeadTimeWeeksMin: 0,
    productionLeadTimeWeeksMax: 0,
    onSiteAssemblyDaysMin: cube ? 2 : 0,
    onSiteAssemblyDaysMax: cube ? 2 : 0,
    housePriceMinCents: priceMinCents,
    housePriceMaxCents: priceMaxCents,
    structuralWarrantyYears: 30,
    category: item.category,
    technicalSpecs: sourceMetadata(item),
    rooms: item.rooms,
    bedrooms: item.bedrooms,
    bathrooms: item.bathrooms,
    storeys: item.storeys,
    externalDimensions: formatDimensions(item.dimensions),
    roofType: cube
      ? "Płaski; papa w Basic, membrana EPDM w Comfort i Premium"
      : "Dwuspadowy; blacha na rąbek lub dachówka zależnie od pakietu",
    constructionSystem: cube
      ? "Prefabrykowany moduł na szkielecie drewnianym"
      : "Prefabrykowany szkielet drewniany z drewna konstrukcyjnego C24",
    foundationOptions: cube
      ? "Sposób posadowienia dobierany do działki i uzgadniany z producentem"
      : "Płyta żelbetowa 200 mm na warstwach podbudowy i izolacji",
    customizationScope:
      "Zmiany projektu, stolarka, elewacja, dach, instalacje, termoizolacja i standard wykończenia zależnie od wybranego pakietu",
    priceMinCents,
    priceMaxCents,
    currency: "EUR",
    priceIncludes: [
      "zakres wybranego pakietu Basic, Comfort lub Premium zgodnie z tabelą producenta",
      "konstrukcję, stolarkę i instalacje przewidziane w wybranym wariancie",
      "dostawę do 100 km według deklaracji producenta",
    ],
    priceExcludes: [
      "VAT — ceny źródłowe są cenami netto",
      "adaptację projektu i indywidualne zmiany",
      "przygotowanie działki oraz przyłącza",
      "transport powyżej 100 km",
      "elementy nieoznaczone jako zawarte w wybranym pakiecie",
    ],
    featured: false,
    coverImageUrl: item.coverImageUrl,
    deletedAt: null,
    updatedAt: new Date(),
  };
}

async function upsertCatalog(): Promise<void> {
  await db.batch([
    db.insert(country).values({ code: "PL", name: "Polska" }).onConflictDoNothing(),
    db
      .insert(users)
      .values({
        id: IMPORT_USER_ID,
        name: "DomiHaus",
        email: "catalog-import+domihaus@modularhub.invalid",
        role: "producer",
        phone: "+48 501 063 489",
      })
      .onConflictDoUpdate({
        target: users.id,
        set: { name: "DomiHaus", role: "producer", phone: "+48 501 063 489", updatedAt: new Date() },
      }),
    db
      .insert(producer)
      .values({
        id: PRODUCER_ID,
        userId: IMPORT_USER_ID,
        nip: "CATALOG-DOMIHAUS",
        name: "DomiHaus",
        countryCode: "PL",
        technology: "szkielet-drewniany",
        verificationStatus: "not_submitted",
      })
      .onConflictDoUpdate({
        target: producer.id,
        set: {
          name: "DomiHaus",
          countryCode: "PL",
          technology: "szkielet-drewniany",
          updatedAt: new Date(),
          deletedAt: null,
        },
      }),
    db
      .insert(producerDeliveryCountry)
      .values({ producerId: PRODUCER_ID, countryCode: "PL" })
      .onConflictDoNothing(),
  ]);

  for (const item of DOMIHAUS_PROJECTS) {
    const values = productValues(item);
    await db
      .insert(product)
      .values({ id: item.id, ...values })
      .onConflictDoUpdate({ target: product.id, set: values });
    await db
      .insert(productCountryEligibility)
      .values({
        productId: item.id,
        countryCode: "PL",
        status: "conditional",
        reason: "Możliwość realizacji i wymagania formalne zależą od konkretnej działki oraz lokalnych ustaleń.",
      })
      .onConflictDoUpdate({
        target: [productCountryEligibility.productId, productCountryEligibility.countryCode],
        set: {
          status: "conditional",
          reason: "Możliwość realizacji i wymagania formalne zależą od konkretnej działki oraz lokalnych ustaleń.",
          updatedAt: new Date(),
        },
      });
  }
}

interface DownloadedPhoto {
  buffer: Buffer;
  filename: string;
  mimeType: string;
}

async function downloadPhoto(url: string): Promise<DownloadedPhoto> {
  const source = new URL(url);
  if (!["domihaus.com", "www.domihaus.com"].includes(source.hostname) || !source.pathname.startsWith("/wp-content/uploads/")) {
    throw new Error(`Niedozwolone źródło zdjęcia: ${url}`);
  }

  const response = await fetch(url, {
    headers: { "User-Agent": "ModularHubEurope-CatalogImporter/1.0" },
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`Pobieranie ${url} zwróciło HTTP ${response.status}`);

  const finalUrl = new URL(response.url);
  if (!["domihaus.com", "www.domihaus.com"].includes(finalUrl.hostname)) {
    throw new Error(`Zdjęcie przekierowało poza domihaus.com: ${response.url}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const validation = validateProductPhotoFile(buffer);
  if (!validation.ok || !validation.mimeType) {
    throw new Error(`Nieprawidłowy obraz ${url}: ${validation.error ?? "nieznany błąd"}`);
  }
  return {
    buffer,
    filename: decodeURIComponent(path.basename(finalUrl.pathname)),
    mimeType: validation.mimeType,
  };
}

async function uploadProjectGallery(item: DomiHausProjectSource): Promise<number> {
  const urls = [item.coverImageUrl, ...item.galleryImageUrls];
  const existing = await db
    .select({ id: document.id, sortOrder: document.sortOrder })
    .from(document)
    .where(and(eq(document.productId, item.id), eq(document.purpose, "product_photo"), isNull(document.deletedAt)));

  if (existing.length === urls.length) return 0;
  if (existing.length > 0) {
    throw new Error(`${item.name}: istnieje niepełna galeria ${existing.length}/${urls.length}; wymaga ręcznej kontroli.`);
  }

  const downloaded = await Promise.all(urls.map(downloadPhoto));
  const uploaded = [] as Array<DownloadedPhoto & { r2Key: string }>;
  for (const photo of downloaded) {
    const r2Key = buildR2Key(photo.filename);
    await uploadObject(r2Key, photo.buffer, photo.mimeType);
    uploaded.push({ ...photo, r2Key });
  }

  await db.insert(document).values(
    uploaded.map((photo, index) => ({
      r2Key: photo.r2Key,
      filename: photo.filename,
      mimeType: photo.mimeType,
      sizeBytes: photo.buffer.byteLength,
      purpose: "product_photo" as const,
      isCover: index === 0,
      sortOrder: index,
      ownerUserId: IMPORT_USER_ID,
      productId: item.id,
    })),
  );
  return uploaded.length;
}

async function main(): Promise<void> {
  await upsertCatalog();
  console.log(`Zapisano ${DOMIHAUS_PROJECTS.length} opublikowanych projektów DomiHaus.`);

  let uploadedPhotos = 0;
  const failures: string[] = [];
  for (const item of DOMIHAUS_PROJECTS) {
    try {
      const count = await uploadProjectGallery(item);
      uploadedPhotos += count;
      console.log(`- ${item.name}: ${count === 0 ? "galeria już kompletna" : `${count} zdjęć zapisanych w R2`}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      failures.push(message);
      console.error(`- ${item.name}: ${message}`);
    }
  }

  console.log(`Łącznie nowych zdjęć w R2: ${uploadedPhotos}.`);
  if (failures.length > 0) throw new Error(`Nie udało się ukończyć ${failures.length} galerii.`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
