import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Prywatny kubełek Cloudflare R2, spec 0063 Build plan #4: drugi, osobny
// kubełek obok lib/storage/r2-client.ts (publiczny, zdjęcia/rzuty/PDF-y
// marketingowe). Ten tutaj nigdy nie serwuje przez publiczną domenę — jedyna
// droga odczytu to krótkoterminowy, podpisany URL (buildSignedDownloadUrl),
// generowany na nowo przy każdym wywołaniu, nigdy zapisywany ani cache'owany
// (spec 0063 Key invariants). Wgrywanie wciąż idzie przez serwer, bez CORS,
// ten sam model co r2-client.ts — tylko odczyt różni się (podpisany URL
// zamiast publicznej domeny).
//
// Ten sam R2_ACCOUNT_ID co kubełek publiczny (jedno konto Cloudflare), ale
// własne poświadczenia i własna nazwa kubełka (PRIVATE_R2_*), bo to osobny,
// prywatny zasób.
const R2_JURISDICTION = "eu";

function getPrivateR2Client(): S3Client {
  const accountId = process.env.R2_ACCOUNT_ID;
  if (!accountId) throw new Error("R2_ACCOUNT_ID nie jest ustawione");

  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.${R2_JURISDICTION}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.PRIVATE_R2_ACCESS_KEY_ID ?? "",
      secretAccessKey: process.env.PRIVATE_R2_SECRET_ACCESS_KEY ?? "",
    },
  });
}

function getPrivateBucketName(): string {
  const bucket = process.env.PRIVATE_R2_BUCKET_NAME;
  if (!bucket) throw new Error("PRIVATE_R2_BUCKET_NAME nie jest ustawione");
  return bucket;
}

export async function uploadPrivateObject(key: string, body: Buffer, contentType: string): Promise<void> {
  const client = getPrivateR2Client();
  await client.send(
    new PutObjectCommand({
      Bucket: getPrivateBucketName(),
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
}

// Nagłówek Content-Disposition nie dopuszcza znaków sterujących ani cudzysłowu
// w wartości cytowanej (ryzyko wstrzyknięcia nagłówka) — oryginalna nazwa
// pliku pochodzi od producenta, więc jest oczyszczana przed wstawieniem.
function sanitizeFilenameForHeader(filename: string): string {
  return filename.replace(/[\r\n"]/g, "").trim() || "wycena.pdf";
}

// Podpisany URL do odczytu, TTL krótki (10 minut w wywołaniach z
// lib/project-quote-actions.ts), generowany na żądanie, nigdy trwały (spec
// 0063 Key invariants). ResponseContentDisposition wymusza pobranie pod
// czytelną nazwą zamiast losowego r2Key w pasku adresu przeglądarki;
// ResponseCacheControl: private, no-store, żeby pośrednicy/przeglądarka nie
// trzymali pliku w pamięci podręcznej po wygaśnięciu TTL.
export async function buildSignedDownloadUrl(key: string, ttlSeconds: number, filename: string): Promise<string> {
  const client = getPrivateR2Client();
  const command = new GetObjectCommand({
    Bucket: getPrivateBucketName(),
    Key: key,
    ResponseContentDisposition: `attachment; filename="${sanitizeFilenameForHeader(filename)}"`,
    ResponseCacheControl: "private, no-store",
  });
  return getSignedUrl(client, command, { expiresIn: ttlSeconds });
}
