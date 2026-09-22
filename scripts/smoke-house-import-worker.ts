import { createHash, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { DefaultAzureCredential } from "@azure/identity";
import { ServiceBusClient } from "@azure/service-bus";
import { and, count, eq, inArray, isNull, notExists } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  aiCandidateEvidence,
  aiDocumentIssue,
  aiExtractionSession,
  aiFieldCandidate,
  aiSourceDocument,
  document,
  producer,
  product,
  users,
} from "@/lib/db/schema";
import { HOUSE_AI_SCHEMA_VERSION } from "@/lib/house-ai-field-catalog";

const DEFAULT_FIXTURE = "_docs/treevia-do-testów.pdf";
const DEFAULT_PAGE_COUNT = 14;
const MAX_SOURCE_PDF_BYTES = 25 * 1024 * 1024;
const ACTIVE_SESSION_STATUSES = [
  "uploading",
  "queued",
  "scanning",
  "extracting",
  "normalizing",
  "applying",
  "cancel_requested",
] as const;
const TERMINAL_SESSION_STATUSES = new Set(["review_ready", "failed", "cancelled"]);

function requiredEnvironmentValue(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

function numericEnvironmentValue(name: string, fallback: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) throw new Error(`${name} is invalid`);
  return value;
}

function productDigest(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, milliseconds));
}

async function selectTargetDraft(): Promise<{
  productId: string;
  producerId: string;
  ownerUserId: string;
}> {
  const producerEmail = process.env.HOUSE_IMPORT_SMOKE_PRODUCER_EMAIL?.trim();
  const activeSession = db
    .select({ id: aiExtractionSession.id })
    .from(aiExtractionSession)
    .where(and(
      eq(aiExtractionSession.producerId, producer.id),
      inArray(aiExtractionSession.status, ACTIVE_SESSION_STATUSES),
    ));
  const [target] = await db
    .select({
      productId: product.id,
      producerId: producer.id,
      ownerUserId: producer.userId,
    })
    .from(product)
    .innerJoin(producer, eq(producer.id, product.producerId))
    .innerJoin(users, eq(users.id, producer.userId))
    .where(and(
      eq(product.family, "dom"),
      eq(product.status, "draft"),
      isNull(product.deletedAt),
      isNull(producer.deletedAt),
      isNull(users.deletedAt),
      producerEmail ? eq(users.email, producerEmail) : undefined,
      notExists(activeSession),
    ))
    .limit(1);

  if (!target) {
    throw new Error(
      producerEmail
        ? "No eligible house draft exists for HOUSE_IMPORT_SMOKE_PRODUCER_EMAIL"
        : "No eligible house draft exists without an active import session",
    );
  }
  return target;
}

