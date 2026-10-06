import { and, desc, eq, gte, inArray, isNull, lte, ne, or, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  costLineItem,
  costLineItemLabelTranslation,
  document,
  favorite,
  producer,
  producerCapacityProfile,
  producerCertification,
  producerCertificationTranslation,
  producerDeliveryCountry,
  product,
  productComplianceAssessment,
  productCountryEligibility,
  productTimelineStage,
  productTranslation,
  productVariant,
  productVariantTranslation,
} from "@/lib/db/schema";
import type { Locale } from "@/lib/i18n/routing";
import { resolveTranslatedText } from "@/lib/i18n/resolve-translated-text";
import { loadReferenceTranslator } from "./reference-text";
import type { EnergyClass, VentilationType } from "@/lib/product-technical-specs";
import { captureError } from "@/lib/observability/errors";
import { resolveFamilies, type FamilyFilterValue } from "@/lib/product-family-groups";
import { clientRequirementsSchema, type ClientRequirementRow } from "@/lib/product-client-requirements";
import { resolveHeatSourceValues, type HeatSourceFilterValue, type StoreysFilter } from "@/lib/results-filters";
import { buildPublicUrl } from "@/lib/storage/r2-client";
import type {
  ContainerSubcategory,
  CostLineItem,
  CountryCode,
  EligibilityByCountry,
  Project,
  ProjectDocument,
  ProjectDocumentPurpose,
  ProjectFaqItem,
  ProjectVariant,
  ProductComplianceAssessment,
  ProductFamily,
  ProductTechnicalSpecsDraft,
  ProducerCertification,
  RoomLayoutEntry,
  SpaSubcategory,
  TimelineStage,
  TimelineStageKey,
} from "./types";

// Kolejność stała, niezależna od sort_order w bazie (spec 0042 AC-6):
// formalności, produkcja, transport, montaż, wykończenie.
const TIMELINE_STAGE_ORDER: TimelineStageKey[] = [
  "formalnosci",
  "produkcja",
  "transport",
  "montaz",
  "wykonczenie",
];

// Tylko te wartości document_purpose dotyczą karty projektu klienta (spec
// 0041 AC-9, spec 0042 AC-7, spec 0049 AC-9); document_purpose ma też
// order_stage, company_verification, producer_photo, ai_source_pdf, które
// żyją poza tym ekranem.
const CLIENT_DOCUMENT_PURPOSES: ProjectDocumentPurpose[] = [
  "product_photo",
  "product_floor_plan",
  "product_realization_photo",
  "product_specification",
];

interface ResolveVariantsOptions {
  /** Etapy harmonogramu są potrzebne tylko na stronie szczegółów pojedynczego
   * projektu (spec 0042 AC-2, AC-6); karty/listy pomijają to dodatkowe
   * zapytanie (domyślnie false). Pozycje kosztowe (label/status/sortOrder) są
   * od spec 0051 AC-6 ładowane zawsze, nawet bez withDetails — ResultCard i
   * ProjectCompareTable pokazują do trzech etykiet "w cenie" zamiast dawnego
   * scopeSummary. */
  withDetails?: boolean;
  locale?: Locale;
}

// Warianty produktu, zgrupowane po product_id (spec 0041/0042): jedno
// zapytanie dla wielu produktów naraz (ten sam wzorzec wsadowy co
// resolveProductDocumentPhotos), nie fanout na wywołanie mapRowToProject.
export async function resolveProductVariants(
  productIds: string[],
  options?: ResolveVariantsOptions,
): Promise<Map<string, ProjectVariant[]>> {
  if (productIds.length === 0) return new Map();

  const locale = options?.locale ?? "pl";
  const translateLabels = locale === "en" || locale === "nl" || locale === "de";

  const variantRows = await db
    .select({
      id: productVariant.id,
      productId: productVariant.productId,
      completionStandard: productVariant.completionStandard,
      variantLabel: productVariant.variantLabel,
      priceMinCents: productVariant.priceMinCents,
      priceOnRequest: productVariant.priceOnRequest,
      isDefault: productVariant.isDefault,
      sortOrder: productVariant.sortOrder,
    })
    .from(productVariant)
    .where(and(inArray(productVariant.productId, productIds), isNull(productVariant.deletedAt)));

  const variantIds = variantRows.map((row) => row.id);
  const costLineItemsByVariant = new Map<string, CostLineItem[]>();
  const timelineStagesByVariant = new Map<string, TimelineStage[]>();

  if (variantIds.length > 0) {
    const costRows = await (translateLabels
      ? db
          .select({
            id: costLineItem.id,
            productVariantId: costLineItem.productVariantId,
            label: costLineItem.label,
            translatedLabel: costLineItemLabelTranslation.translatedLabel,
            status: costLineItem.status,
            responsibleParty: costLineItem.responsibleParty,
            sortOrder: costLineItem.sortOrder,
          })
          .from(costLineItem)
          .leftJoin(
            costLineItemLabelTranslation,
            and(
              eq(costLineItemLabelTranslation.labelPl, costLineItem.label),
              eq(costLineItemLabelTranslation.locale, locale),
            ),
          )
          .where(inArray(costLineItem.productVariantId, variantIds))
      : db
          .select({
            id: costLineItem.id,
            productVariantId: costLineItem.productVariantId,
            label: costLineItem.label,
            translatedLabel: sql<string | null>`NULL`,
            status: costLineItem.status,
            responsibleParty: costLineItem.responsibleParty,
            sortOrder: costLineItem.sortOrder,
          })
          .from(costLineItem)
          .where(inArray(costLineItem.productVariantId, variantIds)));

    const costRowsByVariant = new Map<string, typeof costRows>();
    for (const row of costRows) {
      const list = costRowsByVariant.get(row.productVariantId) ?? [];
      list.push(row);
      costRowsByVariant.set(row.productVariantId, list);
    }
    for (const [variantId, rows] of costRowsByVariant) {
      const sorted = [...rows].sort(
        (a, b) => (a.sortOrder ?? Number.MAX_SAFE_INTEGER) - (b.sortOrder ?? Number.MAX_SAFE_INTEGER),
      );
      costLineItemsByVariant.set(
        variantId,
        sorted.map((row) => ({
          id: row.id,
          label: resolveTranslatedText(row.label, row.translatedLabel),
          status: row.status,
          responsibleParty: row.responsibleParty ?? undefined,
        })),
      );
    }

    if (options?.withDetails) {
      const stageRows = await db
        .select({
          productVariantId: productTimelineStage.productVariantId,
          stageKey: productTimelineStage.stageKey,
          durationMinDays: productTimelineStage.durationMinDays,
          durationMaxDays: productTimelineStage.durationMaxDays,
          startsFromLabel: productTimelineStage.startsFromLabel,
          responsibleParty: productTimelineStage.responsibleParty,
        })
        .from(productTimelineStage)
        .where(inArray(productTimelineStage.productVariantId, variantIds));

      // Spec 0067 AC-5: startsFromLabel i responsibleParty przez słownik po
      // polskim tekście (dla pl bez zapytania).
      const translateReference = await loadReferenceTranslator(
        stageRows.flatMap((row) => [row.startsFromLabel, row.responsibleParty]),
        locale,
      );

      const stageRowsByVariant = new Map<string, typeof stageRows>();
      for (const row of stageRows) {
        const list = stageRowsByVariant.get(row.productVariantId) ?? [];
        list.push(row);
        stageRowsByVariant.set(row.productVariantId, list);
      }
      for (const [variantId, rows] of stageRowsByVariant) {
        const sorted = [...rows].sort(
          (a, b) => TIMELINE_STAGE_ORDER.indexOf(a.stageKey) - TIMELINE_STAGE_ORDER.indexOf(b.stageKey),
        );
        timelineStagesByVariant.set(
          variantId,
          sorted.map((row) => ({
            stageKey: row.stageKey,
            durationMinDays: row.durationMinDays ?? undefined,
            durationMaxDays: row.durationMaxDays ?? undefined,
            startsFromLabel: row.startsFromLabel ? translateReference(row.startsFromLabel) : undefined,
            responsibleParty: row.responsibleParty ? translateReference(row.responsibleParty) : undefined,
          })),
        );
      }
    }
  }

  // Tłumaczenie productVariant.variantLabel (spec 0056 Follow-up): jedyna
  // czytelna nazwa wariantu dla rodzin katalogowych, gdzie completionStandard
  // to tylko techniczny slot ("katalogowy") — bez tego EN/NL/DE widziałyby
  // polski tekst "43″, 4K" nawet po przełączeniu języka. Ten sam warunek
  // translateLabels co costLineItem wyżej.
  const translatedVariantLabels = new Map<string, string>();
  if (translateLabels && variantIds.length > 0) {
    const labelRows = await db
      .select({
        productVariantId: productVariantTranslation.productVariantId,
        variantLabel: productVariantTranslation.variantLabel,
      })
      .from(productVariantTranslation)
      .where(
        and(inArray(productVariantTranslation.productVariantId, variantIds), eq(productVariantTranslation.locale, locale)),
      );
    for (const row of labelRows) {
      if (row.variantLabel && row.variantLabel.trim().length > 0) {
        translatedVariantLabels.set(row.productVariantId, row.variantLabel);
      }
    }
  }

  const byProduct = new Map<string, typeof variantRows>();
  for (const row of variantRows) {
    const list = byProduct.get(row.productId) ?? [];
    list.push(row);
    byProduct.set(row.productId, list);
  }

  const result = new Map<string, ProjectVariant[]>();
  for (const [productId, rows] of byProduct) {
    const sorted = [...rows].sort(
      (a, b) => (a.sortOrder ?? Number.MAX_SAFE_INTEGER) - (b.sortOrder ?? Number.MAX_SAFE_INTEGER),
    );
    result.set(
      productId,
      sorted.map((row) => ({
        id: row.id,
        completionStandard: row.completionStandard,
        variantLabel: translatedVariantLabels.get(row.id) ?? row.variantLabel ?? undefined,
        priceMin: row.priceMinCents !== null ? row.priceMinCents / 100 : undefined,
        currency: "EUR",
        priceOnRequest: row.priceOnRequest,
        isDefault: row.isDefault,
        costLineItems: costLineItemsByVariant.get(row.id) ?? [],
        timelineStages: timelineStagesByVariant.get(row.id) ?? [],
      })),
    );
  }
  return result;
}

