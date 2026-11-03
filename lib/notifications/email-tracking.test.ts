import { describe, expect, it } from "vitest";
import { addUtmToEmailBodies, hostOf, isTrackedEmailType, TRACKED_EMAIL_TYPES } from "./email-tracking";

const HOSTS = new Set(["modularhubeurope.pl"]);

describe("TRACKED_EMAIL_TYPES (spec 0079 AC-13)", () => {
  it("has exactly the seven large_order_producer_* types", () => {
    expect(TRACKED_EMAIL_TYPES).toHaveLength(7);
    for (const type of TRACKED_EMAIL_TYPES) expect(type.startsWith("large_order_producer_")).toBe(true);
  });

  it("does not track the login link or client mails", () => {
    expect(isTrackedEmailType("login_link")).toBe(false);
    expect(isTrackedEmailType("large_order_client_connected")).toBe(false);
    expect(isTrackedEmailType("large_order_producer_reminder")).toBe(true);
  });
});

describe("hostOf", () => {
  it("treats www and apex as the same host and rejects garbage", () => {
    expect(hostOf("https://www.ModularHubEurope.pl/pl")).toBe("modularhubeurope.pl");
    expect(hostOf("not a url")).toBeNull();
    expect(hostOf(undefined)).toBeNull();
  });
});

describe("addUtmToEmailBodies", () => {
  it("adds UTM to our links in HTML and text, leaves other links and mailto alone", () => {
    const html =
      '<a href="https://modularhubeurope.pl/pl/producer/panel/board/1">Open</a> <a href="mailto:a@b.pl">Mail</a> <a href="https://example.com/x">Other</a>';
    const text = "Otworz: https://www.modularhubeurope.pl/pl/producer/panel/board/1.\nInne: https://example.com/x";
    const result = addUtmToEmailBodies({ html, text }, "large_order_producer_new_request", HOSTS);

    expect(result.html).toContain(
      'href="https://modularhubeurope.pl/pl/producer/panel/board/1?utm_source=email&amp;utm_medium=producer_mail&amp;utm_campaign=large_order_producer_new_request"',
    );
    expect(result.html).toContain('href="mailto:a@b.pl"');
    expect(result.html).toContain('href="https://example.com/x"');
    // Kropka kończąca zdanie zostaje poza adresem.
    expect(result.text).toContain(
      "https://www.modularhubeurope.pl/pl/producer/panel/board/1?utm_source=email&utm_medium=producer_mail&utm_campaign=large_order_producer_new_request.\n",
    );
    expect(result.text).toContain("Inne: https://example.com/x");
  });

  it("keeps existing query parameters and does not overwrite utm values", () => {
    const result = addUtmToEmailBodies(
      { text: "https://modularhubeurope.pl/a?x=1&utm_source=custom" },
      "campaign",
      HOSTS,
    );
    const url = new URL(result.text!);
    expect(url.searchParams.get("x")).toBe("1");
    expect(url.searchParams.get("utm_source")).toBe("custom");
    expect(url.searchParams.get("utm_medium")).toBe("producer_mail");
  });

  it("returns undefined bodies untouched", () => {
    expect(addUtmToEmailBodies({}, "c", HOSTS)).toEqual({ html: undefined, text: undefined });
  });
});
