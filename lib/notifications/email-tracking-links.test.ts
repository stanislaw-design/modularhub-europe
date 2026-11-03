import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  appendTrackingPixel,
  rewriteLinksForClickTracking,
  signClickTarget,
  trackedClickUrl,
  verifyClickTarget,
} from "./email-tracking-links";

const ORIGINAL_ENV = { ...process.env };
const ID = "11111111-1111-4111-8111-111111111111";
const OTHER_ID = "22222222-2222-4222-8222-222222222222";

describe("email tracking links (spec 0079 AC-21)", () => {
  beforeEach(() => {
    process.env.EMAIL_TRACKING_SECRET = "test-secret";
    process.env.NEXT_PUBLIC_SITE_URL = "https://modularhubeurope.pl";
  });
  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  const target = new URL("https://modularhubeurope.pl/pl/producer/panel/board/1?utm_source=email");

  function click(url: string) {
    const parsed = new URL(url);
    return { u: parsed.searchParams.get("u"), s: parsed.searchParams.get("s") };
  }

  it("accepts a link it signed", () => {
    const { u, s } = click(trackedClickUrl(ID, target));
    expect(verifyClickTarget(ID, u, s)?.href).toBe(target.href);
  });

  it("rejects a signature made for another message id", () => {
    const { u, s } = click(trackedClickUrl(ID, target));
    expect(verifyClickTarget(OTHER_ID, u, s)).toBeNull();
  });

  it("rejects a swapped target, even one on our own host", () => {
    const { s } = click(trackedClickUrl(ID, target));
    expect(verifyClickTarget(ID, "https://modularhubeurope.pl/pl/internal", s)).toBeNull();
  });

  it("rejects a foreign host even with a valid signature for it (no open redirect)", () => {
    const evil = new URL("https://evil.example/phish");
    expect(verifyClickTarget(ID, evil.href, signClickTarget(ID, evil.href))).toBeNull();
  });

  it("rejects non http(s) schemes", () => {
    const js = "javascript:alert(1)";
    expect(verifyClickTarget(ID, js, signClickTarget(ID, js))).toBeNull();
  });

  it("rejects missing or malformed signatures", () => {
    expect(verifyClickTarget(ID, target.href, null)).toBeNull();
    expect(verifyClickTarget(ID, null, "abc")).toBeNull();
    expect(verifyClickTarget(ID, target.href, "zz-not-hex")).toBeNull();
    expect(verifyClickTarget(ID, target.href, "ab")).toBeNull();
  });

  it("treats www and apex as the same host", () => {
    const www = new URL("https://www.modularhubeurope.pl/pl");
    expect(verifyClickTarget(ID, www.href, signClickTarget(ID, www.href))?.href).toBe(www.href);
  });

  it("throws without EMAIL_TRACKING_SECRET so the sender falls back to untracked", () => {
    delete process.env.EMAIL_TRACKING_SECRET;
    expect(() => trackedClickUrl(ID, target)).toThrow();
  });

  it("rewrites only own links and escapes ampersands for HTML", () => {
    const html = '<a href="https://modularhubeurope.pl/a?x=1&amp;utm_source=email">a</a><a href="https://other.test/b">b</a><a href="mailto:x@y.pl">c</a>';
    const out = rewriteLinksForClickTracking(html, ID, new Set(["modularhubeurope.pl"]));
    expect(out).toContain(`href="https://modularhubeurope.pl/api/email/c/${ID}?u=`);
    expect(out).toContain('href="https://other.test/b"');
    expect(out).toContain('href="mailto:x@y.pl"');
    expect(out).not.toMatch(/&(?!amp;)/);
  });

  it("puts the pixel before the closing body tag, or at the end", () => {
    expect(appendTrackingPixel("<body>x</body>", ID)).toMatch(/x<img [^>]*\/api\/email\/o\/.*<\/body>$/);
    expect(appendTrackingPixel("<p>x</p>", ID)).toMatch(/<p>x<\/p><img /);
  });
});
