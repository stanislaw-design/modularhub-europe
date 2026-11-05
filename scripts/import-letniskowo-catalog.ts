// Letniskowo: 17 domów mobilnych, opcje płatne i treść producenta (dane w scripts/data/letniskowo-*.ts), spec 0081.
// Zdjęcia i rzuty przygotowuje scripts/letniskowo-prepare-images.py do tmp/letniskowo/<model>/.
// Spec 0067: tłumaczenia en/de/nl powstają razem z importem; po nim `npm run check:translations` ma zgłosić zero braków.
// Zapis tylko do dev DB (assertDevDatabase); prod to osobny, jawny krok (drizzle/_promote_letniskowo.sql).
// `--dry-run` waliduje dane i pliki, niczego nie zapisuje.
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { and, eq, inArray, isNull, notInArray, sql } from "drizzle-orm";
import { db } from "../lib/db/client";
import { assertDevDatabase } from "../lib/db/dev-database-guard";
import {
  country,
  document,
  producer,
  producerCertification,
  producerCertificationTranslation,
  producerContentItem,
  producerContentItemTranslation,
  producerDeliveryCountry,
  producerInteriorStyle,
  producerInteriorStyleImage,
  producerInteriorStyleMaterial,
  producerInteriorStyleTranslation,
  producerMember,
  producerTranslation,
  product,
  productCountryEligibility,
  productInteriorStyleAssignment,
  productOption,
  productOptionGroup,
  productOptionGroupAssignment,
  productOptionGroupTranslation,
  productOptionTranslation,
  productTranslation,
  productVariant,
  productVariantTranslation,
  referenceTextTranslation,
  users,
} from "../lib/db/schema";
import { roomLayoutSchema } from "../lib/product-room-layout";
import { getTechnicalSpecsSchema } from "../lib/product-technical-specs";
import { slugifyProductName } from "../lib/product-slug";
import { validateProductPhotoFile } from "../lib/storage/document-validation";
import { buildPublicUrl, buildR2Key, uploadObject } from "../lib/storage/r2-client";
import {
  CERTIFICATIONS,
  COLLABORATION_STEPS,
  COMMERCIAL_USES,
  CONSTRUCTION_SYSTEM,
  CUSTOMIZATION_SCOPE,
  ELIGIBILITY_REASON,
  EXCLUDED_SCOPE,
  IMPORT_USER_ID,
  LETNISKOWO_PRODUCER,
  MODELS,
  PRODUCER_ID,
  ROOM_NAMES,
  SCOPE_SUMMARY,
  TECHNICAL_ACCOUNT_EMAIL,
  descriptionOf,
  detUuid,
  productId,
  roofTypeOf,
  roomId,
  technicalSpecsOf,
  variantId,
  type L10n,
  type ModelSource,
} from "./data/letniskowo-catalog";
import { GROUPS, groupId, groupsForModel, optionId } from "./data/letniskowo-options";
import { STYLES, VIZ_NAMES, materialId, materialsOf, styleId, styleImageId, type StyleSource } from "./data/letniskowo-styles";

const DRY_RUN = process.argv.includes("--dry-run");
const LOCALES = ["en", "de", "nl"] as const;
const excluded = (column: string) => sql.raw(`excluded."${column}"`);
const IMAGES_DIR = path.join(process.cwd(), "tmp", "letniskowo");
const STYLES_DIR = path.join(process.cwd(), "tmp", "letniskowo-styles");

function assertL10n(owner: string, text: L10n): void {
  for (const key of ["pl", "en", "de", "nl"] as const) {
    if (!text[key] || text[key].trim().length === 0) throw new Error(`${owner}: brak wersji ${key}`);
  }
}

const roomsOf = (model: ModelSource) =>
  model.rooms.map(([kind, areaM2], index) => ({ kind, areaM2, index, id: roomId(model, index) }));

const roomLayoutOf = (model: ModelSource) =>
  roomsOf(model).map((room) => ({
    id: room.id,
    name: ROOM_NAMES[room.kind].pl,
    areaM2: room.areaM2,
    floorLevel: room.kind === "mezzanine" ? ("pietro" as const) : ("parter" as const),
  }));

const countKinds = (model: ModelSource, kinds: string[]) => model.rooms.filter(([kind]) => kinds.includes(kind)).length;
const bedroomsOf = (model: ModelSource) => countKinds(model, ["bedroom", "room", "room2"]);
const bathroomsOf = (model: ModelSource) => countKinds(model, ["bathroom", "bathroom2"]);

