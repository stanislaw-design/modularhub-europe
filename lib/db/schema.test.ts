import { createHash } from "node:crypto";
import { and, eq, inArray, sql } from "drizzle-orm";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { db } from "./client";
import {
  auditLog,
  bulkProductInquiry,
  client,
  costLineItem,
  document,
  favorite,
  producer,
  product,
  productTimelineStage,
  productVariant,
  projectQuote,
  projectRequest,
  users,
} from "./schema";

// Confirms AC-2 (spec 0018): every mutation of a personal-data table is
// captured by the Postgres trigger (drizzle/0002_audit_log_trigger.sql), not
// by application code, with personal fields redacted to a hash. Hits the real
// dev Neon database (vitest.setup.ts loads .env.local), skipped where no
// DATABASE_URL is configured. /check verify confirmed this manually on a
// disposable Neon branch; these tests lock the same behaviour in permanently
// against the real dev database.
function md5(value: string): string {
  return createHash("md5").update(value).digest("hex");
}

// drizzle-orm wraps the raw Postgres error in a DrizzleQueryError; the
// constraint/trigger detail lives on `.cause.message`, not the top-level
// message (same pattern as the existing FK and document_one_cover_per_product
// tests below, factored out here for the spec 0037 constraints that reuse it).
async function expectRejectionToMatch(promise: Promise<unknown>, pattern: RegExp): Promise<void> {
  let caught: unknown;
  try {
    await promise;
  } catch (error) {
    caught = error;
  }
  const topMessage = caught instanceof Error ? caught.message : String(caught);
  const causeMessage = caught instanceof Error && caught.cause instanceof Error ? caught.cause.message : "";
  expect(`${topMessage} ${causeMessage}`).toMatch(pattern);
}

describe.skipIf(!process.env.DATABASE_URL)("lib/db/schema: audit trail on create/update", () => {
  const userId = crypto.randomUUID();
  const producerId = crypto.randomUUID();
  const userEmail = `audit-${userId}@example.test`;
  const producerNameOriginal = "Original Producer Name";
  const producerNameUpdated = "Updated Producer Name";

  beforeAll(async () => {
    await db.insert(users).values({
      id: userId,
      name: "Original User Name",
      email: userEmail,
      phone: "+48000000000",
      role: "producer",
    });
    await db.insert(producer).values({
      id: producerId,
      userId,
      nip: `NIP${producerId.slice(0, 9)}`,
      name: producerNameOriginal,
      countryCode: "PL",
      technology: "szkielet-drewniany",
    });
    await db
      .update(producer)
      .set({ name: producerNameUpdated })
      .where(eq(producer.id, producerId));
  });

  afterAll(async () => {
    await db.delete(producer).where(eq(producer.id, producerId));
    await db.delete(users).where(eq(users.id, userId));
    // users/producer are audited tables (spec 0018 Key invariants): the
    // trigger leaves rows behind on purpose. This is a test fixture, not a
    // real event, so sweep it rather than leave synthetic noise in audit_log.
    await db.delete(auditLog).where(inArray(auditLog.recordId, [userId, producerId]));
  });

  it("logs exactly one create action per table on insert, not zero and not duplicated", async () => {
    const rows = await db
      .select()
      .from(auditLog)
      .where(and(inArray(auditLog.recordId, [userId, producerId]), eq(auditLog.action, "create")));

    expect(rows).toHaveLength(2);
    expect(rows.map((row) => row.tableName).sort()).toEqual(["producer", "users"]);
  });

  it("redacts personal fields (name, email, nip) to their md5 hash, not plaintext", async () => {
    const [userCreate] = await db
      .select()
      .from(auditLog)
      .where(and(eq(auditLog.recordId, userId), eq(auditLog.action, "create")));
    const [producerCreate] = await db
      .select()
      .from(auditLog)
      .where(and(eq(auditLog.recordId, producerId), eq(auditLog.action, "create")));

    expect(userCreate?.newValues?.name).toBe(md5("Original User Name"));
    expect(userCreate?.newValues?.email).toBe(md5(userEmail));
    expect(producerCreate?.newValues?.name).toBe(md5(producerNameOriginal));
    expect(producerCreate?.newValues?.nip).toBe(md5(`NIP${producerId.slice(0, 9)}`));
  });

  it("leaves non-sensitive fields (technology, country_code) as plaintext", async () => {
    const [producerCreate] = await db
      .select()
      .from(auditLog)
      .where(and(eq(auditLog.recordId, producerId), eq(auditLog.action, "create")));

    expect(producerCreate?.newValues?.technology).toBe("szkielet-drewniany");
    expect(producerCreate?.newValues?.country_code).toBe("PL");
  });

  it("logs exactly one update action with redacted before/after values that differ", async () => {
    const rows = await db
      .select()
      .from(auditLog)
      .where(and(eq(auditLog.recordId, producerId), eq(auditLog.action, "update")));

    expect(rows).toHaveLength(1);
    const [updateRow] = rows;
    expect(updateRow?.oldValues?.name).toBe(md5(producerNameOriginal));
    expect(updateRow?.newValues?.name).toBe(md5(producerNameUpdated));
    expect(updateRow?.oldValues?.name).not.toBe(updateRow?.newValues?.name);
  });

  it("does not log a row for a table outside the audited list (product)", async () => {
    const productId = crypto.randomUUID();
    await db.insert(product).values({ id: productId, producerId, family: "dom", name: "Unaudited Product" });

    const rows = await db.select().from(auditLog).where(eq(auditLog.recordId, productId));
    expect(rows).toHaveLength(0);

    await db.delete(product).where(eq(product.id, productId));
  });
});

