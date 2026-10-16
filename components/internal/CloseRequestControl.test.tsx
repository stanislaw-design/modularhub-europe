import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { closeRequest } from "@/lib/large-order-admin-actions";
import { CloseRequestControl } from "./CloseRequestControl";

const refreshMock = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: refreshMock }) }));
vi.mock("@/lib/large-order-admin-actions", () => ({ closeRequest: vi.fn() }));
const mockedClose = vi.mocked(closeRequest);

beforeEach(() => {
  mockedClose.mockReset();
  refreshMock.mockReset();
});

// Spec 0070 AC-19: administrator zamyka zapytanie z powodem.
describe("CloseRequestControl", () => {
  it("does nothing until the reason is confirmed, then sends it and refreshes", async () => {
    const user = userEvent.setup();
    mockedClose.mockResolvedValue({ ok: true });
    render(<CloseRequestControl id="req-1" kind="request" />);

    await user.click(screen.getByRole("button", { name: "Zamknij zapytanie" }));
    expect(mockedClose).not.toHaveBeenCalled();
    await user.selectOptions(screen.getByLabelText("Powód zamknięcia"), "no_offers");
    await user.click(screen.getAllByRole("button", { name: "Zamknij zapytanie" })[0]);

    await waitFor(() => expect(mockedClose).toHaveBeenCalledWith("req-1", "request", "no_offers"));
    await waitFor(() => expect(refreshMock).toHaveBeenCalled());
  });

  it("defaults to staff_closed and shows the error without refreshing", async () => {
    const user = userEvent.setup();
    mockedClose.mockResolvedValue({ ok: false, error: "Zapytanie jest już zamknięte albo go nie ma." });
    render(<CloseRequestControl id="req-2" kind="product" />);

    await user.click(screen.getByRole("button", { name: "Zamknij zapytanie" }));
    await user.click(screen.getAllByRole("button", { name: "Zamknij zapytanie" })[0]);

    await waitFor(() => expect(screen.getByRole("alert")).toHaveTextContent("już zamknięte"));
    expect(mockedClose).toHaveBeenCalledWith("req-2", "product", "staff_closed");
    expect(refreshMock).not.toHaveBeenCalled();
  });

  it("cancel returns to the single button without calling the action", async () => {
    const user = userEvent.setup();
    render(<CloseRequestControl id="req-1" kind="request" />);

    await user.click(screen.getByRole("button", { name: "Zamknij zapytanie" }));
    await user.click(screen.getByRole("button", { name: "Anuluj" }));

    expect(screen.queryByLabelText("Powód zamknięcia")).not.toBeInTheDocument();
    expect(mockedClose).not.toHaveBeenCalled();
  });
});
