import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ShortlistActionBar } from "./ShortlistActionBar";

const push = vi.fn();

vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useRouter: () => ({ push }),
}));

afterEach(() => {
  push.mockClear();
});

describe("ShortlistActionBar", () => {
  it("shows the selected count out of the max (AC-2)", () => {
    render(
      <ShortlistActionBar
        locale="pl"
        selectedCount={2}
        maxSelected={3}
        projectIds={["id1", "id2"]}
      />
    );
    expect(screen.getByText("Zaznaczono: 2/3")).toBeInTheDocument();
  });

  it("navigates to the zapytanie URL with the selected project ids on submit (AC-4)", async () => {
    const user = userEvent.setup();
    render(
      <ShortlistActionBar
        locale="pl"
        selectedCount={2}
        maxSelected={3}
        projectIds={["id1", "id2"]}
      />
    );

    await user.click(screen.getByRole("button", { name: "Poproś ModularHub o przygotowanie ofert" }));

    expect(push).toHaveBeenCalledWith("/pl/inquiry?projects=id1%2Cid2");
  });

  it("carries the current country/sizeMin/sizeMax filters into the zapytanie URL (AC-4)", async () => {
    const user = userEvent.setup();
    render(
      <ShortlistActionBar
        locale="pl"
        selectedCount={1}
        maxSelected={3}
        projectIds={["id1"]}
        countryCode="DE"
        sizeMin={50}
        sizeMax={100}
      />
    );

    await user.click(screen.getByRole("button", { name: "Poproś ModularHub o przygotowanie ofert" }));

    expect(push).toHaveBeenCalledWith(
      "/pl/inquiry?projects=id1&country=DE&sizeMin=50&sizeMax=100"
    );
  });

  it("never puts contact data in the URL, only project ids and filters (AC-4)", async () => {
    const user = userEvent.setup();
    render(
      <ShortlistActionBar locale="pl" selectedCount={1} maxSelected={3} projectIds={["id1"]} countryCode="PL" />
    );

    await user.click(screen.getByRole("button", { name: "Poproś ModularHub o przygotowanie ofert" }));

    const url = new URL(push.mock.calls[0][0] as string, "http://localhost");
    expect([...url.searchParams.keys()].sort()).toEqual(["country", "projects"]);
  });
});