describe.skipIf(!process.env.DATABASE_URL)("lib/db/schema: audit trail on delete", () => {
  const userId = crypto.randomUUID();
  const clientId = crypto.randomUUID();

  beforeAll(async () => {
    await db.insert(users).values({
      id: userId,
      email: `audit-delete-${userId}@example.test`,
      phone: "+48000000000",
      role: "client",
    });
    await db.insert(client).values({ id: clientId, userId });
  });

  afterAll(async () => {
    await db.delete(users).where(eq(users.id, userId));
    await db.delete(auditLog).where(inArray(auditLog.recordId, [userId, clientId]));
  });

  it("logs a delete action when a personal-data row with no dependents is removed", async () => {
    await db.delete(client).where(eq(client.id, clientId));

    const rows = await db
      .select()
      .from(auditLog)
      .where(and(eq(auditLog.recordId, clientId), eq(auditLog.action, "delete")));

    expect(rows).toHaveLength(1);
    expect(rows[0]?.tableName).toBe("client");
    expect(rows[0]?.oldValues?.user_id).toBe(userId);
  });
});

// /debug (2026-09-13): audit_log_capture() must fall back to an md5 hash of
// the whole row for a table with no single `id` column (composite primary
// key), not write NULL into audit_log.record_id (a NOT NULL column) and roll
// back the write on the audited table itself. This regressed once already
// (drizzle/0014_bulk_request_limit_and_audit.sql's CREATE OR REPLACE
// accidentally reverted the drizzle/0007_fix_favorite_audit_trigger.sql fix on
// the live database, breaking every favorite/offer_item write) — this test
// locks the fallback in directly against `favorite` (client_id, product_id),
// rather than relying on it being incidentally exercised elsewhere.
describe.skipIf(!process.env.DATABASE_URL)("lib/db/schema: audit trail falls back to a row hash for tables with no single id column", () => {
  const userId = crypto.randomUUID();
  const clientId = crypto.randomUUID();
  const producerId = crypto.randomUUID();
  const producerUserId = crypto.randomUUID();
  const productId = crypto.randomUUID();

  beforeAll(async () => {
    await db.insert(users).values([
      { id: userId, email: `audit-fallback-client-${userId}@example.test`, phone: "+48000000000", role: "client" },
      { id: producerUserId, email: `audit-fallback-producer-${producerUserId}@example.test`, phone: "+48000000000", role: "producer" },
    ]);
    await db.insert(client).values({ id: clientId, userId });
    await db.insert(producer).values({ id: producerId, userId: producerUserId, nip: `AFB${producerId.slice(0, 9)}`, name: "Audit Fallback Producer", countryCode: "PL", technology: "szkielet-drewniany" });
    await db.insert(product).values({ id: productId, producerId, family: "dom", name: "Audit Fallback Product" });
  });

  afterAll(async () => {
    await db.delete(favorite).where(and(eq(favorite.clientId, clientId), eq(favorite.productId, productId)));
    await db.delete(product).where(eq(product.id, productId));
    await db.delete(producer).where(eq(producer.id, producerId));
    await db.delete(client).where(eq(client.id, clientId));
    await db.delete(users).where(inArray(users.id, [userId, producerUserId]));
    await db.delete(auditLog).where(inArray(auditLog.recordId, [userId, producerUserId, clientId, producerId, productId]));
  });

  it("succeeds inserting into favorite (composite key, no id column) and audits it with an md5 row hash, not NULL", async () => {
    await expect(db.insert(favorite).values({ clientId, productId })).resolves.not.toThrow();

    const rows = await db.select().from(auditLog).where(eq(auditLog.tableName, "favorite"));
    const row = rows.find((candidate) => {
      const values = candidate.newValues as Record<string, unknown> | null;
      return values?.client_id === clientId && values?.product_id === productId;
    });
    expect(row).toBeDefined();
    expect(row?.recordId).not.toBeNull();
    // The exact hash depends on created_at (part of the row), so just assert
    // it is a well formed md5 hex digest, not the primary key concatenation.
    expect(row?.recordId).toMatch(/^[0-9a-f]{32}$/);
    expect(row?.recordId).not.toBe(`${clientId}${productId}`);

    await db.delete(auditLog).where(eq(auditLog.id, row!.id));
  });
});

