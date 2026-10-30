import { timingSafeEqual } from "node:crypto";
import { revalidateTag } from "next/cache";
import { NextResponse, type NextRequest } from "next/server";
import { REVALIDATABLE_TAGS } from "@/lib/cache-tags";

// Spec 0078 AC-9: skrypty importu i ręczne zapisy SQL nie przechodzą przez akcje
// serwerowe, więc unieważniają cache danych publicznych tym endpointem.
// Bez ustawionego REVALIDATE_SECRET każde wywołanie jest odrzucone.

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret) return false;
  const header = request.headers.get("authorization") ?? "";
  const expected = Buffer.from(`Bearer ${secret}`);
  const received = Buffer.from(header);
  return received.length === expected.length && timingSafeEqual(received, expected);
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body must be JSON" }, { status: 422 });
  }

  const tags = typeof body === "object" && body !== null && "tags" in body ? (body as { tags: unknown }).tags : null;
  if (!Array.isArray(tags) || tags.length === 0 || !tags.every((tag): tag is string => typeof tag === "string")) {
    return NextResponse.json({ error: "tags must be a non empty array of strings" }, { status: 422 });
  }
  // Tag `product:{id}` i `producer:{id}` też są dozwolone, ale tylko z niepustym id.
  const allowed = (tag: string) =>
    REVALIDATABLE_TAGS.includes(tag) || /^(product|producer):[A-Za-z0-9_-]{1,64}$/.test(tag);
  const unknown = tags.filter((tag) => !allowed(tag));
  if (unknown.length > 0) {
    return NextResponse.json({ error: "Unknown tags", unknown }, { status: 422 });
  }

  const unique = [...new Set(tags)];
  for (const tag of unique) revalidateTag(tag, { expire: 0 });
  return NextResponse.json({ revalidated: unique });
}
