import { eq, inArray } from "drizzle-orm";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

const sendMock = vi.hoisted(() => vi.fn().mockResolvedValue(true));
const captureErrorMock = vi.hoisted(() => vi.fn());
vi.mock("./send", () => ({ sendNotificationEmail: sendMock }));
vi.mock("@/lib/observability", () => ({ captureError: captureErrorMock }));

import { db } from "@/lib/db/client";
import { producer, projectQuote, projectRequest, users } from "@/lib/db/schema";
import { notifyProducersOfClosedRequest, notifyProducersOfOtherSelected } from "./large-order-producer";

// Spec 0070 AC-18, AC-19, AC-24, AC-37: neutralne informacje dla producentów po zamknięciu
// zapytania i po wyborze innego producenta. Prawdziwa baza dev, wysyłka maila podstawiona.
describe.skipIf(!process.env.DATABASE_URL)("lib/notifications/large-order-producer: real DB, mocked mail", () => {
  const activeUserId = crypto.randomUUID();
  const rejectedUserId = crypto.randomUUID();
  const activeProducerId = crypto.randomUUID();
  const rejectedProducerId = crypto.randomUUID();
  const requestId = crypto.randomUUID();
  const emptyRequestId = crypto.randomUUID();
  const activeEmail = `lop-active-${activeUserId}@example.test`;
  const rejectedEmail = `lop-rejected-${rejectedUserId}@example.test`;
  const investorEmail = `lop-investor-${requestId}@example.test`;

  beforeAll(async () => {
    await db.insert(users).values([
      { id: activeUserId, email: activeEmail, phone: "+48000000041", role: "producer" },
      { id: rejectedUserId, email: rejectedEmail, phone: "+48000000042", role: "producer" },
    ]);
    await db.insert(producer).values([
      { id: activeProducerId, userId: activeUserId, nip: `LA${activeProducerId.slice(0, 9)}`, name: "LOP Active", countryCode: "PL", technology: "szkielet-drewniany" },
      { id: rejectedProducerId, userId: rejectedUserId, nip: `LR${rejectedProducerId.slice(0, 9)}`, name: "LOP Rejected", countryCode: "PL", technology: "szkielet-drewniany" },
    ]);
    const base = { contactName: "Sekretny Inwestor", countryCode: "PL", projectType: "resort" as const, families: ["dom" as const], unitCount: 10 };
    await db.insert(projectRequest).values([
      { id: requestId, contactEmail: investorEmail, ...base },
      { id: emptyRequestId, contactEmail: `lop-empty-${emptyRequestId}@example.test`, ...base },
    ]);
    await db.insert(projectQuote).values([
      { projectRequestId: requestId, producerId: activeProducerId, totalPriceCents: 100000, status: "active" },
      { projectRequestId: requestId, producerId: rejectedProducerId, totalPriceCents: 200000, status: "rejected" },
    ]);
  });

  afterAll(async () => {
    await db.delete(projectQuote).where(eq(projectQuote.projectRequestId, requestId));
    await db.delete(projectRequest).where(inArray(projectRequest.id, [requestId, emptyRequestId]));
    await db.delete(producer).where(inArray(producer.id, [activeProducerId, rejectedProducerId]));
    await db.delete(users).where(inArray(users.id, [activeUserId, rejectedUserId]));
  });

  afterEach(() => {
    sendMock.mockClear().mockResolvedValue(true);
    captureErrorMock.mockClear();
  });

  it("closed: mails only the producer with an active offer, in Polish, without client data", async () => {
    await notifyProducersOfClosedRequest({ kind: "request", id: requestId });

    expect(sendMock).toHaveBeenCalledTimes(1);
    const mail = sendMock.mock.calls[0][0];
    expect(mail).toMatchObject({ to: activeEmail, emailType: "large_order_producer_request_closed", entityId: requestId });
    const body = `${mail.subject} ${mail.html} ${mail.text}`;
    expect(body).not.toContain("Sekretny Inwestor");
    expect(body).not.toContain(investorEmail);
    expect(mail.html).toContain("/pl/producer/panel/board");
  });

  it("not selected: mails only the producer whose offer was rejected, without prices or the winner", async () => {
    await notifyProducersOfOtherSelected({ kind: "request", id: requestId });

    expect(sendMock).toHaveBeenCalledTimes(1);
    const mail = sendMock.mock.calls[0][0];
    expect(mail).toMatchObject({ to: rejectedEmail, emailType: "large_order_producer_not_selected", entityId: requestId });
    const body = `${mail.subject} ${mail.html} ${mail.text}`;
    expect(body).not.toContain("LOP Active");
    expect(body).not.toMatch(/2\s?000|1\s?000/);
  });

  it("sends nothing when no producer has a matching offer", async () => {
    await notifyProducersOfClosedRequest({ kind: "request", id: emptyRequestId });
    await notifyProducersOfOtherSelected({ kind: "request", id: emptyRequestId });

    expect(sendMock).not.toHaveBeenCalled();
  });

  it("never throws when sending fails, it reports to Sentry instead", async () => {
    sendMock.mockRejectedValue(new Error("mail down"));

    await expect(notifyProducersOfClosedRequest({ kind: "request", id: requestId })).resolves.toBeUndefined();
    await expect(notifyProducersOfOtherSelected({ kind: "request", id: requestId })).resolves.toBeUndefined();

    expect(captureErrorMock).toHaveBeenCalledTimes(2);
  });
});
