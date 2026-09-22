import { describe, expect, it } from "vitest";
import { mergeRecognizedRooms } from "./room-layout-merge";

describe("mergeRecognizedRooms", () => {
  it("adds an unmatched recognized room as a new row with its confidence", () => {
    const result = mergeRecognizedRooms([], [{ name: "Salon", areaM2: 28, floorLevel: "parter", confidence: "high" }]);

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toMatchObject({ name: "Salon", areaM2: 28, floorLevel: "parter", function: "" });
    expect(result.confidenceById[result.rows[0]!.id]).toBe("high");
  });

  it("matches an existing row by normalized name and similar area without overwriting it", () => {
    const existing = [{ id: "a", name: "salon", areaM2: 27.5, function: "Dzienna", floorLevel: "parter" as const }];
    const result = mergeRecognizedRooms(existing, [{ name: "Salon", areaM2: 28, floorLevel: "parter", confidence: "high" }]);

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0]).toEqual(existing[0]); // untouched: value not silently overwritten
    expect(result.confidenceById["a"]).toBeUndefined(); // no conflict, no badge needed
  });

  it("flags a matched row as needs-check when the recognized floor level differs, without changing it", () => {
    const existing = [{ id: "a", name: "Salon", areaM2: 27.5, function: "Dzienna", floorLevel: "parter" as const }];
    const result = mergeRecognizedRooms(existing, [{ name: "Salon", areaM2: 28, floorLevel: "pietro", confidence: "high" }]);

    expect(result.rows).toEqual(existing); // preserved as-is
    expect(result.confidenceById["a"]).toBe("needs-check");
  });

  it("is idempotent: running the same recognition twice never duplicates an already-accepted room", () => {
    const first = mergeRecognizedRooms([], [{ name: "Salon", areaM2: 28, floorLevel: "parter", confidence: "high" }]);
    const second = mergeRecognizedRooms(first.rows, [{ name: "Salon", areaM2: 28, floorLevel: "parter", confidence: "high" }]);

    expect(second.rows).toHaveLength(1);
  });

  it("matches names ignoring case, whitespace and diacritics", () => {
    const existing = [{ id: "a", name: "Sypialnia główna", areaM2: 15, function: "Nocna", floorLevel: "pietro" as const }];
    const result = mergeRecognizedRooms(existing, [
      { name: "  sypialnia GLOWNA  ", areaM2: 15.5, floorLevel: "pietro", confidence: "low" },
    ]);

    expect(result.rows).toEqual(existing);
    expect(result.confidenceById["a"]).toBeUndefined();
  });

  it("treats a room with a very different area as unmatched, adding it as new", () => {
    const existing = [{ id: "a", name: "Salon", areaM2: 27.5, function: "Dzienna", floorLevel: "parter" as const }];
    const result = mergeRecognizedRooms(existing, [{ name: "Salon", areaM2: 60, floorLevel: "parter", confidence: "high" }]);

    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]).toEqual(existing[0]);
  });
});
