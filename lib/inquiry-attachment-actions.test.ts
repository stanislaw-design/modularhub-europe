import { and, eq, inArray } from "drizzle-orm";
import type { Session } from "next-auth";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

// @/lib/observability pulls in "server-only" and @/auth does not load under Vitest/jsdom,
// so both are mocked at their boundary, like lib/project-request-actions.test.ts. The
// private R2 bucket is mocked too: these tests hit the real dev database, never R2.
vi.mock("server-only", () => ({}));
const trackEventMock = vi.hoisted(() => vi.fn());
const captureErrorMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/observability", () => ({ trackEvent: trackEventMock, captureError: captureErrorMock }));
const authMock = vi.hoisted(() => vi.fn<() => Promise<Session | null>>());
vi.mock("@/auth", () => ({ auth: authMock }));
// Spec 0085: R2 to pamięć w procesie. `store` trzyma obiekty pod kluczami, a podpisany adres do
// zapisu niesie klucz w parametrze, żeby test mógł "wysłać" plik tak, jak zrobiłaby to przeglądarka.
const store = vi.hoisted(() => new Map<string, Buffer>());
const PrivateObjectTooLargeError = vi.hoisted(() => class PrivateObjectTooLargeError extends Error {});
const deleteObjectMock = vi.hoisted(() => vi.fn(async (key: string) => void store.delete(key)));
const signedUrlMock = vi.hoisted(() => vi.fn().mockResolvedValue("https://signed.example.test/file"));
const signedUploadMock = vi.hoisted(() =>
  vi.fn(async (key: string, _ttl: number, _type: string, _length?: number) => `https://signed.example.test/put?key=${key}`),
);
const copyMock = vi.hoisted(() =>
  vi.fn(async (from: string, to: string) => {
    store.set(to, store.get(from)!);
  }),
);
vi.mock("@/lib/storage/private-r2-client", () => ({
  deletePrivateObject: deleteObjectMock,
  buildSignedDownloadUrl: signedUrlMock,
  buildSignedUploadUrl: signedUploadMock,
  copyPrivateObject: copyMock,
  headPrivateObject: vi.fn(async (key: string) => (store.has(key) ? { size: store.get(key)!.byteLength, etag: '"etag"' } : null)),
  readPrivateObjectBytes: vi.fn(async (key: string, maxBytes: number) => {
    const bytes = store.get(key)!;
    if (bytes.byteLength > maxBytes) throw new PrivateObjectTooLargeError();
    return { bytes, etag: '"etag"' };
  }),
  PrivateObjectTooLargeError,
}));

import { db } from "@/lib/db/client";
import {
  auditLog,
  client,
  inquiryAttachment,
  producer,
  producerCapacityProfile,
  producerMember,
  product,
  projectQuote,
  projectRequest,
  uploadIntent,
  users,
} from "@/lib/db/schema";
import { getProjectRequestForBoardDetail } from "@/lib/db/queries";
import { createUploadToken } from "@/lib/inquiry-attachment-token";
import {
  confirmInquiryAttachment,
  deleteInquiryAttachment,
  getInquiryAttachmentUrl,
  hideInquiryAttachment,
  listInquiryAttachments,
  requestInquiryAttachmentUpload,
  unhideInquiryAttachment,
  type AttachmentActionResult,
  type UploadInquiryAttachmentAuth,
} from "./inquiry-attachment-actions";
import type { InquiryKind } from "./inquiry-attachment-specs";

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
const PDF = Buffer.from("%PDF-1.7\n1 0 obj\n/Type /Page\nendobj\n%%EOF", "latin1");

interface TestFile {
  bytes: Buffer;
  name: string;
  // Typ, który przeglądarka deklaruje serwerowi; domyślnie wnioskowany z bajtów.
  declaredType?: string;
}

function makeFile(bytes: Buffer, name: string, declaredType?: string): TestFile {
  return { bytes, name, declaredType };
}

function sniffType(bytes: Buffer): string {
  if (bytes.subarray(0, 4).equals(PNG.subarray(0, 4))) return "image/png";
  return "application/pdf";
}

function keyFromUploadUrl(url: string): string {
  return new URL(url).searchParams.get("key")!;
}

