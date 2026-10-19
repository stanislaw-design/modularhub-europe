import { render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { HomeStructuredData } from "./HomeStructuredData";

const ORIGINAL = process.env.SUPPORT_REPLY_TO_EMAIL;
afterEach(() => {
  if (ORIGINAL === undefined) delete process.env.SUPPORT_REPLY_TO_EMAIL;
  else process.env.SUPPORT_REPLY_TO_EMAIL = ORIGINAL;
});

function readJsonLd() {
  const { container } = render(<HomeStructuredData locale="de" />);
  const script = container.querySelector('script[type="application/ld+json"]');
  const raw = script?.innerHTML ?? "";
  return { raw, data: JSON.parse(raw) };
}

describe("HomeStructuredData (spec 0073 AC-14)", () => {
  it("renders Organization and WebSite with the current language", () => {
    delete process.env.SUPPORT_REPLY_TO_EMAIL;
    const { data } = readJsonLd();
    const types = data["@graph"].map((node: { "@type": string }) => node["@type"]);

    expect(types).toEqual(["Organization", "WebSite"]);
    expect(data["@graph"][1].inLanguage).toBe("de");
    expect(data["@graph"][0].contactPoint).toBeUndefined();
  });

  it("adds contactPoint only when the support email is set", () => {
    process.env.SUPPORT_REPLY_TO_EMAIL = "kontakt@example.test";
    expect(readJsonLd().data["@graph"][0].contactPoint.email).toBe("kontakt@example.test");
  });

  it("escapes < so the content cannot close the script tag", () => {
    process.env.SUPPORT_REPLY_TO_EMAIL = "</script><b>@example.test";
    const { raw } = readJsonLd();
    expect(raw).not.toContain("<");
    expect(raw).toContain("\\u003c");
  });
});
