import { createHmac, timingSafeEqual } from "node:crypto";
import { getSiteUrl } from "@/lib/site-url";
import { hostOf } from "./email-tracking";

// Spec 0079 etap 3 (AC-13, AC-20, AC-21): wariant śledzony maila do producenta. Pikselka otwarcia
// i linki HTML przepisane na trasę kliknięcia z podpisem HMAC. Używane tylko dla odbiorcy z
// aktywną zgodą. Część tekstowa maila nie jest przepisywana (kliknięć w tekście nie liczymy).

function secret(): string {
  const value = process.env.EMAIL_TRACKING_SECRET;
  if (!value) throw new Error("EMAIL_TRACKING_SECRET is not configured");
  return value;
}

// Podpis obejmuje id maila i znormalizowany adres docelowy (URL.href), więc podmiana któregokolwiek
// z nich unieważnia link (AC-21).
export function signClickTarget(messageId: string, href: string): string {
  return createHmac("sha256", secret()).update(`${messageId}\n${href}`).digest("hex");
}

// Zwraca adres docelowy tylko przy poprawnym podpisie i hoście równym hostowi serwisu (z
// uwzględnieniem www i apex). Inaczej null: trasa kliknięcia nie przekierowuje wtedy wcale.
export function verifyClickTarget(messageId: string, rawTarget: string | null, signature: string | null): URL | null {
  if (!rawTarget || !signature) return null;
  let target: URL;
  try {
    target = new URL(rawTarget);
  } catch {
    return null;
  }
  if (target.protocol !== "https:" && target.protocol !== "http:") return null;
  const siteHost = hostOf(getSiteUrl());
  if (!siteHost || hostOf(target.href) !== siteHost) return null;

  let expected: Buffer;
  try {
    expected = Buffer.from(signClickTarget(messageId, target.href), "hex");
  } catch {
    return null;
  }
  const given = Buffer.from(signature, "hex");
  if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
  return target;
}

export function trackedClickUrl(messageId: string, target: URL): string {
  const query = new URLSearchParams({ u: target.href, s: signClickTarget(messageId, target.href) });
  return `${getSiteUrl()}/api/email/c/${messageId}?${query.toString()}`;
}

// Przepisuje href-y HTML prowadzące do naszej domeny (UTM jest już w adresie docelowym). Linki
// obce, mailto: i inne protokoły zostają bez zmian.
export function rewriteLinksForClickTracking(html: string, messageId: string, ownHosts: ReadonlySet<string>): string {
  return html.replace(/(\bhref=")([^"]+)(")/gi, (match, open: string, value: string, close: string) => {
    let target: URL;
    try {
      target = new URL(value.replace(/&amp;/g, "&"));
    } catch {
      return match;
    }
    if (target.protocol !== "https:" && target.protocol !== "http:") return match;
    const host = hostOf(target.href);
    if (!host || !ownHosts.has(host)) return match;
    return `${open}${trackedClickUrl(messageId, target).replace(/&/g, "&amp;")}${close}`;
  });
}

export function trackingPixelTag(messageId: string): string {
  return `<img src="${getSiteUrl()}/api/email/o/${messageId}" width="1" height="1" alt="" style="display:block;border:0;width:1px;height:1px;" />`;
}

// Pikselka na końcu treści HTML, przed zamknięciem body, gdy jest.
export function appendTrackingPixel(html: string, messageId: string): string {
  const pixel = trackingPixelTag(messageId);
  const closing = html.search(/<\/body>/i);
  return closing === -1 ? html + pixel : html.slice(0, closing) + pixel + html.slice(closing);
}
