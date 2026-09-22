import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { MAX_AI_SOURCE_PDF_BYTES } from "@/lib/storage/ai-source-pdf-validation";

const R2_JURISDICTION = "eu";
const UPLOAD_URL_TTL_SECONDS = 5 * 60;

let cachedClient: S3Client | null = null;

function requiredEnvironmentValue(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} nie jest ustawione`);
  return value;
}

function getPrivateR2Client(): S3Client {
  if (cachedClient) return cachedClient;
  const accountId = requiredEnvironmentValue("R2_ACCOUNT_ID");
  cachedClient = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.${R2_JURISDICTION}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: requiredEnvironmentValue("AI_PRIVATE_R2_ACCESS_KEY_ID"),
      secretAccessKey: requiredEnvironmentValue("AI_PRIVATE_R2_SECRET_ACCESS_KEY"),
    },
    maxAttempts: 3,
    requestHandler: {
      connectionTimeout: 6_000,
      requestTimeout: 30_000,
    },
  });
  return cachedClient;
}

export async function downloadAiSourcePdf(key: string): Promise<Uint8Array> {
  if (!key) throw new Error("AI_PRIVATE_R2_OBJECT_KEY_INVALID");
  const response = await getPrivateR2Client().send(new GetObjectCommand({
    Bucket: requiredEnvironmentValue("AI_PRIVATE_R2_BUCKET_NAME"),
    Key: key,
  }));

  if (response.ContentLength !== undefined && response.ContentLength > MAX_AI_SOURCE_PDF_BYTES) {
    const body = response.Body as (typeof response.Body & {
      destroy?: () => void;
      cancel?: () => void | Promise<void>;
    });
    if (typeof body?.destroy === "function") body.destroy();
    else if (typeof body?.cancel === "function") await body.cancel();
    throw new Error("AI_PRIVATE_R2_OBJECT_TOO_LARGE");
  }
  if (!response.Body) throw new Error("AI_PRIVATE_R2_OBJECT_EMPTY");
  const bytes = await response.Body.transformToByteArray();
  if (bytes.byteLength === 0) throw new Error("AI_PRIVATE_R2_OBJECT_EMPTY");
  if (bytes.byteLength > MAX_AI_SOURCE_PDF_BYTES) throw new Error("AI_PRIVATE_R2_OBJECT_TOO_LARGE");
  return bytes;
}

export async function createAiSourcePdfUploadUrl(key: string): Promise<{
  url: string;
  headers: { "Content-Type": "application/pdf" };
}> {
  if (!key.startsWith("quarantine/")) throw new Error("AI_PRIVATE_R2_OBJECT_KEY_INVALID");
  const command = new PutObjectCommand({
    Bucket: requiredEnvironmentValue("AI_PRIVATE_R2_BUCKET_NAME"),
    Key: key,
    ContentType: "application/pdf",
  });
  const url = await getSignedUrl(getPrivateR2Client(), command, { expiresIn: UPLOAD_URL_TTL_SECONDS });
  return { url, headers: { "Content-Type": "application/pdf" } };
}

export async function inspectAiSourcePdf(key: string): Promise<{
  sizeBytes: number;
  contentType: string | null;
}> {
  const response = await getPrivateR2Client().send(new HeadObjectCommand({
    Bucket: requiredEnvironmentValue("AI_PRIVATE_R2_BUCKET_NAME"),
    Key: key,
  }));
  return {
    sizeBytes: response.ContentLength ?? 0,
    contentType: response.ContentType ?? null,
  };
}

export async function deleteAiSourcePdf(key: string): Promise<void> {
  await getPrivateR2Client().send(new DeleteObjectCommand({
    Bucket: requiredEnvironmentValue("AI_PRIVATE_R2_BUCKET_NAME"),
    Key: key,
  }));
}

export function resetAiPrivateR2ClientForTests(): void {
  cachedClient = null;
}
