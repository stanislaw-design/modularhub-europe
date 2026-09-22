# lib/storage/

The Cloudflare R2 object storage layer, introduced by spec 0031 (realne przechowywanie plików). Backs the `document` table (schema in [[lib/db/AGENTS.md|lib/db/]], spec 0018) with an actual file store, replacing the earlier mock upload with no persistence.

## Conventions

- `r2-client.ts` wraps `@aws-sdk/client-s3` (R2 speaks the S3 protocol, so the plain SDK is enough; no `s3-request-presigner`, uploads always go through the server and reads always go through the bucket's public domain, never a signed URL).
- The R2 bucket has EU jurisdiction (spec 0017/0031 Decision), which requires the jurisdictional S3 endpoint `https://<ACCOUNT_ID>.eu.r2.cloudflarestorage.com`, never the default `https://<ACCOUNT_ID>.r2.cloudflarestorage.com` — the default endpoint returns a misleading `AccessDenied` (403) instead of a jurisdiction error. See the `R2_JURISDICTION` constant in `r2-client.ts` before changing the endpoint construction.
- `buildR2Key()` always generates a random UUID plus extension, never the original filename — avoids collisions and guessable object addresses. The original filename is kept only in `document.filename` for display.
- `document-validation.ts` checks real file type by byte signature (magic bytes for JPEG/PNG/WebP), not by extension or the browser supplied `Content-Type` (both are spoofable). Add a new allowed type here by extending `ALLOWED_IMAGE_MIME_TYPES` and `detectImageMimeType()`, not by trusting MIME/extension elsewhere.
- Required environment variables (see `.env.local.example`): `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_DOMAIN`. `R2_PUBLIC_DOMAIN` must also be added to `images.remotePatterns` in `next.config.ts` (already wired conditionally there; only fires once the variable is set, per the root rule on external image hosts).
- The bucket is public read only through its own domain (product photos are marketing content); every write or delete goes through a signed server request with R2 credentials, never from the browser.
- This bucket is not suited to private documents (e.g. future `company_verification`, `order_stage` purposes): a private target needs its own bucket or prefix with signed download URLs, a decision explicitly deferred by spec 0031's Follow-up.
- `ai-private-r2-client.ts` (spec 0047) is the one exception to "uploads always go through the server": the house-import quarantine bucket (`modularhub-house-import-dev`, EU jurisdiction) uses `s3-request-presigner` so the browser can `PUT` straight to R2 without proxying the file through a server action. That needs a **CORS policy on the bucket itself** (Cloudflare dashboard → bucket → Settings → CORS Policy → allow the app origin, `PUT`, header `content-type`) — a manual step easy to forget since every other bucket in this project never needed one. Without it every upload fails with a misleading generic error, indistinguishable in the UI from an oversized file.
- The Cloudflare API for this account's buckets requires the `cf-r2-jurisdiction: eu` header on every R2 Buckets API call (list/get/cors/etc.) — omitting it returns `10006 bucket does not exist` even though the bucket is right there. Relevant if managing CORS or bucket settings via the API instead of the dashboard.

Governing spec: `docs/specs/0031-realne-przechowywanie-plikow/`.

_Drafted by /sync from the introducing change, worth a quick human pass._