function validate(): void {
  const slugs = new Set<string>();
  for (const model of MODELS) {
    if (!getTechnicalSpecsSchema("dom", "published").safeParse(technicalSpecsOf(model)).success) {
      throw new Error(`${model.name}: niepoprawne dane techniczne`);
    }
    const slug = slugifyProductName(model.name);
    if (slugs.has(slug)) throw new Error(`Powtórzony slug ${slug}`);
    slugs.add(slug);
    assertL10n(model.name, descriptionOf(model));
    assertL10n(model.name, roofTypeOf(model));
    for (const [kind] of model.rooms) assertL10n(model.name, ROOM_NAMES[kind]);
    if (!roomLayoutSchema.safeParse(roomLayoutOf(model)).success) throw new Error(`${model.name}: niepoprawny układ pomieszczeń`);
  }
  for (const group of GROUPS) {
    assertL10n(group.key, group.name);
    for (const option of group.options) {
      assertL10n(`${group.key}/${option.key}`, option.label);
      if (option.note) assertL10n(`${group.key}/${option.key}`, option.note);
    }
    if (group.selectionType === "single" && group.options[0].priceEur !== 0) {
      throw new Error(`${group.key}: pierwsza opcja grupy single musi być darmowym standardem`);
    }
  }
  for (const text of [
    LETNISKOWO_PRODUCER.description, ELIGIBILITY_REASON, CONSTRUCTION_SYSTEM, CUSTOMIZATION_SCOPE, SCOPE_SUMMARY, EXCLUDED_SCOPE,
    ...CERTIFICATIONS.map((c) => c.name),
    ...COLLABORATION_STEPS.flatMap((s) => [s.title, s.body]),
    ...COMMERCIAL_USES.map((u) => u.title),
  ]) {
    assertL10n("producent/wspólne", text);
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
  floorLevel: "parter" | null;
}

async function loadModelAssets(model: ModelSource): Promise<LocalAsset[]> {
  const dir = path.join(IMAGES_DIR, model.key);
  const files = (await readdir(dir)).sort();
  const photos = files.filter((file) => !file.endsWith("-plan.jpg"));
  const plans = files.filter((file) => file.endsWith("-plan.jpg"));
  if (photos.length === 0) throw new Error(`${model.name}: brak zdjęć w ${dir}`);
  const entries = [
    ...photos.map((file, index) => ({ file, purpose: "product_photo" as const, isCover: index === 0, floorLevel: null })),
    ...plans.map((file) => ({ file, purpose: "product_floor_plan" as const, isCover: false, floorLevel: "parter" as const })),
  ];
  return Promise.all(
    entries.map(async ({ file, purpose, isCover, floorLevel }, index) => {
      const buffer = await readFile(path.join(dir, file));
      const validation = validateProductPhotoFile(buffer);
      if (!validation.ok || !validation.mimeType) throw new Error(`Nieprawidłowy obraz ${file}: ${validation.error ?? "nieznany błąd"}`);
      return { buffer, filename: file, mimeType: validation.mimeType, r2Key: buildR2Key(file), purpose, isCover, sortOrder: index, floorLevel };
    }),
  );
}

function productValues(model: ModelSource) {
  return {
    producerId: PRODUCER_ID,
    status: "published" as const,
    family: "dom" as const,
    name: model.name,
    slug: slugifyProductName(model.name),
    countryOfProduction: "PL",
    floorAreaM2: model.areaM2,
    description: descriptionOf(model).pl,
    completionStandard: "pod-klucz" as const,
    category: "mobilny" as const,
    technicalSpecs: technicalSpecsOf(model),
    roomLayout: roomLayoutOf(model),
    rooms: null,
    bedrooms: bedroomsOf(model),
    bathrooms: bathroomsOf(model),
    storeys: 1,
    roofType: roofTypeOf(model).pl,
    constructionSystem: CONSTRUCTION_SYSTEM.pl,
    customizationScope: CUSTOMIZATION_SCOPE.pl,
    currency: "EUR",
    featured: false,
    deletedAt: null,
    updatedAt: new Date(),
  };
}

async function upsertProducer(): Promise<void> {
  const certIds = CERTIFICATIONS.map((cert) => detUuid(`cert:${cert.key}`));
  await db.batch([
    db.insert(country).values({ code: "PL", name: "Polska" }).onConflictDoNothing(),
    db
      .insert(users)
      .values({
        id: IMPORT_USER_ID,
        name: LETNISKOWO_PRODUCER.name,
        email: TECHNICAL_ACCOUNT_EMAIL,
        role: "producer",
        // users.phone jest NOT NULL; zaślepka techniczna, nigdzie nie pokazywana (kontakt tylko przez platformę).
        phone: "+48 000 000 000",
      })
      .onConflictDoUpdate({ target: users.id, set: { name: LETNISKOWO_PRODUCER.name, role: "producer", updatedAt: new Date() } }),
    db
      .insert(producer)
      .values({
        id: PRODUCER_ID,
        userId: IMPORT_USER_ID,
        nip: LETNISKOWO_PRODUCER.nip,
        name: LETNISKOWO_PRODUCER.name,
        countryCode: "PL",
        technology: "modulowa-stal-lekka",
        verificationStatus: "not_submitted",
        description: LETNISKOWO_PRODUCER.description.pl,
      })
      .onConflictDoUpdate({
        target: producer.id,
        set: {
          name: LETNISKOWO_PRODUCER.name,
          countryCode: "PL",
          technology: "modulowa-stal-lekka",
          description: LETNISKOWO_PRODUCER.description.pl,
          updatedAt: new Date(),
          deletedAt: null,
        },
      }),
    db.insert(producerDeliveryCountry).values({ producerId: PRODUCER_ID, countryCode: "PL" }).onConflictDoNothing(),
    db.insert(producerMember).values({ producerId: PRODUCER_ID, userId: IMPORT_USER_ID }).onConflictDoNothing(),
    db
      .insert(producerTranslation)
      .values(LOCALES.map((locale) => ({ producerId: PRODUCER_ID, locale, description: LETNISKOWO_PRODUCER.description[locale] })))
      .onConflictDoUpdate({
        target: [producerTranslation.producerId, producerTranslation.locale],
        set: { description: excluded("description"), updatedAt: new Date() },
      }),
    db
      .insert(referenceTextTranslation)
      .values(
        [ELIGIBILITY_REASON].flatMap((text) => LOCALES.map((locale) => ({ sourcePl: text.pl, locale, translated: text[locale] }))),
      )
      .onConflictDoNothing(),
    db
      .insert(producerCertification)
      .values(CERTIFICATIONS.map((cert, index) => ({ id: certIds[index], producerId: PRODUCER_ID, name: cert.name.pl })))
      .onConflictDoUpdate({ target: producerCertification.id, set: { name: excluded("name"), updatedAt: new Date() } }),
    db
      .insert(producerCertificationTranslation)
      .values(CERTIFICATIONS.flatMap((cert, index) => LOCALES.map((locale) => ({ certificationId: certIds[index], locale, name: cert.name[locale] }))))
      .onConflictDoUpdate({
        target: [producerCertificationTranslation.certificationId, producerCertificationTranslation.locale],
        set: { name: excluded("name"), updatedAt: new Date() },
      }),
  ]);
}

async function upsertContentItems(): Promise<void> {
  const items = [
    ...COLLABORATION_STEPS.map((step, index) => ({ kind: "collaboration_step" as const, key: step.key, title: step.title, body: step.body as L10n | null, sortOrder: index })),
    ...COMMERCIAL_USES.map((use, index) => ({ kind: "commercial_use" as const, key: use.key, title: use.title, body: null as L10n | null, sortOrder: index })),
  ];
  const ids = items.map((item) => detUuid(`content:${item.kind}:${item.key}`));
  await db.batch([
    db
      .insert(producerContentItem)
      .values(items.map((item, index) => ({ id: ids[index], producerId: PRODUCER_ID, kind: item.kind, title: item.title.pl, body: item.body?.pl ?? null, sortOrder: item.sortOrder })))
      .onConflictDoUpdate({
        target: producerContentItem.id,
        set: { title: excluded("title"), body: excluded("body"), sortOrder: excluded("sort_order"), deletedAt: null, updatedAt: new Date() },
      }),
    db
      .insert(producerContentItemTranslation)
      .values(items.flatMap((item, index) => LOCALES.map((locale) => ({ itemId: ids[index], locale, title: item.title[locale], body: item.body?.[locale] ?? null }))))
      .onConflictDoUpdate({
        target: [producerContentItemTranslation.itemId, producerContentItemTranslation.locale],
        set: { title: excluded("title"), body: excluded("body"), updatedAt: new Date() },
      }),
  ]);
}

async function upsertOptionGroups(): Promise<void> {
  const ids = GROUPS.map((group) => groupId(group.key));
  // Zmiana opcji domyślnej w grupie (indeks: najwyżej jedna domyślna na grupę) wymaga najpierw wyczyszczenia starej.
  await db.update(productOption).set({ isDefault: false }).where(inArray(productOption.groupId, ids));
  await db.batch([
    db
      .insert(productOptionGroup)
      .values(GROUPS.map((group, index) => ({ id: groupId(group.key), producerId: PRODUCER_ID, name: group.name.pl, selectionType: group.selectionType, sortOrder: index })))
      .onConflictDoUpdate({
        target: productOptionGroup.id,
        set: { name: excluded("name"), selectionType: excluded("selection_type"), sortOrder: excluded("sort_order"), deletedAt: null, updatedAt: new Date() },
      }),
    db
      .insert(productOption)
      .values(
        GROUPS.flatMap((group) =>
          group.options.map((option, index) => ({
            id: optionId(group.key, option.key),
            groupId: groupId(group.key),
            label: option.label.pl,
            priceCents: option.priceEur * 100,
            priceOnRequest: false,
            priceNote: option.note?.pl ?? null,
            isDefault: group.selectionType === "single" && index === 0,
            sortOrder: index,
          })),
        ),
      )
      .onConflictDoUpdate({
        target: productOption.id,
        set: {
          label: excluded("label"),
          priceCents: excluded("price_cents"),
          priceOnRequest: excluded("price_on_request"),
          priceNote: excluded("price_note"),
          isDefault: excluded("is_default"),
          sortOrder: excluded("sort_order"),
          deletedAt: null,
          updatedAt: new Date(),
        },
      }),
    db
      .insert(productOptionGroupTranslation)
      .values(GROUPS.flatMap((group) => LOCALES.map((locale) => ({ groupId: groupId(group.key), locale, name: group.name[locale] }))))
      .onConflictDoUpdate({
        target: [productOptionGroupTranslation.groupId, productOptionGroupTranslation.locale],
        set: { name: excluded("name"), updatedAt: new Date() },
      }),
    db
      .insert(productOptionTranslation)
      .values(
        GROUPS.flatMap((group) =>
          group.options.flatMap((option) =>
            LOCALES.map((locale) => ({ optionId: optionId(group.key, option.key), locale, label: option.label[locale], priceNote: option.note?.[locale] ?? null })),
          ),
        ),
      )
      .onConflictDoUpdate({
        target: [productOptionTranslation.optionId, productOptionTranslation.locale],
        set: { label: excluded("label"), priceNote: excluded("price_note"), updatedAt: new Date() },
      }),
  ]);
}

async function upsertModel(model: ModelSource): Promise<void> {
  const id = productId(model);
  const values = productValues(model);
  const description = descriptionOf(model);
  const roofType = roofTypeOf(model);
  await db.batch([
    db.insert(product).values({ id, ...values }).onConflictDoUpdate({ target: product.id, set: values }),
    db
      .insert(productCountryEligibility)
      .values({ productId: id, countryCode: "PL", status: "conditional", reason: ELIGIBILITY_REASON.pl })
      .onConflictDoUpdate({
        target: [productCountryEligibility.productId, productCountryEligibility.countryCode],
        set: { status: "conditional", reason: ELIGIBILITY_REASON.pl, updatedAt: new Date() },
      }),
    db
      .insert(productTranslation)
      .values(
        LOCALES.map((locale) => ({
          productId: id,
          locale,
          name: model.name,
          description: description[locale],
          roomLayout: roomsOf(model).map((room) => ({ id: room.id, name: ROOM_NAMES[room.kind][locale] })),
          constructionSystem: CONSTRUCTION_SYSTEM[locale],
          roofType: roofType[locale],
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

  // Przypisania grup: dokładnie te, które pasują do modelu (reguły w letniskowo-options.ts); reszta naszych grup odpada.
  const groups = groupsForModel(model);
  const allIds = GROUPS.map((group) => groupId(group.key));
  const wanted = groups.map((group) => groupId(group.key));
  await db
    .delete(productOptionGroupAssignment)
    .where(and(eq(productOptionGroupAssignment.productId, id), inArray(productOptionGroupAssignment.groupId, allIds), notInArray(productOptionGroupAssignment.groupId, wanted)));
  await db.insert(productOptionGroupAssignment).values(wanted.map((groupIdValue) => ({ productId: id, groupId: groupIdValue }))).onConflictDoNothing();

  // Cena product.price_min_cents jest wyliczana wyzwalaczem z wariantu domyślnego.
  const vId = variantId(model);
  await db.batch([
    db
      .insert(productVariant)
      .values({
        id: vId,
        productId: id,
        completionStandard: "pod-klucz",
        priceMinCents: model.priceEur * 100,
        priceOnRequest: false,
        scopeSummary: SCOPE_SUMMARY.pl,
        excludedScope: EXCLUDED_SCOPE.pl,
        isDefault: true,
        sortOrder: 0,
      })
      .onConflictDoUpdate({
        target: productVariant.id,
        set: {
          priceMinCents: model.priceEur * 100,
          priceOnRequest: false,
          scopeSummary: SCOPE_SUMMARY.pl,
          excludedScope: EXCLUDED_SCOPE.pl,
          isDefault: true,
          sortOrder: 0,
          deletedAt: null,
          updatedAt: new Date(),
        },
      }),
    db
      .insert(productVariantTranslation)
      .values(LOCALES.map((locale) => ({ productVariantId: vId, locale, scopeSummary: SCOPE_SUMMARY[locale], excludedScope: EXCLUDED_SCOPE[locale] })))
      .onConflictDoUpdate({
        target: [productVariantTranslation.productVariantId, productVariantTranslation.locale],
        set: { scopeSummary: excluded("scope_summary"), excludedScope: excluded("excluded_scope"), updatedAt: new Date() },
      }),
  ]);
}

// Galeria jest dopełniana po nazwie pliku: nowe pliki trafiają do R2 i do bazy, istniejące dostają tylko aktualną kolejność.
async function uploadModelDocuments(model: ModelSource): Promise<number> {
  const id = productId(model);
  const existing = await db
    .select({ id: document.id, filename: document.filename })
    .from(document)
    .where(and(eq(document.productId, id), isNull(document.deletedAt)));
  const existingByName = new Map(existing.map((row) => [row.filename, row.id]));
  const assets = await loadModelAssets(model);
  const fresh = assets.filter((asset) => !existingByName.has(asset.filename));
  for (const asset of fresh) await uploadObject(asset.r2Key, asset.buffer, asset.mimeType);
  if (fresh.length > 0) {
    await db.insert(document).values(
      fresh.map((asset) => ({
        r2Key: asset.r2Key,
        filename: asset.filename,
        mimeType: asset.mimeType,
        sizeBytes: asset.buffer.byteLength,
        purpose: asset.purpose,
        isCover: false,
        sortOrder: asset.sortOrder,
        floorLevel: asset.floorLevel,
        ownerUserId: IMPORT_USER_ID,
        productId: id,
      })),
    );
  }
  for (const asset of assets) {
    const existingId = existingByName.get(asset.filename);
    if (existingId) await db.update(document).set({ sortOrder: asset.sortOrder, floorLevel: asset.floorLevel, purpose: asset.purpose }).where(eq(document.id, existingId));
  }
  // Okładka: jedna na produkt (indeks częściowy), ustawiana po wstawieniu, nie w trakcie.
  const cover = assets.find((asset) => asset.isCover && asset.purpose === "product_photo");
  if (cover) {
    await db
      .update(document)
      .set({ isCover: sql`(${document.filename} = ${cover.filename})` })
      .where(and(eq(document.productId, id), eq(document.purpose, "product_photo"), isNull(document.deletedAt)));
  }
  return fresh.length;
}

// Stylistyki wnętrz (spec 0081): kafelki to małe WebP z R2 (zwykły <img>, bez optymalizacji Vercela), wizualizacje to JPEG.
// Klucze w R2 są stałe, więc ponowny import nadpisuje te same pliki. Stylistyka należy do producenta i jest przypisana
// tylko do jego produktów (baza tego nie wymusza, pilnuje skrypt).
async function uploadStyleAssets(): Promise<{ swatches: Map<string, string>; viz: Map<string, string> }> {
  const swatches = new Map<string, string>();
  const viz = new Map<string, string>();
  const tiles = new Set(STYLES.flatMap((style) => materialsOf(style).map((material) => material.tile)));
  for (const tile of tiles) {
    const buffer = await readFile(path.join(STYLES_DIR, "swatches", `${tile}.webp`));
    const key = `style-swatches/letniskowo-${tile}.webp`;
    if (!DRY_RUN) await uploadObject(key, buffer, "image/webp");
    swatches.set(tile, buildPublicUrl(key));
  }
  for (const style of STYLES) {
    for (const name of VIZ_NAMES) {
      const buffer = await readFile(path.join(STYLES_DIR, "viz", `${style.key}-${name}.jpg`));
      const validation = validateProductPhotoFile(buffer);
      if (!validation.ok || !validation.mimeType) throw new Error(`Nieprawidłowy obraz ${style.key}-${name}`);
      const key = `style-images/letniskowo-${style.key}-${name}.jpg`;
      if (!DRY_RUN) await uploadObject(key, buffer, validation.mimeType);
      viz.set(`${style.key}:${name}`, buildPublicUrl(key));
    }
  }
  return { swatches, viz };
}

async function upsertStyles(): Promise<void> {
  const { swatches, viz } = await uploadStyleAssets();
  const ids = STYLES.map((style) => styleId(style.key));
  await db.batch([
    db
      .insert(producerInteriorStyle)
      .values(STYLES.map((style, index) => ({ id: styleId(style.key), producerId: PRODUCER_ID, name: style.name, description: style.description.pl, sortOrder: index })))
      .onConflictDoUpdate({
        target: producerInteriorStyle.id,
        set: { name: excluded("name"), description: excluded("description"), sortOrder: excluded("sort_order"), deletedAt: null, updatedAt: new Date() },
      }),
    db
      .insert(producerInteriorStyleTranslation)
      .values(STYLES.flatMap((style) => LOCALES.map((locale) => ({ styleId: styleId(style.key), locale, name: style.name, description: style.description[locale] }))))
      .onConflictDoUpdate({
        target: [producerInteriorStyleTranslation.styleId, producerInteriorStyleTranslation.locale],
        set: { name: excluded("name"), description: excluded("description"), updatedAt: new Date() },
      }),
  ]);
  // Obrazy i materiały należą do tego skryptu: wiersze wstawiane od zera, więc poprzednie znikają.
  await db.delete(producerInteriorStyleImage).where(inArray(producerInteriorStyleImage.styleId, ids));
  await db.delete(producerInteriorStyleMaterial).where(inArray(producerInteriorStyleMaterial.styleId, ids));
  await db.insert(producerInteriorStyleImage).values(
    STYLES.flatMap((style: StyleSource) =>
      VIZ_NAMES.map((name, index) => ({ id: styleImageId(style.key, index), styleId: styleId(style.key), url: viz.get(`${style.key}:${name}`)!, alt: null, sortOrder: index })),
    ),
  );
  await db.insert(producerInteriorStyleMaterial).values(
    STYLES.flatMap((style) =>
      materialsOf(style).map((material, index) => ({
        id: materialId(style.key, index),
        styleId: styleId(style.key),
        zone: material.zone,
        name: material.name,
        code: material.code,
        swatchUrl: swatches.get(material.tile)!,
        sortOrder: material.sortOrder,
      })),
    ),
  );
  const rows = MODELS.flatMap((model) => STYLES.map((style) => ({ productId: productId(model), styleId: styleId(style.key) })));
  await db.insert(productInteriorStyleAssignment).values(rows).onConflictDoNothing();
}

async function main(): Promise<void> {
  validate();
  // Pierwszy argument bez flagi zawęża import do jednego modelu (cienka nitka: `bali`).
  const only = process.argv.slice(2).find((arg) => !arg.startsWith("--"));
  const models = only ? MODELS.filter((model) => model.key === only) : MODELS;
  if (models.length === 0) throw new Error(`Nieznany model: ${only}`);

  if (DRY_RUN) {
    for (const model of models) {
      const files = await loadModelAssets(model);
      console.log(`- ${model.name}: ${files.length} plików, ${model.rooms.length} pomieszczeń, ${model.priceEur} EUR, ${groupsForModel(model).length} grup opcji`);
    }
    await uploadStyleAssets();
    console.log(`Dry run OK: ${models.length} modeli, ${STYLES.length} stylistyk, ${GROUPS.length} grup opcji, nic nie zapisano.`);
    return;
  }

  await assertDevDatabase();
  await upsertProducer();
  await upsertOptionGroups();
  await upsertContentItems();
  for (const model of models) await upsertModel(model);
  // Stylistyki przypisuje się do wszystkich 17 modeli naraz; przy imporcie jednego modelu zostają bez zmian.
  if (!only) await upsertStyles();
  console.log(`Zapisano ${models.length} modeli Letniskowo.`);

  for (const model of models) {
    const count = await uploadModelDocuments(model);
    console.log(`- ${model.name}: ${count === 0 ? "dokumenty już kompletne" : `${count} plików zapisanych w R2`}`);
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
