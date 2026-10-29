import { describe, expect, it } from "vitest";
import { ADMIN_INVITE_TTL_DAYS, adminInviteExpiresAt, isAdminInviteExpired, normalizeAdminEmail } from "./admin-invite";

describe("lib/admin-invite (spec 0077 D)", () => {
  it("normalizuje adres: małe litery i przycięcie (AC-35)", () => {
    expect(normalizeAdminEmail("  Jan@X.PL ")).toBe("jan@x.pl");
  });

  it("zaproszenie jest ważne 7 dni (AC-36)", () => {
    const created = new Date("2026-10-01T10:00:00Z");
    expect(ADMIN_INVITE_TTL_DAYS).toBe(7);
    expect(adminInviteExpiresAt(created).toISOString()).toBe("2026-10-08T10:00:00.000Z");
    expect(isAdminInviteExpired(created, new Date("2026-10-08T09:59:59Z"))).toBe(false);
    expect(isAdminInviteExpired(created, new Date("2026-10-08T10:00:00Z"))).toBe(true);
  });
});
