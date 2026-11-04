import { inArray } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/lib/observability/errors", () => ({ captureError: vi.fn() }));
vi.mock("@/lib/observability", () => ({ captureError: vi.fn() }));

const r2 = vi.hoisted(() => ({
  buildSignedUploadUrl: vi.fn(async (key: string) => `https://upload.example/${key}`),
  buildSignedDownloadUrl: vi.fn(async (key: string, _ttl: number, filename: string, mime?: string) => `https://download.example/${key}?f=${filename}&t=${mime}`),
  deletePrivateObject: vi.fn(async () => undefined),
  headPrivateObjectSize: vi.fn<(key: string) => Promise<number | null>>(),
  readPrivateObjectHead: vi.fn<(key: string, n: number) => Promise<Uint8Array>>(),
}));
vi.mock("@/lib/storage/private-r2-client", () => r2);

import { db } from "@/lib/db/client";
import { crmEntry, crmEntryAttachment, crmPartner, users } from "@/lib/db/schema";
import {
  confirmEntryAttachment,
  deleteEntryAttachment,
  getAttachmentDownloadUrl,
  listAttachmentsForEntries,
  requestEntryAttachmentUpload,
  sanitizeAttachmentFilename,
} from "./attachments";
import { createEntry, createPartner, deleteEntry } from "./mutations";

const MARK = `crm-att-${crypto.randomUUID().slice(0, 8)}`;
const PDF_HEAD = new TextEncoder().encode("%PDF-1.7\n1 0 obj");
const PNG_HEAD = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0, 0, 0, 0, 0]);
const newKey = () => `crm-entry-attachments/${crypto.randomUUID()}`;
const pdf = (sizeBytes = 1000, filename = "wycena.pdf") => ({ filename, mimeType: "application/pdf" as const, sizeBytes });

describe("sanitizeAttachmentFilename", () => {
  it("usuwa ścieżkę, cudzysłów i znaki sterujące", () => {
    expect(sanitizeAttachmentFilename('C:\\tmp\\../evil"\r\n.pdf')).toBe("evil.pdf");
    expect(sanitizeAttachmentFilename("   ")).toBe("plik");
  });
});

