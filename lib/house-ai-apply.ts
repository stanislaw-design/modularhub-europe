import { getHouseAiField } from "@/lib/house-ai-field-catalog";
import type { HouseAiDecision } from "@/lib/house-ai-schemas";

// Zastosowanie zaakceptowanych decyzji do szkicu produktu (spec 0047 AC-13,
// "Atomowe zastosowanie"). Ten moduł buduje i waliduje wyłącznie payload w
// pamięci; sam wielotabelowy zapis odbywa się w jednej funkcji Postgres
// (apply_ai_extraction, drizzle/0027_apply_ai_extraction.sql) — ta sama
// architektura co save_ai_field_decision/get_ai_review_gate (spec 0047,
// lib/db/AGENTS.md: neon-http nie wspiera db.transaction, więc operacja
// wielostatementowa musi być pojedynczym wywołaniem funkcji bazodanowej).
//
// Świadomie poza zakresem tej wersji (patrz docs/specs/0047-import-projektu-z-pdf/verify.md):
// - TRANSLATION_PENDING / TRANSLATION_FAILED — pipeline tłumaczeń EN/DE/NL nie istnieje.
// - PRODUCT_FIELD_CHANGED — ai_field_snapshot nigdy nie jest zapisywany przy starcie sesji.
// - Ponowna walidacja przez istniejące schematy produktu (np. lib/product-technical-specs.ts)
//   przed zapisem — zastosowanie pisze surowy jsonb, tak jak dziś robią to kandydaci.

const APPLICABLE_DECISION_TYPES = new Set<HouseAiDecision["decisionType"]>(["accepted", "manual", "overwrite_changed"]);

/** Ostatni segment ścieżki katalogu pól, np. "variants[].costItems[].label" → "label". */
function pathSuffix(path: string): string {
  const index = path.lastIndexOf("[].");
  return index === -1 ? path : path.slice(index + 3);
}

/** Nazwa kolumny/klucza jsonb z `target` katalogu, np. "product.floor_area_m2" → "floor_area_m2". */
function targetSuffix(target: string): string {
  const dot = target.indexOf(".");
  return dot === -1 ? target : target.slice(dot + 1);
}

export interface AiApplyCostItem {
  label: string;
  status: string;
  responsibleParty: string | null;
}

export interface AiApplyTimelineStage {
  stageKey: string;
  durationMinDays: number | null;
  durationMaxDays: number | null;
  startsFromLabel: string | null;
  responsibleParty: string | null;
}

export interface AiApplyVariant {
  entityKey: string;
  completionStandard: string;
  variantLabel: string | null;
  priceMinCents: number | null;
  priceMaxCents: number | null;
  scopeSummary: string | null;
  costItems: AiApplyCostItem[];
  timeline: AiApplyTimelineStage[];
}

export interface AiApplyPayload {
  product: Record<string, unknown>;
  technicalSpecs: Record<string, unknown>;
  roomLayout: Array<Record<string, unknown>> | null;
  faq: Array<Record<string, unknown>> | null;
  variants: AiApplyVariant[];
}

export type AiApplyResult = { ok: true; payload: AiApplyPayload } | { ok: false; error: string };

