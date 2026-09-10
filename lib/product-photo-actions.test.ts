import { and, eq, inArray } from "drizzle-orm";
import type { Session } from "next-auth";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

// @/auth i @/lib/observability/errors nie ładują się pod Vitest/jsdom
// (next-auth's env.js robi bare `import "next/server"`, Sentry's webpack
// plugin loader wymaga prawdziwego kontekstu builda) — ten sam problem, który
// components/klient/ResultCard.test.tsx obchodzi mockując lib/favorite-actions
// zamiast auth.ts wprost. Tu mockujemy je bezpośrednio na granicy, żeby móc w
// ogóle zaimportować lib/product-photo-actions.ts.
//
// authMock ma własny, jawny typ: next-auth's `auth` export jest przeciążony
// (może też działać jako middleware), więc typ wyprowadzony automatycznie
// łapałby niewłaściwe przeciążenie i .mockResolvedValue() nie typechecka.
// vi.hoisted jest wymagane: vi.mock() jest podnoszone nad zwykłe deklaracje
// top level, zwykłe `const authMock = vi.fn()` rzuciłoby "Cannot access
// 'authMock' before initialization".
const authMock = vi.hoisted(() => vi.fn<() => Promise<Session | null>>());
vi.mock("@/auth", () => ({ auth: authMock }));
vi.mock("@/lib/observability/errors", () => ({ captureError: vi.fn() }));

const uploadObjectMock = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const deleteObjectMock = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));

// buildR2Key/buildPublicUrl zostają prawdziwe (czysta logika, warte pokrycia
// przez ich własny test w r2-client.test.ts); tylko rzeczywiste I/O do R2 jest
// zamockowane, żeby ten plik nigdy nie dotykał prawdziwego kubełka.
vi.mock("@/lib/storage/r2-client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/storage/r2-client")>();
  return {
    ...actual,
    uploadObject: (...args: Parameters<typeof actual.uploadObject>) => uploadObjectMock(...args),
    deleteObject: (...args: Parameters<typeof actual.deleteObject>) => deleteObjectMock(...args),
  };
});

import { db } from "@/lib/db/client";
import { auditLog, document, producer, product, users } from "@/lib/db/schema";
import { captureError } from "@/lib/observability/errors";
import {
  deleteProductPhoto,
  reorderProductPhotos,
  setCoverPhoto,
  uploadProductPhoto,
} from "./product-photo-actions";

function jpegBytes(): ArrayBuffer {
  return new Uint8Array([0xff, 0xd8, 0xff, ...new Array(50).fill(0)]).buffer;
}

function jpegFile(name = "photo.jpg"): File {
  return new File([jpegBytes()], name, { type: "image/jpeg" });
}

function garbageFile(name = "photo.jpg"): File {
  return new File(["not a real image"], name, { type: "image/jpeg" });
}

function sessionAs(userId: string, role: "admin" | "producer" | "client"): Session {
  return {
    user: { id: userId, role, phone: "+48000000000", name: null, email: null, image: null },
    expires: new Date(Date.now() + 3600_000).toISOString(),
  } as Session;
}