async function main(): Promise<void> {
  if (process.env.HOUSE_IMPORT_SMOKE_TEST_ACK !== "1") {
    throw new Error("Set HOUSE_IMPORT_SMOKE_TEST_ACK=1 to confirm the controlled smoke test");
  }

  const fixturePath = resolve(process.argv[2] ?? DEFAULT_FIXTURE);
  const pdf = await readFile(fixturePath);
  if (pdf.byteLength === 0 || pdf.byteLength > MAX_SOURCE_PDF_BYTES) {
    throw new Error("Smoke PDF must contain between 1 byte and 25 MB");
  }
  if (pdf.subarray(0, 5).toString("ascii") !== "%PDF-") {
    throw new Error("Smoke fixture does not have a PDF signature");
  }

  const pageCount = numericEnvironmentValue("HOUSE_IMPORT_SMOKE_PAGE_COUNT", DEFAULT_PAGE_COUNT);
  if (pageCount > 200) throw new Error("HOUSE_IMPORT_SMOKE_PAGE_COUNT exceeds 200 pages");

  const bucket = requiredEnvironmentValue("AI_PRIVATE_R2_BUCKET_NAME");
  const accountId = requiredEnvironmentValue("R2_ACCOUNT_ID");
  const serviceBusNamespace = requiredEnvironmentValue("AZURE_SERVICE_BUS_NAMESPACE");
  const serviceBusQueue = requiredEnvironmentValue("AZURE_SERVICE_BUS_QUEUE");
  const target = await selectTargetDraft();
  const [productBefore] = await db.select().from(product).where(eq(product.id, target.productId));
  if (!productBefore) throw new Error("Selected draft disappeared before smoke setup");

  const sessionId = randomUUID();
  const documentId = randomUUID();
  const sourceDocumentId = randomUUID();
  const r2Key = `quarantine/house-import-smoke/${target.producerId}/${sessionId}/${documentId}.pdf`;
  const sha256 = createHash("sha256").update(pdf).digest("hex");
  const s3 = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.eu.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: requiredEnvironmentValue("AI_PRIVATE_R2_ACCESS_KEY_ID"),
      secretAccessKey: requiredEnvironmentValue("AI_PRIVATE_R2_SECRET_ACCESS_KEY"),
    },
    maxAttempts: 3,
  });

  let uploaded = false;
  let seeded = false;
  let sent = false;
  try {
    await s3.send(new PutObjectCommand({
      Bucket: bucket,
      Key: r2Key,
      Body: pdf,
      ContentLength: pdf.byteLength,
      ContentType: "application/pdf",
      Metadata: { purpose: "house-import-smoke-test" },
    }));
    uploaded = true;

    await db.batch([
      db.insert(document).values({
        id: documentId,
        r2Key,
        filename: "house-import-smoke.pdf",
        mimeType: "application/pdf",
        sizeBytes: pdf.byteLength,
        purpose: "ai_source_pdf",
        ownerUserId: target.ownerUserId,
        productId: target.productId,
        producerId: target.producerId,
      }),
      db.insert(aiExtractionSession).values({
        id: sessionId,
        productId: target.productId,
        producerId: target.producerId,
        createdByUserId: target.ownerUserId,
        status: "queued",
        currentStage: "queue",
        progress: 5,
        schemaVersion: HOUSE_AI_SCHEMA_VERSION,
        model: "gpt-5-mini-global-dev@2025-08-07",
      }),
      db.insert(aiSourceDocument).values({
        id: sourceDocumentId,
        sessionId,
        documentId,
        safeFilename: "house-import-smoke.pdf",
        sha256,
        pageCount,
        pdfKind: "text",
        ocrStatus: "pending",
        sortOrder: 0,
      }),
    ]);
    seeded = true;

    const serviceBus = new ServiceBusClient(serviceBusNamespace, new DefaultAzureCredential());
    const sender = serviceBus.createSender(serviceBusQueue);
    try {
      await sender.sendMessages({
        body: { sessionId },
        contentType: "application/json",
        messageId: `house-import-smoke:${sessionId}`,
        subject: "house-project-import-smoke",
      });
      sent = true;
    } finally {
      await sender.close();
      await serviceBus.close();
    }

    console.log(JSON.stringify({
      event: "house_import_smoke_queued",
      sessionId,
      productId: target.productId,
      reviewPath: `/pl/producer/panel/project/import?sessionId=${sessionId}`,
    }));

    const timeoutMs = numericEnvironmentValue("HOUSE_IMPORT_SMOKE_TIMEOUT_MS", 12 * 60 * 1_000);
    const deadline = Date.now() + timeoutMs;
    let lastState = "";
    let finalSession: {
      status: string;
      currentStage: string;
      progress: number;
      attemptCount: number;
      safeErrorCode: string | null;
    } | undefined;

    while (Date.now() < deadline) {
      const [current] = await db
        .select({
          status: aiExtractionSession.status,
          currentStage: aiExtractionSession.currentStage,
          progress: aiExtractionSession.progress,
          attemptCount: aiExtractionSession.attemptCount,
          safeErrorCode: aiExtractionSession.safeErrorCode,
        })
        .from(aiExtractionSession)
        .where(eq(aiExtractionSession.id, sessionId));
      if (!current) throw new Error("Smoke session disappeared during processing");
      finalSession = current;
      const state = `${current.status}:${current.currentStage}:${current.progress}:${current.attemptCount}`;
      if (state !== lastState) {
        console.log(JSON.stringify({ event: "house_import_smoke_progress", ...current }));
        lastState = state;
      }
      if (TERMINAL_SESSION_STATUSES.has(current.status)) break;
      await delay(5_000);
    }

    if (!finalSession || !TERMINAL_SESSION_STATUSES.has(finalSession.status)) {
      throw new Error("House import smoke test timed out before a terminal state");
    }

    const [candidateResult] = await db
      .select({ value: count() })
      .from(aiFieldCandidate)
      .where(eq(aiFieldCandidate.sessionId, sessionId));
    const [evidenceResult] = await db
      .select({ value: count() })
      .from(aiCandidateEvidence)
      .innerJoin(aiFieldCandidate, eq(aiCandidateEvidence.candidateId, aiFieldCandidate.id))
      .where(eq(aiFieldCandidate.sessionId, sessionId));
    const [issueResult] = await db
      .select({ value: count() })
      .from(aiDocumentIssue)
      .where(eq(aiDocumentIssue.sessionId, sessionId));
    const [productAfter] = await db.select().from(product).where(eq(product.id, target.productId));
    const productUnchanged = productDigest(productBefore) === productDigest(productAfter);

    const result = {
      ok: finalSession.status === "review_ready" && productUnchanged,
      sessionId,
      productId: target.productId,
      reviewPath: `/pl/producer/panel/project/import?sessionId=${sessionId}`,
      status: finalSession.status,
      stage: finalSession.currentStage,
      progress: finalSession.progress,
      attemptCount: finalSession.attemptCount,
      safeErrorCode: finalSession.safeErrorCode,
      candidateCount: candidateResult?.value ?? 0,
      evidenceCount: evidenceResult?.value ?? 0,
      issueCount: issueResult?.value ?? 0,
      productUnchanged,
    };
    console.log(JSON.stringify(result));
    if (!result.ok) process.exitCode = 1;
  } finally {
    if (!sent) {
      if (seeded) {
        await db.delete(aiExtractionSession).where(eq(aiExtractionSession.id, sessionId));
        await db.delete(document).where(eq(document.id, documentId));
      }
      if (uploaded) {
        await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: r2Key }));
      }
    }
    s3.destroy();
  }
}

main().catch((error: unknown) => {
  console.error(JSON.stringify({
    ok: false,
    code: "HOUSE_IMPORT_SMOKE_FAILED",
    message: error instanceof Error ? error.message : "Unknown smoke test failure",
  }));
  process.exitCode = 1;
});