function asString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function buildAiApplyPayload(decisions: HouseAiDecision[]): AiApplyResult {
  const product: Record<string, unknown> = {};
  const technicalSpecs: Record<string, unknown> = {};
  const roomsByKey = new Map<string, Record<string, unknown>>();
  const faqByKey = new Map<string, Record<string, unknown>>();
  const variantFieldsByKey = new Map<string, Record<string, unknown>>();
  const costItemsByVariant = new Map<string, Map<string, Record<string, unknown>>>();
  const timelineByVariant = new Map<string, Map<string, Record<string, unknown>>>();

  function ensureVariant(entityKey: string): Record<string, unknown> {
    const existing = variantFieldsByKey.get(entityKey);
    if (existing) return existing;
    const created: Record<string, unknown> = {};
    variantFieldsByKey.set(entityKey, created);
    return created;
  }

  for (const decision of decisions) {
    if (!APPLICABLE_DECISION_TYPES.has(decision.decisionType)) continue;
    const field = getHouseAiField(decision.fieldPath);

    if (decision.fieldPath.startsWith("variants[].costItems[].")) {
      if (!decision.entityKey || !decision.parentEntityKey) continue;
      ensureVariant(decision.parentEntityKey);
      const byKey = costItemsByVariant.get(decision.parentEntityKey) ?? new Map<string, Record<string, unknown>>();
      const item = byKey.get(decision.entityKey) ?? {};
      item[pathSuffix(decision.fieldPath)] = decision.finalValue;
      byKey.set(decision.entityKey, item);
      costItemsByVariant.set(decision.parentEntityKey, byKey);
      continue;
    }
    if (decision.fieldPath.startsWith("variants[].timeline[].")) {
      if (!decision.entityKey || !decision.parentEntityKey) continue;
      ensureVariant(decision.parentEntityKey);
      const byKey = timelineByVariant.get(decision.parentEntityKey) ?? new Map<string, Record<string, unknown>>();
      const item = byKey.get(decision.entityKey) ?? {};
      item[pathSuffix(decision.fieldPath)] = decision.finalValue;
      byKey.set(decision.entityKey, item);
      timelineByVariant.set(decision.parentEntityKey, byKey);
      continue;
    }
    if (decision.fieldPath.startsWith("variants[].")) {
      if (!decision.entityKey) continue;
      const variant = ensureVariant(decision.entityKey);
      variant[pathSuffix(decision.fieldPath)] = decision.finalValue;
      continue;
    }
    if (decision.fieldPath.startsWith("rooms[].")) {
      if (!decision.entityKey) continue;
      const room = roomsByKey.get(decision.entityKey) ?? {};
      room[pathSuffix(decision.fieldPath)] = decision.finalValue;
      roomsByKey.set(decision.entityKey, room);
      continue;
    }
    if (decision.fieldPath.startsWith("faq[].")) {
      if (!decision.entityKey) continue;
      const entry = faqByKey.get(decision.entityKey) ?? {};
      entry[pathSuffix(decision.fieldPath)] = decision.finalValue;
      faqByKey.set(decision.entityKey, entry);
      continue;
    }
    if (decision.fieldPath.startsWith("technical.")) {
      technicalSpecs[targetSuffix(field.target)] = decision.finalValue;
      continue;
    }
    if (decision.fieldPath.startsWith("translations.")) {
      // Pipeline tłumaczeń nie istnieje jeszcze — patrz komentarz na górze pliku.
      continue;
    }
    // product.*, logistics.*, compliance.* — proste kolumny na product.
    product[targetSuffix(field.target)] = decision.finalValue;
  }

  for (const parentKey of [...costItemsByVariant.keys(), ...timelineByVariant.keys()]) {
    if (!variantFieldsByKey.has(parentKey)) {
      return {
        ok: false,
        error: "Pozycja kosztowa lub etap harmonogramu wskazuje wariant, którego nie ma w tej sesji.",
      };
    }
  }

  const variants: AiApplyVariant[] = [];
  for (const [entityKey, fields] of variantFieldsByKey) {
    const completionStandard = asString(fields.completionStandard);
    if (!completionStandard) {
      return {
        ok: false,
        error: "Wybierz standard wykończenia dla każdego wariantu przed zastosowaniem wyniku.",
      };
    }
    const costItems = [...(costItemsByVariant.get(entityKey)?.values() ?? [])]
      .map((item) => ({ label: asString(item.label), status: asString(item.status), responsibleParty: asString(item.responsibleParty) }))
      .filter((item): item is AiApplyCostItem => item.label !== null && item.status !== null);
    const timeline = [...(timelineByVariant.get(entityKey)?.values() ?? [])]
      .map((item) => ({
        stageKey: asString(item.stageKey),
        durationMinDays: asNumber(item.durationMinDays),
        durationMaxDays: asNumber(item.durationMaxDays),
        startsFromLabel: asString(item.startsFromLabel),
        responsibleParty: asString(item.responsibleParty),
      }))
      .filter((item): item is AiApplyTimelineStage => item.stageKey !== null);

    variants.push({
      entityKey,
      completionStandard,
      variantLabel: asString(fields.variantLabel),
      priceMinCents: asNumber(fields.priceMinCents),
      priceMaxCents: asNumber(fields.priceMaxCents),
      scopeSummary: asString(fields.scopeSummary),
      costItems,
      timeline,
    });
  }

  // roomLayoutSchema/faqSchema (lib/product-room-layout.ts, lib/product-faq.ts)
  // walidują CAŁĄ tablicę naraz przez Zod .strict() — jeden wiersz bez
  // wymaganego pola (np. `id`, który te schematy zawsze wymagają, a AI nigdy
  // go nie proponuje) wywala WSZYSTKIE wiersze do pustej listy w edytorze
  // (app/[locale]/producer/panel/products/[id]/edit/page.tsx), nie tylko ten
  // wadliwy. Dlatego tu, przed zapisem, każdy wiersz dostaje `id` (stabilny
  // `entityKey` z sesji) i albo komplet wymaganych pól z rozsądnym
  // fallbackiem, albo jest w całości pomijany.
  const roomLayout: Array<Record<string, unknown>> = [];
  for (const [entityKey, fields] of roomsByKey) {
    const name = asString(fields.name);
    const areaM2 = asNumber(fields.areaM2);
    if (!name || areaM2 === null) continue;
    roomLayout.push({
      id: entityKey,
      name,
      areaM2,
      function: asString(fields.function) ?? name,
      isMezzanine: typeof fields.isMezzanine === "boolean" ? fields.isMezzanine : false,
    });
  }

  const faq: Array<Record<string, unknown>> = [];
  for (const [entityKey, fields] of faqByKey) {
    const question = asString(fields.question);
    const answer = asString(fields.answer);
    if (!question || !answer) continue;
    faq.push({ id: entityKey, question, answer });
  }

  return {
    ok: true,
    payload: {
      product,
      technicalSpecs,
      roomLayout: roomLayout.length > 0 ? roomLayout : null,
      faq: faq.length > 0 ? faq : null,
      variants,
    },
  };
}
