// Real schema for the epika Produkcja, spec 0018 ("Prawdziwy model danych").
// All 21 tables are defined now (Foundation), even though most start empty:
// feature 6 onward fill them in one at a time (Tracer Bullet), see spec 0018
// Feature design for the full rationale and per-table notes.
import { sql } from "drizzle-orm";
import type { PendingRegistrationPayload } from "@/lib/auth-shared";
import {
  boolean,
  check,
  customType,
  index,
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

// tsvector nie ma dedykowanego column builder w drizzle-orm (spec 0026, Feature
// design). Read-only: kolumna jest GENERATED ALWAYS AS ... STORED przez Postgres
// (patrz product.searchVector niżej), aplikacja nigdy w nią nie zapisuje.
const tsvector = customType<{ data: string }>({
  dataType() {
    return "tsvector";
  },
});

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

// Rodzina produktu, niezależna od category (spec 0022). Bez wartości
// domyślnej celowo: każdy insert, w tym ręczny przez Neon MCP (funkcja 7),
// musi jawnie podać family (spec 0022 AC-1).
export const productFamilyEnum = pgEnum("product_family", ["dom", "spa-modulowe", "pergola"]);

// Tylko en/nl: polski zostaje na product.name/description samym, jako tekst
// źródłowy (spec 0028 Decision) — ten enum nigdy nie nosi "pl".
export const productTranslationLocaleEnum = pgEnum("product_translation_locale", ["en", "nl"]);

export const spaSubcategoryEnum = pgEnum("spa_subcategory", ["sauna", "jacuzzi", "wellness-combo"]);

export const pergolaSubcategoryEnum = pgEnum("pergola_subcategory", [
  "bioklimatyczna",
  "aluminiowa-stala",
  "drewniana",
  "wolnostojaca-przyscienna",
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
  // Brakowało w spec 0018 (przewidział tylko migawkę telefonu na inquiry).
  // Wspólne dla klienta i producenta, zbierane raz przy rejestracji (spec 0023).
  phone: text("phone").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

// Dane z formularza rejestracji do chwili potwierdzenia e mailem (spec 0023
// Key invariants): users/client/producer powstają dopiero przy pierwszym
// udanym logowaniu, ten wiersz jest wtedy kasowany. Zapobiega zajęciu cudzego
// NIP/e maila przez niepotwierdzone konto.
export const pendingRegistration = pgTable("pending_registration", {
  email: text("email").primaryKey(),
  role: roleEnum("role").notNull(),
  payload: jsonb("payload").$type<PendingRegistrationPayload>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
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
// constraint (zbyt wiele pól, patrz spec Key invariants). Wyjątek: zgodność
// family/category/spaSubcategory/pergolaSubcategory JEST ograniczeniem CHECK
// (spec 0022, patrz product_family_subcategory_match niżej) — wąski, celowy
// wyjątek od tej konwencji, bo funkcja 7 wstawia wiersze ręcznie przez Neon
// MCP, mijając walidację aplikacji.
// ---------------------------------------------------------------------------

export const product = pgTable(
  "product",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    producerId: uuid("producer_id")
      .notNull()
      .references(() => producer.id),
    status: productStatusEnum("status").notNull().default("draft"),
    // Rodzina produktu, niezmienna po utworzeniu (spec 0022 AC-1, AC-7).
    family: productFamilyEnum("family").notNull(),
    name: text("name"),
    countryOfProduction: text("country_of_production").references(() => country.code),
    floorAreaM2: real("floor_area_m2"),
    builtUpAreaM2: real("built_up_area_m2"),
    description: text("description"),
    completionStandard: completionStandardEnum("completion_standard"),
    productionLeadTimeWeeksMin: integer("production_lead_time_weeks_min"),
    productionLeadTimeWeeksMax: integer("production_lead_time_weeks_max"),
    onSiteAssemblyDaysMin: integer("on_site_assembly_days_min"),
    onSiteAssemblyDaysMax: integer("on_site_assembly_days_max"),
    housePriceMinCents: integer("house_price_min_cents"),
    housePriceMaxCents: integer("house_price_max_cents"),
    structuralWarrantyYears: integer("structural_warranty_years"),
    // Podkategoria, znacząca tylko dla family dopasowanej do jej nazwy;
    // egzekwowane niżej przez product_family_subcategory_match (spec 0022 AC-2, AC-3).
    category: productCategoryEnum("category"),
    spaSubcategory: spaSubcategoryEnum("spa_subcategory"),
    pergolaSubcategory: pergolaSubcategoryEnum("pergola_subcategory"),
    // Dane techniczne, kształt zależny od family, walidowane schematem Zod
    // po stronie formularza kreatora i zapisu (spec 0022 AC-4). Zastępuje
    // dawnych 8 płaskich kolumn technicznych domu (spec 0022 AC-5).
    technicalSpecs: jsonb("technical_specs"),
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
    // Tymczasowe: zwykły URL zewnętrzny, zastąpione realnym przechowywaniem
    // plików (Cloudflare R2) w Slice 5 (spec 0023 Context, Follow-up).
    coverImageUrl: text("cover_image_url"),
    // Wyszukiwanie pełnotekstowe (spec 0026 AC-6, AC-13): kolumna generowana przez
    // Postgres (GENERATED ALWAYS AS ... STORED, migracja ręczna drizzle/NNNN, ten
    // sam wzorzec spoza DSL drizzle-kit co drizzle/0002_audit_log_trigger.sql —
    // patrz lib/db/AGENTS.md). Zadeklarowana tu z komentarzem ostrzegawczym: NIE
    // dodawaj tu `.generatedAlwaysAs()` i nie licz na to, że `db:generate`
    // zarządzi tą kolumną — jej DDL żyje wyłącznie w tamtej migracji.
    searchVector: tsvector("search_vector"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    // Żadne pole podkategorii nie może być wypełnione dla rodziny, do której
    // nie pasuje. Nie wymusza, że dokładnie jedno jest wypełnione (to zostaje
    // po stronie aplikacji, patrz komentarz nad tabelą) — spec 0022 AC-2.
    check(
      "product_family_subcategory_match",
      sql`(${table.category} IS NULL OR ${table.family} = 'dom') AND (${table.spaSubcategory} IS NULL OR ${table.family} = 'spa-modulowe') AND (${table.pergolaSubcategory} IS NULL OR ${table.family} = 'pergola')`,
    ),
    // Wszystkie cztery poniżej wspierają /wyniki (spec 0026 AC-13): każde
    // dzisiejsze zapytanie filtruje po status+family naraz, stąd złożony indeks
    // zamiast dwóch osobnych; floor_area_m2/price_min_cents dostają zwykły
    // B-drzewa, bo filtr ceny/metrażu przenosi się do WHERE (task 4); indeksy
    // wyrażeniowe na trzech kluczach jsonb faktycznie filtrowanych, bez nich
    // nowe filtry atrybutów skanowałyby całą tabelę mimo enumów.
    index("product_status_family_idx").on(table.status, table.family),
    index("product_floor_area_m2_idx").on(table.floorAreaM2),
    index("product_price_min_cents_idx").on(table.priceMinCents),
    index("product_technical_specs_heat_source_idx").on(sql`(${table.technicalSpecs}->>'heatSource')`),
    index("product_technical_specs_ventilation_idx").on(sql`(${table.technicalSpecs}->>'ventilation')`),
    index("product_technical_specs_energy_class_idx").on(
      sql`(${table.technicalSpecs}->>'heatTransferCoefficients')`,
    ),
    // Indeks GIN na search_vector: zadeklarowany tu (drizzle-kit umie zwykłe
    // indeksy DSL), ale sama kolumna istnieje tylko dzięki migracji ręcznej
    // powyżej — ta migracja SQL musi wykonać się PRZED tą, którą wygeneruje
    // `db:generate` dla tego indeksu (kolejność w drizzle/, patrz Build plan zadanie 1).
    index("product_search_vector_idx").using("gin", table.searchVector),
  ],
);

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

// Tłumaczenie EN/NL nazwy i opisu produktu, wprowadzane ręcznie przez
// producenta (spec 0028 Decision, Feature design). Co najwyżej jeden wiersz
// na (product, locale); name/description nullable, brak lub puste pole
// spada na fallback do polskiego source of truth na `product` (AC-6),
// rozwiązywane w lib/data/projects.ts, nie tutaj.
export const productTranslation = pgTable(
  "product_translation",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id")
      .notNull()
      .references(() => product.id),
    locale: productTranslationLocaleEnum("locale").notNull(),
    name: text("name"),
    description: text("description"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("product_translation_product_id_locale_idx").on(table.productId, table.locale)],
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
  // Wygenerowany po stronie przeglądarki przy otwarciu formularza; ponowne
  // wysłanie z tym samym kluczem po błędzie nie tworzy drugiego wiersza
  // (spec 0023 AC-7, AC-8).
  idempotencyKey: text("idempotency_key").unique(),
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

// Klucz (clientId, productId) unikalny (spec 0024 Feature design): jeden
// klient nie może dodać tego samego produktu dwa razy. toggleFavorite
// (lib/favorite-actions.ts) traktuje to jako idempotentny insert/delete, nigdy
// sprawdź-potem-zapisz (spec 0024 Key invariants).
export const favorite = pgTable(
  "favorite",
  {
    clientId: uuid("client_id")
      .notNull()
      .references(() => client.id),
    productId: uuid("product_id")
      .notNull()
      .references(() => product.id),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [primaryKey({ columns: [table.clientId, table.productId] })],
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
    // Sygnał nieprzeczytane/przeczytane, spec 0033 AC-11/AC-12. Ustawiane
    // wyłącznie w ścieżce faktycznej nawigacji (nigdy w czymś, co Next.js
    // mógłby prefetchować), zapis idempotentny (patrz lib/offer-actions.ts).
    clientViewedAt: timestamp("client_viewed_at", { withTimezone: true }),
    producerDecisionViewedAt: timestamp("producer_decision_viewed_at", { withTimezone: true }),
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

export const document = pgTable(
  "document",
  {
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
  },
  (table) => [
    // Najwyżej jedna okładka (is_cover) na produkt, filtrowane też po purpose
    // (spec 0031 Feature design): bez tego filtru zdjęcie i przyszły rzut
    // techniczny tego samego produktu mogłyby rywalizować o ten sam indeks.
    uniqueIndex("document_one_cover_per_product")
      .on(table.productId)
      .where(sql`${table.isCover} AND ${table.purpose} = 'product_photo' AND ${table.deletedAt} IS NULL`),
  ],
);

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