// Hits the real dev database (spec 0018 AC-5), same convention as
// lib/data/projects.test.ts; only auth and R2 I/O are mocked at their boundary.
describe.skipIf(!process.env.DATABASE_URL)("lib/product-photo-actions: real DB, mocked auth + R2 I/O", () => {
  const adminUserId = crypto.randomUUID();
  const producerUserId = crypto.randomUUID();
  const producerId = crypto.randomUUID();
  const otherProducerUserId = crypto.randomUUID();
  const otherProducerId = crypto.randomUUID();
  const productAId = crypto.randomUUID();
  const productBId = crypto.randomUUID();
  const productCId = crypto.randomUUID();
  const productDId = crypto.randomUUID();
  const allProductIds = [productAId, productBId, productCId, productDId];

  beforeAll(async () => {
    await db.insert(users).values([
      { id: adminUserId, email: `ppa-admin-${adminUserId}@example.test`, phone: "+48000000001", role: "admin" },
      { id: producerUserId, email: `ppa-producer-${producerUserId}@example.test`, phone: "+48000000002", role: "producer" },
      { id: otherProducerUserId, email: `ppa-other-producer-${otherProducerUserId}@example.test`, phone: "+48000000003", role: "producer" },
    ]);
    await db.insert(producer).values([
      {
        id: producerId,
        userId: producerUserId,
        nip: `PPA${producerId.slice(0, 8)}`,
        name: "Test Producer (product-photo-actions)",
        countryCode: "PL",
        technology: "szkielet-drewniany",
      },
      {
        id: otherProducerId,
        userId: otherProducerUserId,
        nip: `PPB${otherProducerId.slice(0, 8)}`,
        name: "Other Test Producer (product-photo-actions)",
        countryCode: "PL",
        technology: "szkielet-drewniany",
      },
    ]);
    await db.insert(product).values(
      allProductIds.map((id, index) => ({
        id,
        producerId,
        family: "dom" as const,
        status: "published" as const,
        name: `product-photo-actions test product ${index}`,
        floorAreaM2: 80,
        countryOfProduction: "PL" as const,
      })),
    );
  });

  afterAll(async () => {
    const docs = await db.select({ id: document.id }).from(document).where(inArray(document.productId, allProductIds));
    const docIds = docs.map((d) => d.id);
    if (docIds.length > 0) {
      await db.delete(auditLog).where(and(eq(auditLog.tableName, "document"), inArray(auditLog.recordId, docIds)));
      await db.delete(document).where(inArray(document.id, docIds));
    }
    await db.delete(product).where(inArray(product.id, allProductIds));
    await db.delete(producer).where(inArray(producer.id, [producerId, otherProducerId]));
    await db.delete(users).where(inArray(users.id, [adminUserId, producerUserId, otherProducerUserId]));
    await db
      .delete(auditLog)
      .where(inArray(auditLog.recordId, [adminUserId, producerUserId, otherProducerUserId, producerId, otherProducerId]));
  });

  afterEach(async () => {
    authMock.mockReset();
    uploadObjectMock.mockClear();
    deleteObjectMock.mockClear();
    vi.mocked(captureError).mockClear();

    // Każdy test zaczyna od czystego stanu document dla naszych produktów
    // testowych (sortOrder/isCover logic w akcjach zależy od tego, co już
    // istnieje dla danego productId).
    const docs = await db.select({ id: document.id }).from(document).where(inArray(document.productId, allProductIds));
    const docIds = docs.map((d) => d.id);
    if (docIds.length > 0) {
      await db.delete(auditLog).where(and(eq(auditLog.tableName, "document"), inArray(auditLog.recordId, docIds)));
      await db.delete(document).where(inArray(document.id, docIds));
    }
  });

  describe("uploadProductPhoto", () => {
    it("rejects with no session, never touches R2", async () => {
      authMock.mockResolvedValue(null);
      const result = await uploadProductPhoto(productAId, jpegFile());
      expect(result.ok).toBe(false);
      expect(result.error).toMatch(/uprawnień/);
      expect(uploadObjectMock).not.toHaveBeenCalled();
    });

    it("rejects a client session, never touches R2", async () => {
      authMock.mockResolvedValue(sessionAs(producerUserId, "client"));
      const result = await uploadProductPhoto(productAId, jpegFile());
      expect(result.ok).toBe(false);
      expect(uploadObjectMock).not.toHaveBeenCalled();
    });

    // spec 0032 AC-7, AC-13: producer role is now legitimate for its own product...
    it("allows a producer session to upload to its own product", async () => {
      authMock.mockResolvedValue(sessionAs(producerUserId, "producer"));
      const result = await uploadProductPhoto(productAId, jpegFile());
      expect(result.ok).toBe(true);
      expect(uploadObjectMock).toHaveBeenCalledTimes(1);
    });

    // ...but never for a product owned by a different producer (spec 0032 AC-13).
    it("rejects a producer session uploading to another producer's product, never touches R2", async () => {
      authMock.mockResolvedValue(sessionAs(otherProducerUserId, "producer"));
      const result = await uploadProductPhoto(productAId, jpegFile());
      expect(result.ok).toBe(false);
      expect(result.error).toMatch(/uprawnień/);
      expect(uploadObjectMock).not.toHaveBeenCalled();
    });

    it("rejects an unknown productId", async () => {
      authMock.mockResolvedValue(sessionAs(adminUserId, "admin"));
      const result = await uploadProductPhoto(crypto.randomUUID(), jpegFile());
      expect(result.ok).toBe(false);
      expect(result.error).toMatch(/produktu/);
      expect(uploadObjectMock).not.toHaveBeenCalled();
    });

    // AC-3: sygnatura bajtowa sprawdzana zawsze po stronie serwera, przed R2.
    it("rejects a file with an invalid signature before ever calling R2 or writing a row", async () => {
      authMock.mockResolvedValue(sessionAs(adminUserId, "admin"));
      const before = await db.select().from(document).where(eq(document.productId, productAId));

      const result = await uploadProductPhoto(productAId, garbageFile());

      expect(result.ok).toBe(false);
      expect(result.error).toMatch(/JPEG, PNG lub WebP/);
      expect(uploadObjectMock).not.toHaveBeenCalled();
      const after = await db.select().from(document).where(eq(document.productId, productAId));
      expect(after).toHaveLength(before.length);
    });

    it("uploads a valid photo and inserts a document row with purpose product_photo, sortOrder 0", async () => {
      authMock.mockResolvedValue(sessionAs(adminUserId, "admin"));

      const result = await uploadProductPhoto(productAId, jpegFile("first.jpg"));

      expect(result.ok).toBe(true);
      expect(result.documentId).toBeDefined();
      expect(result.url).toMatch(/^https:\/\/.+\/[0-9a-f-]{36}\.jpg$/);
      expect(uploadObjectMock).toHaveBeenCalledTimes(1);
      const [r2Key, , mimeType] = uploadObjectMock.mock.calls[0] as [string, Buffer, string];
      expect(mimeType).toBe("image/jpeg");

      const [row] = await db.select().from(document).where(eq(document.id, result.documentId as string));
      expect(row).toMatchObject({
        productId: productAId,
        purpose: "product_photo",
        sortOrder: 0,
        ownerUserId: adminUserId,
        filename: "first.jpg",
        r2Key,
      });
    });

    it("gives the second photo for the same product sortOrder 1", async () => {
      authMock.mockResolvedValue(sessionAs(adminUserId, "admin"));
      await uploadProductPhoto(productAId, jpegFile("first.jpg"));

      const result = await uploadProductPhoto(productAId, jpegFile("second.jpg"));

      const [row] = await db.select().from(document).where(eq(document.id, result.documentId as string));
      expect(row.sortOrder).toBe(1);
    });
  });

  describe("setCoverPhoto", () => {
    it("requires an admin session", async () => {
      authMock.mockResolvedValue(null);
      const result = await setCoverPhoto(crypto.randomUUID());
      expect(result.ok).toBe(false);
    });

    it("returns an error for an unknown documentId", async () => {
      authMock.mockResolvedValue(sessionAs(adminUserId, "admin"));
      const result = await setCoverPhoto(crypto.randomUUID());
      expect(result.ok).toBe(false);
      expect(result.error).toMatch(/zdjęcia/);
    });

    // AC-4: co najwyżej jedna okładka na produkt (db.batch, nie db.transaction).
    it("sets the given photo as cover and clears any other cover on the same product", async () => {
      const [doc1] = await db
        .insert(document)
        .values({
          r2Key: "seed-1.jpg",
          filename: "seed-1.jpg",
          mimeType: "image/jpeg",
          sizeBytes: 10,
          purpose: "product_photo",
          isCover: true,
          sortOrder: 0,
          ownerUserId: adminUserId,
          productId: productBId,
        })
        .returning({ id: document.id });
      const [doc2] = await db
        .insert(document)
        .values({
          r2Key: "seed-2.jpg",
          filename: "seed-2.jpg",
          mimeType: "image/jpeg",
          sizeBytes: 10,
          purpose: "product_photo",
          isCover: false,
          sortOrder: 1,
          ownerUserId: adminUserId,
          productId: productBId,
        })
        .returning({ id: document.id });

      authMock.mockResolvedValue(sessionAs(adminUserId, "admin"));
      const result = await setCoverPhoto(doc2.id);

      expect(result.ok).toBe(true);
      const rows = await db.select().from(document).where(eq(document.productId, productBId));
      const byId = new Map(rows.map((r) => [r.id, r]));
      expect(byId.get(doc1.id)?.isCover).toBe(false);
      expect(byId.get(doc2.id)?.isCover).toBe(true);
    });
  });

  describe("reorderProductPhotos", () => {
    async function seedThreePhotos(productId: string) {
      const inserted = await db
        .insert(document)
        .values([0, 1, 2].map((sortOrder) => ({
          r2Key: `reorder-${productId}-${sortOrder}.jpg`,
          filename: `reorder-${sortOrder}.jpg`,
          mimeType: "image/jpeg",
          sizeBytes: 10,
          purpose: "product_photo" as const,
          sortOrder,
          ownerUserId: adminUserId,
          productId,
        })))
        .returning({ id: document.id, sortOrder: document.sortOrder });
      return inserted;
    }

    it("rejects a list that doesn't match the product's existing photos, and changes nothing", async () => {
      const seeded = await seedThreePhotos(productCId);
      authMock.mockResolvedValue(sessionAs(adminUserId, "admin"));

      const result = await reorderProductPhotos(productCId, [seeded[0].id, seeded[1].id]); // missing the 3rd

      expect(result.ok).toBe(false);
      expect(result.error).toMatch(/nie odpowiada/);
      const after = await db.select({ id: document.id, sortOrder: document.sortOrder }).from(document).where(eq(document.productId, productCId));
      expect(after.map((r) => r.sortOrder).sort()).toEqual([0, 1, 2]);
    });

    it("persists the new order", async () => {
      const seeded = await seedThreePhotos(productDId);
      const reversedIds = [...seeded].reverse().map((r) => r.id);
      authMock.mockResolvedValue(sessionAs(adminUserId, "admin"));

      const result = await reorderProductPhotos(productDId, reversedIds);

      expect(result.ok).toBe(true);
      const after = await db.select({ id: document.id, sortOrder: document.sortOrder }).from(document).where(eq(document.productId, productDId));
      const byId = new Map(after.map((r) => [r.id, r.sortOrder]));
      reversedIds.forEach((id, index) => expect(byId.get(id)).toBe(index));
    });
  });

  describe("deleteProductPhoto", () => {
    it("requires an admin session", async () => {
      authMock.mockResolvedValue(null);
      const result = await deleteProductPhoto(crypto.randomUUID());
      expect(result.ok).toBe(false);
      expect(deleteObjectMock).not.toHaveBeenCalled();
    });

    // AC-6: wiersz jest oznaczany jako usunięty niezależnie od wyniku usunięcia z R2.
    it("soft-deletes the row and calls deleteObject with its r2Key", async () => {
      const [doc] = await db
        .insert(document)
        .values({
          r2Key: "to-delete.jpg",
          filename: "to-delete.jpg",
          mimeType: "image/jpeg",
          sizeBytes: 10,
          purpose: "product_photo",
          sortOrder: 0,
          ownerUserId: adminUserId,
          productId: productAId,
        })
        .returning({ id: document.id });

      authMock.mockResolvedValue(sessionAs(adminUserId, "admin"));
      const result = await deleteProductPhoto(doc.id);

      expect(result.ok).toBe(true);
      expect(deleteObjectMock).toHaveBeenCalledWith("to-delete.jpg");
      const [row] = await db.select().from(document).where(eq(document.id, doc.id));
      expect(row.deletedAt).not.toBeNull();
    });

    it("still soft-deletes and returns ok:true even when the R2 delete fails, and reports it via captureError", async () => {
      const [doc] = await db
        .insert(document)
        .values({
          r2Key: "r2-failure.jpg",
          filename: "r2-failure.jpg",
          mimeType: "image/jpeg",
          sizeBytes: 10,
          purpose: "product_photo",
          sortOrder: 0,
          ownerUserId: adminUserId,
          productId: productAId,
        })
        .returning({ id: document.id });
      deleteObjectMock.mockRejectedValueOnce(new Error("R2 is down"));

      authMock.mockResolvedValue(sessionAs(adminUserId, "admin"));
      const result = await deleteProductPhoto(doc.id);

      expect(result.ok).toBe(true);
      expect(captureError).toHaveBeenCalled();
      const [row] = await db.select().from(document).where(eq(document.id, doc.id));
      expect(row.deletedAt).not.toBeNull();
    });
  });
});
