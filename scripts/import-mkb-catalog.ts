// MKB Inwestycje: 7 domów SIP ze strony mkb-inwestycje.pl (dane w scripts/data/mkb-catalog.ts).
// Spec 0067: tłumaczenia en/de/nl powstają razem z importem; po nim `npm run check:translations`
// ma zgłosić zero braków. Zapis tylko do dev DB (assertDevDatabase); prod to osobny, jawny krok.
// `--dry-run` waliduje dane i pliki, niczego nie zapisuje.
import { readFile } from "node:fs/promises";
import path from "node:path";
import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "../lib/db/client";
import { assertDevDatabase } from "../lib/db/dev-database-guard";
import {
  country,
  document,
  producer,
  producerDeliveryCountry,
  producerMember,
  producerTranslation,
  product,
  productCountryEligibility,
  productTranslation,
  referenceTextTranslation,
  users,
} from "../lib/db/schema";
import { getTechnicalSpecsSchema, type DomTechnicalSpecs } from "../lib/product-technical-specs";
import { roomLayoutSchema } from "../lib/product-room-layout";
import { slugifyProductName } from "../lib/product-slug";
import { validateProductPhotoFile } from "../lib/storage/document-validation";
import { buildR2Key, uploadObject } from "../lib/storage/r2-client";
import {
  CONSTRUCTION_SYSTEM,
  CUSTOMIZATION_SCOPE,
  ELIGIBILITY_REASON,
  IMPORT_USER_ID,
  MKB_PRODUCER,
  MKB_PROJECTS,
  MKB_ROOMS,
  PRODUCER_ID,
  type L10n,
  type MkbProjectSource,
} from "./data/mkb-catalog";

const DRY_RUN = process.argv.includes("--dry-run");
const LOCALES = ["en", "de", "nl"] as const;
const excluded = (column: string) => sql.raw(`excluded."${column}"`);

// Strona producenta nie podaje wentylacji, źródła ciepła ani klasy energetycznej (tylko
// deklarację U=0,12 W/m²K, której nie przekładamy na pasmo klasy), więc te pola mają jawne "brak danych".
const technicalSpecs = {
  wallBuildUp: "Panel SIP: dwie płyty konstrukcyjne z rdzeniem izolacyjnym z pianki PIR.",
  insulation: "Pianka PIR (rdzeń panelu SIP).",
  heatTransferCoefficients: "nieznana",
  ventilation: "inna",
  ventilationOther: "Brak danych na stronie producenta.",
  heatSource: "inne",
  heatSourceOther: "Brak danych na stronie producenta.",
  constructionTechnology: "plyta-warstwowa-sip",
} satisfies DomTechnicalSpecs;

function validate(): void {
  if (!getTechnicalSpecsSchema("dom", "published").safeParse(technicalSpecs).success) {
    throw new Error("Niepoprawne dane techniczne MKB");
  }
  const slugs = new Set<string>();
  for (const item of MKB_PROJECTS) {
    for (const text of [item.description, item.roofType]) assertL10n(item.name, text);
    const slug = slugifyProductName(item.name);
    if (slugs.has(slug)) throw new Error(`Powtórzony slug ${slug}`);
    slugs.add(slug);
    for (const room of MKB_ROOMS[item.name] ?? []) assertL10n(item.name, room.name);
    if (!roomLayoutSchema.safeParse(roomLayoutOf(item).filter((room) => "areaM2" in room)).success) throw new Error(`${item.name}: niepoprawny układ pomieszczeń`);
  }
  for (const text of [MKB_PRODUCER.description, ELIGIBILITY_REASON, CONSTRUCTION_SYSTEM, CUSTOMIZATION_SCOPE]) {
    assertL10n("producent/wspólne", text);
  }
}