describe.skipIf(!process.env.DATABASE_URL)(
  "lib/db/schema: product FK to producer has no cascade",
  () => {
    const userId = crypto.randomUUID();
    const producerId = crypto.randomUUID();
    const productId = crypto.randomUUID();

    beforeAll(async () => {
      await db.insert(users).values({
        id: userId,
        email: `audit-fk-${userId}@example.test`,
        phone: "+48000000000",
        role: "producer",
      });
      await db.insert(producer).values({
        id: producerId,
        userId,
        nip: `NIP${producerId.slice(0, 9)}`,
        name: "FK Test Producer",
        countryCode: "PL",
        technology: "beton-modulowy",
      });
      await db.insert(product).values({ id: productId, producerId, family: "dom", name: "FK Test Product" });
    });

    afterAll(async () => {
      await db.delete(product).where(eq(product.id, productId));
      await db.delete(producer).where(eq(producer.id, producerId));
      await db.delete(users).where(eq(users.id, userId));
      await db.delete(auditLog).where(inArray(auditLog.recordId, [userId, producerId]));
    });

    it("rejects deleting a producer that still has a product, leaving the product row intact", async () => {
      let caught: unknown;
      try {
        await db.delete(producer).where(eq(producer.id, producerId));
      } catch (error) {
        caught = error;
      }

      // drizzle-orm wraps the raw Postgres error; the FK detail lives on
      // `.cause`, not the top-level message, so check both.
      const topMessage = caught instanceof Error ? caught.message : String(caught);
      const causeMessage =
        caught instanceof Error && caught.cause instanceof Error ? caught.cause.message : "";
      expect(`${topMessage} ${causeMessage}`).toMatch(/foreign key constraint/i);

      const rows = await db.select().from(product).where(eq(product.id, productId));
      expect(rows).toHaveLength(1);
      expect(rows[0]?.producerId).toBe(producerId);
    });
  },
);

// spec 0031 AC-4: "co najwyżej jedna okładka na produkt" jest wymuszone przez
// bazę (document_one_cover_per_product), nie tylko kod aplikacji — więc nawet
// wstawienie z pominięciem lib/product-photo-actions.ts musi na to trafić.
describe.skipIf(!process.env.DATABASE_URL)("lib/db/schema: document_one_cover_per_product partial unique index", () => {
  const userId = crypto.randomUUID();
  const producerId = crypto.randomUUID();
  const productId = crypto.randomUUID();

  beforeAll(async () => {
    await db.insert(users).values({
      id: userId,
      email: `document-cover-${userId}@example.test`,
      phone: "+48000000000",
      role: "admin",
    });
    await db.insert(producer).values({
      id: producerId,
      userId,
      nip: `DC${producerId.slice(0, 8)}`,
      name: "Document Cover Index Test Producer",
      countryCode: "PL",
      technology: "szkielet-drewniany",
    });
    await db.insert(product).values({ id: productId, producerId, family: "dom", name: "Document Cover Index Test Product" });
  });

  afterEach(async () => {
    // Każdy test zaczyna od zera dla tego productId, inaczej wiersz z
    // poprzedniego testu sam zderzyłby się z indeksem w następnym.
    const docs = await db.select({ id: document.id }).from(document).where(eq(document.productId, productId));
    if (docs.length > 0) {
      await db.delete(auditLog).where(inArray(auditLog.recordId, docs.map((d) => d.id)));
      await db.delete(document).where(eq(document.productId, productId));
    }
  });

  afterAll(async () => {
    const docs = await db.select({ id: document.id }).from(document).where(eq(document.productId, productId));
    if (docs.length > 0) {
      await db.delete(auditLog).where(inArray(auditLog.recordId, docs.map((d) => d.id)));
      await db.delete(document).where(eq(document.productId, productId));
    }
    await db.delete(product).where(eq(product.id, productId));
    await db.delete(producer).where(eq(producer.id, producerId));
    await db.delete(users).where(eq(users.id, userId));
    await db.delete(auditLog).where(inArray(auditLog.recordId, [userId, producerId]));
  });

  it("rejects a second is_cover=true product_photo row for the same product", async () => {
    await db.insert(document).values({
      r2Key: "cover-index-1.jpg",
      filename: "1.jpg",
      mimeType: "image/jpeg",
      sizeBytes: 10,
      purpose: "product_photo",
      isCover: true,
      ownerUserId: userId,
      productId,
    });

    let caught: unknown;
    try {
      await db.insert(document).values({
        r2Key: "cover-index-2.jpg",
        filename: "2.jpg",
        mimeType: "image/jpeg",
        sizeBytes: 10,
        purpose: "product_photo",
        isCover: true,
        ownerUserId: userId,
        productId,
      });
    } catch (error) {
      caught = error;
    }

    // drizzle-orm wraps the raw Postgres error; the constraint detail lives
    // on `.cause`, not the top-level message (same pattern as the FK test above).
    const topMessage = caught instanceof Error ? caught.message : String(caught);
    const causeMessage = caught instanceof Error && caught.cause instanceof Error ? caught.cause.message : "";
    expect(`${topMessage} ${causeMessage}`).toMatch(/document_one_cover_per_product|unique constraint/i);
  });

  it("allows a second is_cover=true row for the same product under a different purpose (the index is scoped by purpose)", async () => {
    await db.insert(document).values({
      r2Key: "cover-index-photo.jpg",
      filename: "photo.jpg",
      mimeType: "image/jpeg",
      sizeBytes: 10,
      purpose: "product_photo",
      isCover: true,
      ownerUserId: userId,
      productId,
    });

    // product_floor_plan is a different purpose; its own is_cover=true row
    // must not collide with product_photo's, per the index's WHERE clause.
    await expect(
      db.insert(document).values({
        r2Key: "cover-index-floorplan.jpg",
        filename: "floorplan.jpg",
        mimeType: "image/jpeg",
        sizeBytes: 10,
        purpose: "product_floor_plan",
        isCover: true,
        ownerUserId: userId,
        productId,
      }),
    ).resolves.not.toThrow();
  });

  it("allows a new is_cover=true row once the previous cover is soft-deleted (deleted_at excludes it from the index)", async () => {
    const [firstCover] = await db
      .insert(document)
      .values({
        r2Key: "cover-index-soft-1.jpg",
        filename: "1.jpg",
        mimeType: "image/jpeg",
        sizeBytes: 10,
        purpose: "product_photo",
        isCover: true,
        ownerUserId: userId,
        productId,
      })
      .returning({ id: document.id });
    await db.update(document).set({ deletedAt: new Date() }).where(eq(document.id, firstCover.id));

    await expect(
      db.insert(document).values({
        r2Key: "cover-index-soft-2.jpg",
        filename: "2.jpg",
        mimeType: "image/jpeg",
        sizeBytes: 10,
        purpose: "product_photo",
        isCover: true,
        ownerUserId: userId,
        productId,
      }),
    ).resolves.not.toThrow();
  });
});

