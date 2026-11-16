import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
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

// Usunięcie obiektu z prywatnego kubełka (spec 0070 zadanie 20): potrzebne do sprzątania
// po nieudanym zapisie wiersza pliku inwestora i do godzinnego zadania czyszczącego.
// DeleteObject w R2 jest idempotentne (brak obiektu to też sukces).
export async function deletePrivateObject(key: string): Promise<void> {
  const client = getPrivateR2Client();
  await client.send(new DeleteObjectCommand({ Bucket: getPrivateBucketName(), Key: key }));
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
//
// Opcjonalny `contentType` (spec 0080): wymusza zapisany typ MIME w odpowiedzi, żeby przeglądarka
// nie zgadywała typu pliku wgranego przez administratora.
export async function buildSignedDownloadUrl(
  key: string,
  ttlSeconds: number,
  filename: string,
  contentType?: string,
): Promise<string> {
  const client = getPrivateR2Client();
  const command = new GetObjectCommand({
    Bucket: getPrivateBucketName(),
    Key: key,
    ResponseContentDisposition: `attachment; filename="${sanitizeFilenameForHeader(filename)}"`,
    ResponseCacheControl: "private, no-store",
    ...(contentType ? { ResponseContentType: contentType } : {}),
  });
  return getSignedUrl(client, command, { expiresIn: ttlSeconds });
}

// Podpisany adres do zapisu (PUT) prosto z przeglądarki (spec 0080 AC-14, spec 0085): plik omija funkcję
// serwerową, więc nie obowiązuje go limit ciała żądania Vercela (około 4,5 MB). Wymaga reguły
// CORS na prywatnym kubełku. Typ treści wchodzi w podpis, więc przeglądarka musi wysłać dokładnie
// ten sam nagłówek Content-Type. Opcjonalne `contentLength` (spec 0085 AC-4) wchodzi w podpis jako
// nagłówek content-length; bez niego zachowanie jest takie jak dla spec 0080.
export async function buildSignedUploadUrl(
  key: string,
  ttlSeconds: number,
  contentType: string,
  contentLength?: number,
): Promise<string> {
  const client = getPrivateR2Client();
  const command = new PutObjectCommand({
    Bucket: getPrivateBucketName(),
    Key: key,
    ContentType: contentType,
    ...(contentLength !== undefined ? { ContentLength: contentLength } : {}),
  });
  return getSignedUrl(client, command, {
    expiresIn: ttlSeconds,
    ...(contentLength !== undefined ? { signableHeaders: new Set(["content-type", "content-length"]) } : {}),
  });
}

// Rozmiar obiektu bez pobierania go; `null`, gdy obiektu nie ma.
export async function headPrivateObjectSize(key: string): Promise<number | null> {
  const client = getPrivateR2Client();
  try {
    const result = await client.send(new HeadObjectCommand({ Bucket: getPrivateBucketName(), Key: key }));
    return result.ContentLength ?? 0;
  } catch (error) {
    const name = (error as { name?: string }).name;
    const status = (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode;
    if (name === "NotFound" || name === "NoSuchKey" || status === 404) return null;
    throw error;
  }
}

// Zakresowy odczyt pierwszych bajtów obiektu (sprawdzenie sygnatury pliku bez pobierania całości).
export async function readPrivateObjectHead(key: string, byteCount: number): Promise<Uint8Array> {
  const client = getPrivateR2Client();
  const result = await client.send(
    new GetObjectCommand({ Bucket: getPrivateBucketName(), Key: key, Range: `bytes=0-${Math.max(0, byteCount - 1)}` }),
  );
  if (!result.Body) return new Uint8Array();
  return result.Body.transformToByteArray();
}

// Rozmiar i ETag obiektu bez pobierania go (spec 0085 AC-4, AC-6); `null`, gdy obiektu nie ma.
export async function headPrivateObject(key: string): Promise<{ size: number; etag: string | null } | null> {
  const client = getPrivateR2Client();
  try {
    const result = await client.send(new HeadObjectCommand({ Bucket: getPrivateBucketName(), Key: key }));
    return { size: result.ContentLength ?? 0, etag: result.ETag ?? null };
  } catch (error) {
    const name = (error as { name?: string }).name;
    const status = (error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode;
    if (name === "NotFound" || name === "NoSuchKey" || status === 404) return null;
    throw error;
  }
}

export class PrivateObjectTooLargeError extends Error {
  constructor() {
    super("Obiekt przekracza dozwolony rozmiar.");
    this.name = "PrivateObjectTooLargeError";
  }
}

// Pełne pobranie obiektu z twardym limitem bajtów (spec 0085 AC-4, AC-5): nie ufa samemu HEAD, przerywa
// czytanie, gdy strumień przekroczy `maxBytes`, i zwraca ETag odczytanej wersji (do `If-Match` przy kopii).
export async function readPrivateObjectBytes(
  key: string,
  maxBytes: number,
): Promise<{ bytes: Buffer; etag: string | null }> {
  const client = getPrivateR2Client();
  const result = await client.send(new GetObjectCommand({ Bucket: getPrivateBucketName(), Key: key }));
  if (!result.Body) return { bytes: Buffer.alloc(0), etag: result.ETag ?? null };
  const chunks: Buffer[] = [];
  let total = 0;
  for await (const chunk of result.Body as AsyncIterable<Uint8Array>) {
    total += chunk.byteLength;
    if (total > maxBytes) {
      (result.Body as { destroy?: () => void }).destroy?.();
      throw new PrivateObjectTooLargeError();
    }
    chunks.push(Buffer.from(chunk));
  }
  return { bytes: Buffer.concat(chunks, total), etag: result.ETag ?? null };
}

// Kopia obiektu na klucz ostateczny po stronie R2 (plik nie wraca przez funkcję), spec 0085 AC-6, AC-14.
// `CopyObjectIfMatch` gwarantuje, że kopiujemy dokładnie tę wersję, którą zwalidowano.
export async function copyPrivateObject(
  fromKey: string,
  toKey: string,
  ifMatchEtag: string | null,
  contentType: string,
): Promise<void> {
  const client = getPrivateR2Client();
  const bucket = getPrivateBucketName();
  await client.send(
    new CopyObjectCommand({
      Bucket: bucket,
      Key: toKey,
      CopySource: `${bucket}/${fromKey}`,
      ContentType: contentType,
      MetadataDirective: "REPLACE",
      ...(ifMatchEtag ? { CopySourceIfMatch: ifMatchEtag } : {}),
    }),
  );
}
