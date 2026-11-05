// Reguły przypisania opcji Letniskowo do modeli (spec 0081 AC-4 do AC-7), liczone względem tabeli klas z rationale.md.
import { describe, expect, it } from "vitest";
import { MODELS, type ModelSource } from "./letniskowo-catalog";
import { GROUPS, THRESHOLDS, groupsForModel, sizeClass } from "./letniskowo-options";

const model = (key: string): ModelSource => {
  const found = MODELS.find((m) => m.key === key);
  if (!found) throw new Error(`brak modelu ${key}`);
  return found;
};
const groupKeys = (key: string) => groupsForModel(model(key)).map((g) => g.key);
const classOfModel = (key: string, thresholds: readonly number[]) => sizeClass(model(key).areaM2, thresholds);

describe("sizeClass", () => {
  it("bierze najmniejszy próg większy lub równy powierzchni", () => {
    expect(sizeClass(34.88, THRESHOLDS.chassis)).toBe(35);
    expect(sizeClass(35, THRESHOLDS.chassis)).toBe(35);
    expect(sizeClass(39.98, THRESHOLDS.chassis)).toBe(50);
    expect(sizeClass(50.95, THRESHOLDS.chassis)).toBe(70);
  });
  it("zwraca null powyżej największego progu", () => {
    expect(sizeClass(116.81, THRESHOLDS.chassis)).toBeNull();
  });
});

describe("klasy rozmiaru z rationale.md", () => {
  it.each([
    ["zen", 35, 40, 50],
    ["bali", 35, 40, 50],
    ["bremen", 50, 40, 50],
    ["palermo", 50, 50, 50],
    ["riviera", 50, 50, 50],
    ["nicea", 70, 70, 70],
    ["elba", 70, 70, 70],
    ["sylt", 70, 70, 70],
    ["sky-light", 50, 50, 50],
    ["silver-moon", 70, 70, 70],
  ])("%s: podwozie %i, ogrzewanie %i, ściana %i", (key, chassis, floor, wall) => {
    expect(classOfModel(key, THRESHOLDS.chassis)).toBe(chassis);
    expect(classOfModel(key, THRESHOLDS.floor)).toBe(floor);
    expect(classOfModel(key, THRESHOLDS.wall)).toBe(wall);
  });
});

describe("izolacja (AC-5)", () => {
  it("Zen, Bali, Malibu i Palermo nie mają opcji grubości izolacji", () => {
    for (const key of ["zen", "bali", "malibu", "palermo"]) {
      expect(groupKeys(key).some((k) => k.startsWith("pur-"))).toBe(false);
    }
  });
  it("Premium i Vario nie mają opcji grubości izolacji", () => {
    for (const key of ["sky-light", "moon-light", "vario-2br"]) {
      expect(groupKeys(key).some((k) => k.startsWith("pur-"))).toBe(false);
    }
  });
  it("Elba dostaje 18 cm w klasie 70 za 3 452 €, Riviera w klasie 50 za 2 333 €", () => {
    expect(groupKeys("elba")).toContain("pur-70");
    expect(groupKeys("riviera")).toContain("pur-50");
    const price = (groupKey: string) => GROUPS.find((g) => g.key === groupKey)!.options.find((o) => o.key === "18")!.priceEur;
    expect(price("pur-70")).toBe(3452);
    expect(price("pur-50")).toBe(2333);
  });
});

describe("przypisanie do linii (AC-4, AC-7)", () => {
  it("każdy model ma dokładnie jedną grupę podwozia, poza Vario, które nie ma żadnej", () => {
    for (const m of MODELS) {
      const count = groupKeys(m.key).filter((k) => /^chassis-(35|50|70)$/.test(k)).length;
      expect(count).toBe(m.line === "vario" ? 0 : 1);
    }
  });
  it("ogrzewanie podłogowe i klimatyzacja pełna tylko w Comfort (Premium i Vario mają to w standardzie)", () => {
    for (const m of MODELS) {
      const keys = groupKeys(m.key);
      const comfort = m.line === "comfort";
      expect(keys.some((k) => k.startsWith("floor-heating-"))).toBe(comfort);
      expect(keys.includes("ac-comfort")).toBe(comfort);
      expect(keys.includes("ac-extra")).toBe(!comfort);
    }
  });
  it("Vario dostaje wyłącznie opcje niezależne od metrażu i linii", () => {
    const allowed = new Set(["supports-ff", "supports-mp", "chassis-equipment-mp", "construction-extras", "installation-extras", "alarm-cameras", "appliances", "tables", "headboard", "interior-extras", "ac-extra"]);
    for (const key of ["vario-2br", "vario-3br"]) {
      for (const k of groupKeys(key)) expect(allowed.has(k), `${key} nie powinno mieć ${k}`).toBe(true);
    }
  });
  it("opcje pokoju i łóżka piętrowego tylko dla modeli z pokojem", () => {
    for (const key of ["bremen", "zen", "sky-light"]) {
      const keys = groupKeys(key);
      expect(keys).not.toContain("bunk-bed");
      expect(keys).not.toContain("room-comfort");
      expect(keys).not.toContain("room-premium");
    }
    expect(groupKeys("bali")).toContain("bunk-bed");
    expect(groupKeys("silver-moon")).toContain("room-premium");
  });
  it("kąt dachu Premium tylko dla czterech modeli Premium, bez Vario", () => {
    expect(groupKeys("moon-light")).toContain("roof-angle-premium");
    expect(groupKeys("vario-3br")).not.toContain("roof-angle-premium");
    expect(groupKeys("bali")).not.toContain("roof-angle-premium");
  });
});

describe("spójność danych opcji", () => {
  it("grupy single zaczynają od darmowego standardu", () => {
    for (const g of GROUPS.filter((x) => x.selectionType === "single")) expect(g.options[0].priceEur).toBe(0);
  });
  it("klimatyzacja: pełne instalacje i przyrosty zgadzają się z cennikiem (1 248 + 1 747 = 2 995, 1 248 + 3 245 = 4 493)", () => {
    const full = GROUPS.find((g) => g.key === "ac-comfort")!.options.map((o) => o.priceEur);
    const extra = GROUPS.find((g) => g.key === "ac-extra")!.options.map((o) => o.priceEur);
    expect(1248 + extra[1]).toBe(full[2]);
    expect(1248 + extra[2]).toBe(full[3]);
  });
  it("klucze grup i opcji są unikalne", () => {
    expect(new Set(GROUPS.map((g) => g.key)).size).toBe(GROUPS.length);
    for (const g of GROUPS) expect(new Set(g.options.map((o) => o.key)).size).toBe(g.options.length);
  });
  it("suma Bali z klimatyzacją 1 split daje 43 900 + 1 248", () => {
    const bali = model("bali");
    const ac = GROUPS.find((g) => g.key === "ac-comfort")!;
    expect(ac.applies(bali)).toBe(true);
    expect(bali.priceEur + ac.options.find((o) => o.key === "1")!.priceEur).toBe(45148);
  });
});
