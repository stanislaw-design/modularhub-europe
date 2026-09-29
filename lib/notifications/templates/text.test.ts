import { describe, expect, it } from "vitest";
import { SUPPORT_EMAIL, SUPPORT_PHONE, COMPANY_ADDRESS_LINES } from "./contact";
import { renderTransactionalEmailText } from "./text";

const BASE_PROPS = {
  preview: "Preview",
  heading: "Nagłówek",
  body: "Treść wiadomości.",
  ctaLabel: "Kliknij tutaj",
  ctaHref: "https://modularhub.eu/pl/panel",
};

describe("renderTransactionalEmailText", () => {
  it("contains the heading, body, cta link and contact details, with no HTML tags", () => {
    const text = renderTransactionalEmailText(BASE_PROPS);

    expect(text).toContain(BASE_PROPS.heading);
    expect(text).toContain(BASE_PROPS.body);
    expect(text).toContain(BASE_PROPS.ctaHref);
    expect(text).toContain(SUPPORT_EMAIL);
    expect(text).toContain(SUPPORT_PHONE);
    for (const line of COMPANY_ADDRESS_LINES) expect(text).toContain(line);
    expect(text).not.toMatch(/<[a-z]/i);
  });

  it("omits the badge and reference lines when not provided", () => {
    const text = renderTransactionalEmailText(BASE_PROPS);

    expect(text).not.toContain("Nr referencyjny");
  });

  it("includes the badge and reference when provided", () => {
    const text = renderTransactionalEmailText({ ...BASE_PROPS, badge: "Montaż", reference: "A1B2C3D4" });

    expect(text).toContain("[Montaż]");
    expect(text).toContain("Nr referencyjny: A1B2C3D4");
  });
});