// Dokumenty produktu (zdjęcia/rzuty) z ich purpose i opcjonalnym wariantem
// (spec 0042 AC-7, AC-8): zasila zakładki galerii na stronie projektu, osobno
// od resolveProductDocumentPhotos (która tylko wybiera okładkę/galerię
// product_photo dla kart listy, bez rozróżnienia purpose/wariantu).
export async function resolveProductDocuments(productIds: string[]): Promise<Map<string, ProjectDocument[]>> {
  if (productIds.length === 0) return new Map();

  try {
    const rows = await db
      .select({
        productId: document.productId,
        r2Key: document.r2Key,
        purpose: document.purpose,
        productVariantId: document.productVariantId,
        sortOrder: document.sortOrder,
      })
      .from(document)
      .where(
        and(
          inArray(document.productId, productIds),
          inArray(document.purpose, CLIENT_DOCUMENT_PURPOSES),
          isNull(document.deletedAt),
        ),
      );

    const byProduct = new Map<string, typeof rows>();
    for (const row of rows) {
      if (!row.productId) continue;
      const list = byProduct.get(row.productId) ?? [];
      list.push(row);
      byProduct.set(row.productId, list);
    }

    const result = new Map<string, ProjectDocument[]>();
    for (const [productId, docs] of byProduct) {
      const sorted = [...docs].sort(
        (a, b) => (a.sortOrder ?? Number.MAX_SAFE_INTEGER) - (b.sortOrder ?? Number.MAX_SAFE_INTEGER),
      );
      result.set(
        productId,
        sorted.map((row) => ({
          url: buildPublicUrl(row.r2Key),
          purpose: row.purpose as ProjectDocumentPurpose,
          productVariantId: row.productVariantId ?? undefined,
        })),
      );
    }
    return result;
  } catch (error) {
    captureError(error, { path: "resolveProductDocuments" });
    return new Map();
  }
}

interface GetProjectsFilters {
  // Polski jest tekstem źródłowym i nigdy nie wymaga JOIN-a na product_translation
  // (spec 0028 Decision); domyślnie "pl", więc wywołujący, które nie znają jeszcze
  // aktywnego locale, zachowują dzisiejsze zachowanie bez zmian.
  locale?: Locale;
  countryCode?: CountryCode;
  sizeMin?: number;
  sizeMax?: number;
  // Domyślnie "dom" (spec 0023 AC-4), tak samo jak getProjects() dawniej
  // zawsze filtrowało do family "dom" na sztywno. Poza trzema prawdziwymi
  // rodzinami dopuszcza sentinel grupy "wiecej-niz-dom" (spec 0035 AC-2),
  // rozwiązywany niżej przez FAMILY_GROUPS na WHERE ... IN (...).
  family?: FamilyFilterValue;
  // Poniższe cztery mają zastosowanie tylko gdy family === "dom" (spec 0026 Key
  // invariants); getProjects() sam pilnuje tej granicy, nie polega na wywołującym.
  heatSource?: HeatSourceFilterValue;
  ventilation?: VentilationType;
  energyClass?: EnergyClass;
  storeys?: StoreysFilter;
  // Liczby w EUR, nie zamknięty typ progu: dom (PRICE_THRESHOLDS) i sauna
  // (SAUNA_PRICE_THRESHOLDS, spec 0068 AC-11) mają osobne skale, a walidacja
  // wartości należy do parsera parametrów URL, nie do tego zapytania.
  priceMin?: number;
  priceMax?: number;
  // Minimalna liczba miejsc w saunie (spec 0068 AC-7), z technicalSpecs.seatingCapacity.
  seatingMin?: number;
  // Id producenta (spec 0068 AC-9); niepoprawny uuid jest pomijany, nie rzuca błędem bazy.
  producerId?: string;
  // Znaczące tylko dla family dopasowanej do ich nazwy (ta sama granica co category, spec 0022).
  spaSubcategory?: SpaSubcategory;
  containerSubcategory?: ContainerSubcategory;
  q?: string;
}

// Sanityzuje wpisany tekst na bezpieczny prefiksowy to_tsquery (spec 0026 AC-6,
// Key invariants): każdy token traci znaki spoza liter/cyfr (żeby operatory
// tsquery, np. "|"/"&"/"!", wpisane przez użytkownika nigdy nie zmieniły
// znaczenia zapytania) i dostaje sufiks `:*` dla dopasowania prefiksowego.
// Pusta lista tokenów po sanityzacji (np. q złożone z samej interpunkcji)
// zwraca null — wywołujący wtedy pomija filtr wyszukiwania całkowicie.
export function buildPrefixTsQuery(q: string): string | null {
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
// spa/kontenery-modulowe, gdy realne dane tych rodzin powstaną).
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
  /** Backs Project.features (spec 0056 Follow-up): a short tile list, same
   * bridge-field reasoning as _extraImageUrls above. */
  _features?: string[];
  /** Backs Project.usageNote (spec 0056 Follow-up): a short "what this
   * variant is actually for" note rendered above the real-use video. */
  _usageNote?: string;
  /** Backs Project.priceNote (spec 0056 Follow-up): a short caveat rendered
   * under the price, for a converted/orientation-only figure not yet
   * confirmed by the partner. */
  _priceNote?: string;
}

