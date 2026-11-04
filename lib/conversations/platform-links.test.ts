import { and, eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/observability/errors", () => ({ captureError: vi.fn() }));
vi.mock("@/lib/observability", () => ({ captureError: vi.fn() }));

import { db } from "@/lib/db/client";
import { crmContact, crmPartner, producer, users } from "@/lib/db/schema";
import { createContact, createPartner, linkPartnerProducer, unlinkPartnerProducer } from "./mutations";
import { isLinkKind, platformLinkPath, resolvePlatformLink, resolvePlatformLinks, searchPlatformRecords } from "./platform-links";
import { suggestProducersForPartner } from "./queries";

describe("adresy linków do platformy (spec 0080 AC-18)", () => {
  it("buduje adres ekranu z rodzaju i identyfikatora", () => {
    expect(platformLinkPath("producer", "abc")).toBe("/internal/producers/abc");
    expect(platformLinkPath("project_request", "abc")).toBe("/internal/large-orders/abc?kind=request");
    expect(platformLinkPath("bulk_product_inquiry", "abc")).toBe("/internal/large-orders/abc?kind=product");
    expect(platformLinkPath("case", "abc")).toBe("/internal/cases/abc");
    expect(platformLinkPath("product", "abc")).toBe("/internal/products/abc");
    expect(isLinkKind("case")).toBe(true);
    expect(isLinkKind("order")).toBe(false);
  });
});

const MARK = `crm-pl-${crypto.randomUUID().slice(0, 8)}`;

describe.skipIf(!process.env.DATABASE_URL)("linki do platformy i podpowiedzi producentów (spec 0080 AC-7, AC-18)", () => {
  const admin = crypto.randomUUID();
  const actor = { userId: admin };
  const partnerIds: string[] = [];
  // Własny producent testu: baza dev ma setki producentów (po imporcie AC-20 każdy ma już firmę), więc
  // test nie może zgadywać wolnego producenta z danych. Nazwa i mail są unikalne dzięki znacznikowi.
  const producerUserId = crypto.randomUUID();
  const producerId = crypto.randomUUID();
  const seeded = { id: producerId, name: `${MARK} Wytwórnia Testowa`, email: `${MARK}-producent@example.test` };

  async function newPartner(name: string) {
    const result = await createPartner(actor, { name, kind: "producent", tags: [], website: null, countryCode: null, notes: null });
    if (!result.ok) throw new Error(result.error);
    partnerIds.push(result.id);
    return result.id;
  }

  beforeAll(async () => {
    await db.insert(users).values([
      { id: admin, email: `${MARK}@example.test`, phone: "+48000000093", role: "admin", name: "Admin" },
      { id: producerUserId, email: seeded.email, phone: "+48000000094", role: "producer" },
    ]);
    await db.insert(producer).values({ id: producerId, userId: producerUserId, nip: `P80${MARK.slice(-7)}`, name: seeded.name, countryCode: "PL", technology: "szkielet-drewniany" });
  });

  afterAll(async () => {
    if (partnerIds.length) {
      await db.delete(crmContact).where(inArray(crmContact.partnerId, partnerIds));
      await db.delete(crmPartner).where(inArray(crmPartner.id, partnerIds));
    }
    await db.delete(producer).where(eq(producer.id, producerId));
    await db.delete(users).where(inArray(users.id, [admin, producerUserId]));
  });

  it("rekord, którego nie ma, i identyfikator w złym formacie dają 'niedostępny', nie błąd", async () => {
    for (const kind of ["producer", "product", "project_request", "bulk_product_inquiry", "case"] as const) {
      const missing = await resolvePlatformLink({ kind, id: crypto.randomUUID() });
      expect(missing).toMatchObject({ kind, available: false, label: null, status: null });
      expect((await resolvePlatformLink({ kind, id: "nie-uuid" })).available).toBe(false);
    }
    const map = await resolvePlatformLinks([{ kind: "case", id: crypto.randomUUID() }, { kind: "bogus", id: "x" }, null]);
    expect(map.size).toBe(1);
  });

  it("wyszukiwanie nie rzuca dla żadnego rodzaju, a krótka nazwa nic nie zwraca", async () => {
    expect(await searchPlatformRecords("producer", "a")).toEqual([]);
    expect(await searchPlatformRecords("product", "")).toEqual([]);
    for (const kind of ["project_request", "bulk_product_inquiry", "case"] as const) {
      expect(Array.isArray(await searchPlatformRecords(kind, ""))).toBe(true);
      expect(await searchPlatformRecords(kind, crypto.randomUUID())).toEqual([]);
    }
  });

  it("znalezionego producenta da się rozwiązać do nazwy i statusu", async () => {
    const existing = seeded;
    const found = await searchPlatformRecords("producer", existing.name);
    expect(found.some((option) => option.id === existing.id)).toBe(true);
    const resolved = await resolvePlatformLink({ kind: "producer", id: existing.id });
    expect(resolved).toMatchObject({ available: true, label: existing.name });
    expect(resolved.status).toBeTruthy();
  });

  it("podpowiada producenta po mailu osoby, potem po nazwie, i pokazuje, kto już go zajął", async () => {
    const existing = seeded;

    const byEmail = await newPartner(`${MARK} zupełnie inna nazwa`);
    const contact = await createContact(actor, byEmail, { name: "Osoba", email: existing.email.toUpperCase(), role: null, phone: null, preferredChannel: null, language: null, note: null });
    expect(contact.ok).toBe(true);
    const first = await suggestProducersForPartner(byEmail, "");
    expect(first[0]).toMatchObject({ id: existing.id, reason: "email", linkedPartnerId: null });

    const byName = await newPartner(existing.name);
    const second = await suggestProducersForPartner(byName, "");
    expect(second.find((item) => item.id === existing.id)?.reason).toBe("name");

    expect((await linkPartnerProducer(actor, byEmail, existing.id)).ok).toBe(true);
    const taken = (await suggestProducersForPartner(byName, "")).find((item) => item.id === existing.id);
    expect(taken).toMatchObject({ linkedPartnerId: byEmail, linkedPartnerArchived: false });
    const refused = await linkPartnerProducer(actor, byName, existing.id);
    expect(refused).toMatchObject({ ok: false });

    expect((await unlinkPartnerProducer(actor, byEmail)).ok).toBe(true);
    const [row] = await db.select({ producerId: crmPartner.producerId }).from(crmPartner).where(and(eq(crmPartner.id, byEmail)));
    expect(row.producerId).toBeNull();
  });
});
