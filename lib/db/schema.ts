// Real schema for the epika Produkcja, spec 0018 ("Prawdziwy model danych").
// All 21 tables are defined now (Foundation), even though most start empty:
// feature 6 onward fill them in one at a time (Tracer Bullet), see spec 0018
// Feature design for the full rationale and per-table notes.
import { sql } from "drizzle-orm";
import type { PendingRegistrationPayload } from "@/lib/auth-shared";
import {
  bigint,
  boolean,
  check,
  customType,
  date,
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

// Orientacyjny wybór przy rejestracji (spec 0040 AC-8), czysto informacyjny,
// odrębny od producerCapacityProfile.unitsPerMonth (dokładna liczba, spec 0037,
// uzupełniana później w panelu).
export const producerProductionScaleEnum = pgEnum("producer_production_scale", [
  "do-10",
  "powyzej-10",
]);

export const productStatusEnum = pgEnum("product_status", ["draft", "published"]);

export const completionStandardEnum = pgEnum("completion_standard", [
  "surowy-zamkniety",
  "deweloperski",
  "pod-klucz",
]);

// "wynajem-hotel" dopisana przez ALTER TYPE ... ADD VALUE (spec 0041 AC-6),
// ten sam wzorzec co productTranslationLocaleEnum wyżej — Postgres nie ma
// DROP VALUE, więc to jednokierunkowe rozszerzenie.
export const productCategoryEnum = pgEnum("product_category", [
  "caloroczny",
  "rekreacyjny-caloroczny",
  "mobilny",
  "wynajem-hotel",
]);

// Rodzina produktu, niezależna od category (spec 0022). Bez wartości
// domyślnej celowo: każdy insert, w tym ręczny przez Neon MCP (funkcja 7),
// musi jawnie podać family (spec 0022 AC-1). "pergola" zastąpiona przez
// "kontenery-modulowe" (spec 0039): przebudowa typu, nie dopisanie wartości
// obok starej — Postgres nie ma ALTER TYPE ... DROP VALUE.
export const productFamilyEnum = pgEnum("product_family", ["dom", "spa-modulowe", "kontenery-modulowe"]);

// en/nl/de: polski zostaje na product.name/description samym, jako tekst
// źródłowy (spec 0028 Decision) — ten enum nigdy nie nosi "pl". "de" dopisana
// przez ALTER TYPE ... ADD VALUE (spec 0028 rozszerzenie o niemiecki, ten sam
// wzorzec co productFamilyEnum wyżej) — Postgres nie ma DROP VALUE, więc to
// jednokierunkowe rozszerzenie, nie przebudowa typu.
export const productTranslationLocaleEnum = pgEnum("product_translation_locale", ["en", "nl", "de"]);

export const spaSubcategoryEnum = pgEnum("spa_subcategory", ["sauna", "jacuzzi", "wellness-combo"]);

// Zastępuje dawny pergolaSubcategoryEnum (spec 0039): trzy zastosowania
// kontenera modułowego, każde z własnym kształtem technicalSpecs (patrz
// lib/product-technical-specs.ts) zamiast jednego wspólnego na rodzinę.
export const containerSubcategoryEnum = pgEnum("container_subcategory", [
  "gastronomiczne",
  "uslugowe",
  "mieszkalne",
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

// "product_realization_photo" dopisana przez ALTER TYPE ... ADD VALUE (spec
// 0041 AC-9), odróżniona od "product_photo" (wizualizacje/marketing).
export const documentPurposeEnum = pgEnum("document_purpose", [
  "product_photo",
  "product_floor_plan",
  "order_stage",
  "company_verification",
  "producer_photo",
  "product_realization_photo",
]);

export const auditActionEnum = pgEnum("audit_action", ["create", "update", "delete"]);

// Duże zamówienia B2B (spec 0037).
export const bulkRequestStatusEnum = pgEnum("bulk_request_status", [
  "open",
  "quoted",
  "accepted",
  "closed",
]);

export const targetProducerStatusEnum = pgEnum("target_producer_status", [
  "invited",
  "viewed",
  "quoted",
  "declined",
]);

export const clientVerificationStatusEnum = pgEnum("client_verification_status", [
  "not_submitted",
  "pending",
  "approved",
  "rejected",
]);

// Pięć statusów pozycji kosztowej wariantu (spec 0041 AC-2): nigdy puste,
// aplikacja czytająca te dane nigdy nie zgaduje statusu z braku wartości.
export const costLineItemStatusEnum = pgEnum("cost_line_item_status", [
  "w-cenie",
  "obowiazkowa-doplata",
  "opcja",
  "po-stronie-klienta",
  "do-wyceny",
]);

// Pięć etapów realizacji, jeden wiersz na (product_variant, stage_key)
// (spec 0041 AC-3).
export const productTimelineStageKeyEnum = pgEnum("product_timeline_stage_key", [
  "formalnosci",
  "produkcja",
  "transport",
  "montaz",
  "wykonczenie",
]);

export const projectTypeEnum = pgEnum("project_type", [
  "resort",
  "holiday-park",
  "housing-development",
  "student-housing",
  "senior-living",
  "workforce-accommodation",
  "other",
]);

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
  // Nullable od spec 0040: formularz rejestracji przestał je zbierać (AC-8);
  // istniejące konta nietknięte, nowe konta mają NULL do czasu ekranu edycji
  // profilu producenta (spec 0040 Follow-up).
  technology: producerTechnologyEnum("technology"),
  // Orientacyjna skala produkcji zbierana przy rejestracji (spec 0040 AC-8),
  // bez wpływu na żadną inną regułę czy walidację.
  productionScale: producerProductionScaleEnum("production_scale"),
  verificationStatus: producerVerificationStatusEnum("verification_status")
    .notNull()
    .default("not_submitted"),
  // Trzy pola zaufania na kartę projektu (spec 0042 AC-9, AC-10), wpisywane
  // ręcznie przez Neon MCP jak reszta danych producenta w tym etapie. Puste
  // showroomVisitAvailable renderuje się jako "do potwierdzenia", nigdy jako
  // ciche "nie" (patrz components/klient/ProducerCard.tsx).
  inquiryResponseTimeLabel: text("inquiry_response_time_label"),
  showroomVisitAvailable: boolean("showroom_visit_available"),
  showroomVisitNote: text("showroom_visit_note"),
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
  // Duże zamówienia B2B (spec 0037 AC-8): uzupełnienie obu pól przenosi
  // b2bVerificationStatus na 'pending', zatwierdzane/odrzucane przez admina.
  // Nullable, bez wpływu na dzisiejszych klientów detalicznych (spec 0037
  // Consequences, Neutral).
  nip: text("nip"),
  companyName: text("company_name"),
  b2bVerificationStatus: clientVerificationStatusEnum("b2b_verification_status")
    .notNull()
    .default("not_submitted"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
});

// ---------------------------------------------------------------------------
// Katalog: product (łączy dzisiejsze Project i SavedProduct, patrz spec 0018
// Feature design). Pola poniżej są nullable dopóki status = 'draft', wymagane
// od status = 'published'; walidacja tego jest po stronie aplikacji, nie CHECK
// constraint (zbyt wiele pól, patrz spec Key invariants). Wyjątek: zgodność
// family/category/spaSubcategory/containerSubcategory JEST ograniczeniem CHECK
// (spec 0022, rozszerzone spec 0039, patrz product_family_subcategory_match
// niżej) — wąski, celowy wyjątek od tej konwencji, bo funkcja 7 wstawia wiersze ręcznie przez Neon
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
    containerSubcategory: containerSubcategoryEnum("container_subcategory"),
    // Dane techniczne, kształt zależny od family, walidowane schematem Zod
    // po stronie formularza kreatora i zapisu (spec 0022 AC-4). Zastępuje
    // dawnych 8 płaskich kolumn technicznych domu (spec 0022 AC-5).
    technicalSpecs: jsonb("technical_specs"),
    // Uklad pomieszczen (spec 0042 Feature design): tablica {name, areaM2,
    // function, isMezzanine}, wspolna dla calego produktu (nie per wariant).
    // Ten sam wzorzec co technicalSpecs wyzej (jsonb bez wlasnej tabeli, bo
    // nikt dzis nie planuje zapytan przekrojowych po nazwie pomieszczenia),
    // walidacja Zod na granicy aplikacji jest otwartym Follow-up spec 0042.
    roomLayout: jsonb("room_layout"),
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
    // Dodane spec 0041 AC-9 (logistyka/gwarancja per produkt, poza wariantem):
    // gwarancja instalacji jest osobna od structuralWarrantyYears wyżej (spec
    // 0018), bo dotyczy montażu, nie samej konstrukcji.
    installationWarrantyYears: integer("installation_warranty_years"),
    serviceScopeDescription: text("service_scope_description"),
    transportDimensions: text("transport_dimensions"),
    craneRequirements: text("crane_requirements"),
    minPlotWidthM: real("min_plot_width_m"),
    // Zgłoszenie zamiast pozwolenia na budowę (spec 0045 AC-8): czysto
    // deklaratywny checkbox producenta, bez żadnej reguły wyliczającej za
    // nim i bez wartości domyślnej (nieustawiony != "nie").
    simplifiedPermitEligible: boolean("simplified_permit_eligible"),
    // Pytania i odpowiedzi specyficzne dla modelu (sekcja "Dokumenty i
    // pytania" na karcie projektu klienta): tablica {question, answer}, ten
    // sam wzorzec co roomLayout wyżej (jsonb bez własnej tabeli; walidacja
    // Zod na granicy aplikacji jest otwartym Follow-up, tak jak roomLayout).
    faq: jsonb("faq"),
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
      sql`(${table.category} IS NULL OR ${table.family} = 'dom') AND (${table.spaSubcategory} IS NULL OR ${table.family} = 'spa-modulowe') AND (${table.containerSubcategory} IS NULL OR ${table.family} = 'kontenery-modulowe')`,
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
// Wariant produktu (spec 0041 Decision): jeden nazwany standard wykonania
// dostaje własną, pełną parę cena/zakres, żeby cena nigdy nie mogła być
// pokazana obok zakresu innego standardu. product.priceMinCents/priceMaxCents
// wyżej stają się od tej migracji pochodną wyzwalacza price_sync_trigger
// (patrz drizzle/, migracja tej funkcji), nigdy polem wpisywanym wprost —
// patrz lib/db/AGENTS.md.
// ---------------------------------------------------------------------------

export const productVariant = pgTable(
  "product_variant",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productId: uuid("product_id")
      .notNull()
      .references(() => product.id),
    completionStandard: completionStandardEnum("completion_standard").notNull(),
    // Opcjonalna własna nazwa marketingowa producenta (np. "Comfort"); tylko
    // opisowa, nigdy używana do reguł biznesowych czy unikalności (spec 0041
    // Feature design) — to zostaje completionStandard.
    variantLabel: text("variant_label"),
    priceMinCents: integer("price_min_cents"),
    priceMaxCents: integer("price_max_cents"),
    scopeSummary: text("scope_summary"),
    isDefault: boolean("is_default").notNull().default(false),
    sortOrder: integer("sort_order"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    check(
      "product_variant_price_order",
      sql`${table.priceMinCents} IS NULL OR ${table.priceMaxCents} IS NULL OR ${table.priceMaxCents} >= ${table.priceMinCents}`,
    ),
    // Co najwyżej jeden aktywny wariant na (product, standard); indeks
    // częściowy tak, żeby usunięty miękko wariant nie blokował ponownego
    // dodania tego samego standardu (spec 0041 Feature design).
    uniqueIndex("product_variant_product_standard_unique")
      .on(table.productId, table.completionStandard)
      .where(sql`${table.deletedAt} IS NULL`),
    // Co najwyżej jeden aktywny wariant domyślny na produkt, ten sam wzorzec
    // częściowego indeksu co document_one_cover_per_product.
    uniqueIndex("product_variant_one_default_per_product")
      .on(table.productId)
      .where(sql`${table.isDefault} AND ${table.deletedAt} IS NULL`),
    index("product_variant_product_id_idx").on(table.productId),
  ],
);

// Pozycje kosztowe, zawsze przy konkretnym wariancie (status często różni się
// między standardami tego samego produktu, spec 0041 AC-2).
export const costLineItem = pgTable(
  "cost_line_item",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productVariantId: uuid("product_variant_id")
      .notNull()
      .references(() => productVariant.id),
    label: text("label").notNull(),
    status: costLineItemStatusEnum("status").notNull(),
    responsibleParty: text("responsible_party"),
    sortOrder: integer("sort_order"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("cost_line_item_product_variant_id_idx").on(table.productVariantId)],
);

// Etapy harmonogramu, też per wariant, bo czas wykończenia zależy od standardu
// (świadomy kompromis, spec 0041 Feature design: formalności/produkcja/transport
// bywają identyczne między wariantami tego samego produktu, ale mimo to żyją
// per wariant, nie per produkt).
export const productTimelineStage = pgTable(
  "product_timeline_stage",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productVariantId: uuid("product_variant_id")
      .notNull()
      .references(() => productVariant.id),
    stageKey: productTimelineStageKeyEnum("stage_key").notNull(),
    // Jedna wspólna jednostka (dni) zamiast dzisiejszej mieszanki tygodni
    // (produkcja) i dni (montaż) na product.
    durationMinDays: integer("duration_min_days"),
    durationMaxDays: integer("duration_max_days"),
    startsFromLabel: text("starts_from_label"),
    responsibleParty: text("responsible_party"),
    sortOrder: integer("sort_order"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    check(
      "product_timeline_stage_duration_order",
      sql`${table.durationMinDays} IS NULL OR ${table.durationMaxDays} IS NULL OR ${table.durationMaxDays} >= ${table.durationMinDays}`,
    ),
    uniqueIndex("product_timeline_stage_variant_stage_unique").on(
      table.productVariantId,
      table.stageKey,
    ),
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
    // Tłumaczenie wpisów product.room_layout/faq (spec 0045 AC-5, AC-6, AC-10):
    // tablica o tym samym kształcie co źródło polskie na `product`, dopasowana
    // po stabilnym `id` wpisu (pole w jsonb, nie kolumna), nigdy po indeksie —
    // może być krótsza niż polska wersja (tłumaczenie częściowe).
    roomLayout: jsonb("room_layout"),
    faq: jsonb("faq"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [uniqueIndex("product_translation_product_id_locale_idx").on(table.productId, table.locale)],
);

// Tłumaczenie opisu zakresu wariantu (spec 0045 AC-10 Feature design): osobna
// tabela, nie kolumny na productVariant, ten sam wzorzec co productTranslation
// powyżej ale keyed po variantId zamiast productId, bo scope_summary żyje na
// product_variant, nie na product.
export const productVariantTranslation = pgTable(
  "product_variant_translation",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    productVariantId: uuid("product_variant_id")
      .notNull()
      .references(() => productVariant.id),
    locale: productTranslationLocaleEnum("locale").notNull(),
    scopeSummary: text("scope_summary"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("product_variant_translation_variant_id_locale_idx").on(
      table.productVariantId,
      table.locale,
    ),
  ],
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
// Duże zamówienia B2B (spec 0037): dwa osobne wejścia bez logowania
// (projectRequest — wolne zapytanie, bulkProductInquiry — konkretny produkt),
// jedna współdzielona wycena (projectQuote), profil zdolności producenta jeden
// do jednego. Żyje obok inquiry/offer powyżej (zakłada klienta zalogowanego i
// 1-3 konkretne produkty), który zostaje nietknięty dla zwykłych zapytań.
// ---------------------------------------------------------------------------

export const projectRequest = pgTable(
  "project_request",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // Uzupełniane dopiero przy pierwszym logowaniu z pasującym e mailem (AC-7),
    // nigdy przy samym wysłaniu formularza (spec 0037 Key invariants).
    clientId: uuid("client_id").references(() => client.id),
    contactName: text("contact_name").notNull(),
    // Znormalizowany (małe litery, przycięty) przed zapisem, żeby dopasowanie
    // przy logowaniu (AC-7) i limit zgłoszeń (AC-10) nie ominęły wariantów
    // wielkości liter tego samego adresu.
    contactEmail: text("contact_email").notNull(),
    contactPhone: text("contact_phone"),
    countryCode: text("country_code")
      .notNull()
      .references(() => country.code),
    locationDetail: text("location_detail"),
    projectType: projectTypeEnum("project_type").notNull(),
    families: jsonb("families").$type<(typeof productFamilyEnum.enumValues)[number][]>().notNull(),
    unitCountMin: integer("unit_count_min").notNull(),
    unitCountMax: integer("unit_count_max"),
    floorAreaM2Min: real("floor_area_m2_min"),
    floorAreaM2Max: real("floor_area_m2_max"),
    completionStandard: completionStandardEnum("completion_standard"),
    startWindowFrom: date("start_window_from"),
    startWindowTo: date("start_window_to"),
    deliveryWindowFrom: date("delivery_window_from"),
    deliveryWindowTo: date("delivery_window_to"),
    extrasNote: text("extras_note"),
    status: bulkRequestStatusEnum("status").notNull().default("open"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    check("project_request_families_not_empty", sql`jsonb_array_length(${table.families}) > 0`),
    check("project_request_unit_count_min", sql`${table.unitCountMin} >= 10`),
    check(
      "project_request_unit_count_max",
      sql`${table.unitCountMax} IS NULL OR ${table.unitCountMax} >= ${table.unitCountMin}`,
    ),
    check(
      "project_request_start_window_order",
      sql`${table.startWindowFrom} IS NULL OR ${table.startWindowTo} IS NULL OR ${table.startWindowTo} >= ${table.startWindowFrom}`,
    ),
    check(
      "project_request_delivery_window_order",
      sql`${table.deliveryWindowFrom} IS NULL OR ${table.deliveryWindowTo} IS NULL OR ${table.deliveryWindowTo} >= ${table.deliveryWindowFrom}`,
    ),
    index("project_request_contact_email_idx").on(table.contactEmail),
    index("project_request_client_id_idx").on(table.clientId),
  ],
);

// Kto został automatycznie powiadomiony o project_request (AC-2): tylko
// producenci z volumeVerificationStatus = 'approved' dostarczający do kraju
// zapytania w chwili wysłania; brak dopasowanych producentów nie jest błędem
// (zero wierszy, spec 0037 Key invariants).
export const projectRequestTargetProducer = pgTable(
  "project_request_target_producer",
  {
    projectRequestId: uuid("project_request_id")
      .notNull()
      .references(() => projectRequest.id),
    producerId: uuid("producer_id")
      .notNull()
      .references(() => producer.id),
    status: targetProducerStatusEnum("status").notNull().default("invited"),
    notifiedAt: timestamp("notified_at", { withTimezone: true }).defaultNow().notNull(),
    viewedAt: timestamp("viewed_at", { withTimezone: true }),
  },
  (table) => [primaryKey({ columns: [table.projectRequestId, table.producerId] })],
);

// Zapytanie o konkretny, opublikowany produkt w dużej ilości (AC-4): odbiorca
// to bezpośrednio product.producerId, bez osobnej tabeli łączącej.
export const bulkProductInquiry = pgTable(
  "bulk_product_inquiry",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clientId: uuid("client_id").references(() => client.id),
    productId: uuid("product_id")
      .notNull()
      .references(() => product.id),
    contactName: text("contact_name").notNull(),
    contactEmail: text("contact_email").notNull(),
    contactPhone: text("contact_phone"),
    unitCountMin: integer("unit_count_min").notNull(),
    unitCountMax: integer("unit_count_max"),
    deliveryCountryCode: text("delivery_country_code")
      .notNull()
      .references(() => country.code),
    startWindowFrom: date("start_window_from"),
    startWindowTo: date("start_window_to"),
    deliveryWindowFrom: date("delivery_window_from"),
    deliveryWindowTo: date("delivery_window_to"),
    note: text("note"),
    status: bulkRequestStatusEnum("status").notNull().default("open"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    check("bulk_product_inquiry_unit_count_min", sql`${table.unitCountMin} >= 10`),
    check(
      "bulk_product_inquiry_unit_count_max",
      sql`${table.unitCountMax} IS NULL OR ${table.unitCountMax} >= ${table.unitCountMin}`,
    ),
    check(
      "bulk_product_inquiry_start_window_order",
      sql`${table.startWindowFrom} IS NULL OR ${table.startWindowTo} IS NULL OR ${table.startWindowTo} >= ${table.startWindowFrom}`,
    ),
    check(
      "bulk_product_inquiry_delivery_window_order",
      sql`${table.deliveryWindowFrom} IS NULL OR ${table.deliveryWindowTo} IS NULL OR ${table.deliveryWindowTo} >= ${table.deliveryWindowFrom}`,
    ),
    index("bulk_product_inquiry_contact_email_idx").on(table.contactEmail),
    index("bulk_product_inquiry_client_id_idx").on(table.clientId),
    index("bulk_product_inquiry_product_id_idx").on(table.productId),
  ],
);

// Odpowiedź producenta, współdzielona przez obie ścieżki (AC-3, AC-5):
// dokładnie jedno z projectRequestId/bulkProductInquiryId jest ustawione.
// bigint zamiast integer na cenach (spec 0037 Feature design): integer starcza
// do ok. 21,4 mln EUR w groszach, zbyt ciasne dla projektu 100+ domów.
export const projectQuote = pgTable(
  "project_quote",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    projectRequestId: uuid("project_request_id").references(() => projectRequest.id),
    bulkProductInquiryId: uuid("bulk_product_inquiry_id").references(() => bulkProductInquiry.id),
    producerId: uuid("producer_id")
      .notNull()
      .references(() => producer.id),
    currency: text("currency").notNull().default("EUR"),
    unitPriceCents: bigint("unit_price_cents", { mode: "number" }),
    totalPriceCents: bigint("total_price_cents", { mode: "number" }).notNull(),
    proposedLeadTimeWeeks: integer("proposed_lead_time_weeks"),
    notes: text("notes"),
    status: offerStatusEnum("status").notNull().default("active"),
    submittedAt: timestamp("submitted_at", { withTimezone: true }).defaultNow().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    check(
      "project_quote_exactly_one_link",
      sql`((${table.projectRequestId} IS NOT NULL)::int + (${table.bulkProductInquiryId} IS NOT NULL)::int) = 1`,
    ),
    check("project_quote_unit_price_positive", sql`${table.unitPriceCents} IS NULL OR ${table.unitPriceCents} > 0`),
    check("project_quote_total_price_positive", sql`${table.totalPriceCents} > 0`),
    // Najwyżej jedna wycena 'active' na parę (zapytanie, producent), osobny
    // indeks na każdy opcjonalny klucz obcy (NULL nigdy nie koliduje z NULL,
    // patrz lib/db/AGENTS.md, document_one_cover_per_product, więc rząd z
    // przeciwnej ścieżki po prostu nigdy nie trafia w ten indeks) — ten sam
    // wzorzec co offer_active_per_inquiry_producer (spec 0018).
    uniqueIndex("project_quote_active_per_request_producer")
      .on(table.projectRequestId, table.producerId)
      .where(sql`${table.status} = 'active'`),
    uniqueIndex("project_quote_active_per_bulk_inquiry_producer")
      .on(table.bulkProductInquiryId, table.producerId)
      .where(sql`${table.status} = 'active'`),
    // Najwyżej jedna wycena 'accepted' na całe zapytanie, niezależnie od
    // producenta (AC-9): dwie równoległe akceptacje nie mogą obie się powieść.
    uniqueIndex("project_quote_accepted_per_request")
      .on(table.projectRequestId)
      .where(sql`${table.status} = 'accepted'`),
    uniqueIndex("project_quote_accepted_per_bulk_inquiry")
      .on(table.bulkProductInquiryId)
      .where(sql`${table.status} = 'accepted'`),
  ],
);

// Rozszerzenie producenta jeden do jednego (AC-6): brak osobnego id, PK = FK.
export const producerCapacityProfile = pgTable("producer_capacity_profile", {
  producerId: uuid("producer_id")
    .primaryKey()
    .references(() => producer.id),
  unitsPerMonth: integer("units_per_month"),
  productionLines: integer("production_lines"),
  // Lista {units, weeks}, walidowana schematem Zod (lib/producer-capacity-profile-specs.ts),
  // ten sam wzorzec co product.technicalSpecs (spec 0022).
  leadTimeTiers: jsonb("lead_time_tiers")
    .$type<{ units: number; weeks: number }[]>()
    .notNull()
    .default(sql`'[]'::jsonb`),
  maxModuleSizeM2: real("max_module_size_m2"),
  completionStandardsSupported: jsonb("completion_standards_supported")
    .$type<(typeof completionStandardEnum.enumValues)[number][]>()
    .notNull()
    .default(sql`'[]'::jsonb`),
  certifications: jsonb("certifications").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  canCustomizeClientDesign: boolean("can_customize_client_design").notNull().default(false),
  customizationNote: text("customization_note"),
  canHandleTransport: boolean("can_handle_transport").notNull().default(false),
  canHandleAssembly: boolean("can_handle_assembly").notNull().default(false),
  capabilityNote: text("capability_note"),
  pastProjectReferences: jsonb("past_project_references").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  volumeVerificationStatus: producerVerificationStatusEnum("volume_verification_status")
    .notNull()
    .default("not_submitted"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
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
    // Puste znaczy: dokument dotyczy każdego wariantu tego produktu (spec 0041
    // Feature design). document_one_cover_per_product niżej zostaje bez zmian,
    // bo nadal działa na poziomie produktu, nie wariantu.
    productVariantId: uuid("product_variant_id").references(() => productVariant.id),
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