// pl jest tekstem źródłowym (AC-5); en/nl/de pokazują tłumaczenie producenta,
// jeśli istnieje i nie jest puste, inaczej spadają na polski (AC-6) — nigdy
// pusty string na stronie klienta.
interface ProductTranslationText {
  name: string | null;
  description: string | null;
  // Tłumaczenie nazw pomieszczeń (product_translation.room_layout, AC-10),
  // dodane 2026-09-22: dotąd czytane tylko przez kreator producenta
  // (lib/producer-project-draft.ts#alignRoomLayoutTranslation, dopasowanie po
  // `id`), nigdy przez stronę klienta. Surowy jsonb, kształt sprawdzany w
  // resolveTranslatedRoomLayout niżej — wiersze sprzed spec 0045 (ręczny
  // insert przez Neon MCP) mogą nie mieć `id`, więc dopasowanie tam spada na
  // pozycję w tablicy zamiast na `id` (patrz komentarz przy tej funkcji).
  roomLayout: unknown;
  // Spec 0067 AC-3: pola tekstowe produktu, null/puste spada na polski.
  constructionSystem?: string | null;
  roofType?: string | null;
  customizationScope?: string | null;
  serviceScopeDescription?: string | null;
  // Tłumaczenie pozycji własnych "Co musi zapewnić klient"
  // (product_translation.client_requirements, spec 0050 AC-28, AC-35): tylko
  // custom: true wpisy mają tu odpowiednik, ten sam wzorzec dopasowania po
  // `id` co roomLayout wyżej. Pozycje katalogowe (custom: false) tłumaczy
  // strona klienta przez `key` i katalog opcji, nie przez tę kolumnę.
  // Opcjonalne: tylko getProjectById (karta projektu, AC-35) go selectuje —
  // getProjects/getFeaturedProjectByFamily (listy/teaser) nigdy nie renderują
  // tej sekcji, więc nie płacą za dodatkowy JOIN.
  clientRequirements?: unknown;
  // Tłumaczenie product.foundationOptions (spec 0053 AC-7): wolny tekst, ten
  // sam wzorzec opcjonalności co clientRequirements wyżej — tylko
  // getProjectById selectuje tę kolumnę.
  foundationOptions?: string | null;
  // Tłumaczenie product.faq (spec 0045 AC-10, domknięte spec 0056
  // Follow-up): tablica {id, question, answer}, dopasowanie po `id`, ten sam
  // wzorzec co roomLayout/clientRequirements wyżej. Opcjonalne, tylko
  // getProjectById selektuje tę kolumnę.
  faq?: unknown;
  // Tłumaczenie product.technicalSpecs dla rodzin bez własnego schematu Zod
  // (dziś outdoor-tv, spec 0056 Follow-up): kształt `{ specs: { "<polski
  // klucz>": { label?, value? } }, features?: string[], usageNote?: string,
  // priceNote?: string }` — patrz komentarz przy productTranslation.technicalSpecs
  // w lib/db/schema.ts. Opcjonalne, tylko getProjectById selektuje tę kolumnę.
  technicalSpecs?: unknown;
}


// floorLevel zastępuje isMezzanine (spec 0050 AC-8): migracja jednorazowa, na
// granicy aplikacji, tego samego typu co roomLayoutRowSchema w
// lib/product-room-layout.ts, ale bez .strict() Zod — ten odczyt (w
// odróżnieniu od strony edycji producenta) musi tolerować stare wiersze bez
// stabilnego `id` (patrz komentarz przy ProjectRow.roomLayout), które strict
// parse odrzuciłby w całości.
function migrateRoomLayoutEntry(room: RoomLayoutEntry & { isMezzanine?: boolean }): RoomLayoutEntry {
  if (room.floorLevel) return room;
  const { isMezzanine, ...rest } = room;
  return { ...rest, floorLevel: isMezzanine ? "poddasze" : "parter" };
}

// Tylko `name` jest tłumaczony (areaM2/floorLevel nie są
// językozależne, ten sam wzorzec co roomLayoutTranslationRowSchema w
// lib/product-room-layout.ts). Dopasowanie preferuje `id` (kreator producenta
// zawsze go pisze od spec 0045), z fallbackiem na pozycję w tablicy dla
// starszych wierszy bez `id` (patrz komentarz przy ProductTranslationText) —
// bezpieczne tu, bo ten odczyt nigdy nie przechodzi przez Zod jak strona
// edycji producenta, tylko przez to proste dopasowanie.
function resolveTranslatedRoomLayout(base: RoomLayoutEntry[], translated: unknown): RoomLayoutEntry[] {
  if (!Array.isArray(translated) || translated.length === 0) return base;
  return base.map((room, index) => {
    const roomId = (room as { id?: unknown }).id;
    const byId =
      typeof roomId === "string"
        ? translated.find((entry) => entry && typeof entry === "object" && (entry as { id?: unknown }).id === roomId)
        : undefined;
    const candidate = byId ?? translated[index];
    const translatedName =
      candidate && typeof candidate === "object" && typeof (candidate as { name?: unknown }).name === "string"
        ? ((candidate as { name: string }).name.trim())
        : "";
    return translatedName ? { ...room, name: translatedName } : room;
  });
}

// Ten sam wzorzec dopasowania po `id` co resolveTranslatedRoomLayout wyżej
// (spec 0045 AC-10, domknięte spec 0056 Follow-up — kolumna product_translation.faq
// istniała, ale getProjectById dotąd jej nie selektował, więc FAQ zawsze
// wracało po polsku). question/answer tłumaczą się niezależnie: brak jednego
// z nich w tłumaczeniu zostawia polski tekst tego pola, nie cały wiersz.
function resolveTranslatedFaq(base: ProjectFaqItem[], translated: unknown): ProjectFaqItem[] {
  if (!Array.isArray(translated) || translated.length === 0) return base;
  return base.map((item) => {
    const candidate = translated.find(
      (entry) => entry && typeof entry === "object" && (entry as { id?: unknown }).id === item.id,
    );
    if (!candidate || typeof candidate !== "object") return item;
    const translatedQuestion = (candidate as { question?: unknown }).question;
    const translatedAnswer = (candidate as { answer?: unknown }).answer;
    return {
      ...item,
      question:
        typeof translatedQuestion === "string" && translatedQuestion.trim().length > 0
          ? translatedQuestion
          : item.question,
      answer:
        typeof translatedAnswer === "string" && translatedAnswer.trim().length > 0 ? translatedAnswer : item.answer,
    };
  });
}

// Sauna (spec 0061) ma typowany odczyt technicalSpecs po angielskich kluczach
// (claddingMaterial, ...), więc tłumaczenie bierze wartość z tego samego
// kształtu `{ specs: { "<klucz>": { value } } }` co outdoor-tv wyżej, tylko
// kluczem jest nazwa pola schematu, nie polski napis. Brak tłumaczenia albo
// pusta wartość spada na polski tekst (ten sam fallback AC-6).
function resolveTranslatedSpecValue(base: string | undefined, translated: unknown, key: string): string {
  const specs =
    translated && typeof translated === "object" ? (translated as { specs?: unknown }).specs : undefined;
  const entry = specs && typeof specs === "object" ? (specs as Record<string, unknown>)[key] : undefined;
  const value =
    entry && typeof entry === "object" && typeof (entry as { value?: unknown }).value === "string"
      ? (entry as { value: string }).value.trim()
      : "";
  return value || (base ?? "");
}

interface TranslatedTechnicalSpecs {
  rawTechnicalSpecs: Record<string, string>;
  technicalSpecsLabels?: Record<string, string>;
  features?: string[];
  usageNote?: string;
  priceNote?: string;
}

// Tłumaczenie technicalSpecs/features/usageNote/priceNote dla rodzin bez
// własnego schematu Zod (dziś outdoor-tv, spec 0056 Follow-up) — jedyna z
// tych funkcji dopasowującą nie po `id`, bo baseEntries to płaska mapa
// klucz/wartość, nie tablica wierszy: sam polski klucz pełni rolę stabilnego
// id (patrz komentarz przy productTranslation.technicalSpecs w
// lib/db/schema.ts). Etykieta i wartość tłumaczą się niezależnie na wypadek
// częściowego tłumaczenia (ten sam AC-6 fallback co reszta tego pliku).
function resolveTranslatedTechnicalSpecs(
  baseEntries: [string, string][],
  baseFeatures: string[] | undefined,
  baseUsageNote: string | undefined,
  basePriceNote: string | undefined,
  translated: unknown,
): TranslatedTechnicalSpecs {
  const translatedObj =
    translated && typeof translated === "object" ? (translated as Record<string, unknown>) : undefined;
  const translatedSpecs =
    translatedObj && typeof translatedObj.specs === "object" && translatedObj.specs !== null
      ? (translatedObj.specs as Record<string, unknown>)
      : undefined;

  const rawTechnicalSpecs: Record<string, string> = {};
  const technicalSpecsLabels: Record<string, string> = {};
  for (const [key, value] of baseEntries) {
    const candidate = translatedSpecs?.[key];
    const candidateValue =
      candidate && typeof candidate === "object" && typeof (candidate as { value?: unknown }).value === "string"
        ? (candidate as { value: string }).value.trim()
        : "";
    const candidateLabel =
      candidate && typeof candidate === "object" && typeof (candidate as { label?: unknown }).label === "string"
        ? (candidate as { label: string }).label.trim()
        : "";
    rawTechnicalSpecs[key] = candidateValue || value;
    if (candidateLabel) technicalSpecsLabels[key] = candidateLabel;
  }

  const translatedFeatures =
    translatedObj && Array.isArray(translatedObj.features)
      ? (translatedObj.features as unknown[]).filter(
          (item): item is string => typeof item === "string" && item.trim().length > 0,
        )
      : undefined;
  const translatedUsageNote =
    translatedObj && typeof translatedObj.usageNote === "string" && translatedObj.usageNote.trim().length > 0
      ? (translatedObj.usageNote as string)
      : undefined;
  const translatedPriceNote =
    translatedObj && typeof translatedObj.priceNote === "string" && translatedObj.priceNote.trim().length > 0
      ? (translatedObj.priceNote as string)
      : undefined;

  return {
    rawTechnicalSpecs,
    technicalSpecsLabels: Object.keys(technicalSpecsLabels).length > 0 ? technicalSpecsLabels : undefined,
    features: translatedFeatures && translatedFeatures.length > 0 ? translatedFeatures : baseFeatures,
    usageNote: translatedUsageNote ?? baseUsageNote,
    priceNote: translatedPriceNote ?? basePriceNote,
  };
}

