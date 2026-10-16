import { eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "./client";
import { auditLog, inquiryAttachment, projectRequest, users } from "./schema";

// Spec 0070 część D, zadanie 20 (drizzle/0059): limity i stan zapytania egzekwuje
// wyzwalacz w bazie, nie sam kod aplikacji, więc wstawienie wprost musi być odrzucone
// tak samo jak przez akcję. Bije w prawdziwą bazę dev (vitest.setup.ts).
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

const MB = 1024 * 1024;

describe.skipIf(!process.env.DATABASE_URL)("lib/db/schema: inquiry_attachment (migracja 0059)", () => {
  const staffUserId = crypto.randomUUID();
  const createdRequestIds: string[] = [];

  beforeAll(async () => {
    await db.insert(users).values({ id: staffUserId, email: `att-staff-${staffUserId}@example.test`, phone: "+48000000020", role: "admin" });
  });

  afterAll(async () => {
    for (const id of createdRequestIds) {
      await db.delete(inquiryAttachment).where(eq(inquiryAttachment.projectRequestId, id));
      await db.delete(projectRequest).where(eq(projectRequest.id, id));
    }
    await db.delete(auditLog).where(eq(auditLog.actorUserId, staffUserId));
    await db.delete(users).where(eq(users.id, staffUserId));
  });

  async function newRequest(values: Partial<typeof projectRequest.$inferInsert> = {}): Promise<string> {
    const [row] = await db
      .insert(projectRequest)
      .values({
        contactName: "Attachment Test",
        contactEmail: `att-${crypto.randomUUID()}@example.test`,
        countryCode: "PL",
        projectType: "resort",
        families: ["dom"],
        unitCount: 10,
        ...values,
      })
      .returning({ id: projectRequest.id });
    createdRequestIds.push(row.id);
    return row.id;
  }

  function file(
    requestId: string,
    overrides: Partial<typeof inquiryAttachment.$inferInsert> = {},
  ): typeof inquiryAttachment.$inferInsert {
    return {
      projectRequestId: requestId,
      r2Key: `${crypto.randomUUID()}.pdf`,
      filename: "plan.pdf",
      mimeType: "application/pdf",
      sizeBytes: 1000,
      uploadedByKind: "guest",
      ...overrides,
    };
  }

  it("accepts ten active files and rejects the eleventh", async () => {
    const requestId = await newRequest();
    for (let index = 0; index < 10; index += 1) await db.insert(inquiryAttachment).values(file(requestId));

    await expectRejectionToMatch(db.insert(inquiryAttachment).values(file(requestId)), /inquiry_attachment_limit_count/);
  });

  it("does not count deleted files toward the ten, but counts hidden ones", async () => {
    const requestId = await newRequest();
    for (let index = 0; index < 10; index += 1) {
      await db.insert(inquiryAttachment).values(
        index < 3
          ? file(requestId, { deletedAt: new Date(), deletedByKind: "client" })
          : file(requestId, index === 3 ? { hiddenAt: new Date(), hiddenReason: "dane kontaktowe", hiddenByUserId: staffUserId } : {}),
      );
    }
    // 7 aktywnych (w tym jeden ukryty): trzy kolejne mieszczą się, czwarte nie.
    for (let index = 0; index < 3; index += 1) await db.insert(inquiryAttachment).values(file(requestId));
    await expectRejectionToMatch(db.insert(inquiryAttachment).values(file(requestId)), /inquiry_attachment_limit_count/);
  });

  it("rejects going over 60 MB of active files", async () => {
    const requestId = await newRequest();
    for (let index = 0; index < 3; index += 1) await db.insert(inquiryAttachment).values(file(requestId, { sizeBytes: 20 * MB }));

    await expectRejectionToMatch(
      db.insert(inquiryAttachment).values(file(requestId, { sizeBytes: 1 })),
      /inquiry_attachment_limit_size/,
    );
  });

  it("enforces the hard limit of 30 rows not yet purged from R2, and frees a slot once purged", async () => {
    const requestId = await newRequest();
    // 30 usuniętych (nie liczą się do 10 aktywnych), ale obiekty jeszcze w R2.
    const rows = Array.from({ length: 30 }, () => file(requestId, { deletedAt: new Date(), deletedByKind: "client" }));
    await db.insert(inquiryAttachment).values(rows);

    await expectRejectionToMatch(db.insert(inquiryAttachment).values(file(requestId)), /inquiry_attachment_limit_stored/);

    const [first] = await db.select({ id: inquiryAttachment.id }).from(inquiryAttachment).where(eq(inquiryAttachment.projectRequestId, requestId)).limit(1);
    await db.update(inquiryAttachment).set({ purgedAt: new Date() }).where(eq(inquiryAttachment.id, first.id));
    await db.insert(inquiryAttachment).values(file(requestId));
  });

  it("enforces the 150 MB hard limit on bytes not yet purged", async () => {
    const requestId = await newRequest();
    // 8 usuniętych po 19 MB = 152 MB już przekracza 150 MB po dodaniu czegokolwiek większego niż 0.
    await db.insert(inquiryAttachment).values(
      Array.from({ length: 7 }, () => file(requestId, { sizeBytes: 20 * MB, deletedAt: new Date(), deletedByKind: "staff" })),
    );
    // 140 MB w R2, plik 11 MB przekroczyłby 150 MB.
    await expectRejectionToMatch(
      db.insert(inquiryAttachment).values(file(requestId, { sizeBytes: 11 * MB })),
      /inquiry_attachment_limit_stored/,
    );
    await db.insert(inquiryAttachment).values(file(requestId, { sizeBytes: 10 * MB }));
  });

  it("rejects client and guest files once the request is closed, selected, past deadline or summary published", async () => {
    const closedId = await newRequest({ status: "closed", closedAt: new Date(), closedReason: "staff_closed" });
    const pastDeadlineId = await newRequest({ deadlineAt: new Date(Date.now() - 60_000) });
    const publishedId = await newRequest({ summaryPublishedAt: new Date() });
    const acceptedId = await newRequest({ status: "accepted" });

    for (const requestId of [closedId, pastDeadlineId, publishedId, acceptedId]) {
      await expectRejectionToMatch(db.insert(inquiryAttachment).values(file(requestId)), /inquiry_attachment_closed/);
    }
  });

  it("lets staff add files in any request state (limits still apply)", async () => {
    const closedId = await newRequest({ status: "closed", closedAt: new Date(), closedReason: "staff_closed" });
    await db.insert(inquiryAttachment).values(file(closedId, { uploadedByKind: "staff", uploadedByUserId: staffUserId }));

    for (let index = 0; index < 9; index += 1) {
      await db.insert(inquiryAttachment).values(file(closedId, { uploadedByKind: "staff", uploadedByUserId: staffUserId }));
    }
    await expectRejectionToMatch(
      db.insert(inquiryAttachment).values(file(closedId, { uploadedByKind: "staff", uploadedByUserId: staffUserId })),
      /inquiry_attachment_limit_count/,
    );
  });

  it("keeps filename and R2 key out of the audit trail", async () => {
    const requestId = await newRequest();
    const id = crypto.randomUUID();
    await db.batch([
      db.execute(sql`select set_config('app.actor_user_id', ${staffUserId}, true)`),
      db.insert(inquiryAttachment).values(file(requestId, { id, filename: "Jan Kowalski telefon 600100200.pdf", uploadedByKind: "staff", uploadedByUserId: staffUserId })),
    ]);

    const [row] = await db.select().from(auditLog).where(eq(auditLog.recordId, id));
    expect(row?.actorUserId).toBe(staffUserId);
    expect(row?.newValues).toBeTruthy();
    expect(row?.newValues).not.toHaveProperty("filename");
    expect(row?.newValues).not.toHaveProperty("r2_key");
    expect(JSON.stringify(row?.newValues)).not.toContain("Kowalski");
    expect(row?.newValues?.size_bytes).toBe(1000);
  });

  it("rejects inconsistent rows (guest with a user, hidden without a reason, link to nothing)", async () => {
    const requestId = await newRequest();
    await expectRejectionToMatch(
      db.insert(inquiryAttachment).values(file(requestId, { uploadedByKind: "guest", uploadedByUserId: staffUserId })),
      /inquiry_attachment_guest_has_no_user/,
    );
    await expectRejectionToMatch(
      db.insert(inquiryAttachment).values(file(requestId, { hiddenAt: new Date() })),
      /inquiry_attachment_hidden_consistent/,
    );
    await expectRejectionToMatch(
      db.insert(inquiryAttachment).values(file(requestId, { projectRequestId: null })),
      /inquiry_attachment_exactly_one_link/,
    );
  });
});
