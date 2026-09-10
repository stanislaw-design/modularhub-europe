import { randomUUID } from "node:crypto";
import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

// Cloudflare R2 klient, spec 0031 Build plan #3. R2 mówi protokołem S3, więc
// zwykły @aws-sdk/client-s3 wystarcza (bez s3-request-presigner: wgrywanie idzie
// przez serwer, serwowanie przez publiczną domenę kubełka, nigdy podpisane URL).
//
// Kubełek ma jurysdykcję UE (spec 0017/0031 Decision), a taki kubełek jest
// dostępny przez S3 API wyłącznie pod jurysdykcyjnym endpointem
// (https://<ACCOUNT_ID>.eu.r2.cloudflarestorage.com), nigdy przez domyślny
// (https://<ACCOUNT_ID>.r2.cloudflarestorage.com) — inaczej Cloudflare zwraca
// "AccessDenied" (403), nie jasny błąd o złej jurysdykcji.
const R2_JURISDICTION = "eu";

function getR2Client(): S3Client {
  const accountId = process.env.R2_ACCOUNT_ID;
  if (!accountId) throw new Error("R2_ACCOUNT_ID nie jest ustawione");

  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.${R2_JURISDICTION}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID ?? "",
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? "",
    },
  });
}

function getBucketName(): string {
  const bucket = process.env.R2_BUCKET_NAME;
  if (!bucket) throw new Error("R2_BUCKET_NAME nie jest ustawione");
  return bucket;
}

// r2Key to zawsze losowy UUID plus rozszerzenie, nigdy oryginalna nazwa pliku
// (spec 0031 Feature design): unika kolizji nazw i odgadywalnych adresów.
export function buildR2Key(originalFilename: string): string {
  const extension = originalFilename.includes(".") ? originalFilename.slice(originalFilename.lastIndexOf(".")) : "";
  return `${randomUUID()}${extension}`;
}

export async function uploadObject(key: string, body: Buffer, contentType: string): Promise<void> {
  const client = getR2Client();
  await client.send(
    new PutObjectCommand({
      Bucket: getBucketName(),
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  );
}

export async function deleteObject(key: string): Promise<void> {
  const client = getR2Client();
  await client.send(
    new DeleteObjectCommand({
      Bucket: getBucketName(),
      Key: key,
    }),
  );
}

// Kubełek jest publiczny tylko do odczytu przez własną domenę (spec 0031
// Security model): budowanie adresu do wyświetlenia nie wymaga podpisanego URL.
export function buildPublicUrl(key: string): string {
  const domain = process.env.R2_PUBLIC_DOMAIN;
  if (!domain) throw new Error("R2_PUBLIC_DOMAIN nie jest ustawione");
  return `https://${domain}/${key}`;
}
