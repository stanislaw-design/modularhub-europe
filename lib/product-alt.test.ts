import { describe, expect, it } from "vitest";
import { getProductAltKind, getProductAltSubject, getProductModelName } from "./product-alt";

describe("getProductAltKind", () => {
  it("maps family and spa subcategory to the alt noun", () => {
    expect(getProductAltKind({ family: "dom", spaSubcategory: null })).toBe("house");
    expect(getProductAltKind({ family: "spa-modulowe", spaSubcategory: "sauna" })).toBe("sauna");
    expect(getProductAltKind({ family: "spa-modulowe", spaSubcategory: "jacuzzi" })).toBe("spa");
    expect(getProductAltKind({ family: "kontenery-modulowe", spaSubcategory: null })).toBe("container");
    expect(getProductAltKind({ family: "outdoor-tv", spaSubcategory: null })).toBe("outdoorTv");
  });
});

describe("getProductModelName", () => {
  it("strips a leading producer name", () => {
    expect(getProductModelName("Wooden Dream House Loki", "Wooden Dream House")).toBe("Loki");
  });

  it("keeps the name when the producer is not a prefix or would leave it empty", () => {
    expect(getProductModelName("Relax 550", "Kora")).toBe("Relax 550");
    expect(getProductModelName("Kora", "Kora")).toBe("Kora");
  });
});

describe("getProductAltSubject", () => {
  it("builds 'Sauna ogrodowa Loki – Wooden Dream House' for a sauna", async () => {
    const subject = await getProductAltSubject({
      family: "spa-modulowe",
      spaSubcategory: "sauna",
      name: "Wooden Dream House Loki",
      producerName: "Wooden Dream House",
    });
    expect(subject).toBe("Sauna ogrodowa Loki – Wooden Dream House");
  });

  it("keeps 'Dom modułowy' for a house", async () => {
    const subject = await getProductAltSubject({
      family: "dom",
      spaSubcategory: null,
      name: "Modulor Family 90",
      producerName: "Modulor",
    });
    expect(subject).toBe("Dom modułowy Family 90 – Modulor");
  });
});
