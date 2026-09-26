import { asc, eq } from "drizzle-orm";
import { beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/observability/errors", () => ({ captureError: vi.fn() }));
vi.mock("@/lib/observability", () => ({ trackEvent: vi.fn() }));

import { db } from "@/lib/db/client";
import { client, message, producer, product, users } from "@/lib/db/schema";
import { createAdvisoryCase } from "./create";

// Kolejność zapisu wiadomości w createAdvisoryCase (spec 0048 AC-38): system
// notice, potem cztery karty warstwy pierwszej, potem dwie karty warstwy
// drugiej, każda z jawnym, ściśle rosnącym created_at (mikrosekundy), nie
// domyślnym now().
describe.skipIf(!process.env.DATABASE_URL)("createAdvisoryCase: kolejność kart startowych", () => {
  const clientUserId = crypto.randomUUID();
  const clientId = crypto.randomUUID();
  const producerUserId = crypto.randomUUID();
  const producerId = crypto.randomUUID();
  const productId = crypto.randomUUID();
  let channelId: string;

  beforeAll(async () => {
    await db
      .insert(users)
      .values([{ id: clientUserId, email: `cr-client-${clientUserId}@example.test`, phone: "+48000000031", role: "client" }]);
    await db.insert(client).values({ id: clientId, userId: clientUserId });
    await db.insert(users).values([
      { id: producerUserId, email: `cr-producer-${producerUserId}@example.test`, phone: "+48000000032", role: "producer" },
    ]);
    await db.insert(producer).values({
      id: producerId,
      userId: producerUserId,
      nip: `CR${producerId.slice(0, 8)}`,
      name: "Create Order Producer",
      countryCode: "PL",
      technology: "szkielet-drewniany",
    });
    await db.insert(product).values({ id: productId, producerId, family: "dom", status: "draft", name: "Create Order Product" });

    const result = await createAdvisoryCase(
      {
        clientId,
        contact: { name: "Create Order Client", email: "cr-client@example.test", phone: "+48000000031" },
        projectIds: [productId],
        plot: { street: "Testowa 2", postalCode: "00-002", city: "Warszawa", countryCode: "PL" },
        message: null,
        idempotencyKey: `cr-case-${clientId}`,
        locale: "pl",
        systemNoticeBody: "Otrzymaliśmy Twoje zapytanie.",
      },
      { now: () => new Date("2026-09-23T09:00:00.123Z") },
    );
    channelId = result.channelId;
  });

  // message jest niezmienna (trigger message_immutable, AC-31): DELETE jest
  // zawsze odrzucony, więc transytywnie też channel i inquiry (FK bez ON
  // DELETE CASCADE) zostają w bazie dev na stałe. Bez afterAll: nic tu nie da
  // się bezpiecznie posprzątać po tym, jak createAdvisoryCase wstawi karty.

  it("wstawia siedem wiadomości w ściśle rosnącej kolejności created_at", async () => {
    const rows = await db
      .select({ type: message.type, payload: message.payload, createdAt: message.createdAt })
      .from(message)
      .where(eq(message.channelId, channelId))
      .orderBy(asc(message.createdAt), asc(message.id));

    expect(rows).toHaveLength(7);
    const timestamps = rows.map((row) => row.createdAt.getTime());
    for (let i = 1; i < timestamps.length; i++) {
      expect(timestamps[i]).toBeGreaterThanOrEqual(timestamps[i - 1]);
    }
  });

  it("system notice jest pierwszy, potem warstwa pierwsza, potem warstwa druga (AC-38)", async () => {
    const rows = await db
      .select({ type: message.type, payload: message.payload })
      .from(message)
      .where(eq(message.channelId, channelId))
      .orderBy(asc(message.createdAt), asc(message.id));

    expect(rows[0].type).toBe("system_notice");
    const cardKeys = rows.slice(1).map((row) => (row.payload as { fieldKey: string }).fieldKey);
    expect(cardKeys).toEqual(["zakres_uslug", "budzet", "termin", "gotowosc_dzialki", "ogrzewanie", "standard_wykonczenia"]);
  });
});