// Zastępuje dawną akcję `uploadInquiryAttachment`: prośba, "wysłanie" pliku do pamięci udającej R2
// (tak jak robi to przeglądarka) i potwierdzenie. Dzięki temu testy usuwania, widoczności i znacznika
// zmian dalej tworzą pliki prawdziwą ścieżką spec 0085.
async function uploadInquiryAttachment(
  kind: InquiryKind,
  inquiryId: string,
  file: TestFile,
  authInput: UploadInquiryAttachmentAuth = {},
): Promise<AttachmentActionResult> {
  const requested = await requestInquiryAttachmentUpload(
    kind,
    inquiryId,
    { filename: file.name, mimeType: file.declaredType ?? sniffType(file.bytes), sizeBytes: file.bytes.byteLength },
    authInput,
  );
  if (!requested.ok) return requested;
  store.set(keyFromUploadUrl(requested.uploadUrl!), file.bytes);
  return confirmInquiryAttachment(requested.intentId!, { uploadToken: authInput.uploadToken });
}

// Zestaw rusza równolegle na wspólnej bazie Neon, a w CI hooki sprzątające bywają wolniejsze niż 10 s.
vi.setConfig({ hookTimeout: 30_000, testTimeout: 30_000 });

describe.skipIf(!process.env.DATABASE_URL)("lib/inquiry-attachment-actions: real DB, mocked R2 and auth", () => {
  const adminId = crypto.randomUUID();
  const clientUserId = crypto.randomUUID();
  const otherClientUserId = crypto.randomUUID();
  const clientId = crypto.randomUUID();
  const otherClientId = crypto.randomUUID();
  const matchedUserId = crypto.randomUUID();
  const matchedProducerId = crypto.randomUUID();
  const unmatchedUserId = crypto.randomUUID();
  const unmatchedProducerId = crypto.randomUUID();
  const requestIds: string[] = [];
  const originalSecret = process.env.AUTH_SECRET;

  function session(userId: string, role: "admin" | "client" | "producer"): Session {
    return {
      user: { id: userId, role, phone: "+48000000030", name: "Test", email: `${userId}@example.test`, image: null },
      expires: new Date(Date.now() + 3600_000).toISOString(),
    } as Session;
  }

  beforeAll(async () => {
    process.env.AUTH_SECRET = "attachment-actions-test-secret";
    await db.insert(users).values([
      { id: adminId, email: `iaa-admin-${adminId}@example.test`, phone: "+48000000031", role: "admin" },
      { id: clientUserId, email: `iaa-client-${clientUserId}@example.test`, phone: "+48000000032", role: "client" },
      { id: otherClientUserId, email: `iaa-client2-${otherClientUserId}@example.test`, phone: "+48000000033", role: "client" },
      { id: matchedUserId, email: `iaa-pm-${matchedUserId}@example.test`, phone: "+48000000034", role: "producer" },
      { id: unmatchedUserId, email: `iaa-pu-${unmatchedUserId}@example.test`, phone: "+48000000035", role: "producer" },
    ]);
    await db.insert(client).values([
      { id: clientId, userId: clientUserId },
      { id: otherClientId, userId: otherClientUserId },
    ]);
    await db.insert(producer).values([
      { id: matchedProducerId, userId: matchedUserId, nip: `IM${matchedProducerId.slice(0, 9)}`, name: "IAA Matched", countryCode: "PL", technology: "szkielet-drewniany" },
      { id: unmatchedProducerId, userId: unmatchedUserId, nip: `IU${unmatchedProducerId.slice(0, 9)}`, name: "IAA Unmatched", countryCode: "PL", technology: "szkielet-drewniany" },
    ]);
    await db.insert(producerMember).values([
      { producerId: matchedProducerId, userId: matchedUserId },
      { producerId: unmatchedProducerId, userId: unmatchedUserId },
    ]);
    // Dopasowany: zatwierdzony wolumenowo, z opublikowanym domem. Niedopasowany: bez profilu.
    await db.insert(producerCapacityProfile).values({ producerId: matchedProducerId, volumeVerificationStatus: "approved" });
    await db.insert(product).values({ producerId: matchedProducerId, family: "dom", status: "published", name: "IAA Matched Product" });
  });

  afterAll(async () => {
    if (originalSecret === undefined) delete process.env.AUTH_SECRET;
    else process.env.AUTH_SECRET = originalSecret;
    for (const id of requestIds) {
      await db.update(projectRequest).set({ selectedQuoteId: null }).where(eq(projectRequest.id, id));
      await db.delete(inquiryAttachment).where(eq(inquiryAttachment.projectRequestId, id));
      await db.delete(uploadIntent).where(eq(uploadIntent.projectRequestId, id));
      await db.delete(projectQuote).where(eq(projectQuote.projectRequestId, id));
      await db.delete(projectRequest).where(eq(projectRequest.id, id));
    }
    await db.delete(product).where(eq(product.producerId, matchedProducerId));
    await db.delete(producerCapacityProfile).where(eq(producerCapacityProfile.producerId, matchedProducerId));
    await db.delete(producerMember).where(inArray(producerMember.producerId, [matchedProducerId, unmatchedProducerId]));
    await db.delete(producer).where(inArray(producer.id, [matchedProducerId, unmatchedProducerId]));
    await db.delete(client).where(inArray(client.id, [clientId, otherClientId]));
    await db.delete(auditLog).where(eq(auditLog.actorUserId, adminId));
    await db.delete(users).where(inArray(users.id, [adminId, clientUserId, otherClientUserId, matchedUserId, unmatchedUserId]));
  });

  beforeEach(() => {
    authMock.mockReset().mockResolvedValue(null);
    store.clear();
    signedUploadMock.mockClear();
    copyMock.mockClear();
    deleteObjectMock.mockClear();
    signedUrlMock.mockClear();
    trackEventMock.mockClear();
    captureErrorMock.mockClear();
  });

  afterEach(() => {
    authMock.mockReset();
  });

  async function newRequest(values: Partial<typeof projectRequest.$inferInsert> = {}): Promise<string> {
    const [row] = await db
      .insert(projectRequest)
      .values({
        clientId,
        contactName: "IAA Buyer",
        contactEmail: `iaa-${crypto.randomUUID()}@example.test`,
        countryCode: "PL",
        projectType: "resort",
        families: ["dom"],
        unitCount: 10,
        ...values,
      })
      .returning({ id: projectRequest.id });
    requestIds.push(row.id);
    return row.id;
  }

  describe("upload", () => {
    it("rejects a guest without a token and stores nothing", async () => {
      const id = await newRequest();
      const result = await uploadInquiryAttachment("request", id, makeFile(PDF, "plan.pdf"), { confirmedNoContactData: true });

      expect(result).toMatchObject({ ok: false, errorCode: "no_access" });
      expect(signedUploadMock).not.toHaveBeenCalled();
    });

    it("rejects an expired token and a token for another inquiry", async () => {
      const id = await newRequest();
      const otherId = await newRequest();
      const expired = createUploadToken("request", id, new Date(Date.now() - 3 * 3600_000));
      const wrongInquiry = createUploadToken("request", otherId);

      for (const uploadToken of [expired, wrongInquiry]) {
        const result = await uploadInquiryAttachment("request", id, makeFile(PDF, "plan.pdf"), { uploadToken, confirmedNoContactData: true });
        expect(result).toMatchObject({ ok: false, errorCode: "no_access" });
      }
    });

    it("answers a missing inquiry exactly like a forbidden one", async () => {
      const result = await uploadInquiryAttachment("request", crypto.randomUUID(), makeFile(PDF, "plan.pdf"), {});
      expect(result).toMatchObject({ ok: false, errorCode: "no_access" });
    });

    it("requires the no contact data confirmation from a guest, but not from an admin", async () => {
      const id = await newRequest();
      const uploadToken = createUploadToken("request", id);

      const refused = await uploadInquiryAttachment("request", id, makeFile(PDF, "plan.pdf"), { uploadToken });
      expect(refused).toMatchObject({ ok: false, errorCode: "consent_required" });

      authMock.mockResolvedValue(session(adminId, "admin"));
      const accepted = await uploadInquiryAttachment("request", id, makeFile(PDF, "plan.pdf"), {});
      expect(accepted.ok).toBe(true);
    });

    it("stores a guest file with a valid token: sanitized name, sniffed type, parent marker, no filename in the event", async () => {
      const id = await newRequest();
      const uploadToken = createUploadToken("request", id);

      // Obraz nazwany .pdf zapisuje się jako obraz (AC-28, typ ustala sygnatura).
      const result = await uploadInquiryAttachment("request", id, makeFile(PNG, "../../Rzut żółć.pdf"), {
        uploadToken,
        confirmedNoContactData: true,
      });

      expect(result.ok).toBe(true);
      const [row] = await db.select().from(inquiryAttachment).where(eq(inquiryAttachment.id, result.attachmentId!));
      expect(row).toMatchObject({
        projectRequestId: id,
        filename: "Rzut żółć.pdf",
        mimeType: "image/png",
        sizeBytes: PNG.byteLength,
        uploadedByKind: "guest",
        uploadedByUserId: null,
      });
      expect(row.r2Key).toMatch(/^inquiry-attachments\/[0-9a-f-]{36}\.png$/);
      // Plik jest pod kluczem ostatecznym, a klucz tymczasowy został sprzątnięty (AC-14).
      expect(store.get(row.r2Key)).toEqual(PNG);
      expect([...store.keys()].some((key) => key.startsWith("uploads/"))).toBe(false);

      const [parent] = await db.select({ changedAt: projectRequest.attachmentsChangedAt }).from(projectRequest).where(eq(projectRequest.id, id));
      expect(parent.changedAt).toBeInstanceOf(Date);

      expect(trackEventMock).toHaveBeenCalledWith(
        "inquiry_attachment_uploaded",
        expect.objectContaining({ kind: "request", mimeType: "image/png" }),
        id,
      );
      expect(JSON.stringify(trackEventMock.mock.calls)).not.toContain("Rzut");
    });

    it("rejects a file with no allowed signature at confirmation and removes the object", async () => {
      const id = await newRequest();
      const uploadToken = createUploadToken("request", id);
      const result = await uploadInquiryAttachment(
        "request",
        id,
        makeFile(Buffer.from("<script>alert(1)</script>"), "x.pdf", "application/pdf"),
        { uploadToken, confirmedNoContactData: true },
      );

      expect(result).toMatchObject({ ok: false, errorCode: "file_rejected" });
      expect(store.size).toBe(0);
      expect(await db.select().from(inquiryAttachment).where(eq(inquiryAttachment.projectRequestId, id))).toHaveLength(0);
    });

    it("rejects an image declared as PDF, and a declared type outside the allow list", async () => {
      const id = await newRequest();
      const uploadToken = createUploadToken("request", id);
      const auth = { uploadToken, confirmedNoContactData: true };

      const mismatch = await uploadInquiryAttachment("request", id, makeFile(PNG, "a.pdf", "application/pdf"), auth);
      expect(mismatch).toMatchObject({ ok: false, errorCode: "file_rejected" });

      const badType = await uploadInquiryAttachment("request", id, makeFile(PDF, "a.exe", "application/x-msdownload"), auth);
      expect(badType).toMatchObject({ ok: false, errorCode: "invalid_type" });
    });

    it("answers not_uploaded when confirmed before the file was sent, and keeps the intent for a retry", async () => {
      const id = await newRequest();
      const uploadToken = createUploadToken("request", id);
      const requested = await requestInquiryAttachmentUpload(
        "request",
        id,
        { filename: "plan.pdf", mimeType: "application/pdf", sizeBytes: PDF.byteLength },
        { uploadToken, confirmedNoContactData: true },
      );
      expect(requested.ok).toBe(true);

      const early = await confirmInquiryAttachment(requested.intentId!, { uploadToken });
      expect(early).toMatchObject({ ok: false, errorCode: "not_uploaded" });

      store.set(keyFromUploadUrl(requested.uploadUrl!), PDF);
      const retry = await confirmInquiryAttachment(requested.intentId!, { uploadToken });
      expect(retry.ok).toBe(true);
    });

    it("rejects a file whose size differs from the declaration and removes it", async () => {
      const id = await newRequest();
      const uploadToken = createUploadToken("request", id);
      const requested = await requestInquiryAttachmentUpload(
        "request",
        id,
        { filename: "plan.pdf", mimeType: "application/pdf", sizeBytes: PDF.byteLength },
        { uploadToken, confirmedNoContactData: true },
      );
      store.set(keyFromUploadUrl(requested.uploadUrl!), Buffer.concat([PDF, Buffer.from("tail")]));

      const result = await confirmInquiryAttachment(requested.intentId!, { uploadToken });

      expect(result).toMatchObject({ ok: false, errorCode: "file_rejected" });
      expect(store.size).toBe(0);
    });

    it("refuses a size above 20 MB and an empty file at request time", async () => {
      const id = await newRequest();
      const uploadToken = createUploadToken("request", id);
      const auth = { uploadToken, confirmedNoContactData: true };

      const huge = await requestInquiryAttachmentUpload("request", id, { filename: "a.pdf", mimeType: "application/pdf", sizeBytes: 21 * 1024 * 1024 }, auth);
      expect(huge).toMatchObject({ ok: false, errorCode: "too_large" });
      const empty = await requestInquiryAttachmentUpload("request", id, { filename: "a.pdf", mimeType: "application/pdf", sizeBytes: 0 }, auth);
      expect(empty).toMatchObject({ ok: false, errorCode: "invalid_type" });
    });

    it("lets only the same caller confirm, and a second confirmation yields no second row", async () => {
      const id = await newRequest();
      authMock.mockResolvedValue(session(adminId, "admin"));
      const requested = await requestInquiryAttachmentUpload("request", id, { filename: "plan.pdf", mimeType: "application/pdf", sizeBytes: PDF.byteLength }, {});
      store.set(keyFromUploadUrl(requested.uploadUrl!), PDF);

      // Gość z tokenem nie potwierdzi zamiaru admina.
      authMock.mockResolvedValue(null);
      const guest = await confirmInquiryAttachment(requested.intentId!, { uploadToken: createUploadToken("request", id) });
      expect(guest).toMatchObject({ ok: false, errorCode: "no_access" });

      authMock.mockResolvedValue(session(adminId, "admin"));
      const first = await confirmInquiryAttachment(requested.intentId!);
      expect(first.ok).toBe(true);
      const second = await confirmInquiryAttachment(requested.intentId!);
      expect(second).toMatchObject({ ok: false, errorCode: "no_access" });
      expect(await db.select().from(inquiryAttachment).where(eq(inquiryAttachment.projectRequestId, id))).toHaveLength(1);
    });

    it("lets a repeated request for the same file replace the earlier one without taking a second slot", async () => {
      const id = await newRequest();
      authMock.mockResolvedValue(session(clientUserId, "client"));
      const declaration = { filename: "plan.pdf", mimeType: "application/pdf", sizeBytes: PDF.byteLength };
      const first = await requestInquiryAttachmentUpload("request", id, declaration, { confirmedNoContactData: true });
      const second = await requestInquiryAttachmentUpload("request", id, declaration, { confirmedNoContactData: true });

      expect(second.ok).toBe(true);
      expect(second.intentId).not.toBe(first.intentId);
      expect(deleteObjectMock).toHaveBeenCalledWith(keyFromUploadUrl(first.uploadUrl!));
      store.set(keyFromUploadUrl(first.uploadUrl!), PDF);
      expect(await confirmInquiryAttachment(first.intentId!)).toMatchObject({ ok: false, errorCode: "no_access" });
    });

    it("lets the owning client upload, and another client not", async () => {
      const id = await newRequest();

      authMock.mockResolvedValue(session(otherClientUserId, "client"));
      const stranger = await uploadInquiryAttachment("request", id, makeFile(PDF, "a.pdf"), { confirmedNoContactData: true });
      expect(stranger).toMatchObject({ ok: false, errorCode: "no_access" });

      authMock.mockResolvedValue(session(clientUserId, "client"));
      const owner = await uploadInquiryAttachment("request", id, makeFile(PDF, "a.pdf"), { confirmedNoContactData: true });
      expect(owner.ok).toBe(true);
      const [row] = await db.select().from(inquiryAttachment).where(eq(inquiryAttachment.id, owner.attachmentId!));
      expect(row).toMatchObject({ uploadedByKind: "client", uploadedByUserId: clientUserId });
    });

    it("records staff uploads in the audit trail with the admin as actor", async () => {
      const id = await newRequest();
      authMock.mockResolvedValue(session(adminId, "admin"));

      const result = await uploadInquiryAttachment("request", id, makeFile(PDF, "plan.pdf"), {});

      const [audit] = await db.select().from(auditLog).where(and(eq(auditLog.recordId, result.attachmentId!), eq(auditLog.action, "create")));
      expect(audit?.actorUserId).toBe(adminId);
      expect(audit?.newValues).not.toHaveProperty("filename");
    });

    it("rejects the eleventh file before issuing an upload address", async () => {
      const id = await newRequest();
      authMock.mockResolvedValue(session(clientUserId, "client"));
      for (let index = 0; index < 10; index += 1) {
        const ok = await uploadInquiryAttachment("request", id, makeFile(PDF, `p${index}.pdf`), { confirmedNoContactData: true });
        expect(ok.ok).toBe(true);
      }
      signedUploadMock.mockClear();

      const result = await uploadInquiryAttachment("request", id, makeFile(PDF, "p11.pdf"), { confirmedNoContactData: true });

      // Limit liczy też rozpoczęte wgrania i zatrzymuje prośbę, zanim powstanie adres do zapisu (AC-3).
      expect(result).toMatchObject({ ok: false, errorCode: "limit_count" });
      expect(signedUploadMock).not.toHaveBeenCalled();
    });

    it("blocks client and guest uploads once the summary is published, but not admin uploads", async () => {
      const id = await newRequest({ summaryPublishedAt: new Date(), status: "published" });
      const uploadToken = createUploadToken("request", id);

      const guest = await uploadInquiryAttachment("request", id, makeFile(PDF, "a.pdf"), { uploadToken, confirmedNoContactData: true });
      expect(guest).toMatchObject({ ok: false, errorCode: "closed" });
      expect(signedUploadMock).not.toHaveBeenCalled();

      authMock.mockResolvedValue(session(adminId, "admin"));
      const admin = await uploadInquiryAttachment("request", id, makeFile(PDF, "a.pdf"), {});
      expect(admin.ok).toBe(true);
    });

    it("reports a signing failure without writing a row", async () => {
      const id = await newRequest();
      const uploadToken = createUploadToken("request", id);
      signedUploadMock.mockRejectedValueOnce(new Error("r2 down"));

      const result = await uploadInquiryAttachment("request", id, makeFile(PDF, "a.pdf"), { uploadToken, confirmedNoContactData: true });

      expect(result).toMatchObject({ ok: false, errorCode: "storage_failed" });
      expect(await db.select().from(inquiryAttachment).where(eq(inquiryAttachment.projectRequestId, id))).toHaveLength(0);
    });
  });

  describe("delete", () => {
    async function seedFile(id: string, uploadedByKind: "client" | "guest" | "staff") {
      const [row] = await db
        .insert(inquiryAttachment)
        .values({
          projectRequestId: id,
          r2Key: `${crypto.randomUUID()}.pdf`,
          filename: "plan.pdf",
          mimeType: "application/pdf",
          sizeBytes: 1000,
          uploadedByKind,
          uploadedByUserId: uploadedByKind === "client" ? clientUserId : uploadedByKind === "staff" ? adminId : null,
        })
        .returning({ id: inquiryAttachment.id });
      return row.id;
    }

    it("lets the owner delete softly and stamps the parent", async () => {
      const id = await newRequest();
      const fileId = await seedFile(id, "client");
      authMock.mockResolvedValue(session(clientUserId, "client"));

      const result = await deleteInquiryAttachment(fileId);

      expect(result.ok).toBe(true);
      const [row] = await db.select().from(inquiryAttachment).where(eq(inquiryAttachment.id, fileId));
      expect(row.deletedAt).toBeInstanceOf(Date);
      expect(row.deletedByKind).toBe("client");
      const [parent] = await db.select({ changedAt: projectRequest.attachmentsChangedAt }).from(projectRequest).where(eq(projectRequest.id, id));
      expect(parent.changedAt).toBeInstanceOf(Date);
    });

    it("refuses a stranger, with the same answer as for a missing file", async () => {
      const id = await newRequest();
      const fileId = await seedFile(id, "client");
      authMock.mockResolvedValue(session(otherClientUserId, "client"));

      const stranger = await deleteInquiryAttachment(fileId);
      const missing = await deleteInquiryAttachment(crypto.randomUUID());

      expect(stranger).toEqual(missing);
      expect(stranger).toMatchObject({ ok: false, errorCode: "not_found" });
    });

    it("lets a guest delete only guest files with a valid token", async () => {
      const id = await newRequest();
      const guestFile = await seedFile(id, "guest");
      const staffFile = await seedFile(id, "staff");
      const uploadToken = createUploadToken("request", id);

      expect(await deleteInquiryAttachment(staffFile, { uploadToken })).toMatchObject({ ok: false, errorCode: "not_found" });
      expect(await deleteInquiryAttachment(guestFile, {})).toMatchObject({ ok: false, errorCode: "not_found" });
      expect((await deleteInquiryAttachment(guestFile, { uploadToken })).ok).toBe(true);
    });

    it("blocks the owner after the client selected an offer, while the admin can still delete", async () => {
      const id = await newRequest();
      const fileId = await seedFile(id, "client");
      const [quote] = await db
        .insert(projectQuote)
        .values({ projectRequestId: id, producerId: matchedProducerId, totalPriceCents: 100000 })
        .returning({ id: projectQuote.id });
      await db.update(projectRequest).set({ selectedQuoteId: quote.id, selectedAt: new Date() }).where(eq(projectRequest.id, id));

      authMock.mockResolvedValue(session(clientUserId, "client"));
      expect(await deleteInquiryAttachment(fileId)).toMatchObject({ ok: false, errorCode: "closed" });

      authMock.mockResolvedValue(session(adminId, "admin"));
      expect((await deleteInquiryAttachment(fileId)).ok).toBe(true);
      const [row] = await db.select().from(inquiryAttachment).where(eq(inquiryAttachment.id, fileId));
      expect(row.deletedByKind).toBe("staff");
    });

    it("does not delete twice", async () => {
      const id = await newRequest();
      const fileId = await seedFile(id, "client");
      authMock.mockResolvedValue(session(clientUserId, "client"));

      expect((await deleteInquiryAttachment(fileId)).ok).toBe(true);
      expect(await deleteInquiryAttachment(fileId)).toMatchObject({ ok: false, errorCode: "not_found" });
    });
  });

  describe("visibility", () => {
    async function seedFiles(id: string) {
      const rows = await db
        .insert(inquiryAttachment)
        .values([
          { projectRequestId: id, r2Key: `${crypto.randomUUID()}.pdf`, filename: "a.pdf", mimeType: "application/pdf", sizeBytes: 10, uploadedByKind: "guest" as const },
          { projectRequestId: id, r2Key: `${crypto.randomUUID()}.pdf`, filename: "b.pdf", mimeType: "application/pdf", sizeBytes: 20, uploadedByKind: "guest" as const },
        ])
        .returning({ id: inquiryAttachment.id });
      return rows.map((row) => row.id);
    }

    it("shows a matched producer the files and gives a signed download link", async () => {
      const id = await newRequest();
      const [fileId] = await seedFiles(id);
      authMock.mockResolvedValue(session(matchedUserId, "producer"));

      const list = await listInquiryAttachments("request", id);
      expect(list.map((item) => item.filename)).toEqual(["a.pdf", "b.pdf"]);
      expect(list[0]).toMatchObject({ hidden: false, uploadedByKind: null });

      const link = await getInquiryAttachmentUrl(fileId);
      expect(link).toEqual({ ok: true, url: "https://signed.example.test/file" });
      expect(signedUrlMock).toHaveBeenCalledWith(expect.any(String), 600, "a.pdf");
    });

    it("hides everything from an unmatched producer, identically to a missing file", async () => {
      const id = await newRequest();
      const [fileId] = await seedFiles(id);
      authMock.mockResolvedValue(session(unmatchedUserId, "producer"));

      expect(await listInquiryAttachments("request", id)).toEqual([]);
      const forbidden = await getInquiryAttachmentUrl(fileId);
      const missing = await getInquiryAttachmentUrl(crypto.randomUUID());
      expect(forbidden).toEqual(missing);
      expect(forbidden).toMatchObject({ ok: false, errorCode: "not_found" });
      expect(signedUrlMock).not.toHaveBeenCalled();
    });

    it("gives an unmatched producer access through an active offer, and keeps it only for an accepted offer after closing", async () => {
      const id = await newRequest();
      const [fileId] = await seedFiles(id);
      const [quote] = await db
        .insert(projectQuote)
        .values({ projectRequestId: id, producerId: unmatchedProducerId, totalPriceCents: 100000 })
        .returning({ id: projectQuote.id });
      authMock.mockResolvedValue(session(unmatchedUserId, "producer"));
      expect((await getInquiryAttachmentUrl(fileId)).ok).toBe(true);

      await db.update(projectRequest).set({ status: "closed", closedAt: new Date(), closedReason: "staff_closed" }).where(eq(projectRequest.id, id));
      expect(await getInquiryAttachmentUrl(fileId)).toMatchObject({ ok: false, errorCode: "not_found" });

      await db.update(projectQuote).set({ status: "accepted" }).where(eq(projectQuote.id, quote.id));
      expect((await getInquiryAttachmentUrl(fileId)).ok).toBe(true);
    });

    it("does not show a closed request to a producer that only matched", async () => {
      const id = await newRequest();
      const [fileId] = await seedFiles(id);
      await db.update(projectRequest).set({ status: "closed", closedAt: new Date(), closedReason: "staff_closed" }).where(eq(projectRequest.id, id));
      authMock.mockResolvedValue(session(matchedUserId, "producer"));

      expect(await listInquiryAttachments("request", id)).toEqual([]);
      expect(await getInquiryAttachmentUrl(fileId)).toMatchObject({ ok: false });
    });

    it("lets the admin hide a file: the producer loses it, the client sees it marked, and it can be restored", async () => {
      const id = await newRequest();
      const [fileId, otherFileId] = await seedFiles(id);

      authMock.mockResolvedValue(session(adminId, "admin"));
      const missingReason = await hideInquiryAttachment(fileId, "   ");
      expect(missingReason).toMatchObject({ ok: false, errorCode: "reason_required" });
      expect((await hideInquiryAttachment(fileId, "numer telefonu w stopce rysunku")).ok).toBe(true);

      const [audit] = await db.select().from(auditLog).where(and(eq(auditLog.recordId, fileId), eq(auditLog.action, "update")));
      expect(audit?.actorUserId).toBe(adminId);

      authMock.mockResolvedValue(session(matchedUserId, "producer"));
      expect((await listInquiryAttachments("request", id)).map((item) => item.id)).toEqual([otherFileId]);
      expect(await getInquiryAttachmentUrl(fileId)).toMatchObject({ ok: false, errorCode: "not_found" });

      authMock.mockResolvedValue(session(clientUserId, "client"));
      const clientList = await listInquiryAttachments("request", id);
      expect(clientList.find((item) => item.id === fileId)).toMatchObject({ hidden: true, hiddenReason: "numer telefonu w stopce rysunku" });
      expect((await getInquiryAttachmentUrl(fileId)).ok).toBe(true);

      authMock.mockResolvedValue(session(adminId, "admin"));
      expect((await unhideInquiryAttachment(fileId)).ok).toBe(true);
      authMock.mockResolvedValue(session(matchedUserId, "producer"));
      expect((await listInquiryAttachments("request", id)).map((item) => item.id)).toContain(fileId);
    });

    it("refuses hide and unhide to everyone but an admin", async () => {
      const id = await newRequest();
      const [fileId] = await seedFiles(id);

      for (const userSession of [null, session(clientUserId, "client"), session(matchedUserId, "producer")]) {
        authMock.mockResolvedValue(userSession);
        expect(await hideInquiryAttachment(fileId, "powód")).toMatchObject({ ok: false, errorCode: "no_access" });
        expect(await unhideInquiryAttachment(fileId)).toMatchObject({ ok: false, errorCode: "no_access" });
      }
    });

    it("shows the admin deleted files with their author, and a stranger client nothing", async () => {
      const id = await newRequest();
      const [fileId] = await seedFiles(id);
      await db.update(inquiryAttachment).set({ deletedAt: new Date(), deletedByKind: "client" }).where(eq(inquiryAttachment.id, fileId));

      authMock.mockResolvedValue(session(adminId, "admin"));
      const adminList = await listInquiryAttachments("request", id);
      expect(adminList.find((item) => item.id === fileId)).toMatchObject({ deleted: true, uploadedByKind: "guest" });

      authMock.mockResolvedValue(session(clientUserId, "client"));
      expect((await listInquiryAttachments("request", id)).map((item) => item.id)).not.toContain(fileId);

      authMock.mockResolvedValue(session(otherClientUserId, "client"));
      expect(await listInquiryAttachments("request", id)).toEqual([]);
    });
  });

  // AC-33: producent z aktywną ofertą widzi znacznik, gdy pliki zmieniły się po jej złożeniu.
  describe("files changed after the producer's offer", () => {
    it("flags a change made after the active offer, and clears when the offer is renewed", async () => {
      const id = await newRequest();
      await db.insert(projectQuote).values({ projectRequestId: id, producerId: matchedProducerId, totalPriceCents: 100000, submittedAt: new Date(Date.now() - 60_000) });

      expect((await getProjectRequestForBoardDetail(id, matchedProducerId))?.filesChangedAfterOwnQuote).toBe(false);

      authMock.mockResolvedValue(session(adminId, "admin"));
      const upload = await uploadInquiryAttachment("request", id, makeFile(PDF, "nowy.pdf"), {});
      expect(upload.ok).toBe(true);
      expect((await getProjectRequestForBoardDetail(id, matchedProducerId))?.filesChangedAfterOwnQuote).toBe(true);

      await db.update(projectQuote).set({ status: "superseded" }).where(eq(projectQuote.projectRequestId, id));
      await db.insert(projectQuote).values({ projectRequestId: id, producerId: matchedProducerId, totalPriceCents: 90000 });
      expect((await getProjectRequestForBoardDetail(id, matchedProducerId))?.filesChangedAfterOwnQuote).toBe(false);
    });

    it("also flags a hide done by the admin", async () => {
      const id = await newRequest();
      const [file] = await db
        .insert(inquiryAttachment)
        .values({ projectRequestId: id, r2Key: `${crypto.randomUUID()}.pdf`, filename: "a.pdf", mimeType: "application/pdf", sizeBytes: 10, uploadedByKind: "guest" })
        .returning({ id: inquiryAttachment.id });
      await db.insert(projectQuote).values({ projectRequestId: id, producerId: matchedProducerId, totalPriceCents: 100000, submittedAt: new Date(Date.now() - 60_000) });
      expect((await getProjectRequestForBoardDetail(id, matchedProducerId))?.filesChangedAfterOwnQuote).toBe(false);

      authMock.mockResolvedValue(session(adminId, "admin"));
      await hideInquiryAttachment(file.id, "dane kontaktowe");

      expect((await getProjectRequestForBoardDetail(id, matchedProducerId))?.filesChangedAfterOwnQuote).toBe(true);
    });
  });
});
