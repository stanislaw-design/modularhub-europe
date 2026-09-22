"use server";

import { randomUUID } from "node:crypto";
import { and, eq, isNull } from "drizzle-orm";
import { auth } from "@/auth";
import { db } from "@/lib/db/client";
import { getProducerIdForUser } from "@/lib/db/queries";
import { document, product, productVariant } from "@/lib/db/schema";
import { captureError } from "@/lib/observability/errors";
import { validateDocumentPdf } from "@/lib/storage/document-pdf-validation";
import { validateProductPhotoFile } from "@/lib/storage/document-validation";
import { buildPublicUrl, buildR2Key, deleteObject, uploadObject } from "@/lib/storage/r2-client";

interface ActionResult {
  ok: boolean;
  error?: string;
}

interface PhotoActor {
  userId: string;
  role: "admin" | "producer";
}

const DENIED_ERROR = "Nie masz uprawnień do tego zdjęcia.";
const PRODUCT_NOT_FOUND_ERROR = "Nie znaleziono produktu.";

// Bramka roli admin/producer, mirror requireAdminSession, rozszerzona o
// producenta (spec 0032 Key invariants): jedna para funkcji obsługuje oba
// panele zamiast trzech niemal identycznych nowych akcji producenta obok
// istniejących admina. null oznacza "brak dostępu", wywołujący zwraca
// ActionResult z komunikatem.
async function requirePhotoActor(): Promise<PhotoActor | null> {
  const session = await auth();
  if (!session) return null;
  if (session.user.role !== "admin" && session.user.role !== "producer") return null;
  return { userId: session.user.id, role: session.user.role };
}

type ProductOwnership = "ok" | "not_found" | "denied";

// Admin: dowolny istniejący produkt. Producent: tylko własny, przez
// product.producerId wyprowadzone z sesji (nigdy przez document.producerId,
// osobną kolumnę tej samej tabeli używaną przez inne purpose, np.
// producer_photo/company_verification — spec 0032 Key invariants). Odróżnia
// "nie istnieje" od "nie twoje", żeby wywołujący mógł pokazać właściwy komunikat.
async function resolveProductOwnership(actor: PhotoActor, productId: string): Promise<ProductOwnership> {
  const [row] = await db.select({ id: product.id, producerId: product.producerId }).from(product).where(eq(product.id, productId));
  if (!row) return "not_found";
  if (actor.role === "admin") return "ok";
  const producerId = await getProducerIdForUser(actor.userId);
  if (!producerId) return "denied";
  return row.producerId === producerId ? "ok" : "denied";
}

// Wariant dla akcji, które startują z documentId, nie productId (setCoverPhoto,
// deleteProductPhoto): dokument już znaleziony, więc "nie istnieje" nie ma tu
// znaczenia — każdy wynik poza "ok" mapuje się na tę samą odmowę.
async function actorOwnsProduct(actor: PhotoActor, productId: string | null): Promise<boolean> {
  if (!productId) return false;
  return (await resolveProductOwnership(actor, productId)) === "ok";
}

export interface UploadProductPhotoResult extends ActionResult {
  documentId?: string;
  url?: string;
}