// Ten sam wzorzec dopasowania po `id` co resolveTranslatedRoomLayout wyżej,
// ale tylko dla custom: true (pozycje katalogowe trzymają swoją bazową,
// polską label — strona klienta re-derywuje ich etykietę z katalogu opcji
// przez `key`, patrz komentarz przy ProductTranslationText.clientRequirements).
function resolveTranslatedClientRequirements(base: ClientRequirementRow[], translated: unknown): ClientRequirementRow[] {
  if (!Array.isArray(translated) || translated.length === 0) return base;
  return base.map((requirement) => {
    if (!requirement.custom) return requirement;
    const candidate = translated.find(
      (entry) => entry && typeof entry === "object" && (entry as { id?: unknown }).id === requirement.id,
    );
    const translatedLabel =
      candidate && typeof candidate === "object" && typeof (candidate as { label?: unknown }).label === "string"
        ? (candidate as { label: string }).label.trim()
        : "";
    return translatedLabel ? { ...requirement, label: translatedLabel } : requirement;
  });
}

interface ProductDocumentPhotos {
  coverUrl: string | null;
  galleryUrls: string[];
}

// AC-7, AC-8: jedno zagregowane query dla wielu produktów naraz (nie fanout na
// wywołanie mapRowToProject), łagodny fallback w obie strony do
// coverImageUrl/_extraImageUrls dopóki produkt nie ma żadnego wiersza document
// (strangler, spec 0031 Migration plan) — okładka i galeria nigdy się nie psują
// w trakcie migracji.
// Wrapped end to end: a broken/missing R2 config (buildPublicUrl throws, see
// lib/storage/r2-client.ts) must degrade to the mock/legacy cover images
// applyDocumentPhotos() already falls back to for a product with no entry in
// the returned map, never take down every screen that lists projects.
export async function resolveProductDocumentPhotos(productIds: string[]): Promise<Map<string, ProductDocumentPhotos>> {
  if (productIds.length === 0) return new Map();

  try {
    const rows = await db
      .select({
        productId: document.productId,
        r2Key: document.r2Key,
        isCover: document.isCover,
        sortOrder: document.sortOrder,
      })
      .from(document)
      .where(
        and(inArray(document.productId, productIds), eq(document.purpose, "product_photo"), isNull(document.deletedAt)),
      );

    const byProduct = new Map<string, typeof rows>();
    for (const row of rows) {
      if (!row.productId) continue;
      const bucket = byProduct.get(row.productId) ?? [];
      bucket.push(row);
      byProduct.set(row.productId, bucket);
    }

    const result = new Map<string, ProductDocumentPhotos>();
    for (const [productId, docs] of byProduct) {
      const sorted = [...docs].sort(
        (a, b) => (a.sortOrder ?? Number.MAX_SAFE_INTEGER) - (b.sortOrder ?? Number.MAX_SAFE_INTEGER),
      );
      const cover = sorted.find((doc) => doc.isCover) ?? null;
      result.set(productId, {
        coverUrl: cover ? buildPublicUrl(cover.r2Key) : null,
        galleryUrls: sorted.filter((doc) => !doc.isCover).map((doc) => buildPublicUrl(doc.r2Key)),
      });
    }
    return result;
  } catch (error) {
    captureError(error, { path: "resolveProductDocumentPhotos" });
    return new Map();
  }
}

// Nadpisuje okładkę/galerię danymi z document tylko gdy produkt ma już
// przynajmniej jeden zmigrowany/wgrany wiersz (AC-8); bez żadnego wiersza
// project zostaje bez zmian (dzisiejszy mock/mostek, patrz mapRowToProject).
function applyDocumentPhotos(projectItem: Project, photos: ProductDocumentPhotos | undefined): Project {
  if (!photos) return projectItem;
  return {
    ...projectItem,
    coverImageUrl: photos.coverUrl ?? projectItem.coverImageUrl,
    galleryImageUrls: photos.galleryUrls.length > 0 ? photos.galleryUrls : projectItem.galleryImageUrls,
  };
}

function applyVariants(projectItem: Project, variants: ProjectVariant[] | undefined): Project {
  return { ...projectItem, variants: variants ?? [] };
}

function applyDocuments(projectItem: Project, documents: ProjectDocument[] | undefined): Project {
  return { ...projectItem, documents: documents ?? [] };
}

// Spec 0065 AC-12: certyfikaty firmy z producer_certification. Mapa zawiera
// tylko producentów z co najmniej jednym certyfikatem, więc brak wpisu znaczy
// "brak certyfikatów" (undefined na projekcie). onlyConfirmed filtruje w SQL,
// listing na /verified-manufacturers nigdy nie dostaje deklaracji.
async function resolveProducerCertifications(
  producerIds: string[],
  options: { onlyConfirmed?: boolean; locale?: Locale } = {},
): Promise<Map<string, ProducerCertification[]>> {
  if (producerIds.length === 0) return new Map();
  const rows = await db
    .select({
      id: producerCertification.id,
      producerId: producerCertification.producerId,
      name: producerCertification.name,
      issuer: producerCertification.issuer,
      confirmationStatus: producerCertification.confirmationStatus,
      confirmedAt: producerCertification.confirmedAt,
    })
    .from(producerCertification)
    .where(
      and(
        inArray(producerCertification.producerId, producerIds),
        options.onlyConfirmed ? eq(producerCertification.confirmationStatus, "platform_confirmed") : undefined,
      ),
    )
    .orderBy(producerCertification.name);
  // Spec 0067 AC-4/AC-7: tłumaczenie nazwy po id certyfikatu, klucz i
  // sortowanie zostają na polskiej nazwie; dla pl bez joina.
  const locale = options.locale ?? "pl";
  const translatedNames = new Map<string, string>();
  if (locale !== "pl" && rows.length > 0) {
    const translations = await db
      .select({ certificationId: producerCertificationTranslation.certificationId, name: producerCertificationTranslation.name })
      .from(producerCertificationTranslation)
      .where(
        and(
          inArray(
            producerCertificationTranslation.certificationId,
            rows.map((row) => row.id),
          ),
          eq(producerCertificationTranslation.locale, locale),
        ),
      );
    for (const translation of translations) translatedNames.set(translation.certificationId, translation.name);
  }
  const map = new Map<string, ProducerCertification[]>();
  for (const row of rows) {
    const list = map.get(row.producerId) ?? [];
    list.push({
      name: resolveTranslatedText(row.name, translatedNames.get(row.id)),
      issuer: row.issuer,
      confirmed: row.confirmationStatus === "platform_confirmed",
      confirmedAt: row.confirmedAt,
    });
    map.set(row.producerId, list);
  }
  return map;
}

interface ProjectRelatedRows {
  variants?: ProjectVariant[];
  documents?: ProjectDocument[];
}

