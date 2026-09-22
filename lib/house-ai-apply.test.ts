import { describe, expect, it } from "vitest";
import { buildAiApplyPayload } from "./house-ai-apply";
import type { HouseAiDecision } from "./house-ai-schemas";

function decision(overrides: Partial<HouseAiDecision> & Pick<HouseAiDecision, "fieldPath" | "finalValue" | "decisionType">): HouseAiDecision {
  return { entityKey: null, parentEntityKey: null, selectedCandidateId: null, version: 1, ...overrides };
}

describe("buildAiApplyPayload", () => {
  it("routes standalone product, logistics and technical fields to the right buckets", () => {
    const result = buildAiApplyPayload([
      decision({ fieldPath: "product.name", finalValue: "Dom Nordic 120", decisionType: "accepted" }),
      decision({ fieldPath: "product.floorAreaM2", finalValue: 120, decisionType: "manual" }),
      decision({ fieldPath: "logistics.installationWarrantyYears", finalValue: 5, decisionType: "accepted" }),
      decision({ fieldPath: "compliance.simplifiedPermitEligible", finalValue: false, decisionType: "accepted" }),
      decision({ fieldPath: "technical.heatSource", finalValue: "pompa-ciepla", decisionType: "accepted" }),
    ]);

    expect(result).toMatchObject({
      ok: true,
      payload: {
        product: {
          name: "Dom Nordic 120",
          floor_area_m2: 120,
          installation_warranty_years: 5,
          simplified_permit_eligible: false,
        },
        technicalSpecs: { heatSource: "pompa-ciepla" },
      },
    });
  });

  it("ignores rejected, not_applicable and keep_current decisions", () => {
    const result = buildAiApplyPayload([
      decision({ fieldPath: "product.name", finalValue: "Ignorowane", decisionType: "rejected" }),
      decision({ fieldPath: "product.description", finalValue: "Też ignorowane", decisionType: "not_applicable" }),
      decision({ fieldPath: "product.bedrooms", finalValue: 3, decisionType: "keep_current" }),
    ]);

    expect(result).toMatchObject({ ok: true, payload: { product: {} } });
  });

  it("groups room and FAQ decisions by entity_key, giving each row a stable id matching the DB schema", () => {
    const result = buildAiApplyPayload([
      decision({ fieldPath: "rooms[].name", entityKey: "room-1", finalValue: "Salon", decisionType: "accepted" }),
      decision({ fieldPath: "rooms[].areaM2", entityKey: "room-1", finalValue: 28, decisionType: "accepted" }),
      decision({ fieldPath: "rooms[].function", entityKey: "room-1", finalValue: "Wypoczynek", decisionType: "accepted" }),
      decision({ fieldPath: "rooms[].isMezzanine", entityKey: "room-1", finalValue: true, decisionType: "accepted" }),
      decision({ fieldPath: "faq[].question", entityKey: "faq-1", finalValue: "Czy dom ma piwnicę?", decisionType: "accepted" }),
      decision({ fieldPath: "faq[].answer", entityKey: "faq-1", finalValue: "Nie.", decisionType: "accepted" }),
    ]);

    expect(result).toMatchObject({
      ok: true,
      payload: {
        roomLayout: [{ id: "room-1", name: "Salon", areaM2: 28, function: "Wypoczynek", isMezzanine: true }],
        faq: [{ id: "faq-1", question: "Czy dom ma piwnicę?", answer: "Nie." }],
      },
    });
  });

  it("fills missing function and isMezzanine with a safe fallback instead of dropping the room", () => {
    const result = buildAiApplyPayload([
      decision({ fieldPath: "rooms[].name", entityKey: "room-1", finalValue: "Kuchnia", decisionType: "accepted" }),
      decision({ fieldPath: "rooms[].areaM2", entityKey: "room-1", finalValue: 13.24, decisionType: "accepted" }),
    ]);

    expect(result).toMatchObject({
      ok: true,
      payload: { roomLayout: [{ id: "room-1", name: "Kuchnia", areaM2: 13.24, function: "Kuchnia", isMezzanine: false }] },
    });
  });

  it("drops a room that is missing its required name or area, without discarding the other rooms", () => {
    const result = buildAiApplyPayload([
      decision({ fieldPath: "rooms[].areaM2", entityKey: "room-1", finalValue: 36.65, decisionType: "accepted" }),
      decision({ fieldPath: "rooms[].name", entityKey: "room-2", finalValue: "Garaż", decisionType: "accepted" }),
      decision({ fieldPath: "rooms[].areaM2", entityKey: "room-2", finalValue: 44.45, decisionType: "accepted" }),
    ]);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.payload.roomLayout).toEqual([{ id: "room-2", name: "Garaż", areaM2: 44.45, function: "Garaż", isMezzanine: false }]);
  });

  it("drops a FAQ entry missing its question or answer", () => {
    const result = buildAiApplyPayload([
      decision({ fieldPath: "faq[].question", entityKey: "faq-1", finalValue: "Czy jest garaż?", decisionType: "accepted" }),
    ]);

    expect(result).toMatchObject({ ok: true, payload: { faq: null } });
  });

  it("returns null for room layout and FAQ when nothing was decided", () => {
    const result = buildAiApplyPayload([decision({ fieldPath: "product.name", finalValue: "X", decisionType: "accepted" })]);
    expect(result).toMatchObject({ ok: true, payload: { roomLayout: null, faq: null } });
  });

  it("builds a variant with its cost items and timeline stages keyed by parent_entity_key", () => {
    const result = buildAiApplyPayload([
      decision({ fieldPath: "variants[].completionStandard", entityKey: "variant-a", finalValue: "deweloperski", decisionType: "accepted" }),
      decision({ fieldPath: "variants[].variantLabel", entityKey: "variant-a", finalValue: "BASIC", decisionType: "accepted" }),
      decision({ fieldPath: "variants[].priceMinCents", entityKey: "variant-a", finalValue: 74605500, decisionType: "accepted" }),
      decision({ fieldPath: "variants[].costItems[].label", entityKey: "cost-1", parentEntityKey: "variant-a", finalValue: "Fundament", decisionType: "accepted" }),
      decision({ fieldPath: "variants[].costItems[].status", entityKey: "cost-1", parentEntityKey: "variant-a", finalValue: "included", decisionType: "accepted" }),
      decision({ fieldPath: "variants[].timeline[].stageKey", entityKey: "stage-1", parentEntityKey: "variant-a", finalValue: "production", decisionType: "accepted" }),
      decision({ fieldPath: "variants[].timeline[].durationMinDays", entityKey: "stage-1", parentEntityKey: "variant-a", finalValue: 30, decisionType: "accepted" }),
    ]);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.payload.variants).toEqual([
      {
        entityKey: "variant-a",
        completionStandard: "deweloperski",
        variantLabel: "BASIC",
        priceMinCents: 74605500,
        priceMaxCents: null,
        scopeSummary: null,
        costItems: [{ label: "Fundament", status: "included", responsibleParty: null }],
        timeline: [{ stageKey: "production", durationMinDays: 30, durationMaxDays: null, startsFromLabel: null, responsibleParty: null }],
      },
    ]);
  });

  it("fails when a cost item's parent_entity_key does not match any decided variant", () => {
    const result = buildAiApplyPayload([
      decision({ fieldPath: "variants[].costItems[].label", entityKey: "cost-1", parentEntityKey: "orphan-variant", finalValue: "Fundament", decisionType: "accepted" }),
      decision({ fieldPath: "variants[].costItems[].status", entityKey: "cost-1", parentEntityKey: "orphan-variant", finalValue: "included", decisionType: "accepted" }),
    ]);

    expect(result).toMatchObject({ ok: false, error: expect.stringContaining("wariant") });
  });

  it("fails when a decided variant has no completion standard", () => {
    const result = buildAiApplyPayload([
      decision({ fieldPath: "variants[].priceMinCents", entityKey: "variant-a", finalValue: 100, decisionType: "accepted" }),
    ]);

    expect(result).toMatchObject({ ok: false, error: expect.stringContaining("standard wykończenia") });
  });

  it("drops a cost item that is missing its required label or status", () => {
    const result = buildAiApplyPayload([
      decision({ fieldPath: "variants[].completionStandard", entityKey: "variant-a", finalValue: "deweloperski", decisionType: "accepted" }),
      decision({ fieldPath: "variants[].costItems[].responsibleParty", entityKey: "cost-1", parentEntityKey: "variant-a", finalValue: "producent", decisionType: "accepted" }),
    ]);

    expect(result).toMatchObject({ ok: true, payload: { variants: [{ costItems: [] }] } });
  });
});
