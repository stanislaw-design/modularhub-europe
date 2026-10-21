import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { resolveAsyncTree } from "@/test/resolve-async-tree";
import { FamilyTabs } from "./FamilyTabs";

const push = vi.fn();

vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useRouter: () => ({ push }),
}));

afterEach(() => {
  push.mockClear();
});

describe("FamilyTabs", () => {
  it("renders exactly two top-level group tabs, Domy and Więcej niż dom (spec 0035 AC-1)", async () => {
    render(await resolveAsyncTree(<FamilyTabs locale="pl" family="dom" />));

    const topNav = screen.getByRole("navigation", { name: "Rodzina produktu" });
    const links = within(topNav).getAllByRole("link");
    expect(links.map((link) => link.textContent)).toEqual(["Domy", "Więcej niż dom"]);
  });

  it("marks Domy as current and renders no second-level row for family dom (AC-6)", async () => {
    render(await resolveAsyncTree(<FamilyTabs locale="pl" family="dom" />));

    expect(screen.getByRole("link", { name: "Domy" })).toHaveAttribute("aria-current", "page");
    expect(screen.queryByRole("navigation", { name: "Doprecyzuj w grupie Więcej niż dom" })).not.toBeInTheDocument();
  });

  it("marks Więcej niż dom as current and shows the refine dropdown with Wszystko selected (AC-3)", async () => {
    const user = userEvent.setup();
    render(await resolveAsyncTree(<FamilyTabs locale="pl" family="wiecej-niz-dom" />));

    expect(screen.getByRole("link", { name: "Więcej niż dom" })).toHaveAttribute("aria-current", "page");
    const trigger = screen.getByRole("button", { name: "Doprecyzuj w grupie Więcej niż dom" });
    expect(trigger).toHaveTextContent("Wszystko");
    await user.click(trigger);
    expect(screen.getAllByRole("option").map((option) => option.textContent)).toEqual([
      "Wszystko",
      "Spa modułowe",
      "Kontenery",
      "Outdoor TV",
    ]);
  });

  it("shows the specific refine value when family is spa-modulowe or outdoor-tv (AC-3)", async () => {
    const { unmount } = render(await resolveAsyncTree(<FamilyTabs locale="pl" family="spa-modulowe" />));
    expect(screen.getByRole("link", { name: "Więcej niż dom" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("button", { name: "Doprecyzuj w grupie Więcej niż dom" })).toHaveTextContent("Spa modułowe");
    unmount();

    render(await resolveAsyncTree(<FamilyTabs locale="pl" family="outdoor-tv" />));
    expect(screen.getByRole("button", { name: "Doprecyzuj w grupie Więcej niż dom" })).toHaveTextContent("Outdoor TV");
  });

  it("links the wiecej-niz-dom tab to family=wiecej-niz-dom and dom to a bare href (AC-2)", async () => {
    render(await resolveAsyncTree(<FamilyTabs locale="pl" family="dom" />));

    expect(screen.getByRole("link", { name: "Domy" })).toHaveAttribute("href", "/pl/results");
    expect(screen.getByRole("link", { name: "Więcej niż dom" })).toHaveAttribute(
      "href",
      "/pl/results?family=wiecej-niz-dom"
    );
  });

  it("preserves country and size filters on the group link and when picking a refine option (AC-3)", async () => {
    const user = userEvent.setup();
    render(
      await resolveAsyncTree(
        <FamilyTabs locale="pl" family="kontenery-modulowe" countryCode="DE" sizeMin={50} sizeMax={100} />
      )
    );

    expect(screen.getByRole("link", { name: "Domy" })).toHaveAttribute(
      "href",
      "/pl/results?country=DE&sizeMin=50&sizeMax=100"
    );
    await user.click(screen.getByRole("button", { name: "Doprecyzuj w grupie Więcej niż dom" }));
    await user.click(screen.getByRole("option", { name: "Spa modułowe" }));
    expect(push).toHaveBeenCalledWith("/pl/results?family=spa-modulowe&country=DE&sizeMin=50&sizeMax=100");
  });
});