function mapRowToProject(
  row: typeof product.$inferSelect,
  producerName: string,
  translation?: ProductTranslationText,
  related?: ProjectRelatedRows,
): Project {
  const specs = (row.technicalSpecs ?? {}) as ProductTechnicalSpecsDraft & TechnicalSpecsBridgeFields;
  // Spec 0061 AC-7: sauna dostaje realny, typowany odczyt (nie generyczną
  // tabelę jsonb jak outdoor-tv niżej) — undefined dla każdy inny produkt,
  // ten sam warunek co strażnik rodziny/podkategorii na /sauna/[slug].
  const saunaTechnicalSpecs =
    row.family === "spa-modulowe" && row.spaSubcategory === "sauna"
      ? {
          claddingMaterial: resolveTranslatedSpecValue(specs.claddingMaterial, translation?.technicalSpecs, "claddingMaterial"),
          interiorWoodType: resolveTranslatedSpecValue(specs.interiorWoodType, translation?.technicalSpecs, "interiorWoodType"),
          benchMaterial: resolveTranslatedSpecValue(specs.benchMaterial, translation?.technicalSpecs, "benchMaterial"),
          insulationType: resolveTranslatedSpecValue(specs.insulationType, translation?.technicalSpecs, "insulationType"),
          glazingType: resolveTranslatedSpecValue(specs.glazingType, translation?.technicalSpecs, "glazingType"),
          seatingCapacity: specs.seatingCapacity ?? null,
          hasChangingArea: specs.hasChangingArea ?? null,
          changingAreaDescription: resolveTranslatedSpecValue(
            specs.changingAreaDescription,
            translation?.technicalSpecs,
            "changingAreaDescription",
          ),
          electricalRequirement: resolveTranslatedSpecValue(
            specs.electricalRequirement,
            translation?.technicalSpecs,
            "electricalRequirement",
          ),
        }
      : undefined;
  // Wersja surowa, bez typowania pod "dom" (spec 0056 AC-3): dla rodziny bez
  // własnego schematu Zod (outdoor-tv) to jedyny sposób pokazania czegokolwiek
  // ze specyfikacji technicznej. Klucze wewnętrzne (podkreślnik, np.
  // _priceOnRequest) i wartości nietekstowe są pomijane — to pole nie zna
  // kształtu żadnej konkretnej rodziny, tylko wypisuje to, co jest.
  const baseTechnicalSpecsEntries = Object.entries((row.technicalSpecs ?? {}) as Record<string, unknown>).filter(
    (entry): entry is [string, string] =>
      !entry[0].startsWith("_") && typeof entry[1] === "string" && entry[1].length > 0,
  );
  const translatedTechnicalSpecs = resolveTranslatedTechnicalSpecs(
    baseTechnicalSpecsEntries,
    specs._features,
    specs._usageNote,
    specs._priceNote,
    translation?.technicalSpecs,
  );
  const rawTechnicalSpecs = translatedTechnicalSpecs.rawTechnicalSpecs;
  // price_min/max_cents są od spec 0041 pochodną wyzwalacza synchronizacji
  // ceny (lib/db/AGENTS.md): NULL gdy produkt nie ma aktywnego wariantu
  // domyślnego. AC-11 traktuje to dokładnie jak priceOnRequest, nigdy jako
  // "od undefined €".
  const priceOnRequest = Boolean(specs._priceOnRequest) || row.priceMinCents === null;
  const rawRoomLayout = (row.roomLayout as (RoomLayoutEntry & { isMezzanine?: boolean })[] | null) ?? undefined;
  const baseRoomLayout = rawRoomLayout?.map(migrateRoomLayoutEntry);
  const roomLayout = baseRoomLayout ? resolveTranslatedRoomLayout(baseRoomLayout, translation?.roomLayout) : undefined;
  const baseFaq = (row.faq as ProjectFaqItem[] | null) ?? undefined;
  const faq = baseFaq ? resolveTranslatedFaq(baseFaq, translation?.faq) : undefined;
  // Spec 0050 AC-23, AC-35: safeParse zamiast rzucającego parse, bo ten sam
  // wzorzec co reszta tego mappera toleruje niekompletne/legacy wiersze
  // (nigdy nie blokuje renderu całej karty projektu przez jedno złe pole jsonb).
  const clientRequirementsResult = clientRequirementsSchema.safeParse(row.clientRequirements ?? []);
  const baseClientRequirements = clientRequirementsResult.success ? clientRequirementsResult.data : [];
  const clientRequirements =
    baseClientRequirements.length > 0
      ? resolveTranslatedClientRequirements(baseClientRequirements, translation?.clientRequirements)
      : [];

  return {
    id: row.id,
    producerId: row.producerId,
    producerName,
    name: resolveTranslatedText(row.name, translation?.name),
    slug: row.slug,
    status: row.status,
    countryOfProduction: (row.countryOfProduction ?? "PL") as CountryCode,
    floorAreaM2: row.floorAreaM2,
    builtUpAreaM2: row.builtUpAreaM2,
    rooms: row.rooms,
    bedrooms: row.bedrooms,
    bathrooms: row.bathrooms,
    storeys: row.storeys,
    externalDimensions: row.externalDimensions ?? "",
    roofType: resolveTranslatedText(row.roofType, translation?.roofType),
    family: row.family,
    category: row.category ?? "caloroczny",
    spaSubcategory: row.spaSubcategory,
    constructionSystem: resolveTranslatedText(row.constructionSystem, translation?.constructionSystem),
    foundationOptions: resolveTranslatedText(row.foundationOptions, translation?.foundationOptions),
    customizationScope: resolveTranslatedText(row.customizationScope, translation?.customizationScope),
    structuralWarrantyYears: row.structuralWarrantyYears ?? 0,
    priceMin: (row.priceMinCents ?? 0) / 100,
    currency: "EUR",
    coverImageUrl: row.coverImageUrl ?? "",
    description: resolveTranslatedText(row.description, translation?.description),
    wallBuildUp: specs.wallBuildUp ?? "",
    insulation: specs.insulation ?? "",
    heatTransferCoefficients: specs.heatTransferCoefficients ?? "",
    windowClass: specs.windowClass ?? "",
    ventilation: specs.ventilation ?? "",
    heatSource: specs.heatSource ?? "",
    fireResistance: specs.fireResistance ?? "",
    windResistance: specs.windResistance ?? "",
    saunaTechnicalSpecs,
    variants: related?.variants ?? [],
    roomLayout: roomLayout && roomLayout.length > 0 ? roomLayout : undefined,
    documents: related?.documents ?? [],
    faq: faq && faq.length > 0 ? faq : undefined,
    clientRequirements: clientRequirements.length > 0 ? clientRequirements : undefined,
    installationWarrantyYears: row.installationWarrantyYears ?? undefined,
    serviceScopeDescription: row.serviceScopeDescription
      ? resolveTranslatedText(row.serviceScopeDescription, translation?.serviceScopeDescription)
      : undefined,
    transportDimensions: row.transportDimensions ?? undefined,
    craneRequirements: row.craneRequirements ?? undefined,
    minPlotWidthM: row.minPlotWidthM ?? undefined,
    featured: row.featured,
    priceOnRequest,
    galleryImageUrls: specs._extraImageUrls,
    videoUrl: row.videoUrl ?? undefined,
    features: translatedTechnicalSpecs.features,
    usageNote: translatedTechnicalSpecs.usageNote,
    priceNote: translatedTechnicalSpecs.priceNote,
    technicalSpecs: Object.keys(rawTechnicalSpecs).length > 0 ? rawTechnicalSpecs : undefined,
    technicalSpecsLabels: translatedTechnicalSpecs.technicalSpecsLabels,
  };
}