// spec 0037: CHECK constraints and the exactly-one-link/mutual-exclusion
// invariants must hold even for a manual insert bypassing the application
// layer (same rationale as document_one_cover_per_product above).
describe.skipIf(!process.env.DATABASE_URL)("lib/db/schema: project_request / bulk_product_inquiry / project_quote CHECK constraints", () => {
  afterEach(async () => {
    await db.delete(projectRequest).where(eq(projectRequest.contactEmail, "schema-check@example.test"));
  });

  it("rejects a project_request with an empty families array", async () => {
    await expectRejectionToMatch(
      db.insert(projectRequest).values({
        contactName: "Schema Check",
        contactEmail: "schema-check@example.test",
        countryCode: "PL",
        projectType: "resort",
        families: [],
        unitCountMin: 12,
      }),
      /project_request_families_not_empty/,
    );
  });

  it("rejects a project_request with unitCountMin below 10", async () => {
    await expectRejectionToMatch(
      db.insert(projectRequest).values({
        contactName: "Schema Check",
        contactEmail: "schema-check@example.test",
        countryCode: "PL",
        projectType: "resort",
        families: ["dom"],
        unitCountMin: 9,
      }),
      /project_request_unit_count_min/,
    );
  });

  it("rejects a project_request where unitCountMax is below unitCountMin", async () => {
    await expectRejectionToMatch(
      db.insert(projectRequest).values({
        contactName: "Schema Check",
        contactEmail: "schema-check@example.test",
        countryCode: "PL",
        projectType: "resort",
        families: ["dom"],
        unitCountMin: 20,
        unitCountMax: 10,
      }),
      /project_request_unit_count_max/,
    );
  });

  it("rejects a project_quote with neither projectRequestId nor bulkProductInquiryId set", async () => {
    const producerId = crypto.randomUUID();
    const userId = crypto.randomUUID();
    await db.insert(users).values({ id: userId, email: `pq-check-${userId}@example.test`, phone: "+48000000000", role: "producer" });
    await db.insert(producer).values({ id: producerId, userId, nip: `PQC${producerId.slice(0, 9)}`, name: "Schema Check Producer", countryCode: "PL", technology: "szkielet-drewniany" });

    await expectRejectionToMatch(
      db.insert(projectQuote).values({ producerId, totalPriceCents: 500000 }),
      /project_quote_exactly_one_link/,
    );

    await db.delete(producer).where(eq(producer.id, producerId));
    await db.delete(users).where(eq(users.id, userId));
    await db.delete(auditLog).where(inArray(auditLog.recordId, [userId, producerId]));
  });
});

// spec 0037, AC-9: at most one accepted project_quote per project_request,
// regardless of producer -- enforced by project_quote_accepted_per_request,
// not just by application logic (lib/project-quote-actions.ts's acceptProjectQuote).
describe.skipIf(!process.env.DATABASE_URL)("lib/db/schema: project_quote_accepted_per_request partial unique index", () => {
  const producerAId = crypto.randomUUID();
  const producerAUserId = crypto.randomUUID();
  const producerBId = crypto.randomUUID();
  const producerBUserId = crypto.randomUUID();
  const projectRequestId = crypto.randomUUID();

  beforeAll(async () => {
    await db.insert(users).values([
      { id: producerAUserId, email: `pq-idx-a-${producerAUserId}@example.test`, phone: "+48000000000", role: "producer" },
      { id: producerBUserId, email: `pq-idx-b-${producerBUserId}@example.test`, phone: "+48000000000", role: "producer" },
    ]);
    await db.insert(producer).values([
      { id: producerAId, userId: producerAUserId, nip: `PQIA${producerAId.slice(0, 8)}`, name: "Index Test Producer A", countryCode: "PL", technology: "szkielet-drewniany" },
      { id: producerBId, userId: producerBUserId, nip: `PQIB${producerBId.slice(0, 8)}`, name: "Index Test Producer B", countryCode: "PL", technology: "szkielet-drewniany" },
    ]);
    await db.insert(projectRequest).values({
      id: projectRequestId,
      contactName: "Index Test Investor",
      contactEmail: `pq-idx-${projectRequestId}@example.test`,
      countryCode: "PL",
      projectType: "resort",
      families: ["dom"],
      unitCountMin: 12,
    });
  });

  afterAll(async () => {
    await db.delete(projectQuote).where(eq(projectQuote.projectRequestId, projectRequestId));
    await db.delete(projectRequest).where(eq(projectRequest.id, projectRequestId));
    await db.delete(producer).where(inArray(producer.id, [producerAId, producerBId]));
    await db.delete(users).where(inArray(users.id, [producerAUserId, producerBUserId]));
    await db.delete(auditLog).where(inArray(auditLog.recordId, [producerAUserId, producerBUserId, producerAId, producerBId]));
  });

  it("allows only one accepted quote per project_request, across different producers", async () => {
    await db.insert(projectQuote).values({ projectRequestId, producerId: producerAId, totalPriceCents: 500000, status: "accepted" });

    await expectRejectionToMatch(
      db.insert(projectQuote).values({ projectRequestId, producerId: producerBId, totalPriceCents: 600000, status: "accepted" }),
      /project_quote_accepted_per_request|unique constraint/i,
    );
  });
});

