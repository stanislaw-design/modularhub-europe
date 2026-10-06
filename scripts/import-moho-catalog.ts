// Spec 0067: tłumaczenia (en, de, nl) opcji, producenta i pól produktu powstają razem z importem,
// patrz .claude/skills/scrape-kora-wdh/SKILL.md. Po imporcie uruchom `npm run check:translations`.
import { readFile } from "node:fs/promises";
import path from "node:path";
import { and, eq, isNull } from "drizzle-orm";
import { MOHO_PROJECTS, type MohoProjectSource } from "./data/moho-catalog";
import { getTechnicalSpecsSchema, type DomTechnicalSpecs } from "../lib/product-technical-specs";
import { assertDevDatabase } from "../lib/db/dev-database-guard";
import { db } from "../lib/db/client";
import {
  country,
  document,
  producer,
  producerDeliveryCountry,
  producerMember,
  product,
  productCountryEligibility,
  users,
} from "../lib/db/schema";
import { slugifyProductName } from "../lib/product-slug";
import { validateProductPhotoFile } from "../lib/storage/document-validation";
import { buildR2Key, uploadObject } from "../lib/storage/r2-client";

const IMPORT_USER_ID = "catalog-import:moho";
const PRODUCER_ID = "e0010000-0000-4000-8000-0000000000ff";

const mohoTechnicalSpecs = {
  wallBuildUp:
    "Konstrukcja stalowa, ocieplenie pianą PUR, wewnątrz malowany panel HDF z włókien drzewnych; ściany działowe w technologii skandynawskiej.",
  insulation: "Pianka PUR.",
  heatTransferCoefficients: "nieznana",
  ventilation: "inna",
  ventilationOther: "Brak danych w katalogu.",
  heatSource: "inne",
  heatSourceOther: "Ogrzewanie podłogowe; źródło ciepła nieokreślone w katalogu.",
  constructionTechnology: "modulowa-stal-lekka",
} satisfies DomTechnicalSpecs;

if (!getTechnicalSpecsSchema("dom", "published").safeParse(mohoTechnicalSpecs).success) {
  throw new Error("Niepoprawne dane techniczne MOHO");
}

function formatExternalDimensions([length, width, height]: MohoProjectSource["externalDimensionsM"]): string {
  return `${length} × ${width} × ${height} m`;
}

function roomLayoutOf(item: MohoProjectSource) {
  return item.rooms.map((room, index) => ({
    id: `${item.id}-room-${index}`,
    name: room.name,
    areaM2: room.areaM2,
    floorLevel: "parter" as const,
  }));
}