// Re-exportowane z lib/data/project-variants.ts (moduł bez zależności na
// lib/db/client), żeby dzisiejsi odbiorcy importujący z tego pliku nie musieli
// zmieniać ścieżki importu; komponenty prezentacyjne importują bezpośrednio
// z project-variants.ts, patrz komentarz tam.
export { getDefaultProjectVariant } from "./project-variants";

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
    locale = "pl",
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
    seatingMin,
    producerId,
    spaSubcategory,
    containerSubcategory,
    q,
  } = filters ?? {};

  // "wiecej-niz-dom" rozwija się na >1 prawdziwą rodzinę (spec 0035 AC-2, AC-4):
  // WHERE ... IN (...) zamiast równości, jedyne miejsce, gdzie ta gałąź się rozgałęzia.
  const filterFamilies = resolveFamilies(family);
  const conditions = [
    eq(product.status, "published"),
    filterFamilies.length > 1 ? inArray(product.family, filterFamilies) : eq(product.family, filterFamilies[0]),
  ];

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

  // spaSubcategory/containerSubcategory are each scoped to their own family
  // (same boundary as `category`, spec 0022).
  if (family === "spa-modulowe" && spaSubcategory !== undefined) {
    conditions.push(eq(product.spaSubcategory, spaSubcategory));
  }
  if (family === "kontenery-modulowe" && containerSubcategory !== undefined) {
    conditions.push(eq(product.containerSubcategory, containerSubcategory));
  }

  // Compares against the product's priceMin ("od"), never a range (spec 0026 AC-4);
  // priceOnRequest never matches once a price bound is present.
  if (priceMin !== undefined || priceMax !== undefined) {
    conditions.push(sql`(${product.technicalSpecs}->>'_priceOnRequest') IS DISTINCT FROM 'true'`);
    if (priceMin !== undefined) conditions.push(gte(product.priceMinCents, priceMin * 100));
    if (priceMax !== undefined) conditions.push(lte(product.priceMinCents, priceMax * 100));
  }

  // Liczba miejsc czytana z jsonb bez rzutowania na ślepo (spec 0068 Key
  // invariants): jeden rekord z tekstem w seatingCapacity nie może wywrócić
  // całej listy, taki produkt po prostu nie przechodzi filtra.
  if (seatingMin !== undefined) {
    conditions.push(
      sql`CASE WHEN jsonb_typeof(${product.technicalSpecs}->'seatingCapacity') = 'number' THEN (${product.technicalSpecs}->>'seatingCapacity')::numeric >= ${seatingMin} ELSE false END`,
    );
  }
  if (producerId !== undefined && UUID_PATTERN.test(producerId)) {
    conditions.push(eq(product.producerId, producerId));
  }

  if (q !== undefined) {
    const tsQuery = buildPrefixTsQuery(q);
    if (tsQuery !== null) conditions.push(sql`${product.searchVector} @@ to_tsquery('simple', ${tsQuery})`);
  }

  let projects: Project[];
  if (locale === "en" || locale === "nl" || locale === "de") {
    const rows = await db
      .select({
        product,
        producerName: producer.name,
        translationName: productTranslation.name,
        translationDescription: productTranslation.description,
        translationRoomLayout: productTranslation.roomLayout,
        translationConstructionSystem: productTranslation.constructionSystem,
        translationRoofType: productTranslation.roofType,
        translationCustomizationScope: productTranslation.customizationScope,
        translationServiceScopeDescription: productTranslation.serviceScopeDescription,
      })
      .from(product)
      .innerJoin(producer, eq(product.producerId, producer.id))
      .leftJoin(
        productTranslation,
        and(eq(productTranslation.productId, product.id), eq(productTranslation.locale, locale)),
      )
      .where(and(...conditions));
    projects = rows.map((row) =>
      mapRowToProject(row.product, row.producerName, {
        name: row.translationName,
        description: row.translationDescription,
        roomLayout: row.translationRoomLayout,
        constructionSystem: row.translationConstructionSystem,
        roofType: row.translationRoofType,
        customizationScope: row.translationCustomizationScope,
        serviceScopeDescription: row.translationServiceScopeDescription,
      }),
    );
  } else {
    const rows = await db
      .select({ product, producerName: producer.name })
      .from(product)
      .innerJoin(producer, eq(product.producerId, producer.id))
      .where(and(...conditions));
    projects = rows.map((row) => mapRowToProject(row.product, row.producerName));
  }

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

  const projectIds = projects.map((project) => project.id);
  const producerIds = [...new Set(projects.map((project) => project.producerId))];
  const [documentPhotos, variantsByProduct, certificationsByProducer] = await Promise.all([
    resolveProductDocumentPhotos(projectIds),
    resolveProductVariants(projectIds, { locale }),
    resolveProducerCertifications(producerIds, { locale }),
  ]);
  return projects.map((project) => ({
    ...applyVariants(applyDocumentPhotos(project, documentPhotos.get(project.id)), variantsByProduct.get(project.id)),
    certifications: certificationsByProducer.get(project.producerId),
  }));
}

export interface SaunaProducerOption {
  id: string;
  name: string;
  count: number;
}

// Producenci z co najmniej jedną opublikowaną sauną, do chipów filtra na
// /sauna (spec 0068 AC-9). Lista rośnie sama razem z katalogiem, bez zmiany
// kodu. Pusta lista zamiast błędu, gdy nie ma żadnej sauny.
export async function getSaunaProducerOptions(): Promise<SaunaProducerOption[]> {
  const rows = await db
    .select({ id: producer.id, name: producer.name, count: sql<number>`count(*)::int` })
    .from(product)
    .innerJoin(producer, eq(product.producerId, producer.id))
    .where(
      and(
        eq(product.status, "published"),
        eq(product.family, "spa-modulowe"),
        eq(product.spaSubcategory, "sauna"),
      ),
    )
    .groupBy(producer.id, producer.name)
    .orderBy(producer.name);
  return rows;
}

// Id existence check for the zapytanie/dzialka flows (spec 0023 AC-... /
// spec 0006): those flows accept a product id picked from *any* family
// (`/wyniki?family=spa-modulowe` selection included, not just the dom
// default), so validation must not filter by family the way getProjects()
// does. Was a bug: both pages used to build knownIds from getProjects({ locale })
// alone, which defaults to family "dom" and silently dropped every non-dom
// selection, bouncing the client back to results with no error.
export async function getPublishedProductIds(): Promise<Set<string>> {
  const rows = await db.select({ id: product.id }).from(product).where(eq(product.status, "published"));
  return new Set(rows.map((row) => row.id));
}

// product.id jest kolumną uuid w Postgresie: porównanie z niepoprawnym uuid
// (np. starym mockowym slugiem "prj-xxx" albo dowolnym literałem z adresu)
// rzuca błędem bazy zamiast zwrócić brak wiersza, więc strona kończyła się
// 500 zamiast standardowego notFound() (spec 0020 AC-6). Wczesny return na
// kształt id, przed zapytaniem do bazy, naprawia to bez zmiany reszty funkcji.
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function getProjectById(id: string, locale: Locale = "pl"): Promise<Project | null> {
  if (!UUID_PATTERN.test(id)) return null;

  if (locale === "en" || locale === "nl" || locale === "de") {
    const [row] = await db
      .select({
        product,
        producerName: producer.name,
        translationName: productTranslation.name,
        translationDescription: productTranslation.description,
        translationRoomLayout: productTranslation.roomLayout,
        translationConstructionSystem: productTranslation.constructionSystem,
        translationRoofType: productTranslation.roofType,
        translationCustomizationScope: productTranslation.customizationScope,
        translationServiceScopeDescription: productTranslation.serviceScopeDescription,
        translationClientRequirements: productTranslation.clientRequirements,
        translationFoundationOptions: productTranslation.foundationOptions,
        // Kolumna istniała w schemacie od dawna (spec 0045 AC-10), ale
        // dotąd nic jej nie odczytywało na karcie klienta — FAQ zawsze
        // renderowało się po polsku niezależnie od locale. Domknięte tu
        // (outdoor-tv FAQ, spec 0056 Follow-up), ten sam wzorzec co
        // translationClientRequirements/translationFoundationOptions
        // wyżej: tylko getProjectById selektuje tę kolumnę.
        translationFaq: productTranslation.faq,
        translationTechnicalSpecs: productTranslation.technicalSpecs,
      })
      .from(product)
      .innerJoin(producer, eq(product.producerId, producer.id))
      .leftJoin(
        productTranslation,
        and(eq(productTranslation.productId, product.id), eq(productTranslation.locale, locale)),
      )
      .where(eq(product.id, id));

    if (!row) return null;
    const [documentPhotos, variantsByProduct, documentsByProduct, certificationsByProducer] = await Promise.all([
      resolveProductDocumentPhotos([id]),
      resolveProductVariants([id], { withDetails: true, locale }),
      resolveProductDocuments([id]),
      resolveProducerCertifications([row.product.producerId], { locale }),
    ]);
    return {
      ...applyDocuments(
        applyVariants(
          applyDocumentPhotos(
            mapRowToProject(row.product, row.producerName, {
              name: row.translationName,
              description: row.translationDescription,
              roomLayout: row.translationRoomLayout,
              constructionSystem: row.translationConstructionSystem,
              roofType: row.translationRoofType,
              customizationScope: row.translationCustomizationScope,
              serviceScopeDescription: row.translationServiceScopeDescription,
              clientRequirements: row.translationClientRequirements,
              foundationOptions: row.translationFoundationOptions,
              faq: row.translationFaq,
              technicalSpecs: row.translationTechnicalSpecs,
            }),
            documentPhotos.get(id),
          ),
          variantsByProduct.get(id),
        ),
        documentsByProduct.get(id),
      ),
      certifications: certificationsByProducer.get(row.product.producerId),
    };
  }

  const [row] = await db
    .select({ product, producerName: producer.name })
    .from(product)
    .innerJoin(producer, eq(product.producerId, producer.id))
    .where(eq(product.id, id));

  if (!row) return null;
  const [documentPhotos, variantsByProduct, documentsByProduct, certificationsByProducer] = await Promise.all([
    resolveProductDocumentPhotos([id]),
    resolveProductVariants([id], { withDetails: true, locale }),
    resolveProductDocuments([id]),
    resolveProducerCertifications([row.product.producerId], { locale }),
  ]);
  return {
    ...applyDocuments(
      applyVariants(
        applyDocumentPhotos(mapRowToProject(row.product, row.producerName), documentPhotos.get(id)),
        variantsByProduct.get(id),
      ),
      documentsByProduct.get(id),
    ),
    certifications: certificationsByProducer.get(row.product.producerId),
  };
}

