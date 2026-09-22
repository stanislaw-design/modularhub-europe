import { randomUUID } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { persistHouseProjectExtraction } from "@/lib/ai/house-project-extraction-persistence";
import { db } from "@/lib/db/client";
import {
  aiCandidateEvidence,
  aiDocumentIssue,
  aiExtractionSession,
  aiFieldCandidate,
  aiSourceDocument,
  auditLog,
  document,
  producer,
  product,
  users,
} from "@/lib/db/schema";

const RUN_DATABASE_INTEGRATION_TESTS = process.env.RUN_DATABASE_INTEGRATION_TESTS === "1";

describe.skipIf(!process.env.DATABASE_URL || !RUN_DATABASE_INTEGRATION_TESTS)("house project extraction persistence in Neon", () => {
  const userId = randomUUID();
  const producerId = randomUUID();
  const productId = randomUUID();
  const documentId = randomUUID();
  const sessionId = randomUUID();
  const sourceDocumentId = randomUUID();
  let fixtureStarted = false;

  beforeAll(async () => {
    await db.insert(users).values({
      id: userId,
      email: `house-import-persistence-${userId}@example.test`,
      phone: "+48000000000",
      role: "producer",
    });
    fixtureStarted = true;
    await db.insert(producer).values({
      id: producerId,
      userId,
      nip: `HIP${producerId.slice(0, 9)}`,
      name: "House import persistence test",
      countryCode: "PL",
    });
    await db.insert(product).values({
      id: productId,
      producerId,
      family: "dom",
      name: "Existing draft value",
    });
    await db.insert(document).values({
      id: documentId,
      r2Key: `test/house-import/${documentId}.pdf`,
      filename: "safe-test.pdf",
      mimeType: "application/pdf",
      sizeBytes: 1024,
      purpose: "ai_source_pdf",
      ownerUserId: userId,
      productId,
    });
    await db.insert(aiExtractionSession).values({
      id: sessionId,
      productId,
      producerId,
      createdByUserId: userId,
      status: "normalizing",
      currentStage: "normalization",
      progress: 90,
      schemaVersion: "house-import-v1",
      model: "integration-test",
    });
    await db.insert(aiSourceDocument).values({
      id: sourceDocumentId,
      sessionId,
      documentId,
      safeFilename: "safe-test.pdf",
      sha256: "a".repeat(64),
      pageCount: 3,
      detectedLanguage: "pl",
      pdfKind: "text",
      ocrStatus: "ready",
      sortOrder: 0,
    });
  });

  afterAll(async () => {
    if (!fixtureStarted) return;
    await db.delete(aiExtractionSession).where(eq(aiExtractionSession.id, sessionId));
    await db.delete(document).where(eq(document.id, documentId));
    await db.delete(product).where(eq(product.id, productId));
    await db.delete(producer).where(eq(producer.id, producerId));
    await db.delete(users).where(eq(users.id, userId));
    await db.delete(auditLog).where(inArray(auditLog.recordId, [userId, producerId, productId, documentId]));
  });

  it("atomically writes the review data, marks the session ready and never changes the product", async () => {
    const persistenceInput = {
      sessionId,
      documents: [{
        sourceDocumentId,
        candidates: [{
          fieldPath: "product.name" as const,
          entityKey: null,
          parentEntityKey: null,
          rawValue: "Imported proposal",
          normalizedValue: "Imported proposal",
          normalizationMetadata: null,
          origin: "extracted" as const,
          confidence: "high" as const,
          ocrConfidence: 0.98,
          evidence: [
            { pageNumber: 1, excerpt: "Imported proposal" },
            { pageNumber: 2, excerpt: "Model: Imported proposal" },
          ],
        }],
        issues: [{
          code: "ORIGIN_NOT_ALLOWED" as const,
          fieldPath: "technical.ventilation" as const,
          entityKey: null,
          parentEntityKey: null,
          evidencePages: [3],
        }],
      }],
    };

    const first = await persistHouseProjectExtraction(persistenceInput);
    const second = await persistHouseProjectExtraction(persistenceInput);

    expect(first).toEqual({
      alreadyPersisted: false,
      candidateCount: 1,
      evidenceCount: 2,
      issueCount: 1,
      conflictCount: 0,
    });
    expect(second.alreadyPersisted).toBe(true);

    const [session] = await db.select().from(aiExtractionSession).where(eq(aiExtractionSession.id, sessionId));
    const candidates = await db.select().from(aiFieldCandidate).where(eq(aiFieldCandidate.sessionId, sessionId));
    const evidence = await db.select().from(aiCandidateEvidence).where(eq(aiCandidateEvidence.candidateId, candidates[0]!.id));
    const issues = await db.select().from(aiDocumentIssue).where(eq(aiDocumentIssue.sessionId, sessionId));
    const [unchangedProduct] = await db.select({ name: product.name }).from(product).where(eq(product.id, productId));

    expect(session).toMatchObject({ status: "review_ready", currentStage: "review", progress: 100 });
    expect(candidates).toHaveLength(1);
    expect(evidence).toHaveLength(2);
    expect(issues).toHaveLength(1);
    expect(unchangedProduct?.name).toBe("Existing draft value");
  });
});