// spec 0037: project_request/bulk_product_inquiry carry personal data from a
// person without an account, same as inquiry (spec 0018 Key invariants) --
// the audit trigger's redaction list (drizzle/0014_bulk_request_limit_and_audit.sql)
// was extended to cover their contact_name/contact_email/contact_phone columns.
describe.skipIf(!process.env.DATABASE_URL)("lib/db/schema: audit trail redacts project_request / bulk_product_inquiry contact fields", () => {
  it("redacts contact_name/contact_email/contact_phone on project_request to their md5 hash", async () => {
    const contactEmail = `audit-pr-${crypto.randomUUID()}@example.test`;
    const [inserted] = await db
      .insert(projectRequest)
      .values({ contactName: "Audit Investor", contactEmail, contactPhone: "+48111222333", countryCode: "PL", projectType: "resort", families: ["dom"], unitCountMin: 12 })
      .returning({ id: projectRequest.id });

    const [auditRow] = await db.select().from(auditLog).where(and(eq(auditLog.recordId, inserted.id), eq(auditLog.action, "create")));

    expect(auditRow?.newValues?.contact_name).toBe(md5("Audit Investor"));
    expect(auditRow?.newValues?.contact_email).toBe(md5(contactEmail));
    expect(auditRow?.newValues?.contact_phone).toBe(md5("+48111222333"));

    await db.delete(projectRequest).where(eq(projectRequest.id, inserted.id));
    await db.delete(auditLog).where(eq(auditLog.recordId, inserted.id));
  });

  it("redacts contact fields on bulk_product_inquiry the same way", async () => {
    const producerId = crypto.randomUUID();
    const producerUserId = crypto.randomUUID();
    const productId = crypto.randomUUID();
    await db.insert(users).values({ id: producerUserId, email: `audit-bpi-producer-${producerUserId}@example.test`, phone: "+48000000000", role: "producer" });
    await db.insert(producer).values({ id: producerId, userId: producerUserId, nip: `ABP${producerId.slice(0, 9)}`, name: "Audit BPI Producer", countryCode: "PL", technology: "szkielet-drewniany" });
    await db.insert(product).values({ id: productId, producerId, family: "dom", status: "published", name: "Audit BPI Product" });

    const contactEmail = `audit-bpi-${crypto.randomUUID()}@example.test`;
    const [inserted] = await db
      .insert(bulkProductInquiry)
      .values({ productId, contactName: "Audit Bulk Buyer", contactEmail, unitCountMin: 20, deliveryCountryCode: "PL" })
      .returning({ id: bulkProductInquiry.id });

    const [auditRow] = await db.select().from(auditLog).where(and(eq(auditLog.recordId, inserted.id), eq(auditLog.action, "create")));
    expect(auditRow?.newValues?.contact_name).toBe(md5("Audit Bulk Buyer"));
    expect(auditRow?.newValues?.contact_email).toBe(md5(contactEmail));

    await db.delete(bulkProductInquiry).where(eq(bulkProductInquiry.id, inserted.id));
    await db.delete(product).where(eq(product.id, productId));
    await db.delete(producer).where(eq(producer.id, producerId));
    await db.delete(users).where(eq(users.id, producerUserId));
    await db.delete(auditLog).where(inArray(auditLog.recordId, [inserted.id, producerUserId, producerId]));
  });
});

// spec 0037, AC-10: enforced atomically by an advisory-lock trigger
// (drizzle/0014_bulk_request_limit_and_audit.sql), not by application code --
// a manual insert bypassing lib/project-request-actions.ts must trip it too.
describe.skipIf(!process.env.DATABASE_URL)("lib/db/schema: enforce_bulk_request_email_limit trigger", () => {
  it("rejects a 4th unresolved project_request for the same email, inserted directly", async () => {
    const email = `schema-limit-${crypto.randomUUID()}@example.test`;
    for (let index = 0; index < 3; index += 1) {
      await db.insert(projectRequest).values({ contactName: `Direct ${index}`, contactEmail: email, countryCode: "PL", projectType: "resort", families: ["dom"], unitCountMin: 10 + index });
    }

    await expectRejectionToMatch(
      db.insert(projectRequest).values({ contactName: "Direct 4", contactEmail: email, countryCode: "PL", projectType: "resort", families: ["dom"], unitCountMin: 20 }),
      /bulk_request_email_limit_exceeded/,
    );

    await db.delete(projectRequest).where(eq(projectRequest.contactEmail, email));
  });
});