// Spec 0065 AC-6: wiersze ocen zgodności dla jednego produktu, z podpisem
// tego, czego dotyczą (kraj i przepis). Zastrzeżenie Compliance Engine renderuje
// komponent, nie ta funkcja.
export async function getProductComplianceAssessments(
  productId: string,
  locale: Locale = "pl",
): Promise<ProductComplianceAssessment[]> {
  if (!UUID_PATTERN.test(productId)) return [];
  const rows = await db
    .select({
      countryCode: productComplianceAssessment.countryCode,
      rule: productComplianceAssessment.rule,
      status: productComplianceAssessment.status,
      reason: productComplianceAssessment.reason,
      confirmationStatus: productComplianceAssessment.confirmationStatus,
      confirmedAt: productComplianceAssessment.confirmedAt,
    })
    .from(productComplianceAssessment)
    .where(eq(productComplianceAssessment.productId, productId))
    .orderBy(productComplianceAssessment.countryCode, productComplianceAssessment.rule);
  const translateReference = await loadReferenceTranslator(
    rows.map((row) => row.reason),
    locale,
  );
  return rows.map((row) => ({
    countryCode: row.countryCode as CountryCode,
    rule: row.rule,
    status: row.status,
    reason: row.reason ? translateReference(row.reason) : row.reason,
    confirmed: row.confirmationStatus === "platform_confirmed",
    confirmedAt: row.confirmedAt,
  }));
}

// Adres publicznej strony produktu przyjmuje slug albo id (spec 0058 AC-3):
// najpierw dopasowanie po slug (czytelny adres), dopiero gdy brak trafienia i
// wartość ma kształt uuid, dopasowanie po id (stary adres, wciąż działa —
// AC-4/AC-5 decydują o ewentualnym przekierowaniu na poziomie strony, nie
// tutaj: ta funkcja tylko rozwiązuje wartość na produkt albo null). Deleguje
// do getProjectById po znalezieniu prawdziwego id, żeby nie duplikować całego
// zapytania/joinów dwa razy.
export async function getProjectBySlugOrId(value: string, locale: Locale = "pl"): Promise<Project | null> {
  const [bySlug] = await db.select({ id: product.id }).from(product).where(eq(product.slug, value));
  if (bySlug) return getProjectById(bySlug.id, locale);
  return getProjectById(value, locale);
}

// Public: feeds CategoryShowcase on the home page with one real, clickable
// project per family instead of a generic unfiltered /wyniki link.
export async function getFeaturedProjectByFamily(
  family: ProductFamily,
  locale: Locale = "pl",
): Promise<Project | null> {
  if (locale === "en" || locale === "nl" || locale === "de") {
    const [row] = await db
      .select({
        product,
        producerName: producer.name,
        translationName: productTranslation.name,
        translationDescription: productTranslation.description,
        translationRoomLayout: productTranslation.roomLayout,
        translationConstructionSystem: productTranslation.constructionSystem,
        translationRoofType: productTranslation.roofType,
        translationCustomizationScope: productTranslation.customizationScope,
        translationServiceScopeDescription: productTranslation.serviceScopeDescription,
      })
      .from(product)
      .innerJoin(producer, eq(product.producerId, producer.id))
      .leftJoin(
        productTranslation,
        and(eq(productTranslation.productId, product.id), eq(productTranslation.locale, locale)),
      )
      .where(and(eq(product.family, family), eq(product.featured, true), eq(product.status, "published")));

    if (!row) return null;
    const [documentPhotos, variantsByProduct] = await Promise.all([
      resolveProductDocumentPhotos([row.product.id]),
      resolveProductVariants([row.product.id], { locale }),
    ]);
    return applyVariants(
      applyDocumentPhotos(
        mapRowToProject(row.product, row.producerName, {
          name: row.translationName,
          description: row.translationDescription,
          roomLayout: row.translationRoomLayout,
          constructionSystem: row.translationConstructionSystem,
          roofType: row.translationRoofType,
          customizationScope: row.translationCustomizationScope,
          serviceScopeDescription: row.translationServiceScopeDescription,
        }),
        documentPhotos.get(row.product.id),
      ),
      variantsByProduct.get(row.product.id),
    );
  }

  const [row] = await db
    .select({ product, producerName: producer.name })
    .from(product)
    .innerJoin(producer, eq(product.producerId, producer.id))
    .where(and(eq(product.family, family), eq(product.featured, true), eq(product.status, "published")));

  if (!row) return null;
  const [documentPhotos, variantsByProduct] = await Promise.all([
    resolveProductDocumentPhotos([row.product.id]),
    resolveProductVariants([row.product.id], { locale }),
  ]);
  return applyVariants(
    applyDocumentPhotos(mapRowToProject(row.product, row.producerName), documentPhotos.get(row.product.id)),
    variantsByProduct.get(row.product.id),
  );
}

