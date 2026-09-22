import { describe, expect, it } from "vitest";
import { roomLayoutRowSchema } from "./product-room-layout";

// Spec 0050 AC-8: floorLevel zastępuje isMezzanine, migracja jednorazowa na
// granicy aplikacji (dokładnie w tym schemacie), zamiast migracji bazy.
describe("roomLayoutRowSchema", () => {
  const base = { id: "a", name: "Salon", areaM2: 28, function: "Dzienna" };

  it("passes floorLevel through unchanged when already present", () => {
    const result = roomLayoutRowSchema.parse({ ...base, floorLevel: "pietro" });
    expect(result).toEqual({ ...base, floorLevel: "pietro" });
  });

  it("migrates isMezzanine: true to floorLevel: poddasze, dropping isMezzanine", () => {
    const result = roomLayoutRowSchema.parse({ ...base, isMezzanine: true });
    expect(result).toEqual({ ...base, floorLevel: "poddasze" });
    expect(result).not.toHaveProperty("isMezzanine");
  });

  it("migrates isMezzanine: false (or absent) to floorLevel: parter", () => {
    expect(roomLayoutRowSchema.parse({ ...base, isMezzanine: false })).toEqual({ ...base, floorLevel: "parter" });
    expect(roomLayoutRowSchema.parse(base)).toEqual({ ...base, floorLevel: "parter" });
  });

  it("floorLevel wins if both floorLevel and isMezzanine are present", () => {
    const result = roomLayoutRowSchema.parse({ ...base, floorLevel: "pietro", isMezzanine: true });
    expect(result.floorLevel).toBe("pietro");
  });

  it("rejects an unknown floorLevel value", () => {
    expect(() => roomLayoutRowSchema.parse({ ...base, floorLevel: "strych" })).toThrow();
  });

  it("still rejects unknown keys (.strict())", () => {
    expect(() => roomLayoutRowSchema.parse({ ...base, extra: "nope" })).toThrow();
  });
});
