import { describe, expect, it } from "vitest";
import { resolveInquiryFamily } from "./inquiry-family";

describe("resolveInquiryFamily (spec 0084 AC-2)", () => {
  it("zwraca dom, gdy którakolwiek pozycja jest domem", () => {
    expect(resolveInquiryFamily(["spa-modulowe", "dom"])).toBe("dom");
    expect(resolveInquiryFamily(["outdoor-tv", "kontenery-modulowe", "dom"])).toBe("dom");
  });

  it("w przeciwnym razie zwraca rodzinę pierwszego produktu", () => {
    expect(resolveInquiryFamily(["spa-modulowe"])).toBe("spa-modulowe");
    expect(resolveInquiryFamily(["kontenery-modulowe", "outdoor-tv"])).toBe("kontenery-modulowe");
  });

  it("pusta lista to dom (jak przed spec 0084)", () => {
    expect(resolveInquiryFamily([])).toBe("dom");
  });
});

import { familyCardKeys } from "./cases/start-cards";

describe("familyCardKeys (spec 0084)", () => {
  it("dom dostaje sześć kart w dzisiejszej kolejności", () => {
    expect(familyCardKeys("dom")).toEqual(["zakres_uslug", "budzet", "termin", "gotowosc_dzialki", "ogrzewanie", "standard_wykonczenia"]);
  });

  it("pozostałe rodziny dostają tylko swoje trzy karty", () => {
    expect(familyCardKeys("spa-modulowe")).toEqual(["miejsce_ustawienia", "zasilanie_400v", "termin"]);
    expect(familyCardKeys("kontenery-modulowe")).toEqual(["przylacza", "liczba_sztuk", "termin"]);
    expect(familyCardKeys("outdoor-tv")).toEqual(["miejsce_montazu_tv", "liczba_sztuk", "termin"]);
  });
});
