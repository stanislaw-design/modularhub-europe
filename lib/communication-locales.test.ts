import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { COMMUNICATION_LOCALES } from "@/lib/communication-locales";

// Regresja spec 0077 C: komponent kliencki importuje tę listę, więc plik nie może mieć importów
// (inaczej klient bazy trafia do przeglądarki i strona ustawień pada przy hydracji).
describe("communication-locales", () => {
  it("ma cztery języki", () => {
    expect([...COMMUNICATION_LOCALES]).toEqual(["pl", "en", "de", "nl"]);
  });

  it("nie importuje niczego", () => {
    const source = readFileSync("lib/communication-locales.ts", "utf8");
    expect(source).not.toMatch(/^\s*import\s/m);
  });

  it("komponent formularza nie importuje modułu z bazą", () => {
    const form = readFileSync("components/producent/CommunicationLocaleForm.tsx", "utf8");
    expect(form).not.toContain("@/lib/producer-communication-locale\"");
  });
});
