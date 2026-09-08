import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

// `createMiddleware(routing)` runs at proxy.ts's module top level and reads
// this mock's return value immediately, so it must exist before proxy.ts
// (and its `next-intl/middleware` import) is instantiated — vi.hoisted lifts
// this above the mocked import, unlike a plain `const` (see LanguageSwitcher.test.tsx
// for the lazier case where a plain const is enough).
const { intlMiddlewareMock } = vi.hoisted(() => ({
  intlMiddlewareMock: vi.fn(() => new Response(null, { status: 200, headers: { "x-intl-middleware": "reached" } })),
}));

vi.mock("next-intl/middleware", () => ({
  default: () => intlMiddlewareMock,
}));

import { proxy } from "./proxy";

beforeEach(() => {
  intlMiddlewareMock.mockClear();
});

function request(path: string): NextRequest {
  return new NextRequest(`http://localhost:3000${path}`);
}

describe("proxy (spec 0028)", () => {
  describe("unrecognized locale segment (AC-3)", () => {
    it("redirects a two-letter segment next-intl won't recognize to the default locale, keeping the rest of the path", () => {
      const response = proxy(request("/de/klient"));

      expect(response.status).toBe(307);
      expect(new URL(response.headers.get("location")!).pathname).toBe("/pl/klient");
      expect(intlMiddlewareMock).not.toHaveBeenCalled();
    });

    it("redirects a bare unrecognized locale segment with no further path", () => {
      const response = proxy(request("/de"));

      expect(new URL(response.headers.get("location")!).pathname).toBe("/pl");
    });

    it("does not treat a recognized locale as unrecognized", () => {
      proxy(request("/en/klient"));

      expect(intlMiddlewareMock).toHaveBeenCalledTimes(1);
    });
  });

  describe("admin panel stays Polish-only (AC-1)", () => {
    it("redirects /en/internal/... to /pl/internal/...", () => {
      const response = proxy(request("/en/internal/zapytania"));

      expect(new URL(response.headers.get("location")!).pathname).toBe("/pl/internal/zapytania");
      expect(intlMiddlewareMock).not.toHaveBeenCalled();
    });

    it("redirects /nl/internal/... to /pl/internal/...", () => {
      const response = proxy(request("/nl/internal/zapytania"));

      expect(new URL(response.headers.get("location")!).pathname).toBe("/pl/internal/zapytania");
    });

    it("does not redirect /pl/internal/... (already the default locale)", () => {
      proxy(request("/pl/internal/zapytania"));

      expect(intlMiddlewareMock).toHaveBeenCalledTimes(1);
    });

    it("does not redirect a non-internal route under a recognized non-default locale", () => {
      proxy(request("/en/producent"));

      expect(intlMiddlewareMock).toHaveBeenCalledTimes(1);
    });
  });

  it("hands every other request to the next-intl middleware unchanged", () => {
    const req = request("/pl/klient/wyniki?sizeMin=80");
    const response = proxy(req);

    expect(intlMiddlewareMock).toHaveBeenCalledWith(req);
    expect(response.headers.get("x-intl-middleware")).toBe("reached");
  });
});
