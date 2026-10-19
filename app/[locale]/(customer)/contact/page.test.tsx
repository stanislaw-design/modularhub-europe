import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { resolveAsyncTree } from "@/test/resolve-async-tree";
import ContactPage, { generateMetadata } from "./page";

const ORIGINAL_EMAIL = process.env.SUPPORT_REPLY_TO_EMAIL;

afterEach(() => {
  if (ORIGINAL_EMAIL === undefined) delete process.env.SUPPORT_REPLY_TO_EMAIL;
  else process.env.SUPPORT_REPLY_TO_EMAIL = ORIGINAL_EMAIL;
});

async function renderPage(locale = "pl") {
  const element = await ContactPage({ params: Promise.resolve({ locale }) });
  return render(await resolveAsyncTree(element));
}

describe("ContactPage (spec 0072)", () => {
  // AC-9
  it("renders one h1, a mailto link and the who-to-contact links", async () => {
    process.env.SUPPORT_REPLY_TO_EMAIL = "info@example.com";
    await renderPage();

    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("link", { name: "info@example.com" })).toHaveAttribute(
      "href",
      "mailto:info@example.com",
    );
    expect(screen.getByRole("link", { name: "Dołącz jako producent" })).toHaveAttribute(
      "href",
      "/pl/producer/registration",
    );
    expect(screen.getByRole("link", { name: "Zapytanie o duże zamówienie" })).toHaveAttribute(
      "href",
      "/pl/project-request",
    );
    expect(document.querySelector("form")).toBeNull();
  });

  // AC-9
  it("drops only the email block when SUPPORT_REPLY_TO_EMAIL is not set", async () => {
    delete process.env.SUPPORT_REPLY_TO_EMAIL;
    await renderPage();

    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
    expect(screen.queryByText("Adres e mail zespołu")).not.toBeInTheDocument();
    expect(document.querySelector('a[href^="mailto:"]')).toBeNull();
  });

  // AC-10
  it("sets canonical and language alternates including x-default", async () => {
    const metadata = await generateMetadata({ params: Promise.resolve({ locale: "en" }) });

    expect(metadata.alternates?.canonical).toBe("/en/contact");
    expect(metadata.alternates?.languages).toMatchObject({
      pl: "/pl/contact",
      en: "/en/contact",
      "x-default": "/pl/contact",
    });
  });
});
