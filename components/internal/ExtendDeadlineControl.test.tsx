import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { extendDeadline } from "@/lib/large-order-admin-actions";
import { ExtendDeadlineControl } from "./ExtendDeadlineControl";

const refreshMock = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: refreshMock }) }));
vi.mock("@/lib/large-order-admin-actions", () => ({ extendDeadline: vi.fn() }));
const mockedExtend = vi.mocked(extendDeadline);

beforeEach(() => {
  mockedExtend.mockReset();
  refreshMock.mockReset();
});

// Spec 0070 AC-9: administrator zmienia termin ofert.
describe("ExtendDeadlineControl", () => {
  it("opens the form, sends the chosen moment as UTC ISO and refreshes on success", async () => {
    const user = userEvent.setup();
    mockedExtend.mockResolvedValue({ ok: true });
    render(<ExtendDeadlineControl id="req-1" kind="request" />);

    await user.click(screen.getByRole("button", { name: "Zmień termin" }));
    fireEvent.change(screen.getByLabelText("Nowy termin ofert"), { target: { value: "2030-05-01T10:30" } });
    await user.click(screen.getByRole("button", { name: "Zapisz termin" }));

    await waitFor(() => expect(mockedExtend).toHaveBeenCalledWith("req-1", "request", new Date("2030-05-01T10:30").toISOString()));
    await waitFor(() => expect(refreshMock).toHaveBeenCalled());
    expect(screen.getByRole("button", { name: "Zmień termin" })).toBeInTheDocument();
  });

  it("asks for a date when none is entered and does not call the action", async () => {
    const user = userEvent.setup();
    render(<ExtendDeadlineControl id="req-1" kind="product" />);

    await user.click(screen.getByRole("button", { name: "Zmień termin" }));
    await user.click(screen.getByRole("button", { name: "Zapisz termin" }));

    expect(screen.getByRole("alert")).toHaveTextContent("Podaj datę i godzinę.");
    expect(mockedExtend).not.toHaveBeenCalled();
  });

  it("shows the server error, keeps the form open and does not refresh", async () => {
    const user = userEvent.setup();
    mockedExtend.mockResolvedValue({ ok: false, error: "Nowy termin musi być w przyszłości." });
    render(<ExtendDeadlineControl id="req-1" kind="request" />);

    await user.click(screen.getByRole("button", { name: "Zmień termin" }));
    fireEvent.change(screen.getByLabelText("Nowy termin ofert"), { target: { value: "2020-01-01T10:00" } });
    await user.click(screen.getByRole("button", { name: "Zapisz termin" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("w przyszłości");
    expect(refreshMock).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Nowy termin ofert")).toBeInTheDocument();
  });
});
