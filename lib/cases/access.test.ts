import { describe, expect, it, vi } from "vitest";

// access.ts importuje klienta bazy na poziomie modułu, a ten rzuca bez
// DATABASE_URL. Testujemy wyłącznie czystą funkcję decyzyjną.
vi.mock("@/lib/db/client", () => ({ db: {} }));

import { evaluateCaseAccess, type CaseAccessContext, type CaseActor } from "./access";

const INQUIRY_ID = "inq-1";
const OWNER: CaseActor = { kind: "client", userId: "u-owner", clientId: "c-owner" };
const STRANGER: CaseActor = { kind: "client", userId: "u-other", clientId: "c-other" };
const ADVISOR: CaseActor = { kind: "advisor", userId: "u-admin" };
const PRODUCER_A: CaseActor = { kind: "producer", userId: "u-pa", producerId: "p-a" };
const PRODUCER_B: CaseActor = { kind: "producer", userId: "u-pb", producerId: "p-b" };

function caseContext(overrides: Partial<CaseAccessContext["inquiry"]> = {}): CaseAccessContext["inquiry"] {
  return { id: INQUIRY_ID, clientId: "c-owner", stage: "rozmowa", finalistProducerId: null, ...overrides };
}

function channelOf(kind: "klient_doradca" | "producent_doradca" | "wspolny", producerId: string | null = null, id = "ch-1") {
  return { id, inquiryId: INQUIRY_ID, kind, producerId };
}

describe("evaluateCaseAccess", () => {
  describe("klient", () => {
    it("ma dostęp do własnej sprawy i kanału klient_doradca", () => {
      expect(evaluateCaseAccess(OWNER, { inquiry: caseContext() })).toMatchObject({ role: "client", channelId: null });
      expect(evaluateCaseAccess(OWNER, { inquiry: caseContext(), channel: channelOf("klient_doradca") })).toMatchObject({
        role: "client",
        channelId: "ch-1",
      });
    });

    it("nigdy nie czyta kanału producent_doradca, nawet własnej sprawy (AC-8)", () => {
      expect(evaluateCaseAccess(OWNER, { inquiry: caseContext(), channel: channelOf("producent_doradca", "p-a") })).toBeNull();
    });

    it("czyta kanał wspólny własnej sprawy", () => {
      const context = { inquiry: caseContext({ stage: "wspolne_ustalenia", finalistProducerId: "p-a" }), channel: channelOf("wspolny", "p-a") };
      expect(evaluateCaseAccess(OWNER, context)).not.toBeNull();
    });

    it("nie ma dostępu do cudzej sprawy ani cudzego kanału", () => {
      expect(evaluateCaseAccess(STRANGER, { inquiry: caseContext() })).toBeNull();
      expect(evaluateCaseAccess(STRANGER, { inquiry: caseContext(), channel: channelOf("klient_doradca") })).toBeNull();
    });
  });

  describe("doradca", () => {
    it("widzi sprawę i każdy rodzaj kanału", () => {
      expect(evaluateCaseAccess(ADVISOR, { inquiry: caseContext() })).not.toBeNull();
      for (const kind of ["klient_doradca", "producent_doradca", "wspolny"] as const) {
        const producerId = kind === "klient_doradca" ? null : "p-a";
        expect(evaluateCaseAccess(ADVISOR, { inquiry: caseContext(), channel: channelOf(kind, producerId) })).not.toBeNull();
      }
    });
  });

  describe("producent", () => {
    it("bez zaproszenia nie ma dostępu do samej sprawy", () => {
      expect(evaluateCaseAccess(PRODUCER_A, { inquiry: caseContext() })).toBeNull();
    });

    it("czyta wyłącznie własny kanał producent_doradca", () => {
      const own = { inquiry: caseContext(), channel: channelOf("producent_doradca", "p-a") };
      expect(evaluateCaseAccess(PRODUCER_A, own)).not.toBeNull();
      expect(evaluateCaseAccess(PRODUCER_B, own)).toBeNull();
    });

    it("nie czyta kanału klient_doradca (AC-8, AC-9)", () => {
      expect(evaluateCaseAccess(PRODUCER_A, { inquiry: caseContext(), channel: channelOf("klient_doradca") })).toBeNull();
    });

    it("kanał wspólny czyta tylko finalista", () => {
      const context = {
        inquiry: caseContext({ stage: "wspolne_ustalenia", finalistProducerId: "p-a" }),
        channel: channelOf("wspolny", "p-a"),
      };
      expect(evaluateCaseAccess(PRODUCER_A, context)).not.toBeNull();
      expect(evaluateCaseAccess(PRODUCER_B, context)).toBeNull();
    });

    it("kanał wspólny z ustawionym producerId, ale bez wskazanego finalisty, jest zamknięty", () => {
      const context = { inquiry: caseContext(), channel: channelOf("wspolny", "p-a") };
      expect(evaluateCaseAccess(PRODUCER_A, context)).toBeNull();
    });
  });

  describe("granice sprawy", () => {
    it("stare zapytania bezpośrednie nie mają sprawy doradczej dla nikogo", () => {
      const legacy = { inquiry: caseContext({ stage: "legacy_direct" }) };
      expect(evaluateCaseAccess(OWNER, legacy)).toBeNull();
      expect(evaluateCaseAccess(ADVISOR, legacy)).toBeNull();
    });

    it("kanał z innej sprawy jest odrzucony, także dla doradcy", () => {
      const foreign = { id: "ch-x", inquiryId: "inq-other", kind: "klient_doradca" as const, producerId: null };
      expect(evaluateCaseAccess(ADVISOR, { inquiry: caseContext(), channel: foreign })).toBeNull();
    });
  });
});
