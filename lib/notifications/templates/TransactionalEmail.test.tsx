import { render } from "@react-email/render";
import { describe, expect, it } from "vitest";
import { COMPANY_ADDRESS_LINES, SUPPORT_EMAIL, SUPPORT_PHONE } from "./contact";
import { TransactionalEmail } from "./TransactionalEmail";

const BASE_PROPS = {
  preview: "Preview",
  heading: "Nagłówek",
  body: "Treść wiadomości.",
  ctaLabel: "Kliknij tutaj",
  ctaHref: "https://modularhub.eu/pl/panel",
};

describe("TransactionalEmail", () => {
  it("renders the logo, heading, body, cta link, and the contact/address footer", async () => {
    const html = await render(TransactionalEmail(BASE_PROPS));

    expect(html).toContain("Modular");
    expect(html).toContain(BASE_PROPS.heading);
    expect(html).toContain(BASE_PROPS.body);
    expect(html).toContain(BASE_PROPS.ctaHref);
    expect(html).toContain(SUPPORT_EMAIL);
    expect(html).toContain(SUPPORT_PHONE);
    for (const line of COMPANY_ADDRESS_LINES) expect(html).toContain(line);
  });

  it("omits the stage badge and reference line when not provided", async () => {
    const html = await render(TransactionalEmail(BASE_PROPS));

    expect(html).not.toContain("Nr referencyjny");
  });

  it("renders the stage badge and reference line when provided", async () => {
    const html = await render(TransactionalEmail({ ...BASE_PROPS, badge: "Montaż", reference: "A1B2C3D4" }));

    expect(html).toContain("Montaż");
    expect(html).toContain("Nr referencyjny:");
    expect(html).toContain("A1B2C3D4");
  });
});
