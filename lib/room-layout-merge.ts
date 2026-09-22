import type { RoomLayoutRow } from "./product-room-layout";
import type { RecognizedRoom } from "./producer-room-layout-actions";

// Scalanie wyniku recognizeRoomLayout z listą już wpisaną w kreatorze (spec
// 0050 AC-6, AC-7): czysta funkcja, bez zależności od React/DB, testowana
// osobno od UI. "needs-check" to trzeci, osobny stan poza low/high z AC-6 —
// dopasowana pozycja o innej wartości nigdy nie jest cicho nadpisywana,
// dostaje tylko ten znacznik do ręcznego sprawdzenia przez producenta.
export type RoomLayoutConfidence = "low" | "high" | "needs-check";

export interface MergeRecognizedRoomsResult {
  rows: RoomLayoutRow[];
  // Tylko dla id-ów faktycznie dotkniętych tym scaleniem (nowe albo
  // "do sprawdzenia"); pozycje niedotknięte nie mają wpisu.
  confidenceById: Record<string, RoomLayoutConfidence>;
}

// Polskie znaki spoza NFD (ą/ć/ę/ł/ń/ś/ź/ż nie dekomponują się na literę plus
// diakrytyk łączący, w odróżnieniu od np. ó): rozpoznawanie może je czasem
// zgubić (OCR/AI), więc dopasowanie nazw je składa ręcznie po NFD.
const POLISH_FOLD_MAP: Record<string, string> = {
  ą: "a",
  ć: "c",
  ę: "e",
  ł: "l",
  ń: "n",
  ó: "o",
  ś: "s",
  ź: "z",
  ż: "z",
};

function normalizeRoomName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[ąćęłńóśźż]/g, (char) => POLISH_FOLD_MAP[char] ?? char);
}

// "Zbliżona powierzchnia" (AC-7): tolerancja 15% (minimum 1 m²) — nigdzie w
// spec nie jest podana liczbowo, przyjęte świadomie jako rozsądny margines
// błędu odczytu z rzutu, nie jako twardy kontrakt.
function isSimilarArea(a: number, b: number): boolean {
  return Math.abs(a - b) <= Math.max(1, Math.min(a, b) * 0.15);
}

export function mergeRecognizedRooms(existing: RoomLayoutRow[], recognized: RecognizedRoom[]): MergeRecognizedRoomsResult {
  const rows = [...existing];
  const confidenceById: Record<string, RoomLayoutConfidence> = {};

  for (const room of recognized) {
    const matchIndex = rows.findIndex(
      (row) => normalizeRoomName(row.name) === normalizeRoomName(room.name) && isSimilarArea(row.areaM2, room.areaM2),
    );

    if (matchIndex === -1) {
      const id = crypto.randomUUID();
      rows.push({ id, name: room.name, areaM2: room.areaM2, function: "", floorLevel: room.floorLevel });
      confidenceById[id] = room.confidence;
      continue;
    }

    // Powierzchnia dopasowana przez isSimilarArea wyżej z definicji jest
    // "wystarczająco bliska" (szum pomiaru z rzutu), więc tylko floorLevel —
    // pole kategoryczne, nie przybliżone — liczy się jako realna różnica
    // warta znacznika "do sprawdzenia".
    const existingRow = rows[matchIndex]!;
    if (existingRow.floorLevel !== room.floorLevel) confidenceById[existingRow.id] = "needs-check";
  }

  return { rows, confidenceById };
}
