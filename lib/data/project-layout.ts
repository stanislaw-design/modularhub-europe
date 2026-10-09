import type { SelectedProductOptionsByGroup } from "./project-variants";
import type { FloorLevel } from "../product-room-layout";
import type { Project, ProjectDocument, RoomLayoutEntry } from "./types";

// Wersje układu wnętrz (spec 0069). Czyste funkcje nad już pobranymi danymi,
// bez importu klienta bazy, ten sam wzorzec co project-variants.ts: komponenty
// i testy mogą je wołać bez bootowania Neon.

/** Dane układu przypięte do opcji (product_option_layout), tłumaczenia już rozwiązane. */
export interface ProductOptionLayout {
  optionId: string;
  /** null w każdym polu poniżej znaczy: wartość z produktu. */
  floorAreaM2: number | null;
  rooms: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  roomLayout: RoomLayoutEntry[] | null;
  description: string | null;
}

/** Najmniejszy kształt grupy, jakiego potrzebują te funkcje (ProductOptionGroup go spełnia). */
export interface LayoutGroupShape {
  id: string;
  selectionType: "single" | "multi";
  options: { id: string; label?: string }[];
}

export interface ResolvedProjectLayout {
  /** Id wybranej opcji grupy niosącej układ, albo null gdy produkt nie ma takiej grupy. */
  layoutOptionId: string | null;
  layoutOptionLabel: string | null;
  rooms: RoomLayoutEntry[] | undefined;
  /** Metraż do pokazania zamiast sumy pomieszczeń. null: nie ma czego nadpisać, sekcja liczy sumę jak dotąd. */
  floorAreaM2: number | null;
  roomCount: number | null;
  bedroomCount: number | null;
  bathroomCount: number | null;
  description: string | null;
}

// Podpis rzutu potrzebuje krótkiej nazwy wersji ("Wersja 2"), a etykieta opcji bywa
// pełnym opisem ("Wersja 2: trzy sypialnie na poddaszu ..."): bierzemy tekst przed
// pierwszym dwukropkiem, o ile jest krótki, inaczej całą etykietę.
export function shortVersionName(label: string): string {
  const colon = label.indexOf(":");
  return colon > 0 && colon <= 40 ? label.slice(0, colon).trim() : label;
}

function findLayoutGroup(groups: LayoutGroupShape[], layouts: Map<string, ProductOptionLayout>): LayoutGroupShape | undefined {
  return groups.find(
    (group) => group.selectionType === "single" && group.options.some((option) => layouts.has(option.id)),
  );
}

// Wynikowy układ dla zaznaczonych opcji (AC-1, AC-4). Produkt bez opcji
// niosących układ zwraca dokładnie wartości produktu, więc strona wygląda jak
// przed tą zmianą (AC-3). Pole puste w danych opcji oznacza wartość z produktu.
export function resolveProjectLayout(input: {
  project: Pick<Project, "roomLayout" | "floorAreaM2" | "rooms" | "bedrooms" | "bathrooms">;
  groups: LayoutGroupShape[];
  layouts: Map<string, ProductOptionLayout>;
  selected: SelectedProductOptionsByGroup;
}): ResolvedProjectLayout {
  const { project, groups, layouts, selected } = input;
  const layoutGroup = findLayoutGroup(groups, layouts);
  const layoutOptionId = layoutGroup ? (selected.get(layoutGroup.id)?.[0] ?? null) : null;
  const layout = layoutOptionId ? layouts.get(layoutOptionId) : undefined;
  const layoutOptionLabel =
    layoutGroup && layoutOptionId
      ? shortVersionName(layoutGroup.options.find((option) => option.id === layoutOptionId)?.label ?? "") || null
      : null;

  const rooms = layout?.roomLayout && layout.roomLayout.length > 0 ? layout.roomLayout : project.roomLayout;
  return {
    layoutOptionId,
    layoutOptionLabel,
    rooms,
    floorAreaM2: layout ? (layout.floorAreaM2 ?? project.floorAreaM2) : null,
    roomCount: layout?.rooms ?? project.rooms,
    bedroomCount: layout?.bedrooms ?? project.bedrooms,
    bathroomCount: layout?.bathrooms ?? project.bathrooms,
    description: layout?.description && layout.description.trim().length > 0 ? layout.description : null,
  };
}