function assertL10n(owner: string, text: L10n): void {
  for (const key of ["pl", "en", "de", "nl"] as const) {
    if (!text[key] || text[key].trim().length === 0) throw new Error(`${owner}: brak wersji ${key}`);
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

async function loadProjectAssets(item: MkbProjectSource): Promise<LocalAsset[]> {
  const photos = [item.coverPhoto, ...item.galleryPhotos];
  return [
    ...(await Promise.all(photos.map((file, index) => loadAsset(file, "product_photo", index === 0, index)))),
    ...(await Promise.all(
      item.floorPlans.map((file, index) => loadAsset(file, "product_floor_plan", false, photos.length + index)),
    )),
  ];
}

const roomId = (item: MkbProjectSource, index: number) => `${item.id}-room-${index}`;

function roomLayoutOf(item: MkbProjectSource) {
  return (MKB_ROOMS[item.name] ?? []).map((room, index) => ({
    id: roomId(item, index),
    name: room.name.pl,
    ...(room.areaM2 === undefined ? {} : { areaM2: room.areaM2 }),
    floorLevel: room.floorLevel,
  }));
}

function productValues(item: MkbProjectSource) {
  return {
    producerId: PRODUCER_ID,
    status: "published" as const,
    family: "dom" as const,
    name: item.name,
    slug: slugifyProductName(item.name),
    countryOfProduction: "PL",
    floorAreaM2: item.floorAreaM2,
    description: item.description.pl,
    category: item.category,
    technicalSpecs,
    roomLayout: roomLayoutOf(item),
    rooms: item.rooms,
    bedrooms: item.bedrooms,
    bathrooms: item.bathrooms,
    storeys: item.storeys,
    roofType: item.roofType.pl,
    constructionSystem: CONSTRUCTION_SYSTEM.pl,
    customizationScope: CUSTOMIZATION_SCOPE.pl,
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
        name: MKB_PRODUCER.name,
        email: "catalog-import+mkb@modularhub.invalid",
        role: "producer",
        // users.phone jest NOT NULL; zaślepka techniczna, nigdzie nie pokazywana (kontakt tylko przez platformę).
        phone: "+48 000 000 000",
      })
      .onConflictDoUpdate({ target: users.id, set: { name: MKB_PRODUCER.name, role: "producer", updatedAt: new Date() } }),
    db
      .insert(producer)
      .values({
        id: PRODUCER_ID,
        userId: IMPORT_USER_ID,
        nip: MKB_PRODUCER.nip,
        name: MKB_PRODUCER.name,
        countryCode: "PL",
        technology: "plyta-warstwowa-sip",
        verificationStatus: "not_submitted",
        description: MKB_PRODUCER.description.pl,
      })
      .onConflictDoUpdate({
        target: producer.id,
        set: {
          name: MKB_PRODUCER.name,
          countryCode: "PL",
          technology: "plyta-warstwowa-sip",
          description: MKB_PRODUCER.description.pl,
          updatedAt: new Date(),
          deletedAt: null,
        },
      }),
    db.insert(producerDeliveryCountry).values({ producerId: PRODUCER_ID, countryCode: "PL" }).onConflictDoNothing(),
    db.insert(producerMember).values({ producerId: PRODUCER_ID, userId: IMPORT_USER_ID }).onConflictDoNothing(),
    db
      .insert(producerTranslation)
      .values(LOCALES.map((locale) => ({ producerId: PRODUCER_ID, locale, description: MKB_PRODUCER.description[locale] })))
      .onConflictDoUpdate({
        target: [producerTranslation.producerId, producerTranslation.locale],
        set: { description: excluded("description"), updatedAt: new Date() },
      }),
    db
      .insert(referenceTextTranslation)
      .values(LOCALES.map((locale) => ({ sourcePl: ELIGIBILITY_REASON.pl, locale, translated: ELIGIBILITY_REASON[locale] })))
      .onConflictDoNothing(),
  ]);

  for (const item of MKB_PROJECTS) {
    const values = productValues(item);
    await db.batch([
      db
        .insert(product)
        .values({ id: item.id, ...values })
        .onConflictDoUpdate({ target: product.id, set: values }),
      db
        .insert(productCountryEligibility)
        .values({ productId: item.id, countryCode: "PL", status: "conditional", reason: ELIGIBILITY_REASON.pl })
        .onConflictDoUpdate({
          target: [productCountryEligibility.productId, productCountryEligibility.countryCode],
          set: { status: "conditional", reason: ELIGIBILITY_REASON.pl, updatedAt: new Date() },
        }),
      db
        .insert(productTranslation)
        .values(
          LOCALES.map((locale) => ({
            productId: item.id,
            locale,
            name: item.name,
            description: item.description[locale],
            roomLayout: (MKB_ROOMS[item.name] ?? []).map((room, index) => ({
              id: roomId(item, index),
              name: room.name[locale],
            })),
            constructionSystem: CONSTRUCTION_SYSTEM[locale],
            roofType: item.roofType[locale],
            customizationScope: CUSTOMIZATION_SCOPE[locale],
          })),
        )
        .onConflictDoUpdate({
          target: [productTranslation.productId, productTranslation.locale],
          set: {
            name: excluded("name"),
            description: excluded("description"),
            roomLayout: excluded("room_layout"),
            constructionSystem: excluded("construction_system"),
            roofType: excluded("roof_type"),
            customizationScope: excluded("customization_scope"),
            updatedAt: new Date(),
          },
        }),
    ]);
  }
}

async function uploadProjectDocuments(item: MkbProjectSource): Promise<number> {
  const expected = 1 + item.galleryPhotos.length + item.floorPlans.length;
  const existing = await db
    .select({ id: document.id })
    .from(document)
    .where(and(eq(document.productId, item.id), isNull(document.deletedAt)));

  if (existing.length === expected) return 0;
  if (existing.length > 0) {
    throw new Error(`${item.name}: istnieje niepełna galeria ${existing.length}/${expected}; wymaga ręcznej kontroli.`);
  }

  const assets = await loadProjectAssets(item);
  for (const asset of assets) await uploadObject(asset.r2Key, asset.buffer, asset.mimeType);

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
  validate();
  if (DRY_RUN) {
    let files = 0;
    for (const item of MKB_PROJECTS) files += (await loadProjectAssets(item)).length;
    console.log(`Dry run OK: ${MKB_PROJECTS.length} projektów, ${files} poprawnych plików, nic nie zapisano.`);
    return;
  }

  await assertDevDatabase();
  await upsertCatalog();
  console.log(`Zapisano ${MKB_PROJECTS.length} projektów MKB Inwestycje.`);

  let uploadedFiles = 0;
  const failures: string[] = [];
  for (const item of MKB_PROJECTS) {
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
