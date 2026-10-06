import { eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db/client";
import { referenceTextTranslation } from "@/lib/db/schema";
import { loadReferenceTranslator } from "./reference-text";

// Spec 0067 AC-5, AC-6, AC-7: slownik po dokladnym polskim tekscie. Dev DB.
describe.skipIf(!process.env.DATABASE_URL)("lib/data/reference-text (spec 0067)", () => {
  const key = `Test powodu ${crypto.randomUUID()}`;
  const blankKey = `Pusty ${crypto.randomUUID()}`;

  beforeAll(async () => {
    await db.insert(referenceTextTranslation).values([
      { sourcePl: key, locale: "en", translated: "Reason test" },
      { sourcePl: blankKey, locale: "en", translated: "   " },
    ]);
  });

  afterAll(async () => {
    await db.delete(referenceTextTranslation).where(inArray(referenceTextTranslation.sourcePl, [key, blankKey]));
  });

  it("translates a known text and falls back to Polish for unknown or blank translations", async () => {
    const translate = await loadReferenceTranslator([key, blankKey, "Brak wpisu"], "en");
    expect(translate(key)).toBe("Reason test");
    expect(translate(blankKey)).toBe(blankKey);
    expect(translate("Brak wpisu")).toBe("Brak wpisu");
  });

  it("returns the source for a locale without a row and for pl without querying", async () => {
    expect((await loadReferenceTranslator([key], "de"))(key)).toBe(key);
    expect((await loadReferenceTranslator([key], "pl"))(key)).toBe(key);
  });

  it("matches the exact Polish text only", async () => {
    const translate = await loadReferenceTranslator([key.toLowerCase()], "en");
    expect(translate(key.toLowerCase())).toBe(key.toLowerCase());
    const rows = await db.select().from(referenceTextTranslation).where(eq(referenceTextTranslation.sourcePl, key));
    expect(rows).toHaveLength(1);
  });
});