// spec 0041 AC-5, rewritten spec 0051 AC-3: product.price_min_cents is no
// longer written directly -- it is derived by the price sync trigger
// (drizzle/0020_lame_tigra.sql, rewritten by drizzle/0033 to stop
// reading/writing price_max_cents on either table) from whichever
// product_variant has is_default = true. /check verify confirmed this
// manually on a disposable Neon branch; these tests lock the same behaviour
// in permanently.
describe.skipIf(!process.env.DATABASE_URL)("lib/db/schema: product_variant price sync trigger (spec 0041 AC-5, spec 0051 AC-3)", () => {
  const userId = crypto.randomUUID();
  const producerId = crypto.randomUUID();
  const productId = crypto.randomUUID();

  beforeAll(async () => {
    await db.insert(users).values({ id: userId, email: `variant-sync-${userId}@example.test`, phone: "+48000000000", role: "producer" });
    await db.insert(producer).values({ id: producerId, userId, nip: `PVS${producerId.slice(0, 9)}`, name: "Variant Sync Test Producer", countryCode: "PL", technology: "szkielet-drewniany" });
    await db.insert(product).values({ id: productId, producerId, family: "dom", name: "Variant Sync Test Product" });
  });

  afterEach(async () => {
    await db.delete(productVariant).where(eq(productVariant.productId, productId));
  });

  afterAll(async () => {
    await db.delete(product).where(eq(product.id, productId));
    await db.delete(producer).where(eq(producer.id, producerId));
    await db.delete(users).where(eq(users.id, userId));
    await db.delete(auditLog).where(inArray(auditLog.recordId, [userId, producerId]));
  });

  it("sets product price from the sole default variant on insert", async () => {
    await db.insert(productVariant).values({
      productId,
      completionStandard: "surowy-zamkniety",
      priceMinCents: 500000,
      isDefault: true,
    });

    const [row] = await db.select().from(product).where(eq(product.id, productId));
    expect(row?.priceMinCents).toBe(500000);
  });

  it("keeps product price in sync after switching the default variant with a single UPDATE", async () => {
    await db.insert(productVariant).values({
      productId,
      completionStandard: "surowy-zamkniety",
      priceMinCents: 500000,
      isDefault: true,
    });
    const [second] = await db
      .insert(productVariant)
      .values({ productId, completionStandard: "pod-klucz", priceMinCents: 900000, isDefault: false })
      .returning({ id: productVariant.id });

    // The spec's key invariant: switching the default is always one UPDATE,
    // never two (which would open a window with no default variant).
    await db.execute(sql`UPDATE product_variant SET is_default = (id = ${second.id}) WHERE product_id = ${productId}`);

    const [row] = await db.select().from(product).where(eq(product.id, productId));
    expect(row?.priceMinCents).toBe(900000);
  });

  it("reverts product price to NULL when no variant is marked default, never a stale value", async () => {
    await db.insert(productVariant).values({
      productId,
      completionStandard: "surowy-zamkniety",
      priceMinCents: 500000,
      isDefault: true,
    });

    await db.update(productVariant).set({ isDefault: false }).where(eq(productVariant.productId, productId));

    const [row] = await db.select().from(product).where(eq(product.id, productId));
    expect(row?.priceMinCents).toBeNull();
  });

  // spec 0051 AC-2: raising the price on a variant with a stale, still
  // physically present price_max_cents below the new price_min_cents must
  // not trip a CHECK anymore (product_variant_price_order was dropped).
  it("allows raising price_min_cents above a stale price_max_cents value", async () => {
    const [variant] = await db
      .insert(productVariant)
      .values({ productId, completionStandard: "surowy-zamkniety", priceMinCents: 500000, isDefault: true })
      .returning({ id: productVariant.id });
    // Simulate the stale column still holding a smaller value from before
    // the app stopped writing it (phase 2), via raw SQL since the column no
    // longer has a drizzle field.
    await db.execute(sql`UPDATE product_variant SET price_max_cents = 550000 WHERE id = ${variant.id}`);

    await expect(
      db.update(productVariant).set({ priceMinCents: 900000 }).where(eq(productVariant.id, variant.id)),
    ).resolves.not.toThrow();
  });
});

// spec 0041 AC-1: enforced by two partial unique indexes, not just
// application discipline -- a manual insert bypassing future application
// code must trip them too (same rationale as document_one_cover_per_product
// above).
describe.skipIf(!process.env.DATABASE_URL)("lib/db/schema: product_variant uniqueness and price constraints (spec 0041 AC-1)", () => {
  const userId = crypto.randomUUID();
  const producerId = crypto.randomUUID();
  const productId = crypto.randomUUID();

  beforeAll(async () => {
    await db.insert(users).values({ id: userId, email: `variant-unique-${userId}@example.test`, phone: "+48000000000", role: "producer" });
    await db.insert(producer).values({ id: producerId, userId, nip: `PVU${producerId.slice(0, 9)}`, name: "Variant Unique Test Producer", countryCode: "PL", technology: "szkielet-drewniany" });
    await db.insert(product).values({ id: productId, producerId, family: "dom", name: "Variant Unique Test Product" });
  });

  afterEach(async () => {
    await db.delete(productVariant).where(eq(productVariant.productId, productId));
  });

  afterAll(async () => {
    await db.delete(product).where(eq(product.id, productId));
    await db.delete(producer).where(eq(producer.id, producerId));
    await db.delete(users).where(eq(users.id, userId));
    await db.delete(auditLog).where(inArray(auditLog.recordId, [userId, producerId]));
  });

  it("rejects a second active variant with the same completion_standard for the same product", async () => {
    await db.insert(productVariant).values({ productId, completionStandard: "surowy-zamkniety" });

    await expectRejectionToMatch(
      db.insert(productVariant).values({ productId, completionStandard: "surowy-zamkniety" }),
      /product_variant_product_standard_unique/,
    );
  });

  it("allows re-adding the same completion_standard once the original variant is soft-deleted", async () => {
    const [original] = await db
      .insert(productVariant)
      .values({ productId, completionStandard: "deweloperski" })
      .returning({ id: productVariant.id });
    await db.update(productVariant).set({ deletedAt: new Date() }).where(eq(productVariant.id, original.id));

    await expect(db.insert(productVariant).values({ productId, completionStandard: "deweloperski" })).resolves.not.toThrow();
  });

  it("rejects marking a second variant as default while another is already the active default", async () => {
    await db.insert(productVariant).values({ productId, completionStandard: "surowy-zamkniety", isDefault: true });
    const [second] = await db
      .insert(productVariant)
      .values({ productId, completionStandard: "pod-klucz", isDefault: false })
      .returning({ id: productVariant.id });

    await expectRejectionToMatch(
      db.update(productVariant).set({ isDefault: true }).where(eq(productVariant.id, second.id)),
      /product_variant_one_default_per_product/,
    );
  });

  // product_variant_price_order dropped spec 0051 AC-2 (migration phase 1):
  // price_max_cents no longer has a meaningful order to enforce.
  it("rejects a variant with priceOnRequest true and a priceMinCents set (product_variant_price_on_request)", async () => {
    await expectRejectionToMatch(
      db.insert(productVariant).values({
        productId,
        completionStandard: "surowy-zamkniety",
        priceMinCents: 900000,
        priceOnRequest: true,
      }),
      /product_variant_price_on_request/,
    );
  });
});

