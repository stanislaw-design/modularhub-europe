import { describe, expect, it } from "vitest";
import { classifyTodayTask, computeThreadStatus, partnerNamesSimilar, taskOwnerUserId } from "./status";
import { buildTemplateTasks, CASE_TEMPLATES, getCaseTemplate } from "./templates";
import { addDaysToDate, dateToWarsawLocal, isValidDateString, warsawDateString, warsawLocalToDate } from "./time";

describe("computeThreadStatus (AC-11)", () => {
  it("zamknięta ma pierwszeństwo przed zadaniami", () => {
    expect(computeThreadStatus({ closedAt: new Date(), openUserTasks: 2, openExternalTasks: 1 })).toBe("closed");
  });
  it("czekamy na nas, gdy jest otwarte zadanie administratora", () => {
    expect(computeThreadStatus({ closedAt: null, openUserTasks: 1, openExternalTasks: 3 })).toBe("waiting_us");
  });
  it("czekamy na nich, gdy są tylko zadania zewnętrzne", () => {
    expect(computeThreadStatus({ closedAt: null, openUserTasks: 0, openExternalTasks: 1 })).toBe("waiting_them");
  });
  it("otwarta, gdy nie ma otwartych zadań", () => {
    expect(computeThreadStatus({ closedAt: null, openUserTasks: 0, openExternalTasks: 0 })).toBe("open");
  });
});

describe("classifyTodayTask (AC-15)", () => {
  const today = "2026-11-03";
  it("do wykonania to zadania administratorów z terminem: zaległe, dzisiejsze i przyszłe", () => {
    expect(classifyTodayTask({ assigneeKind: "user", dueDate: "2026-11-01" }, today)).toBe("toDo");
    expect(classifyTodayTask({ assigneeKind: "user", dueDate: today }, today)).toBe("toDo");
    expect(classifyTodayTask({ assigneeKind: "user", dueDate: "2026-11-09" }, today)).toBe("toDo");
    expect(classifyTodayTask({ assigneeKind: "external", dueDate: "2026-11-01" }, today)).toBe("waitingThem");
  });
  it("bez terminu trafia do ostatniej sekcji, oba rodzaje", () => {
    expect(classifyTodayTask({ assigneeKind: "user", dueDate: null }, today)).toBe("noDueDate");
    expect(classifyTodayTask({ assigneeKind: "external", dueDate: null }, today)).toBe("noDueDate");
  });
});

describe("taskOwnerUserId (reguła moje)", () => {
  it("zadanie administratora należy do osoby przypisanej", () => {
    expect(taskOwnerUserId({ assigneeKind: "user", assigneeUserId: "a", threadOwnerUserId: "b", createdBy: "c" })).toBe("a");
  });
  it("zadanie zewnętrzne należy do właściciela sprawy, a bez sprawy do autora", () => {
    expect(taskOwnerUserId({ assigneeKind: "external", assigneeUserId: null, threadOwnerUserId: "b", createdBy: "c" })).toBe("b");
    expect(taskOwnerUserId({ assigneeKind: "external", assigneeUserId: null, threadOwnerUserId: null, createdBy: "c" })).toBe("c");
  });
});

describe("partnerNamesSimilar (AC-5)", () => {
  it("równe po normalizacji wielkości liter i spacji", () => {
    expect(partnerNamesSimilar("  Kora   Sauny ", "kora sauny")).toBe(true);
  });
  it("zawieranie w obu kierunkach od 4 znaków", () => {
    expect(partnerNamesSimilar("Kora", "Kora Sauny sp. z o.o.")).toBe(true);
    expect(partnerNamesSimilar("Kora Sauny sp. z o.o.", "Kora")).toBe(true);
  });
  it("krótkie nazwy porównują się tylko przez równość", () => {
    expect(partnerNamesSimilar("ABC", "ABC Domy")).toBe(false);
    expect(partnerNamesSimilar("abc", "ABC")).toBe(true);
  });
  it("różne firmy nie są podobne", () => {
    expect(partnerNamesSimilar("Kora", "Dampol")).toBe(false);
  });
});

describe("czas w Europe/Warsaw (AC-13, AC-9)", () => {
  it("00:30 czasu polskiego latem to wczorajsza data UTC, ale dzisiejsza w Warszawie", () => {
    const instant = new Date("2026-07-14T22:30:00Z"); // 00:30 CEST 15 lipca
    expect(instant.toISOString().slice(0, 10)).toBe("2026-07-14");
    expect(warsawDateString(instant)).toBe("2026-07-15");
  });
  it("00:30 czasu polskiego zimą (CET)", () => {
    expect(warsawDateString(new Date("2026-12-09T23:30:00Z"))).toBe("2026-12-10");
  });
  it("czas ścienny z formularza zamienia się na właściwą chwilę UTC", () => {
    expect(warsawLocalToDate("2026-07-15T00:30")?.toISOString()).toBe("2026-07-14T22:30:00.000Z");
    expect(warsawLocalToDate("2026-12-10T00:30")?.toISOString()).toBe("2026-12-09T23:30:00.000Z");
  });
  it("round trip przez pole datetime-local", () => {
    const local = "2026-11-03T08:15";
    const date = warsawLocalToDate(local);
    expect(date && dateToWarsawLocal(date)).toBe(local);
  });
  it("odrzuca błędny zapis", () => {
    expect(warsawLocalToDate("jutro")).toBeNull();
    expect(warsawLocalToDate("2026-13-01T10:00")).toBeNull();
    expect(warsawLocalToDate("2026-02-31T10:00")).toBeNull();
  });
  it("dodawanie dni to arytmetyka na datach, także przez zmianę czasu", () => {
    expect(addDaysToDate("2026-03-28", 2)).toBe("2026-03-30");
    expect(addDaysToDate("2026-10-24", 2)).toBe("2026-10-26");
    expect(addDaysToDate("2026-12-30", 3)).toBe("2027-01-02");
  });
  it("walidacja daty", () => {
    expect(isValidDateString("2026-02-28")).toBe(true);
    expect(isValidDateString("2026-02-30")).toBe(false);
    expect(isValidDateString("28-02-2026")).toBe(false);
  });
});

describe("szablony spraw (AC-9)", () => {
  it("są trzy szablony z unikalnymi kluczami", () => {
    expect(CASE_TEMPLATES.map((t) => t.key)).toEqual(["rfq", "catalog-import", "terms"]);
    expect(getCaseTemplate("nie-ma")).toBeNull();
  });
  it("rfq: terminy liczone od dnia utworzenia, zadania naszej strony do właściciela", () => {
    const tasks = buildTemplateTasks(getCaseTemplate("rfq")!, "2026-03-28", "owner-1");
    expect(tasks.map((t) => [t.dueDate, t.assigneeKind, t.assigneeUserId])).toEqual([
      ["2026-03-28", "user", "owner-1"],
      ["2026-04-02", "external", null],
      ["2026-04-04", "user", "owner-1"],
    ]);
  });
  it("catalog-import ma pięć zadań", () => {
    expect(getCaseTemplate("catalog-import")!.tasks).toHaveLength(5);
  });
});
