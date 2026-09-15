import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LanguageSwitcher } from "./LanguageSwitcher";

const replace = vi.fn();
const usePathnameMock = vi.fn(() => "/results");
const searchParamsMock = vi.fn(() => new URLSearchParams("sizeMin=80"));

vi.mock("@/lib/i18n/navigation", () => ({
  usePathname: () => usePathnameMock(),
  useRouter: () => ({ replace }),
}));

vi.mock("next/navigation", () => ({
  useSearchParams: () => searchParamsMock(),
}));

afterEach(() => {
  replace.mockClear();
  usePathnameMock.mockClear();
  searchParamsMock.mockReset();
  searchParamsMock.mockReturnValue(new URLSearchParams("sizeMin=80"));
});

describe("LanguageSwitcher (spec 0028 AC-4)", () => {
  it("shows PL/EN/NL/DE as the four options once opened", async () => {
    const user = userEvent.setup();
    render(<LanguageSwitcher locale="pl" />);

    await user.click(screen.getByRole("button", { name: "Zmień język" }));

    expect(screen.getByRole("menuitem", { name: /Polski/ })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "English" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Nederlands" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Deutsch" })).toBeInTheDocument();
  });

  it("navigates to the same path and query under the picked locale", async () => {
    const user = userEvent.setup();
    render(<LanguageSwitcher locale="pl" />);

    await user.click(screen.getByRole("button", { name: "Zmień język" }));
    await user.click(screen.getByRole("menuitem", { name: "English" }));

    expect(replace).toHaveBeenCalledWith("/results?sizeMin=80", { locale: "en" });
  });

  it("omits the query string entirely when there are no search params", async () => {
    searchParamsMock.mockReturnValue(new URLSearchParams());
    const user = userEvent.setup();
    render(<LanguageSwitcher locale="pl" />);

    await user.click(screen.getByRole("button", { name: "Zmień język" }));
    await user.click(screen.getByRole("menuitem", { name: "Nederlands" }));

    expect(replace).toHaveBeenCalledWith("/results", { locale: "nl" });
  });

  it("does not navigate when the already active locale is picked again", async () => {
    const user = userEvent.setup();
    render(<LanguageSwitcher locale="pl" />);

    await user.click(screen.getByRole("button", { name: "Zmień język" }));
    await user.click(screen.getByRole("menuitem", { name: /Polski/ }));

    expect(replace).not.toHaveBeenCalled();
  });

  it("shows the active locale on the trigger button", async () => {
    render(<LanguageSwitcher locale="en" />);

    expect(screen.getByRole("button", { name: "Zmień język" })).toHaveTextContent("EN");
  });
});
