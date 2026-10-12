import { eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/lib/db/client";
import { producer, projectQuote, projectRequest, users } from "@/lib/db/schema";
import { getAllCountries, getLargeOrderForAdmin, getLargeOrdersForAdmin } from "./queries";

// Hits the real dev database (spec 0070 AC-1, AC-2): oba odczyty admina na
// zapytaniach i ofertach, w tym ofercie jeszcze nieopublikowanej.
describe.skipIf(!process.env.DATABASE_URL)("large orders admin queries", () => {
  const producerUserId = crypto.randomUUID();
  const producerId = crypto.randomUUID();
  const requestId = crypto.randomUUID();
  const publishedQuoteId = crypto.randomUUID();
  const pendingQuoteId = crypto.randomUUID();
  const secondProducerUserId = crypto.randomUUID();
  const secondProducerId = crypto.randomUUID();

  beforeAll(async () => {
    await db.insert(users).values([
      { id: producerUserId, email: `lo-p1-${producerUserId}@example.test`, phone: "+48000000021", role: "producer" },
      { id: secondProducerUserId, email: `lo-p2-${secondProducerUserId}@example.test`, phone: "+48000000022", role: "producer" },
    ]);
    await db.insert(producer).values([
      { id: producerId, userId: producerUserId, nip: `LO1${producerId.slice(0, 9)}`, name: "Large Orders Producer 1", countryCode: "PL", technology: "szkielet-drewniany" },
      { id: secondProducerId, userId: secondProducerUserId, nip: `LO2${secondProducerId.slice(0, 9)}`, name: "Large Orders Producer 2", countryCode: "PL", technology: "szkielet-drewniany" },
    ]);
    await db.insert(projectRequest).values({
      id: requestId,
      contactName: "Large Orders Investor",
      contactEmail: `lo-investor-${requestId}@example.test`,
      contactPhone: "+49 111 222",
      contactLocale: "de",
      countryCode: "DE",
      projectType: "resort",
      families: ["dom"],
      unitCount: 12,
      status: "quoted",
    });
    await db.insert(projectQuote).values([
      { id: publishedQuoteId, projectRequestId: requestId, producerId, totalPriceCents: 100000000, status: "active" },
      { id: pendingQuoteId, projectRequestId: requestId, producerId: secondProducerId, totalPriceCents: 120000000, status: "active", publishedToClientAt: null },
    ]);
  });

  afterAll(async () => {
    await db.delete(projectQuote).where(inArray(projectQuote.id, [publishedQuoteId, pendingQuoteId]));
    await db.delete(projectRequest).where(eq(projectRequest.id, requestId));
    await db.delete(producer).where(inArray(producer.id, [producerId, secondProducerId]));
    await db.delete(users).where(inArray(users.id, [producerUserId, secondProducerUserId]));
  });

  it("lists the request with its quote counts, counting the unpublished quote as waiting", async () => {
    const { items } = await getLargeOrdersForAdmin({ status: "quoted", kind: "request", page: 1 });

    const item = items.find((row) => row.id === requestId);
    expect(item).toMatchObject({ kind: "request", countryCode: "DE", unitCount: 12, status: "quoted", quoteCount: 2, pendingPublicationCount: 1 });
    expect(item?.deadlineAt.getTime()).toBeGreaterThan(Date.now());
    // Brak firmy klienta: nazwa inwestora to imię i nazwisko z zapytania.
    expect(item).toMatchObject({ investorName: "Large Orders Investor", investorEmail: `lo-investor-${requestId}@example.test` });
  });

  it("filters by status and by kind", async () => {
    const closed = await getLargeOrdersForAdmin({ status: "closed", page: 1 });
    expect(closed.items.find((row) => row.id === requestId)).toBeUndefined();

    const products = await getLargeOrdersForAdmin({ kind: "product", page: 1 });
    expect(products.items.every((row) => row.kind === "product")).toBe(true);
    expect(products.items.find((row) => row.id === requestId)).toBeUndefined();
  });

  it("returns the full detail with client contact and every quote, published or not", async () => {
    const detail = await getLargeOrderForAdmin("request", requestId);

    expect(detail).toMatchObject({
      kind: "request",
      contactName: "Large Orders Investor",
      contactPhone: "+49 111 222",
      contactLocale: "de",
      countryName: expect.any(String),
    });
    expect(detail?.quotes.map((quote) => quote.id).sort()).toEqual([publishedQuoteId, pendingQuoteId].sort());
    const pending = detail?.quotes.find((quote) => quote.id === pendingQuoteId);
    expect(pending?.publishedToClientAt).toBeNull();
    expect(pending?.producerName).toBe("Large Orders Producer 2");
  });

  it("returns null for an id that does not exist under that kind", async () => {
    expect(await getLargeOrderForAdmin("request", crypto.randomUUID())).toBeNull();
    expect(await getLargeOrderForAdmin("product", requestId)).toBeNull();
  });

  it("lists countries for the delivery country pickers", async () => {
    const countries = await getAllCountries();

    expect(countries.map((item) => item.code)).toEqual(expect.arrayContaining(["PL", "DE", "NL"]));
  });
});
