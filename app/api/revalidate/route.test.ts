import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const revalidateTag = vi.fn();
vi.mock("next/cache", () => ({ revalidateTag: (...args: unknown[]) => revalidateTag(...args) }));

import { POST } from "./route";

function call(body: unknown, token?: string) {
  return POST(
    new NextRequest("http://localhost/api/revalidate", {
      method: "POST",
      headers: token ? { authorization: `Bearer ${token}` } : {},
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );
}

describe("POST /api/revalidate", () => {
  beforeEach(() => {
    revalidateTag.mockClear();
    vi.stubEnv("REVALIDATE_SECRET", "s3cret");
  });
  afterEach(() => vi.unstubAllEnvs());

  it("refuses a missing or wrong token with 401", async () => {
    expect((await call({ tags: ["products"] })).status).toBe(401);
    expect((await call({ tags: ["products"] }, "wrong")).status).toBe(401);
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it("refuses every call when no secret is configured", async () => {
    vi.stubEnv("REVALIDATE_SECRET", "");
    expect((await call({ tags: ["products"] }, "")).status).toBe(401);
  });

  it("returns 422 for empty, malformed or unknown tags", async () => {
    expect((await call({ tags: [] }, "s3cret")).status).toBe(422);
    expect((await call("not json", "s3cret")).status).toBe(422);
    expect((await call({ tags: ["users"] }, "s3cret")).status).toBe(422);
    expect(revalidateTag).not.toHaveBeenCalled();
  });

  it("expires each allowed tag once", async () => {
    const response = await call({ tags: ["products", "products", "producer:abc-1"] }, "s3cret");
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ revalidated: ["products", "producer:abc-1"] });
    expect(revalidateTag).toHaveBeenCalledWith("products", { expire: 0 });
    expect(revalidateTag).toHaveBeenCalledWith("producer:abc-1", { expire: 0 });
    expect(revalidateTag).toHaveBeenCalledTimes(2);
  });
});
