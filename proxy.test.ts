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
      proxy(request("/en/results"));

      expect(intlMiddlewareMock).toHaveBeenCalledTimes(1);
    });
  });

  describe("old customer route redirects (spec 0036 AC-5)", () => {
    it("redirects an old customer route to its new address, keeping the query string, with a 308", () => {
      const response = proxy(request("/pl/klient/wyniki?sizeMin=80"));

      expect(response.status).toBe(308);
      const location = new URL(response.headers.get("location")!);
      expect(location.pathname).toBe("/pl/results");
      expect(location.search).toBe("?sizeMin=80");
      expect(intlMiddlewareMock).not.toHaveBeenCalled();
    });

    it("redirects the bare /klient home page to just the locale prefix", () => {
      const response = proxy(request("/pl/klient"));

      expect(new URL(response.headers.get("location")!).pathname).toBe("/pl");
    });

    it("redirects a nested dynamic segment without touching the id itself", () => {
      const response = proxy(request("/pl/klient/panel/zapytania/inq-42"));

      expect(new URL(response.headers.get("location")!).pathname).toBe("/pl/panel/inquiries/inq-42");
    });

    it("redirects /logowanie to /login", () => {
      const response = proxy(request("/pl/logowanie?callbackUrl=%2Fpl%2Fresults"));

      const location = new URL(response.headers.get("location")!);
      expect(location.pathname).toBe("/pl/login");
      expect(location.search).toBe("?callbackUrl=%2Fpl%2Fresults");
    });

    it("does not redirect a route that is already at its new address", () => {
      proxy(request("/pl/results"));

      expect(intlMiddlewareMock).toHaveBeenCalledTimes(1);
    });
  });

  describe("old producer route redirects (spec 0036 AC-3, AC-5)", () => {
    it("redirects an old producer route to its new address with a 308", () => {
      const response = proxy(request("/pl/producent/panel/zapytania?status=open"));

      expect(response.status).toBe(308);
      const location = new URL(response.headers.get("location")!);
      expect(location.pathname).toBe("/pl/producer/panel/inquiries");
      expect(location.search).toBe("?status=open");
      expect(intlMiddlewareMock).not.toHaveBeenCalled();
    });

    it("redirects the bare /producent landing page to /producer", () => {
      const response = proxy(request("/pl/producent"));

      expect(new URL(response.headers.get("location")!).pathname).toBe("/pl/producer");
    });

    it("redirects the product edit page, moving the segment that comes after the dynamic id", () => {
      const response = proxy(request("/pl/producent/panel/produkty/prod-7/edytuj"));

      expect(new URL(response.headers.get("location")!).pathname).toBe(
        "/pl/producer/panel/products/prod-7/edit"
      );
    });

    it("does not redirect a producer route that is already at its new address", () => {
      proxy(request("/pl/producer/panel/inquiries"));

      expect(intlMiddlewareMock).toHaveBeenCalledTimes(1);
    });
  });

  describe("admin panel stays Polish-only (AC-1)", () => {
    it("redirects /en/internal/... to /pl/internal/...", () => {
      const response = proxy(request("/en/internal/inquiries"));

      expect(new URL(response.headers.get("location")!).pathname).toBe("/pl/internal/inquiries");
      expect(intlMiddlewareMock).not.toHaveBeenCalled();
    });

    it("redirects /nl/internal/... to /pl/internal/...", () => {
      const response = proxy(request("/nl/internal/inquiries"));

      expect(new URL(response.headers.get("location")!).pathname).toBe("/pl/internal/inquiries");
    });

    it("does not redirect /pl/internal/... (already the default locale)", () => {
      proxy(request("/pl/internal/inquiries"));

      expect(intlMiddlewareMock).toHaveBeenCalledTimes(1);
    });

    it("does not redirect a non-internal route under a recognized non-default locale", () => {
      proxy(request("/en/producer"));

      expect(intlMiddlewareMock).toHaveBeenCalledTimes(1);
    });
  });

  describe("old internal route redirects, merged with the language lock (spec 0036 AC-4, AC-5)", () => {
    it("redirects an old internal segment under the default locale straight to the new segment, with a 308", () => {
      const response = proxy(request("/pl/internal/zapytania"));

      expect(response.status).toBe(308);
      expect(new URL(response.headers.get("location")!).pathname).toBe("/pl/internal/inquiries");
    });

    it("redirects an old internal segment under a non-default locale in a single hop to /pl, not through the old segment", () => {
      const response = proxy(request("/en/internal/zapytania"));

      expect(response.status).toBe(308);
      expect(new URL(response.headers.get("location")!).pathname).toBe("/pl/internal/inquiries");
    });

    it("preserves the dynamic product id while renaming the segment", () => {
      const response = proxy(request("/en/internal/produkty/prod-9"));

      expect(new URL(response.headers.get("location")!).pathname).toBe("/pl/internal/products/prod-9");
    });
  });

  it("hands every other request to the next-intl middleware unchanged", () => {
    const req = request("/pl/results?sizeMin=80");
    const response = proxy(req);

    expect(intlMiddlewareMock).toHaveBeenCalledWith(req);
    expect(response.headers.get("x-intl-middleware")).toBe("reached");
  });
});
