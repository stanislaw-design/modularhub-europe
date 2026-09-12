import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { resolveAsyncTree } from "@/test/resolve-async-tree";
import GotowoscEksportowaPage from "./page";

function makeProps(searchParams: Record<string, string | string[] | undefined>) {
  return {
    params: Promise.resolve({ locale: "pl" }),
    searchParams: Promise.resolve(searchParams),
  };
}

async function renderPage(searchParams: Record<string, string | string[] | undefined>) {
  const element = await GotowoscEksportowaPage(makeProps(searchParams));
  render(await resolveAsyncTree(element));
}

describe("GotowoscEksportowaPage", () => {
  it("renders the generic heading and every fixture country when nazwa is absent", async () => {
    await renderPage({});

    expect(screen.getByRole("heading", { level: 1, name: "Gotowość eksportowa" })).toBeInTheDocument();
    expect(screen.getByText("Polska")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Niemcy/ })).toBeInTheDocument();
    expect(screen.getByText("Holandia")).toBeInTheDocument();
  });

  it("includes the project name in the heading when nazwa is present", async () => {
    await renderPage({ nazwa: "Modulor 28" });

    expect(
      screen.getByRole("heading", { level: 1, name: "Gotowość eksportowa: „Modulor 28”" })
    ).toBeInTheDocument();
  });

  it("treats a whitespace-only nazwa as absent", async () => {
    await renderPage({ nazwa: "   " });

    expect(screen.getByRole("heading", { level: 1, name: "Gotowość eksportowa" })).toBeInTheDocument();
  });

  it("threads locale into the Niemcy row so its Domknij luki link stays under /pl (spec 0010 build step 2)", async () => {
    const user = (await import("@testing-library/user-event")).default.setup();
    await renderPage({});

    await user.click(screen.getByRole("button", { name: /Niemcy/ }));

    expect(screen.getByRole("link", { name: "Domknij luki" })).toHaveAttribute(
      "href",
      "/pl/producer/gap-closure?kraj=DE"
    );
  });
});