// AC-2, AC-3: plik trafia do R2 dopiero po walidacji, wiersz document dopiero po
// udanym wgraniu do R2 (spec 0031 Key invariants — zapobiega wierszowi bez pliku;
// odwrotny, rzadszy przypadek pliku bez wiersza jest zaakceptowanym ryzykiem).
export async function uploadProductPhoto(productId: string, file: File): Promise<UploadProductPhotoResult> {
  const actor = await requirePhotoActor();
  if (!actor) return { ok: false, error: DENIED_ERROR };
  const ownership = await resolveProductOwnership(actor, productId);
  if (ownership === "not_found") return { ok: false, error: PRODUCT_NOT_FOUND_ERROR };
  if (ownership === "denied") return { ok: false, error: DENIED_ERROR };

  const buffer = Buffer.from(await file.arrayBuffer());
  const validation = validateProductPhotoFile(buffer);
  if (!validation.ok || !validation.mimeType) {
    return { ok: false, error: validation.error ?? "Nieprawidłowy plik." };
  }

  const r2Key = buildR2Key(file.name);
  try {
    await uploadObject(r2Key, buffer, validation.mimeType);
  } catch (error) {
    captureError(error, { path: "uploadProductPhoto", userId: actor.userId });
    return { ok: false, error: "Nie udało się wgrać pliku do magazynu. Spróbuj ponownie." };
  }

  try {
    const existing = await db
      .select({ sortOrder: document.sortOrder })
      .from(document)
      .where(
        and(eq(document.productId, productId), eq(document.purpose, "product_photo"), isNull(document.deletedAt)),
      );
    const maxSortOrder = existing.reduce((max, row) => Math.max(max, row.sortOrder ?? -1), -1);
    // Pierwsze zdjęcie produktu automatycznie staje się okładką (spec 0032 Key
    // invariants): nowo dodany produkt zawsze ma poprawną okładkę na /wyniki
    // bez dodatkowego kroku producenta; kolejne zdjęcia zostają isCover: false.
    const isFirstPhoto = existing.length === 0;

    const [inserted] = await db
      .insert(document)
      .values({
        r2Key,
        filename: file.name,
        mimeType: validation.mimeType,
        sizeBytes: buffer.byteLength,
        purpose: "product_photo",
        isCover: isFirstPhoto,
        sortOrder: maxSortOrder + 1,
        ownerUserId: actor.userId,
        productId,
      })
      .returning({ id: document.id });

    return { ok: true, documentId: inserted.id, url: buildPublicUrl(r2Key) };
  } catch (error) {
    // Plik już jest w R2 w tym momencie; osierocony obiekt bez wiersza to
    // zaakceptowane, rzadkie ryzyko przy tej skali (spec 0031 Key invariants).
    captureError(error, { path: "uploadProductPhoto", userId: actor.userId });
    return { ok: false, error: "Plik trafił do magazynu, ale zapis w bazie się nie powiódł. Spróbuj ponownie." };
  }
}

// AC-4: db.batch (nie db.transaction — driver neon-http w tym repo nie wspiera
// interaktywnych transakcji, tylko atomowe partie zapytań) czyści isCover na
// wszystkich innych zdjęciach produktu w tej samej atomowej partii co ustawienie
// nowej okładki, żeby nigdy nie zderzyć się z częściowym unikalnym indeksem.
export async function setCoverPhoto(documentId: string): Promise<ActionResult> {
  const actor = await requirePhotoActor();
  if (!actor) return { ok: false, error: DENIED_ERROR };

  const [documentRow] = await db
    .select({ id: document.id, productId: document.productId })
    .from(document)
    .where(and(eq(document.id, documentId), isNull(document.deletedAt)));
  if (!documentRow || !documentRow.productId) {
    return { ok: false, error: "Nie znaleziono zdjęcia." };
  }
  if (!(await actorOwnsProduct(actor, documentRow.productId))) return { ok: false, error: DENIED_ERROR };

  try {
    await db.batch([
      db
        .update(document)
        .set({ isCover: false })
        .where(
          and(
            eq(document.productId, documentRow.productId),
            eq(document.purpose, "product_photo"),
            isNull(document.deletedAt),
          ),
        ),
      db.update(document).set({ isCover: true }).where(eq(document.id, documentId)),
    ]);
    return { ok: true };
  } catch (error) {
    captureError(error, { path: "setCoverPhoto", userId: actor.userId });
    return { ok: false, error: "Nie udało się ustawić okładki. Spróbuj ponownie." };
  }
}