// spec 0041 AC-2: cost_line_item.status must never be empty -- the reading
// application is never meant to guess a status from a missing value.
describe.skipIf(!process.env.DATABASE_URL)("lib/db/schema: cost_line_item status (spec 0041 AC-2)", () => {
  const userId = crypto.randomUUID();
  const producerId = crypto.randomUUID();
  const productId = crypto.randomUUID();
  const variantId = crypto.randomUUID();

  beforeAll(async () => {
    await db.insert(users).values({ id: userId, email: `cost-line-${userId}@example.test`, phone: "+48000000000", role: "producer" });
    await db.insert(producer).values({ id: producerId, userId, nip: `CLI${producerId.slice(0, 9)}`, name: "Cost Line Item Test Producer", countryCode: "PL", technology: "szkielet-drewniany" });
    await db.insert(product).values({ id: productId, producerId, family: "dom", name: "Cost Line Item Test Product" });
    await db.insert(productVariant).values({ id: variantId, productId, completionStandard: "surowy-zamkniety" });
  });

  afterEach(async () => {
    await db.delete(costLineItem).where(eq(costLineItem.productVariantId, variantId));
  });

  afterAll(async () => {
    await db.delete(productVariant).where(eq(productVariant.id, variantId));
    await db.delete(product).where(eq(product.id, productId));
    await db.delete(producer).where(eq(producer.id, producerId));
    await db.delete(users).where(eq(users.id, userId));
    await db.delete(auditLog).where(inArray(auditLog.recordId, [userId, producerId]));
  });

  it("rejects a cost line item with no status, even bypassing the application's own type check", async () => {
    await expectRejectionToMatch(
      db.insert(costLineItem).values({ productVariantId: variantId, label: "Fundament" } as never),
      /null value in column "status"|not-null constraint/i,
    );
  });

  it("stores each of the five defined statuses", async () => {
    const statuses = ["w-cenie", "obowiazkowa-doplata", "opcja", "po-stronie-klienta", "do-wyceny"] as const;
    await db.insert(costLineItem).values(statuses.map((status) => ({ productVariantId: variantId, label: status, status })));

    const rows = await db.select().from(costLineItem).where(eq(costLineItem.productVariantId, variantId));
    expect(rows.map((row) => row.status).sort()).toEqual([...statuses].sort());
  });
});

// spec 0041 AC-3: at most one row per (variant, stage) pair, and a stage's
// duration range must be well formed.
describe.skipIf(!process.env.DATABASE_URL)("lib/db/schema: product_timeline_stage constraints (spec 0041 AC-3)", () => {
  const userId = crypto.randomUUID();
  const producerId = crypto.randomUUID();
  const productId = crypto.randomUUID();
  const variantId = crypto.randomUUID();

  beforeAll(async () => {
    await db.insert(users).values({ id: userId, email: `timeline-${userId}@example.test`, phone: "+48000000000", role: "producer" });
    await db.insert(producer).values({ id: producerId, userId, nip: `TLS${producerId.slice(0, 9)}`, name: "Timeline Stage Test Producer", countryCode: "PL", technology: "szkielet-drewniany" });
    await db.insert(product).values({ id: productId, producerId, family: "dom", name: "Timeline Stage Test Product" });
    await db.insert(productVariant).values({ id: variantId, productId, completionStandard: "surowy-zamkniety" });
  });

  afterEach(async () => {
    await db.delete(productTimelineStage).where(eq(productTimelineStage.productVariantId, variantId));
  });

  afterAll(async () => {
    await db.delete(productVariant).where(eq(productVariant.id, variantId));
    await db.delete(product).where(eq(product.id, productId));
    await db.delete(producer).where(eq(producer.id, producerId));
    await db.delete(users).where(eq(users.id, userId));
    await db.delete(auditLog).where(inArray(auditLog.recordId, [userId, producerId]));
  });

  it("rejects a second stage row for the same (variant, stage_key) pair", async () => {
    await db.insert(productTimelineStage).values({ productVariantId: variantId, stageKey: "formalnosci" });

    await expectRejectionToMatch(
      db.insert(productTimelineStage).values({ productVariantId: variantId, stageKey: "formalnosci" }),
      /product_timeline_stage_variant_stage_unique/,
    );
  });

  it("rejects duration_max_days below duration_min_days", async () => {
    await expectRejectionToMatch(
      db.insert(productTimelineStage).values({ productVariantId: variantId, stageKey: "montaz", durationMinDays: 10, durationMaxDays: 5 }),
      /product_timeline_stage_duration_order/,
    );
  });
});

