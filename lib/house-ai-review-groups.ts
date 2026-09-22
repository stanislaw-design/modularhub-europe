import type { HouseAiReviewField } from "@/lib/data/fixtures/house-ai-import";

export interface HouseAiVariantReviewGroup {
  entityKey: string;
  fields: HouseAiReviewField[];
}

export interface HouseAiRoomReviewGroup {
  entityKey: string;
  fields: HouseAiReviewField[];
}

const ROOM_FIELD_ORDER = [
  "rooms[].name",
  "rooms[].areaM2",
  "rooms[].function",
  "rooms[].isMezzanine",
] as const;

const VARIANT_FIELD_ORDER = [
  "variants[].variantLabel",
  "variants[].completionStandard",
  "variants[].priceMinCents",
  "variants[].priceMaxCents",
  "variants[].scopeSummary",
  "variants[].costItems[].label",
  "variants[].costItems[].status",
  "variants[].costItems[].responsibleParty",
  "variants[].timeline[].stageKey",
  "variants[].timeline[].durationMinDays",
  "variants[].timeline[].durationMaxDays",
  "variants[].timeline[].startsFromLabel",
  "variants[].timeline[].responsibleParty",
] as const;

const variantOrderByPath = new Map<string, number>(VARIANT_FIELD_ORDER.map((path, index) => [path, index]));
const roomOrderByPath = new Map<string, number>(ROOM_FIELD_ORDER.map((path, index) => [path, index]));

function roomOwnerKey(field: HouseAiReviewField): string | null {
  const candidate = field.candidates[0];
  return candidate && field.fieldPath.startsWith("rooms[].") ? candidate.entityKey : null;
}

function variantOwnerKey(field: HouseAiReviewField): string | null {
  const candidate = field.candidates[0];
  if (!candidate || !field.fieldPath.startsWith("variants[].")) return null;
  if (field.fieldPath.startsWith("variants[].costItems[].") || field.fieldPath.startsWith("variants[].timeline[].")) {
    return candidate.parentEntityKey;
  }
  return candidate.entityKey;
}

export function groupHouseAiReviewFields(fields: HouseAiReviewField[]): {
  standaloneFields: HouseAiReviewField[];
  roomGroups: HouseAiRoomReviewGroup[];
  variantGroups: HouseAiVariantReviewGroup[];
} {
  const standaloneFields: HouseAiReviewField[] = [];
  const rooms = new Map<string, HouseAiReviewField[]>();
  const variants = new Map<string, HouseAiReviewField[]>();

  for (const field of fields) {
    const roomKey = roomOwnerKey(field);
    if (roomKey) {
      const group = rooms.get(roomKey) ?? [];
      group.push(field);
      rooms.set(roomKey, group);
      continue;
    }
    const ownerKey = variantOwnerKey(field);
    if (!ownerKey) {
      standaloneFields.push(field);
      continue;
    }
    const group = variants.get(ownerKey) ?? [];
    group.push(field);
    variants.set(ownerKey, group);
  }

  return {
    standaloneFields,
    roomGroups: [...rooms.entries()].map(([entityKey, groupFields]) => ({
      entityKey,
      fields: groupFields.sort((left, right) =>
        (roomOrderByPath.get(left.fieldPath) ?? Number.MAX_SAFE_INTEGER)
        - (roomOrderByPath.get(right.fieldPath) ?? Number.MAX_SAFE_INTEGER)),
    })),
    variantGroups: [...variants.entries()].map(([entityKey, groupFields]) => ({
      entityKey,
      fields: groupFields.sort((left, right) =>
        (variantOrderByPath.get(left.fieldPath) ?? Number.MAX_SAFE_INTEGER)
        - (variantOrderByPath.get(right.fieldPath) ?? Number.MAX_SAFE_INTEGER)),
    })),
  };
}
