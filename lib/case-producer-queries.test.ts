import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Spec 0048 Key invariants: baza nie jest bramką, więc moduł zapytań
// producenta ma nie sięgać po kolumny osobowe sprawy. Test statyczny łapie
// przypadkowe dopisanie takiej kolumny do listy selekcji.
const FORBIDDEN_COLUMNS = [
  "inquiry.name",
  "inquiry.email",
  "inquiry.phone",
  "inquiry.plotStreet",
  "inquiry.plotPostalCode",
  "inquiry.plotCity",
  "inquiry.clientMessage",
  "inquiry.clientId",
];

describe("lib/case-producer-queries.ts: brak danych osobowych klienta", () => {
  const source = readFileSync(join(__dirname, "case-producer-queries.ts"), "utf8");
  // Komentarze wyjaśniają zakaz i wymieniają nazwy kolumn, więc pomijamy je.
  const code = source
    .split("\n")
    .filter((line) => !line.trim().startsWith("//"))
    .join("\n");

  it.each(FORBIDDEN_COLUMNS)("nie odwołuje się do %s", (column) => {
    expect(code).not.toContain(column);
  });

  it("nie używa select bez listy kolumn", () => {
    expect(code).not.toMatch(/\.select\(\s*\)/);
  });
});
