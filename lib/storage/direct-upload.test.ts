import { eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const captureErrorMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/observability", () => ({ trackEvent: vi.fn(), captureError: captureErrorMock }));
const deleteMock = vi.hoisted(() => vi.fn<(key: string) => Promise<void>>());
vi.mock("./private-r2-client", () => ({ deletePrivateObject: deleteMock }));

import { db } from "@/lib/db/client";
import { client, inquiryAttachment, projectRequest, uploadIntent, users } from "@/lib/db/schema";
import { createIntent, pendingForTarget, runUploadsCleanup, supersedeSameUpload } from "./direct-upload";

vi.setConfig({ hookTimeout: 30_000, testTimeout: 30_000 });

// Spec 0085 AC-9: zadanie czyszczące na prawdziwej bazie dev, R2 podmieniony.
describe.skipIf(!process.env.DATABASE_URL)("lib/storage/direct-upload: cleanup and limits, real DB, mocked R2", () => {
  const userId = crypto.randomUUID();
  const clientId = crypto.randomUUID();
  let requestId: string;
  const intentIds: string[] = [];
  const attachmentIds: string[] = [];

  beforeAll(async () => {
    await db.insert(users).values({ id: userId, email: `du-${userId}@example.test`, phone: "+48000000041", role: "client" });
    await db.insert(client).values({ id: clientId, userId });
    const [row] = await db
      .insert(projectRequest)
      .values({
        clientId,
        contactName: "DU Buyer",
        contactEmail: `du-${userId}@example.test`,
        countryCode: "PL",
        projectType: "resort",
        families: ["dom"],
        unitCount: 10,
      })
      .returning({ id: projectRequest.id });
    requestId = row.id;
  });

  afterAll(async () => {
    await db.delete(inquiryAttachment).where(inArray(inquiryAttachment.id, attachmentIds));
    await db.delete(uploadIntent).where(eq(uploadIntent.projectRequestId, requestId));
    await db.delete(projectRequest).where(eq(projectRequest.id, requestId));
    await db.delete(client).where(eq(client.id, clientId));
    await db.delete(users).where(eq(users.id, userId));
  });

  beforeEach(() => {
    deleteMock.mockReset().mockResolvedValue(undefined);
    captureErrorMock.mockClear();
  });

  const base = () => ({
    purpose: "inquiry_attachment" as const,
    target: { projectRequestId: requestId },
    actorKind: "client" as const,
    actorUserId: userId,
    mimeType: "application/pdf",
    declaredSizeBytes: 1000,
    filename: "plan.pdf",
    consentConfirmed: true,
  });

  async function ageIntent(id: string, minutesAgo: number, extra: Partial<{ consumed: boolean }> = {}) {
    await db
      .update(uploadIntent)
      .set({
        createdAt: new Date(Date.now() - minutesAgo * 60_000),
        expiresAt: new Date(Date.now() - (minutesAgo - 60) * 60_000),
        ...(extra.consumed ? { consumedAt: new Date() } : {}),
      })
      .where(eq(uploadIntent.id, id));
  }

  it("counts a started upload for a quarter of an hour and supersedes a repeat of the same file", async () => {
    const first = await createIntent(base());
    intentIds.push(first.id);
    expect(await pendingForTarget({ projectRequestId: requestId })).toEqual({ count: 1, bytes: 1000 });

    await supersedeSameUpload(base());
    expect(deleteMock).toHaveBeenCalledWith(first.r2Key);
    expect(await pendingForTarget({ projectRequestId: requestId })).toEqual({ count: 0, bytes: 0 });
  });

  it("purges expired unconsumed intents once, and a second run claims nothing new", async () => {
    const stale = await createIntent(base());
    const consumed = await createIntent({ ...base(), filename: "b.pdf" });
    await ageIntent(stale.id, 120);
    await ageIntent(consumed.id, 120, { consumed: true });

    const first = await runUploadsCleanup();
    expect(first.purgedIntents).toBeGreaterThanOrEqual(1);
    expect(deleteMock).toHaveBeenCalledWith(stale.r2Key);

    deleteMock.mockClear();
    const second = await runUploadsCleanup();
    expect(second.purgedIntents).toBe(0);
  });

  it("puts the claim back when R2 fails, and keeps going with the next object", async () => {
    const failing = await createIntent({ ...base(), filename: "x.pdf" });
    const fine = await createIntent({ ...base(), filename: "y.pdf" });
    await ageIntent(failing.id, 120);
    await ageIntent(fine.id, 120);
    deleteMock.mockImplementation(async (key) => {
      if (key === failing.r2Key) throw new Error("r2 down");
    });

    const result = await runUploadsCleanup();

    expect(result.errors).toBeGreaterThanOrEqual(1);
    expect(captureErrorMock).toHaveBeenCalled();
    expect(deleteMock).toHaveBeenCalledWith(fine.r2Key);
    const [failedRow] = await db.select().from(uploadIntent).where(eq(uploadIntent.id, failing.id));
    const [fineRow] = await db.select().from(uploadIntent).where(eq(uploadIntent.id, fine.id));
    expect(failedRow.purgedAt).toBeNull();
    expect(fineRow.purgedAt).not.toBeNull();
  });

  it("purges files soft deleted more than 30 days ago and marks them", async () => {
    const [row] = await db
      .insert(inquiryAttachment)
      .values({
        projectRequestId: requestId,
        r2Key: `inquiry-attachments/${crypto.randomUUID()}.pdf`,
        filename: "stary.pdf",
        mimeType: "application/pdf",
        sizeBytes: 10,
        uploadedByKind: "client",
        uploadedByUserId: userId,
        deletedAt: new Date(Date.now() - 31 * 24 * 3600_000),
        deletedByKind: "client",
      })
      .returning({ id: inquiryAttachment.id, r2Key: inquiryAttachment.r2Key });
    attachmentIds.push(row.id);

    const result = await runUploadsCleanup();

    expect(result.purgedDeletedAttachments).toBeGreaterThanOrEqual(1);
    expect(deleteMock).toHaveBeenCalledWith(row.r2Key);
    const [after] = await db.select({ purgedAt: inquiryAttachment.purgedAt }).from(inquiryAttachment).where(eq(inquiryAttachment.id, row.id));
    expect(after.purgedAt).not.toBeNull();
  });
});
