import { and, eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/observability/errors", () => ({ captureError: vi.fn() }));
vi.mock("@/lib/observability", () => ({ trackEvent: vi.fn() }));

import { db } from "@/lib/db/client";
import { caseField, client, inquiry, message, producer, product, users } from "@/lib/db/schema";
import { answerCard, assessReadiness, getCaseFields, upsertCaseField } from "./cards";
import type { CaseActor } from "./access";
import { createAdvisoryCase } from "./create";

// Karty startowe, odpowiedzi klienta, podsumowanie potrzeb i ocena gotowości
// (spec 0048 AC-7, AC-12, AC-13, AC-38 do AC-44). Sprawa i sześć kart
// startowych powstają przez createAdvisoryCase, tak jak w prawdziwym
// przepływie, żeby test korzystał z tych samych message.payload co produkcja.
describe.skipIf(!process.env.DATABASE_URL)("karty startowe i podsumowanie potrzeb", () => {
  const clientUserId = crypto.randomUUID();
  const clientId = crypto.randomUUID();
  const advisorUserId = crypto.randomUUID();
  const producerUserId = crypto.randomUUID();
  const producerId = crypto.randomUUID();
  const productId = crypto.randomUUID();

  const clock = { now: () => new Date("2026-09-23T10:00:00.000Z") };
  const clientActor: CaseActor = { kind: "client", userId: clientUserId, clientId };
  const advisorActor: CaseActor = { kind: "advisor", userId: advisorUserId };
  const producerActor: CaseActor = { kind: "producer", userId: producerUserId, producerId };

  let inquiryId: string;
  let channelId: string;
  let cardMessageIds: Record<string, string>;

  beforeAll(async () => {
    await db.insert(users).values([
      { id: clientUserId, email: `cf-client-${clientUserId}@example.test`, phone: "+48000000021", role: "client" },
      { id: advisorUserId, email: `cf-advisor-${advisorUserId}@example.test`, phone: "+48000000022", role: "admin" },
      { id: producerUserId, email: `cf-producer-${producerUserId}@example.test`, phone: "+48000000023", role: "producer" },
    ]);
    await db.insert(client).values({ id: clientId, userId: clientUserId });
    await db.insert(producer).values({
      id: producerId,
      userId: producerUserId,
      nip: `CF${producerId.slice(0, 8)}`,
      name: "Case Field Producer",
      countryCode: "PL",
      technology: "szkielet-drewniany",
    });
    await db.insert(product).values({ id: productId, producerId, family: "dom", status: "draft", name: "Case Field Product" });

    const result = await createAdvisoryCase(
      {
        clientId,
        contact: { name: "Case Field Client", email: "cf-client@example.test", phone: "+48000000021" },
        projectIds: [productId],
        plot: { street: "Testowa 1", postalCode: "00-001", city: "Warszawa", countryCode: "PL" },
        message: null,
        idempotencyKey: `cf-case-${clientId}`,
        locale: "pl",
        systemNoticeBody: "Otrzymaliśmy Twoje zapytanie.",
      },
      clock,
    );
    inquiryId = result.inquiryId;
    channelId = result.channelId;

    const rows = await db
      .select({ id: message.id, payload: message.payload })
      .from(message)
      .where(and(eq(message.channelId, channelId), eq(message.type, "question_card")));
    cardMessageIds = Object.fromEntries(
      rows.map((row) => [(row.payload as { fieldKey: string }).fieldKey, row.id]),
    );
  });

  // message jest niezmienna (trigger message_immutable, AC-31): DELETE jest
  // zawsze odrzucony, bez wyjątku dla danych testowych. To transytywnie
  // blokuje też usunięcie channel i inquiry (FK bez ON DELETE CASCADE), więc
  // ta gałąź fixture zostaje w bazie dev na stałe raz utworzona. Czyścimy
  // wyłącznie case_field, które nie ma triggera niezmienności.
  afterAll(async () => {
    await db.delete(caseField).where(eq(caseField.inquiryId, inquiryId));
  });

  it("createAdvisoryCase wstawia sześć kart startowych z payloadem fieldKey/allowUnsure (AC-38)", () => {
    expect(Object.keys(cardMessageIds).sort()).toEqual(
      ["budzet", "gotowosc_dzialki", "ogrzewanie", "standard_wykonczenia", "termin", "zakres_uslug"].sort(),
    );
  });

  it("wybór opcji zapisuje case_field jako potwierdzone, źródło client_card (AC-7, AC-40)", async () => {
    const result = await answerCard(clientActor, { inquiryId, messageId: cardMessageIds.budzet, value: "150_do_250k" }, clock);
    expect(result.ok).toBe(true);

    const fields = await getCaseFields(inquiryId);
    expect(fields.budzet).toEqual({ value: "150_do_250k", state: "confirmed" });
  });

  it("'nie wiem' zapisuje stan brak informacji i wartość null, nigdy potwierdzone (AC-40)", async () => {
    const result = await answerCard(clientActor, { inquiryId, messageId: cardMessageIds.termin, value: "nie_wiem" }, clock);
    expect(result.ok).toBe(true);

    const fields = await getCaseFields(inquiryId);
    expect(fields.termin).toEqual({ value: null, state: "missing" });
  });

  it("odrzuca wartość spoza katalogu danego klucza", async () => {
    const result = await answerCard(clientActor, { inquiryId, messageId: cardMessageIds.gotowosc_dzialki, value: "pompa_ciepla" }, clock);
    expect(result).toEqual({ ok: false, reason: "invalid" });
  });

  it("producent nie może odpowiedzieć na kartę klienta (AC-8, AC-31)", async () => {
    const result = await answerCard(producerActor, { inquiryId, messageId: cardMessageIds.ogrzewanie, value: "gaz" }, clock);
    expect(result).toEqual({ ok: false, reason: "forbidden" });
  });

  it("dwie równoległe odpowiedzi na tę samą kartę zostawiają jeden wiersz, ostatnia wygrywa (AC-40)", async () => {
    const [first, second] = await Promise.all([
      answerCard(clientActor, { inquiryId, messageId: cardMessageIds.standard_wykonczenia, value: "deweloperski" }, clock),
      answerCard(clientActor, { inquiryId, messageId: cardMessageIds.standard_wykonczenia, value: "pod_klucz" }, clock),
    ]);
    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);

    const rows = await db
      .select()
      .from(caseField)
      .where(and(eq(caseField.inquiryId, inquiryId), eq(caseField.key, "standard_wykonczenia")));
    expect(rows).toHaveLength(1);
    expect(["deweloperski", "pod_klucz"]).toContain(rows[0]?.value);
  });

  it("doradca poprawia pole bezpośrednio przez upsertCaseField (AC-12)", async () => {
    const result = await upsertCaseField(
      advisorActor,
      { inquiryId, key: "zakres_uslug", value: "kompleksowo_z_fundamentem", state: "assumption" },
      clock,
    );
    expect(result.ok).toBe(true);

    const fields = await getCaseFields(inquiryId);
    expect(fields.zakres_uslug).toEqual({ value: "kompleksowo_z_fundamentem", state: "assumption" });
  });

  it("upsertCaseField wymusza wartość null dla stanu brak informacji", async () => {
    const result = await upsertCaseField(advisorActor, { inquiryId, key: "zakres_uslug", value: null, state: "missing" }, clock);
    expect(result.ok).toBe(true);

    const fields = await getCaseFields(inquiryId);
    expect(fields.zakres_uslug).toEqual({ value: null, state: "missing" });
  });

  it("klient nie może wołać upsertCaseField (tylko doradca, AC-12)", async () => {
    const result = await upsertCaseField(clientActor, { inquiryId, key: "budzet", value: "do_150k", state: "confirmed" }, clock);
    expect(result).toEqual({ ok: false, reason: "forbidden" });
  });

  it("assessReadiness 'gotowe do briefu' przesuwa etap i wysyła wiadomość do klienta (AC-13)", async () => {
    const result = await assessReadiness(
      advisorActor,
      { inquiryId, outcome: "ready_for_brief", message: "Mamy komplet informacji, przygotowuję brief.", locale: "pl" },
      clock,
    );
    expect(result.ok).toBe(true);

    const [row] = await db.select({ stage: inquiry.stage, waitingOn: inquiry.waitingOn }).from(inquiry).where(eq(inquiry.id, inquiryId));
    expect(row?.stage).toBe("brief_do_zatwierdzenia");
    expect(row?.waitingOn).toBe("advisor");

    const [lastMessage] = await db
      .select({ body: message.body, authorKind: message.authorKind })
      .from(message)
      .where(and(eq(message.channelId, channelId), eq(message.type, "text")));
    expect(lastMessage?.body).toBe("Mamy komplet informacji, przygotowuję brief.");
    expect(lastMessage?.authorKind).toBe("advisor");
  });

  it("assessReadiness 'poza obszarem obsługi' zamyka sprawę bez etykiety widocznej dla klienta (AC-13)", async () => {
    const result = await assessReadiness(
      advisorActor,
      { inquiryId, outcome: "out_of_area", message: "Niestety nie obsługujemy jeszcze tego regionu.", locale: "pl" },
      clock,
    );
    expect(result.ok).toBe(true);

    const [row] = await db
      .select({ stage: inquiry.stage, closedReason: inquiry.closedReason, closedAt: inquiry.closedAt })
      .from(inquiry)
      .where(eq(inquiry.id, inquiryId));
    expect(row?.stage).toBe("zamkniete_bez_wyboru");
    expect(row?.closedReason).toBe("poza_obszarem");
    expect(row?.closedAt).not.toBeNull();
  });
});