describe.skipIf(!process.env.DATABASE_URL)("załączniki wpisów (spec 0080 AC-14)", () => {
  const admin = crypto.randomUUID();
  const actor = { userId: admin };
  let partnerId: string;

  async function newEntry() {
    const result = await createEntry(actor, partnerId, { direction: "internal", channel: "other", body: "wpis", threadId: null, contactId: null, occurredAtLocal: null });
    if (!result.ok) throw new Error(result.error);
    return result.id;
  }

  beforeAll(async () => {
    await db.insert(users).values({ id: admin, email: `${MARK}@example.test`, phone: "+48000000091", role: "admin", name: "Admin" });
    const partner = await createPartner(actor, { name: `${MARK} firma`, kind: "producent", tags: [], website: null, countryCode: null, notes: null });
    if (!partner.ok) throw new Error(partner.error);
    partnerId = partner.id;
  });

  afterAll(async () => {
    const entries = await db.select({ id: crmEntry.id }).from(crmEntry).where(inArray(crmEntry.partnerId, [partnerId]));
    const ids = entries.map((row) => row.id);
    if (ids.length) {
      await db.delete(crmEntryAttachment).where(inArray(crmEntryAttachment.entryId, ids));
      await db.delete(crmEntry).where(inArray(crmEntry.id, ids));
    }
    await db.delete(crmPartner).where(inArray(crmPartner.id, [partnerId]));
    await db.delete(users).where(inArray(users.id, [admin]));
  });

  beforeEach(() => {
    vi.clearAllMocks();
    r2.headPrivateObjectSize.mockResolvedValue(1000);
    r2.readPrivateObjectHead.mockResolvedValue(PDF_HEAD);
  });

  it("podpisuje adres tylko dla dozwolonego typu i rozmiaru oraz istniejącego wpisu", async () => {
    const entryId = await newEntry();
    const ok = await requestEntryAttachmentUpload(actor, entryId, pdf());
    expect(ok.ok && ok.key.startsWith("crm-entry-attachments/")).toBe(true);
    expect(await requestEntryAttachmentUpload(actor, entryId, { filename: "a.exe", mimeType: "application/x-msdownload" as never, sizeBytes: 10 })).toMatchObject({ ok: false });
    expect(await requestEntryAttachmentUpload(actor, entryId, pdf(20 * 1024 * 1024 + 1))).toMatchObject({ ok: false });
    expect(await requestEntryAttachmentUpload(actor, crypto.randomUUID(), pdf())).toMatchObject({ ok: false });
  });

  it("potwierdza poprawny PDF i pokazuje go na liście", async () => {
    const entryId = await newEntry();
    const key = newKey();
    const result = await confirmEntryAttachment(actor, entryId, key, pdf());
    expect(result.ok).toBe(true);
    const list = await listAttachmentsForEntries([entryId]);
    expect(list.get(entryId)).toHaveLength(1);
    expect(r2.deletePrivateObject).not.toHaveBeenCalled();
  });

  it("usuwa obiekt, gdy rozmiar nie zgadza się z deklaracją", async () => {
    const entryId = await newEntry();
    const key = newKey();
    r2.headPrivateObjectSize.mockResolvedValue(999);
    expect(await confirmEntryAttachment(actor, entryId, key, pdf(1000))).toMatchObject({ ok: false });
    expect(r2.deletePrivateObject).toHaveBeenCalledWith(key);
    expect((await listAttachmentsForEntries([entryId])).get(entryId)).toBeUndefined();
  });

  it("odrzuca plik .pdf bez sygnatury PDF i usuwa obiekt", async () => {
    const entryId = await newEntry();
    const key = newKey();
    r2.readPrivateObjectHead.mockResolvedValue(PNG_HEAD);
    expect(await confirmEntryAttachment(actor, entryId, key, pdf())).toMatchObject({ ok: false });
    expect(r2.deletePrivateObject).toHaveBeenCalledWith(key);
  });

  it("nie usuwa niczego, gdy obiektu nie ma w kubełku", async () => {
    const entryId = await newEntry();
    r2.headPrivateObjectSize.mockResolvedValue(null);
    expect(await confirmEntryAttachment(actor, entryId, newKey(), pdf())).toMatchObject({ ok: false });
    expect(r2.deletePrivateObject).not.toHaveBeenCalled();
  });

  it("limit pięciu plików: szósty jest odrzucony, a jego obiekt usunięty", async () => {
    const entryId = await newEntry();
    for (let i = 0; i < 5; i++) expect((await confirmEntryAttachment(actor, entryId, newKey(), pdf())).ok).toBe(true);
    const sixth = newKey();
    expect(await confirmEntryAttachment(actor, entryId, sixth, pdf())).toMatchObject({ ok: false });
    expect(r2.deletePrivateObject).toHaveBeenCalledWith(sixth);
    expect(await requestEntryAttachmentUpload(actor, entryId, pdf())).toMatchObject({ ok: false });
  });

  it("nie przyjmuje klucza spoza prefiksu ani tego samego klucza dwa razy", async () => {
    const entryId = await newEntry();
    expect(await confirmEntryAttachment(actor, entryId, "inny/klucz", pdf())).toMatchObject({ ok: false });
    const key = newKey();
    expect((await confirmEntryAttachment(actor, entryId, key, pdf())).ok).toBe(true);
    vi.clearAllMocks();
    expect(await confirmEntryAttachment(actor, entryId, key, pdf())).toMatchObject({ ok: false });
    expect(r2.deletePrivateObject).not.toHaveBeenCalled();
  });

  it("adres pobrania: świeży dla aktywnego, null po usunięciu pliku lub wpisu", async () => {
    const entryId = await newEntry();
    const confirmed = await confirmEntryAttachment(actor, entryId, newKey(), pdf(1000, "oferta.pdf"));
    if (!confirmed.ok) throw new Error(confirmed.error);
    expect(await getAttachmentDownloadUrl(confirmed.id)).toContain("oferta.pdf");
    expect(r2.buildSignedDownloadUrl).toHaveBeenCalledWith(expect.any(String), expect.any(Number), "oferta.pdf", "application/pdf");

    const second = await confirmEntryAttachment(actor, entryId, newKey(), pdf());
    if (!second.ok) throw new Error(second.error);
    expect((await deleteEntryAttachment(actor, second.id)).ok).toBe(true);
    expect(await getAttachmentDownloadUrl(second.id)).toBeNull();

    await deleteEntry(actor, entryId);
    expect(await getAttachmentDownloadUrl(confirmed.id)).toBeNull();
    expect(await getAttachmentDownloadUrl("nie-uuid")).toBeNull();
  });
});
