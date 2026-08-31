// Real schema for the epika Produkcja, spec 0018 ("Prawdziwy model danych").
// All 21 tables are defined now (Foundation), even though most start empty:
// feature 6 onward fill them in one at a time (Tracer Bullet), see spec 0018
// Feature design for the full rationale and per-table notes.
import { sql } from "drizzle-orm";
import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const roleEnum = pgEnum("role", ["client", "producer", "admin"]);

export const producerVerificationStatusEnum = pgEnum("producer_verification_status", [
  "not_submitted",
  "pending",
  "approved",
  "rejected",
]);

// Cztery wartości z dzisiejszego mocka, lib/producer-technologies.ts.
export const producerTechnologyEnum = pgEnum("producer_technology", [
  "szkielet-drewniany",
  "modulowa-stal-lekka",
  "plyta-warstwowa-sip",
  "beton-modulowy",
]);

export const productStatusEnum = pgEnum("product_status", ["draft", "published"]);

export const completionStandardEnum = pgEnum("completion_standard", [
  "surowy-zamkniety",
  "deweloperski",
  "pod-klucz",
]);

export const productCategoryEnum = pgEnum("product_category", [
  "caloroczny",
  "rekreacyjny-caloroczny",
  "mobilny",
]);

// Współdzielony przez product_country_eligibility, plot_analysis_result i
// producer_export_readiness (patrz spec 0018 Rationale: ten sam kształt
// {status, reason}, ale trzy osobne tabele bo różne klucze biznesowe).
export const eligibilityStatusEnum = pgEnum("eligibility_status", [
  "approved",
  "conditional",
  "blocked",
]);

export const inquiryStatusEnum = pgEnum("inquiry_status", ["open", "offered", "closed"]);

export const offerStatusEnum = pgEnum("offer_status", [
  "active",
  "accepted",
  "rejected",
  "superseded",
]);

export const orderStageEnum = pgEnum("order_stage", [
  "produkcja",
  "transport",
  "montaz",
  "odbior",
  "gwarancja",
]);

export const paymentPurposeEnum = pgEnum("payment_purpose", [
  "plot_analysis_fee",
  "platform_commission",
]);

export const paymentStatusEnum = pgEnum("payment_status", [
  "pending",
  "paid",
  "failed",
  "refunded",
]);

export const documentPurposeEnum = pgEnum("document_purpose", [
  "product_photo",
  "product_floor_plan",
  "order_stage",
  "company_verification",
  "producer_photo",
]);

export const auditActionEnum = pgEnum("audit_action", ["create", "update", "delete"]);

// ---------------------------------------------------------------------------
// Dictionary: country
// ---------------------------------------------------------------------------