// AC-5: lista musi dokładnie odpowiadać dzisiejszym, nieusuniętym zdjęciom
// produktu (spec 0031 API surface, błąd 422 przy rozjeździe).
export async function reorderProductPhotos(productId: string, orderedDocumentIds: string[]): Promise<ActionResult> {
  const actor = await requirePhotoActor();
  if (!actor) return { ok: false, error: DENIED_ERROR };
  const ownership = await resolveProductOwnership(actor, productId);
  if (ownership === "not_found") return { ok: false, error: PRODUCT_NOT_FOUND_ERROR };
  if (ownership === "denied") return { ok: false, error: DENIED_ERROR };

  const existing = await db
    .select({ id: document.id })
    .from(document)
    .where(
      and(eq(document.productId, productId), eq(document.purpose, "product_photo"), isNull(document.deletedAt)),
    );
  const existingIds = new Set(existing.map((row) => row.id));
  const providedIds = new Set(orderedDocumentIds);
  const matches =
    existingIds.size === providedIds.size && [...existingIds].every((id) => providedIds.has(id));
  if (!matches) {
    return { ok: false, error: "Lista zdjęć nie odpowiada dzisiejszej galerii produktu." };
  }

  try {
    const updates = orderedDocumentIds.map((documentId, index) =>
      db.update(document).set({ sortOrder: index }).where(eq(document.id, documentId)),
    );
    await db.batch(updates as [typeof updates[number], ...(typeof updates)]);
    return { ok: true };
  } catch (error) {
    captureError(error, { path: "reorderProductPhotos", userId: actor.userId });
    return { ok: false, error: "Nie udało się zapisać kolejności. Spróbuj ponownie." };
  }
}

// AC-6: wiersz jest oznaczany jako usunięty niezależnie od wyniku usunięcia z
// R2 (spec 0031 Key invariants) — rzadka awaria samego R2 jest zalogowana, nie
// blokuje usunięcia wiersza.
export async function deleteProductPhoto(documentId: string): Promise<ActionResult> {
  const actor = await requirePhotoActor();
  if (!actor) return { ok: false, error: DENIED_ERROR };

  const [documentRow] = await db
    .select({ id: document.id, r2Key: document.r2Key, productId: document.productId })
    .from(document)
    .where(and(eq(document.id, documentId), isNull(document.deletedAt)));
  if (!documentRow) return { ok: false, error: "Nie znaleziono zdjęcia." };
  if (!(await actorOwnsProduct(actor, documentRow.productId))) return { ok: false, error: DENIED_ERROR };

  try {
    await db.update(document).set({ deletedAt: new Date() }).where(eq(document.id, documentId));
  } catch (error) {
    captureError(error, { path: "deleteProductPhoto", userId: actor.userId });
    return { ok: false, error: "Nie udało się usunąć zdjęcia. Spróbuj ponownie." };
  }

  try {
    await deleteObject(documentRow.r2Key);
  } catch (error) {
    captureError(error, { path: "deleteProductPhoto.r2", userId: actor.userId });
  }

  return { ok: true };
}

export interface UploadFloorPlanResult extends ActionResult {
  documentId?: string;
  url?: string;
}

interface FloorPlanValidationResult {
  ok: boolean;
  mimeType?: "image/jpeg" | "image/png" | "image/webp" | "application/pdf";
  error?: string;
}

// Rzuty akceptują obraz (JPEG/PNG/WebP, jak dotychczas) albo PDF (spec 0050
// AC-3, nowość), do 10 MB, wykryte po rzeczywistej sygnaturze bajtowej pliku,
// nie po rozszerzeniu ani zgłoszonym Content-Type (ten sam powód co
// validateProductPhotoFile/validateDocumentPdf, które ta funkcja łączy).
function validateFloorPlanFile(bytes: Uint8Array): FloorPlanValidationResult {
  const imageValidation = validateProductPhotoFile(bytes);
  if (imageValidation.ok && imageValidation.mimeType) {
    return { ok: true, mimeType: imageValidation.mimeType };
  }
  const pdfValidation = validateDocumentPdf(bytes);
  if (pdfValidation.ok) {
    return { ok: true, mimeType: "application/pdf" };
  }
  return { ok: false, error: "Dozwolone są tylko pliki JPEG, PNG, WebP albo PDF, maksymalnie 10 MB." };
}