export async function getEligibilityByCountry(
  countryCode: CountryCode,
  locale: Locale = "pl",
): Promise<EligibilityByCountry[]> {
  const rows = await db
    .select()
    .from(productCountryEligibility)
    .where(eq(productCountryEligibility.countryCode, countryCode));

  // Spec 0067 AC-5: powód decyzji przez słownik (strona /results nie podaje
  // locale, bo czyta tylko status, więc dla niej bez dodatkowego zapytania).
  const translateReference = await loadReferenceTranslator(
    rows.map((row) => row.reason),
    locale,
  );
  return rows.map((row) => ({
    projectId: row.productId,
    countryCode: row.countryCode as CountryCode,
    status: row.status,
    reason: row.reason ? translateReference(row.reason) : row.reason,
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

  const favoriteIds = rows.map((row) => row.product.id);
  const [documentPhotos, variantsByProduct] = await Promise.all([
    resolveProductDocumentPhotos(favoriteIds),
    resolveProductVariants(favoriteIds),
  ]);

  return rows.map((row) => ({
    project: applyVariants(
      applyDocumentPhotos(mapRowToProject(row.product, row.producerName), documentPhotos.get(row.product.id)),
      variantsByProduct.get(row.product.id),
    ),
    available: row.product.status === "published" && row.product.deletedAt === null,
  }));
}

export interface VerifiedVolumeManufacturer {
  producerId: string;
  producerName: string;
  unitsPerMonth: number | null;
  certifications: ProducerCertification[];
  deliveryCountries: CountryCode[];
  projects: Project[];
}

async function loadDeliveryCountriesByProducer(producerIds: string[]): Promise<Map<string, CountryCode[]>> {
  if (producerIds.length === 0) return new Map();
  const rows = await db
    .select({ producerId: producerDeliveryCountry.producerId, countryCode: producerDeliveryCountry.countryCode })
    .from(producerDeliveryCountry)
    .where(inArray(producerDeliveryCountry.producerId, producerIds));
  const map = new Map<string, CountryCode[]>();
  for (const row of rows) {
    const list = map.get(row.producerId) ?? [];
    list.push(row.countryCode as CountryCode);
    map.set(row.producerId, list);
  }
  return map;
}

// Rozszerzenie paskiem wyszukiwania (spec 0038 AC-19 do AC-23, aktualizacja
// 2026-09-14): kraj dostawy zawęża listę PRODUCENTÓW (nie tylko ich
// projektów) przed zapytaniem o produkty, bo producent bez wiersza
// producerDeliveryCountry dla tego kraju ma zniknąć ze strony całkowicie,
// nawet jeśli ma opublikowane produkty (AC-20). Metraż i słowo kluczowe
// zawężają samo zapytanie o produkty, tymi samymi warunkami co getProjects()
// (AC-21, AC-22).
export interface VerifiedVolumeManufacturerFilter {
  countryCode?: CountryCode;
  sizeMin?: number;
  sizeMax?: number;
  q?: string;
}

// Feeds /verified-manufacturers (spec 0038 AC-13): "who qualifies" is the
// exact same condition autoTargetProducers already uses in
// lib/project-request-actions.ts (volumeVerificationStatus = 'approved'),
// so this screen and the auto-matching engine never disagree on the list.
export async function getVerifiedVolumeManufacturerProjects(
  locale: Locale = "pl",
  filter?: VerifiedVolumeManufacturerFilter,
): Promise<VerifiedVolumeManufacturer[]> {
  const approvedProducers = await db
    .select({
      producerId: producer.id,
      producerName: producer.name,
      unitsPerMonth: producerCapacityProfile.unitsPerMonth,
    })
    .from(producer)
    .innerJoin(producerCapacityProfile, eq(producerCapacityProfile.producerId, producer.id))
    .where(and(eq(producerCapacityProfile.volumeVerificationStatus, "approved"), isNull(producer.deletedAt)));

  if (approvedProducers.length === 0) return [];

  let producerIds = approvedProducers.map((row) => row.producerId);

  if (filter?.countryCode) {
    const deliveryRows = await db
      .select({ producerId: producerDeliveryCountry.producerId })
      .from(producerDeliveryCountry)
      .where(
        and(
          inArray(producerDeliveryCountry.producerId, producerIds),
          eq(producerDeliveryCountry.countryCode, filter.countryCode),
        ),
      );
    const deliveringIds = new Set(deliveryRows.map((row) => row.producerId));
    producerIds = producerIds.filter((id) => deliveringIds.has(id));
  }

  if (producerIds.length === 0) return [];

  const productConditions = [eq(product.status, "published"), inArray(product.producerId, producerIds)];
  if (filter?.sizeMin !== undefined) productConditions.push(gte(product.floorAreaM2, filter.sizeMin));
  if (filter?.sizeMax !== undefined) productConditions.push(lte(product.floorAreaM2, filter.sizeMax));
  if (filter?.q !== undefined) {
    const tsQuery = buildPrefixTsQuery(filter.q);
    if (tsQuery !== null) productConditions.push(sql`${product.searchVector} @@ to_tsquery('simple', ${tsQuery})`);
  }

  const projectsByProducer = new Map<string, Project[]>();
  if (locale === "en" || locale === "nl" || locale === "de") {
    const rows = await db
      .select({
        product,
        producerName: producer.name,
        translationName: productTranslation.name,
        translationDescription: productTranslation.description,
        translationRoomLayout: productTranslation.roomLayout,
        translationConstructionSystem: productTranslation.constructionSystem,
        translationRoofType: productTranslation.roofType,
        translationCustomizationScope: productTranslation.customizationScope,
        translationServiceScopeDescription: productTranslation.serviceScopeDescription,
      })
      .from(product)
      .innerJoin(producer, eq(product.producerId, producer.id))
      .leftJoin(
        productTranslation,
        and(eq(productTranslation.productId, product.id), eq(productTranslation.locale, locale)),
      )
      .where(and(...productConditions));
    for (const row of rows) {
      const list = projectsByProducer.get(row.product.producerId) ?? [];
      list.push(
        mapRowToProject(row.product, row.producerName, {
          name: row.translationName,
          description: row.translationDescription,
          roomLayout: row.translationRoomLayout,
          constructionSystem: row.translationConstructionSystem,
          roofType: row.translationRoofType,
          customizationScope: row.translationCustomizationScope,
          serviceScopeDescription: row.translationServiceScopeDescription,
        }),
      );
      projectsByProducer.set(row.product.producerId, list);
    }
  } else {
    const rows = await db
      .select({ product, producerName: producer.name })
      .from(product)
      .innerJoin(producer, eq(product.producerId, producer.id))
      .where(and(...productConditions));
    for (const row of rows) {
      const list = projectsByProducer.get(row.product.producerId) ?? [];
      list.push(mapRowToProject(row.product, row.producerName));
      projectsByProducer.set(row.product.producerId, list);
    }
  }

  const allProjectIds = [...projectsByProducer.values()].flat().map((project) => project.id);
  const [documentPhotos, variantsByProduct] = await Promise.all([
    resolveProductDocumentPhotos(allProjectIds),
    resolveProductVariants(allProjectIds, { locale }),
  ]);
  for (const [producerId, list] of projectsByProducer) {
    projectsByProducer.set(
      producerId,
      list.map((project) =>
        applyVariants(applyDocumentPhotos(project, documentPhotos.get(project.id)), variantsByProduct.get(project.id)),
      ),
    );
  }

  const deliveryMap = await loadDeliveryCountriesByProducer(producerIds);
  const confirmedCertificationsByProducer = await resolveProducerCertifications(producerIds, { onlyConfirmed: true, locale });
  const eligibleProducerIds = new Set(producerIds);

  // Producent bez ani jednego pasującego projektu znika z listy razem z
  // nagłówkiem (AC-23): dotyczy zarówno wykluczenia po kraju wyżej, jak i
  // zera dopasowań po metrażu/słowie kluczowym poniżej — żadna sekcja
  // producenta nie renderuje się pusta.
  return approvedProducers
    .filter((row) => eligibleProducerIds.has(row.producerId))
    .map((row) => ({
      producerId: row.producerId,
      producerName: row.producerName,
      unitsPerMonth: row.unitsPerMonth,
      certifications: confirmedCertificationsByProducer.get(row.producerId) ?? [],
      deliveryCountries: deliveryMap.get(row.producerId) ?? [],
      projects: projectsByProducer.get(row.producerId) ?? [],
    }))
    .filter((manufacturer) => manufacturer.projects.length > 0);
}

// Gates the "Zapytaj o większą ilość" block on /project/[id] (spec 0038
// AC-15): null unless this producer has an approved capacity profile, same
// 'approved' condition as getVerifiedVolumeManufacturerProjects above.
export async function getProducerVolumeProfile(
  producerId: string,
  locale: Locale = "pl",
): Promise<Omit<VerifiedVolumeManufacturer, "projects"> | null> {
  if (!UUID_PATTERN.test(producerId)) return null;

  const [row] = await db
    .select({
      producerId: producer.id,
      producerName: producer.name,
      unitsPerMonth: producerCapacityProfile.unitsPerMonth,
    })
    .from(producer)
    .innerJoin(producerCapacityProfile, eq(producerCapacityProfile.producerId, producer.id))
    .where(
      and(
        eq(producer.id, producerId),
        eq(producerCapacityProfile.volumeVerificationStatus, "approved"),
        isNull(producer.deletedAt),
      ),
    );
  if (!row) return null;

  const [deliveryMap, certificationsByProducer] = await Promise.all([
    loadDeliveryCountriesByProducer([producerId]),
    resolveProducerCertifications([producerId], { onlyConfirmed: true, locale }),
  ]);

  return {
    producerId: row.producerId,
    producerName: row.producerName,
    unitsPerMonth: row.unitsPerMonth,
    certifications: certificationsByProducer.get(producerId) ?? [],
    deliveryCountries: deliveryMap.get(producerId) ?? [],
  };
}