function productValues(item: MohoProjectSource) {
  return {
    producerId: PRODUCER_ID,
    status: "published" as const,
    family: "dom" as const,
    name: item.name,
    slug: slugifyProductName(item.name),
    countryOfProduction: "PL",
    floorAreaM2: item.floorAreaM2,
    builtUpAreaM2: item.builtUpAreaM2,
    description: item.description,
    completionStandard: "deweloperski" as const,
    category: item.category,
    simplifiedPermitEligible: item.simplifiedPermitEligible,
    technicalSpecs: mohoTechnicalSpecs,
    roomLayout: roomLayoutOf(item),
    rooms: item.bedrooms + 1,
    bedrooms: item.bedrooms,
    bathrooms: 1,
    storeys: 1,
    externalDimensions: formatExternalDimensions(item.externalDimensionsM),
    roofType: item.roofType,
    constructionSystem: "Konstrukcja stalowa",
    customizationScope:
      "Dostępny w stanie deweloperskim z szerokim wachlarzem opcji dodatkowych (katalog, strony 14–28).",
    currency: "EUR",
    featured: false,
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
        name: "MOHO",
        email: "catalog-import+moho@modularhub.invalid",
        role: "producer",
        phone: "+48 533 291 900",
      })
      .onConflictDoUpdate({
        target: users.id,
        set: { name: "MOHO", role: "producer", phone: "+48 533 291 900", updatedAt: new Date() },
      }),
    db
      .insert(producer)
      .values({
        id: PRODUCER_ID,
        userId: IMPORT_USER_ID,
        nip: "CATALOG-MOHO",
        name: "MOHO",
        countryCode: "PL",
        technology: "modulowa-stal-lekka",
        verificationStatus: "not_submitted",
      })
      .onConflictDoUpdate({
        target: producer.id,
        set: {
          name: "MOHO",
          countryCode: "PL",
          technology: "modulowa-stal-lekka",
          updatedAt: new Date(),
          deletedAt: null,
        },
      }),
    db
      .insert(producerDeliveryCountry)
      .values({ producerId: PRODUCER_ID, countryCode: "PL" })
      .onConflictDoNothing(),
    db
      .insert(producerMember)
      .values({ producerId: PRODUCER_ID, userId: IMPORT_USER_ID })
      .onConflictDoNothing(),
  ]);

  for (const item of MOHO_PROJECTS) {
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

interface LocalAsset {
  buffer: Buffer;
  filename: string;
  mimeType: string;
  r2Key: string;
  purpose: "product_photo" | "product_floor_plan";
  isCover: boolean;
  sortOrder: number;
}

async function loadAsset(
  file: string,
  purpose: LocalAsset["purpose"],
  isCover: boolean,
  sortOrder: number,
): Promise<LocalAsset> {
  const buffer = await readFile(path.join(process.cwd(), file));
  const validation = validateProductPhotoFile(buffer);
  if (!validation.ok || !validation.mimeType) {
    throw new Error(`Nieprawidłowy obraz ${file}: ${validation.error ?? "nieznany błąd"}`);
  }
  const filename = path.basename(file);
  return { buffer, filename, mimeType: validation.mimeType, r2Key: buildR2Key(filename), purpose, isCover, sortOrder };
}

async function uploadProjectDocuments(item: MohoProjectSource): Promise<number> {
  const expected = 1 + item.galleryPhotos.length + 1;
  const existing = await db
    .select({ id: document.id })
    .from(document)
    .where(and(eq(document.productId, item.id), isNull(document.deletedAt)));

  if (existing.length === expected) return 0;
  if (existing.length > 0) {
    throw new Error(`${item.name}: istnieje niepełna galeria ${existing.length}/${expected}; wymaga ręcznej kontroli.`);
  }

  const assets = [
    await loadAsset(item.coverPhoto, "product_photo", true, 0),
    ...(await Promise.all(item.galleryPhotos.map((file, index) => loadAsset(file, "product_photo", false, index + 1)))),
    await loadAsset(item.floorPlan, "product_floor_plan", false, item.galleryPhotos.length + 1),
  ];

  for (const asset of assets) {
    await uploadObject(asset.r2Key, asset.buffer, asset.mimeType);
  }

  await db.insert(document).values(
    assets.map((asset) => ({
      r2Key: asset.r2Key,
      filename: asset.filename,
      mimeType: asset.mimeType,
      sizeBytes: asset.buffer.byteLength,
      purpose: asset.purpose,
      isCover: asset.isCover,
      sortOrder: asset.sortOrder,
      ownerUserId: IMPORT_USER_ID,
      productId: item.id,
    })),
  );
  return assets.length;
}

async function main(): Promise<void> {
  await assertDevDatabase();
  await upsertCatalog();
  console.log(`Zapisano ${MOHO_PROJECTS.length} projektów MOHO.`);

  let uploadedFiles = 0;
  const failures: string[] = [];
  for (const item of MOHO_PROJECTS) {
    try {
      const count = await uploadProjectDocuments(item);
      uploadedFiles += count;
      console.log(`- ${item.name}: ${count === 0 ? "dokumenty już kompletne" : `${count} plików zapisanych w R2`}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      failures.push(message);
      console.error(`- ${item.name}: ${message}`);
    }
  }

  console.log(`Łącznie nowych plików w R2: ${uploadedFiles}.`);
  if (failures.length > 0) throw new Error(`Nie udało się ukończyć ${failures.length} galerii.`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