// AC-7 (spec 0045): prawdziwe wgrywanie rzutów architektonicznych, tym samym
// mechanizmem R2 co zdjęcia produktu wyżej. Ta sama tabela document z
// purpose="product_floor_plan" zamiast "product_photo". variantId opcjonalny:
// puste znaczy "dotyczy wszystkich wariantów" (spec 0041 Feature design);
// podany variantId jest sprawdzony jako należący do tego samego productId,
// żeby zmanipulowane żądanie nie mogło przypisać rzutu do cudzego wariantu.
export async function uploadFloorPlan(
  productId: string,
  file: File,
  variantId?: string | null,
): Promise<UploadFloorPlanResult> {
  const actor = await requirePhotoActor();
  if (!actor) return { ok: false, error: DENIED_ERROR };
  const ownership = await resolveProductOwnership(actor, productId);
  if (ownership === "not_found") return { ok: false, error: PRODUCT_NOT_FOUND_ERROR };
  if (ownership === "denied") return { ok: false, error: DENIED_ERROR };

  if (variantId) {
    const [variantRow] = await db
      .select({ id: productVariant.id })
      .from(productVariant)
      .where(and(eq(productVariant.id, variantId), eq(productVariant.productId, productId), isNull(productVariant.deletedAt)));
    if (!variantRow) return { ok: false, error: "Wariant nie należy do tego produktu." };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const validation = validateFloorPlanFile(buffer);
  if (!validation.ok || !validation.mimeType) {
    return { ok: false, error: validation.error ?? "Nieprawidłowy plik." };
  }

  const r2Key = buildR2Key(file.name);
  try {
    await uploadObject(r2Key, buffer, validation.mimeType);
  } catch (error) {
    captureError(error, { path: "uploadFloorPlan", userId: actor.userId });
    return { ok: false, error: "Nie udało się wgrać pliku do magazynu. Spróbuj ponownie." };
  }

  try {
    const existing = await db
      .select({ sortOrder: document.sortOrder })
      .from(document)
      .where(
        and(eq(document.productId, productId), eq(document.purpose, "product_floor_plan"), isNull(document.deletedAt)),
      );
    const maxSortOrder = existing.reduce((max, row) => Math.max(max, row.sortOrder ?? -1), -1);

    const [inserted] = await db
      .insert(document)
      .values({
        r2Key,
        filename: file.name,
        mimeType: validation.mimeType,
        sizeBytes: buffer.byteLength,
        purpose: "product_floor_plan",
        sortOrder: maxSortOrder + 1,
        ownerUserId: actor.userId,
        productId,
        productVariantId: variantId || null,
      })
      .returning({ id: document.id });

    return { ok: true, documentId: inserted.id, url: buildPublicUrl(r2Key) };
  } catch (error) {
    captureError(error, { path: "uploadFloorPlan", userId: actor.userId });
    return { ok: false, error: "Plik trafił do magazynu, ale zapis w bazie się nie powiódł. Spróbuj ponownie." };
  }
}

// AC-7: usunięcie rzutu, ten sam wzorzec co deleteProductPhoto wyżej (miękkie
// usunięcie wiersza niezależnie od wyniku usunięcia z R2).
export async function deleteFloorPlan(documentId: string): Promise<ActionResult> {
  const actor = await requirePhotoActor();
  if (!actor) return { ok: false, error: DENIED_ERROR };

  const [documentRow] = await db
    .select({ id: document.id, r2Key: document.r2Key, productId: document.productId })
    .from(document)
    .where(and(eq(document.id, documentId), isNull(document.deletedAt)));
  if (!documentRow) return { ok: false, error: "Nie znaleziono rzutu." };
  if (!(await actorOwnsProduct(actor, documentRow.productId))) return { ok: false, error: DENIED_ERROR };

  try {
    await db.update(document).set({ deletedAt: new Date() }).where(eq(document.id, documentId));
  } catch (error) {
    captureError(error, { path: "deleteFloorPlan", userId: actor.userId });
    return { ok: false, error: "Nie udało się usunąć rzutu. Spróbuj ponownie." };
  }

  try {
    await deleteObject(documentRow.r2Key);
  } catch (error) {
    captureError(error, { path: "deleteFloorPlan.r2", userId: actor.userId });
  }

  return { ok: true };
}

export interface UploadProductSpecificationPdfResult extends ActionResult {
  documentId?: string;
  url?: string;
}

// Jeden plik PDF specyfikacji na produkt, zawsze productVariantId = null
// (spec 0049 AC-6, AC-7): wgranie nowego pliku zastępuje poprzedni atomowo w
// jednym db.batch (miękkie usunięcie starego, wstawienie nowego), ten sam
// wzorzec co createAiProductDraft (lib/house-ai-import-actions.ts), bo
// sterownik neon-http nie wspiera db.transaction (lib/db/AGENTS.md).
export async function uploadProductSpecificationPdf(productId: string, file: File): Promise<UploadProductSpecificationPdfResult> {
  const actor = await requirePhotoActor();
  if (!actor) return { ok: false, error: DENIED_ERROR };
  const ownership = await resolveProductOwnership(actor, productId);
  if (ownership === "not_found") return { ok: false, error: PRODUCT_NOT_FOUND_ERROR };
  if (ownership === "denied") return { ok: false, error: DENIED_ERROR };

  const buffer = Buffer.from(await file.arrayBuffer());
  const validation = validateDocumentPdf(buffer);
  if (!validation.ok) {
    return { ok: false, error: validation.error ?? "Nieprawidłowy plik PDF." };
  }

  const r2Key = buildR2Key(file.name);
  try {
    await uploadObject(r2Key, buffer, "application/pdf");
  } catch (error) {
    captureError(error, { path: "uploadProductSpecificationPdf", userId: actor.userId });
    return { ok: false, error: "Nie udało się wgrać pliku do magazynu. Spróbuj ponownie." };
  }

  try {
    const existing = await db
      .select({ id: document.id })
      .from(document)
      .where(
        and(eq(document.productId, productId), eq(document.purpose, "product_specification"), isNull(document.deletedAt)),
      );

    const newDocumentId = randomUUID();
    const statements = [
      db.insert(document).values({
        id: newDocumentId,
        r2Key,
        filename: file.name,
        mimeType: "application/pdf",
        sizeBytes: buffer.byteLength,
        purpose: "product_specification",
        ownerUserId: actor.userId,
        productId,
        productVariantId: null,
      }),
      ...existing.map((row) => db.update(document).set({ deletedAt: new Date() }).where(eq(document.id, row.id))),
    ];
    await db.batch(statements as [(typeof statements)[number], ...typeof statements]);

    return { ok: true, documentId: newDocumentId, url: buildPublicUrl(r2Key) };
  } catch (error) {
    captureError(error, { path: "uploadProductSpecificationPdf", userId: actor.userId });
    return { ok: false, error: "Plik trafił do magazynu, ale zapis w bazie się nie powiódł. Spróbuj ponownie." };
  }
}

export async function deleteProductSpecificationPdf(documentId: string): Promise<ActionResult> {
  const actor = await requirePhotoActor();
  if (!actor) return { ok: false, error: DENIED_ERROR };

  const [documentRow] = await db
    .select({ id: document.id, r2Key: document.r2Key, productId: document.productId })
    .from(document)
    .where(and(eq(document.id, documentId), isNull(document.deletedAt)));
  if (!documentRow) return { ok: false, error: "Nie znaleziono pliku specyfikacji." };
  if (!(await actorOwnsProduct(actor, documentRow.productId))) return { ok: false, error: DENIED_ERROR };

  try {
    await db.update(document).set({ deletedAt: new Date() }).where(eq(document.id, documentId));
  } catch (error) {
    captureError(error, { path: "deleteProductSpecificationPdf", userId: actor.userId });
    return { ok: false, error: "Nie udało się usunąć pliku specyfikacji. Spróbuj ponownie." };
  }

  try {
    await deleteObject(documentRow.r2Key);
  } catch (error) {
    captureError(error, { path: "deleteProductSpecificationPdf.r2", userId: actor.userId });
  }

  return { ok: true };
}