export const country = pgTable("country", {
  code: text("code").primaryKey(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// ---------------------------------------------------------------------------
// Auth.js (v5, adapter Drizzle) core tables. Column shape follows the
// adapter's own convention, extended only with `role` on users (AC-6);
// wiring the actual adapter is feature 6, not this schema.
// ---------------------------------------------------------------------------

export const users = pgTable("users", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
  role: roleEnum("role").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export const accounts = pgTable(
  "accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (table) => [
    uniqueIndex("accounts_provider_account_unique").on(table.provider, table.providerAccountId),
  ],
);

export const sessions = pgTable("sessions", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (table) => [primaryKey({ columns: [table.identifier, table.token] })],
);

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------

export const producer = pgTable("producer", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => users.id),
  nip: text("nip").notNull().unique(),
  name: text("name").notNull(),
  countryCode: text("country_code")
    .notNull()
    .references(() => country.code),
  rating: real("rating"),
  reviewCount: integer("review_count").notNull().default(0),
  technology: producerTechnologyEnum("technology").notNull(),
  verificationStatus: producerVerificationStatusEnum("verification_status")
    .notNull()
    .default("not_submitted"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

export const producerDeliveryCountry = pgTable(
  "producer_delivery_country",
  {
    producerId: uuid("producer_id")
      .notNull()
      .references(() => producer.id),
    countryCode: text("country_code")
      .notNull()
      .references(() => country.code),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [primaryKey({ columns: [table.producerId, table.countryCode] })],
);

export const client = pgTable("client", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

// ---------------------------------------------------------------------------
// Katalog: product (łączy dzisiejsze Project i SavedProduct, patrz spec 0018
// Feature design). Pola poniżej są nullable dopóki status = 'draft', wymagane
// od status = 'published'; walidacja tego jest po stronie aplikacji, nie CHECK
// constraint (zbyt wiele pól, patrz spec Key invariants).
// ---------------------------------------------------------------------------

export const product = pgTable("product", {
  id: uuid("id").primaryKey().defaultRandom(),
  producerId: uuid("producer_id")
    .notNull()
    .references(() => producer.id),
  status: productStatusEnum("status").notNull().default("draft"),
  name: text("name"),
  countryOfProduction: text("country_of_production").references(() => country.code),
  floorAreaM2: real("floor_area_m2"),
  builtUpAreaM2: real("built_up_area_m2"),
  description: text("description"),
  wallBuildUp: text("wall_build_up"),
  insulation: text("insulation"),
  heatTransferCoefficients: text("heat_transfer_coefficients"),
  windowClass: text("window_class"),
  ventilation: text("ventilation"),
  heatSource: text("heat_source"),
  fireResistance: text("fire_resistance"),
  windResistance: text("wind_resistance"),
  completionStandard: completionStandardEnum("completion_standard"),
  productionLeadTimeWeeksMin: integer("production_lead_time_weeks_min"),
  productionLeadTimeWeeksMax: integer("production_lead_time_weeks_max"),
  onSiteAssemblyDaysMin: integer("on_site_assembly_days_min"),
  onSiteAssemblyDaysMax: integer("on_site_assembly_days_max"),
  housePriceMinCents: integer("house_price_min_cents"),
  housePriceMaxCents: integer("house_price_max_cents"),
  structuralWarrantyYears: integer("structural_warranty_years"),
  category: productCategoryEnum("category"),
  // Pola obecne tylko w dzisiejszym fixture Project, których kreator
  // producenta (spec 0016) jeszcze nie zbiera: nullable, wypełniane później
  // (patrz spec 0018 Follow-up).
  rooms: integer("rooms"),
  bedrooms: integer("bedrooms"),
  bathrooms: integer("bathrooms"),
  storeys: integer("storeys"),
  externalDimensions: text("external_dimensions"),
  roofType: text("roof_type"),
  constructionSystem: text("construction_system"),
  foundationOptions: text("foundation_options"),
  customizationScope: text("customization_scope"),
  priceMinCents: integer("price_min_cents"),
  priceMaxCents: integer("price_max_cents"),
  currency: text("currency").notNull().default("EUR"),
  priceIncludes: jsonb("price_includes").$type<string[]>(),
  priceExcludes: jsonb("price_excludes").$type<string[]>(),
  featured: boolean("featured").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

// ---------------------------------------------------------------------------
// Zgodność: trzy osobne tabele, ten sam kształt {status, reason}, różne klucze
// biznesowe (patrz spec 0018 Rationale).
// ---------------------------------------------------------------------------

export const productCountryEligibility = pgTable(
  "product_country_eligibility",
  {
    productId: uuid("product_id")
      .notNull()
      .references(() => product.id),
    countryCode: text("country_code")
      .notNull()
      .references(() => country.code),
    status: eligibilityStatusEnum("status").notNull(),
    reason: text("reason").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [primaryKey({ columns: [table.productId, table.countryCode] })],
);

// Kluczowane per (product, client), nie per product samo: dwóch różnych
// klientów analizujących ten sam produkt dla różnych działek to dwa osobne
// wiersze (spec 0018 Rationale, poprawka po cross checku).
export const plotAnalysisResult = pgTable(
  "plot_analysis_result",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id")
      .notNull()
      .references(() => product.id),
    clientId: uuid("client_id")
      .notNull()
      .references(() => client.id),
    status: eligibilityStatusEnum("status").notNull(),
    reason: text("reason").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("plot_analysis_result_product_client_unique").on(table.productId, table.clientId),
  ],
);

export const producerExportReadiness = pgTable(
  "producer_export_readiness",
  {
    producerId: uuid("producer_id")
      .notNull()
      .references(() => producer.id),
    countryCode: text("country_code")
      .notNull()
      .references(() => country.code),
    status: eligibilityStatusEnum("status").notNull(),
    reason: text("reason").notNull(),
    gaps: jsonb("gaps").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [primaryKey({ columns: [table.producerId, table.countryCode] })],
);

// ---------------------------------------------------------------------------
// Zapytanie -> oferta -> zamówienie
// ---------------------------------------------------------------------------

export const inquiry = pgTable("inquiry", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id")
    .notNull()
    .references(() => client.id),
  // Migawka danych kontaktowych w chwili wysłania (spec 0018 Rationale):
  // niezależna od tego, co klient później zmieni na swoim koncie.
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  deliveryCountryCode: text("delivery_country_code")
    .notNull()
    .references(() => country.code),
  status: inquiryStatusEnum("status").notNull().default("open"),
  receivedAt: timestamp("received_at", { withTimezone: true }).defaultNow().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const inquiryItem = pgTable(
  "inquiry_item",
  {
    inquiryId: uuid("inquiry_id")
      .notNull()
      .references(() => inquiry.id),
    productId: uuid("product_id")
      .notNull()
      .references(() => product.id),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [primaryKey({ columns: [table.inquiryId, table.productId] })],
);

export const offer = pgTable(
  "offer",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    inquiryId: uuid("inquiry_id")
      .notNull()
      .references(() => inquiry.id),
    producerId: uuid("producer_id")
      .notNull()
      .references(() => producer.id),
    currency: text("currency").notNull().default("EUR"),
    // Migawka zapisana w chwili złożenia oferty, nie liczona na żywo (spec
    // 0018 Feature design).
    installationPriceCents: integer("installation_price_cents").notNull(),
    transportPriceCents: integer("transport_price_cents").notNull(),
    status: offerStatusEnum("status").notNull().default("active"),
    submittedAt: timestamp("submitted_at", { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    // Najwyżej jedna oferta status='active' na parę (inquiry, producer); nowa
    // oferta ustawia poprzednią na 'superseded' zamiast nadpisywać ją (spec
    // 0018 Key invariants).
    uniqueIndex("offer_active_per_inquiry_producer")
      .on(table.inquiryId, table.producerId)
      .where(sql`${table.status} = 'active'`),
  ],
);

export const offerItem = pgTable(
  "offer_item",
  {
    offerId: uuid("offer_id")
      .notNull()
      .references(() => offer.id),
    productId: uuid("product_id")
      .notNull()
      .references(() => product.id),
    // Cena każdego produktu w ofercie osobno, nie jedna spłaszczona kwota
    // (spec 0018 Feature design).
    housePriceCents: integer("house_price_cents").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [primaryKey({ columns: [table.offerId, table.productId] })],
);

export const order = pgTable("order", {
  id: uuid("id").primaryKey().defaultRandom(),
  // order istnieje wyłącznie jako efekt offer.status = 'accepted' (spec 0018
  // Key invariants): FK wymagany i unikalny, nie da się utworzyć zamówienia
  // bez zaakceptowanej oferty.
  offerId: uuid("offer_id")
    .notNull()
    .unique()
    .references(() => offer.id),
  currentStage: orderStageEnum("current_stage").notNull().default("produkcja"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const orderStageEvent = pgTable("order_stage_event", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id")
    .notNull()
    .references(() => order.id),
  stage: orderStageEnum("stage").notNull(),
  reachedAt: timestamp("reached_at", { withTimezone: true }).defaultNow().notNull(),
  changedByUserId: text("changed_by_user_id").references(() => users.id),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// ---------------------------------------------------------------------------
// Płatność i dokumenty
// ---------------------------------------------------------------------------

export const payment = pgTable("payment", {
  id: uuid("id").primaryKey().defaultRandom(),
  purpose: paymentPurposeEnum("purpose").notNull(),
  amountCents: integer("amount_cents").notNull(),
  currency: text("currency").notNull().default("EUR"),
  status: paymentStatusEnum("status").notNull().default("pending"),
  providerReference: text("provider_reference"),
  orderId: uuid("order_id").references(() => order.id),
  plotAnalysisResultId: uuid("plot_analysis_result_id").references(() => plotAnalysisResult.id),
  paidByUserId: text("paid_by_user_id")
    .notNull()
    .references(() => users.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const document = pgTable("document", {
  id: uuid("id").primaryKey().defaultRandom(),
  r2Key: text("r2_key").notNull(),
  filename: text("filename").notNull(),
  mimeType: text("mime_type").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  purpose: documentPurposeEnum("purpose").notNull(),
  // Zastępuje dzisiejsze coverImageUrl/featuredPhotoUrl (spec 0018 Feature design).
  isCover: boolean("is_cover").notNull().default(false),
  sortOrder: integer("sort_order"),
  ownerUserId: text("owner_user_id")
    .notNull()
    .references(() => users.id),
  productId: uuid("product_id").references(() => product.id),
  orderStageEventId: uuid("order_stage_event_id").references(() => orderStageEvent.id),
  producerId: uuid("producer_id").references(() => producer.id),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

// ---------------------------------------------------------------------------
// Audyt: wypełniane triggerem Postgres (migracja 0002), nie kodem aplikacji
// (spec 0018 Rationale). Tabela append-only.
// ---------------------------------------------------------------------------

export const auditLog = pgTable("audit_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  actorUserId: text("actor_user_id").references(() => users.id),
  action: auditActionEnum("action").notNull(),
  tableName: text("table_name").notNull(),
  // Stringified PK: uuid dla większości tabel, id tekstowe dla users.
  recordId: text("record_id").notNull(),
  oldValues: jsonb("old_values").$type<Record<string, unknown>>(),
  newValues: jsonb("new_values").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