const FLOOR_ORDER: Record<FloorLevel, number> = { parter: 0, pietro: 1, poddasze: 2 };

// Rzuty do pokazania w zakładce Rzut (AC-2, AC-3). `documents` przychodzą już
// posortowane wg sort_order (resolveProductDocuments), a Array.sort jest
// stabilny, więc kolejność wewnątrz piętra zostaje sort_order.
//   1. tylko product_floor_plan, bez wariantu albo równy wybranemu,
//   2. rzut wskazujący opcję spoza `allowedOptionIds` (osierocony przez
//      odpięcie grupy albo ręczny zapis) jest pomijany,
//   3. jeśli wybrana opcja układu ma choć jeden własny rzut, tylko jej rzuty,
//      inaczej rzuty produktu bez przypisanej opcji. Nigdy obie grupy naraz.
export function selectFloorPlans(
  documents: ProjectDocument[],
  options: {
    selectedVariantId?: string;
    layoutOptionId?: string | null;
    allowedOptionIds: Iterable<string>;
  },
): ProjectDocument[] {
  const allowed = new Set(options.allowedOptionIds);
  const matching = documents.filter(
    (doc) =>
      doc.purpose === "product_floor_plan" &&
      (doc.productVariantId === undefined || doc.productVariantId === options.selectedVariantId) &&
      (doc.productOptionId === undefined || allowed.has(doc.productOptionId)),
  );
  const own = options.layoutOptionId
    ? matching.filter((doc) => doc.productOptionId === options.layoutOptionId)
    : [];
  const chosen = own.length > 0 ? own : matching.filter((doc) => doc.productOptionId === undefined);
  return [...chosen].sort(
    (a, b) => (a.floorLevel ? FLOOR_ORDER[a.floorLevel] : 3) - (b.floorLevel ? FLOOR_ORDER[b.floorLevel] : 3),
  );
}

// Jedna wspólna walidacja zapisu (AC-8), wołana przez import i każdą przyszłą
// ścieżkę zapisu. Rzuca z komunikatem, co jest nie tak:
//   - opcja z danymi układu musi należeć do grupy przypisanej do produktu,
//   - ta grupa musi być typu single,
//   - najwyżej jedna taka grupa na produkt,
//   - rzut może wskazywać tylko opcję grupy single przypisanej do produktu.
export function assertLayoutGroupRule(
  groups: LayoutGroupShape[],
  layoutOptionIds: Iterable<string>,
  floorPlanOptionIds: Iterable<string> = [],
): void {
  const groupByOptionId = new Map<string, LayoutGroupShape>();
  for (const group of groups) {
    for (const option of group.options) groupByOptionId.set(option.id, group);
  }

  const layoutGroupIds = new Set<string>();
  for (const optionId of layoutOptionIds) {
    const group = groupByOptionId.get(optionId);
    if (!group) {
      throw new Error(`Opcja ${optionId} z danymi układu nie należy do grupy przypisanej do produktu.`);
    }
    if (group.selectionType !== "single") {
      throw new Error(`Opcja ${optionId} z danymi układu jest w grupie ${group.id} typu multi, dozwolona tylko single.`);
    }
    layoutGroupIds.add(group.id);
  }
  if (layoutGroupIds.size > 1) {
    throw new Error(`Więcej niż jedna grupa single niesie dane układu: ${[...layoutGroupIds].join(", ")}.`);
  }

  for (const optionId of floorPlanOptionIds) {
    const group = groupByOptionId.get(optionId);
    if (!group) {
      throw new Error(`Rzut wskazuje opcję ${optionId} spoza grup przypisanych do produktu.`);
    }
    if (group.selectionType !== "single") {
      throw new Error(`Rzut wskazuje opcję ${optionId} z grupy multi, dozwolona tylko single.`);
    }
  }
}