// spec 0041 AC-4: a document with no product_variant_id applies to every
// variant of its product; one with a specific id applies only to that variant.
describe.skipIf(!process.env.DATABASE_URL)("lib/db/schema: document.product_variant_id (spec 0041 AC-4)", () => {
  const userId = crypto.randomUUID();
  const producerId = crypto.randomUUID();
  const productId = crypto.randomUUID();
  const variantId = crypto.randomUUID();

  beforeAll(async () => {
    await db.insert(users).values({ id: userId, email: `doc-variant-${userId}@example.test`, phone: "+48000000000", role: "producer" });
    await db.insert(producer).values({ id: producerId, userId, nip: `DVT${producerId.slice(0, 9)}`, name: "Document Variant Test Producer", countryCode: "PL", technology: "szkielet-drewniany" });
    await db.insert(product).values({ id: productId, producerId, family: "dom", name: "Document Variant Test Product" });
    await db.insert(productVariant).values({ id: variantId, productId, completionStandard: "surowy-zamkniety" });
  });

  afterAll(async () => {
    const docs = await db.select({ id: document.id }).from(document).where(eq(document.productId, productId));
    if (docs.length > 0) {
      await db.delete(auditLog).where(inArray(auditLog.recordId, docs.map((d) => d.id)));
      await db.delete(document).where(eq(document.productId, productId));
    }
    await db.delete(productVariant).where(eq(productVariant.id, variantId));
    await db.delete(product).where(eq(product.id, productId));
    await db.delete(producer).where(eq(producer.id, producerId));
    await db.delete(users).where(eq(users.id, userId));
    await db.delete(auditLog).where(inArray(auditLog.recordId, [userId, producerId]));
  });

  it("accepts a document with no product_variant_id (applies to every variant of the product)", async () => {
    const [row] = await db
      .insert(document)
      .values({ r2Key: "variant-general.jpg", filename: "general.jpg", mimeType: "image/jpeg", sizeBytes: 10, purpose: "product_photo", ownerUserId: userId, productId })
      .returning();

    expect(row.productVariantId).toBeNull();
  });

  it("accepts a document scoped to a specific product_variant_id", async () => {
    const [row] = await db
      .insert(document)
      .values({
        r2Key: "variant-specific.jpg",
        filename: "specific.jpg",
        mimeType: "image/jpeg",
        sizeBytes: 10,
        purpose: "product_photo",
        ownerUserId: userId,
        productId,
        productVariantId: variantId,
      })
      .returning();

    expect(row.productVariantId).toBe(variantId);
  });
});

// spec 0041 AC-6, AC-9: one-way enum extensions (Postgres has no ADD VALUE
// rollback) -- confirms the new values are actually usable, not just declared.
describe.skipIf(!process.env.DATABASE_URL)("lib/db/schema: spec 0041 enum extensions", () => {
  const userId = crypto.randomUUID();
  const producerId = crypto.randomUUID();

  beforeAll(async () => {
    await db.insert(users).values({ id: userId, email: `enum-ext-${userId}@example.test`, phone: "+48000000000", role: "producer" });
    await db.insert(producer).values({ id: producerId, userId, nip: `EET${producerId.slice(0, 9)}`, name: "Enum Extension Test Producer", countryCode: "PL", technology: "szkielet-drewniany" });
  });

  afterAll(async () => {
    await db.delete(producer).where(eq(producer.id, producerId));
    await db.delete(users).where(eq(users.id, userId));
    await db.delete(auditLog).where(inArray(auditLog.recordId, [userId, producerId]));
  });

  it("accepts product_category = 'wynajem-hotel' (AC-6)", async () => {
    const productId = crypto.randomUUID();
    await db.insert(product).values({ id: productId, producerId, family: "dom", category: "wynajem-hotel", name: "Rental Hotel Test Product" });

    const [row] = await db.select().from(product).where(eq(product.id, productId));
    expect(row?.category).toBe("wynajem-hotel");

    await db.delete(product).where(eq(product.id, productId));
  });

  it("accepts document_purpose = 'product_realization_photo', distinct from product_photo (AC-9)", async () => {
    const productId = crypto.randomUUID();
    await db.insert(product).values({ id: productId, producerId, family: "dom", name: "Realization Photo Test Product" });
    const [row] = await db
      .insert(document)
      .values({ r2Key: "realization.jpg", filename: "realization.jpg", mimeType: "image/jpeg", sizeBytes: 10, purpose: "product_realization_photo", ownerUserId: userId, productId })
      .returning();

    expect(row.purpose).toBe("product_realization_photo");
    expect(row.purpose).not.toBe("product_photo");

    await db.delete(auditLog).where(eq(auditLog.recordId, row.id));
    await db.delete(document).where(eq(document.id, row.id));
    await db.delete(product).where(eq(product.id, productId));
  });
});
