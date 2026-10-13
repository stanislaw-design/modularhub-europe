import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { cancelRequest } from "@/lib/project-request-actions";
import { CancelRequestButton } from "./CancelRequestButton";

const refreshMock = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useRouter: () => ({ refresh: refreshMock }),
}));
vi.mock("@/lib/project-request-actions", () => ({
  cancelRequest: vi.fn(),
}));

const mockedCancelRequest = vi.mocked(cancelRequest);

beforeEach(() => {
  mockedCancelRequest.mockReset();
  refreshMock.mockReset();
});

// Spec 0070 AC-37: zamknięcie przez klienta wymaga potwierdzenia w oknie i nie pyta o powód.
describe("CancelRequestButton", () => {
  it("does nothing until the confirmation dialog is confirmed", async () => {
    const user = userEvent.setup();
    render(<CancelRequestButton id="req-1" kind="request" />);

    await user.click(screen.getByRole("button", { name: "Zamknij zapytanie" }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(mockedCancelRequest).not.toHaveBeenCalled();
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
  });

  it("closes the request after confirmation and refreshes the list", async () => {
    mockedCancelRequest.mockResolvedValue({ ok: true });
    const user = userEvent.setup();
    render(<CancelRequestButton id="req-1" kind="product" />);

    await user.click(screen.getByRole("button", { name: "Zamknij zapytanie" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Zamknij zapytanie" }));

    await waitFor(() => {
      expect(mockedCancelRequest).toHaveBeenCalledWith("req-1", "product");
      expect(refreshMock).toHaveBeenCalled();
    });
  });

  it("keeps the dialog open and shows a message when the request cannot be closed", async () => {
    mockedCancelRequest.mockResolvedValue({ ok: false, errorCode: "not_cancellable" });
    const user = userEvent.setup();
    render(<CancelRequestButton id="req-1" kind="request" />);

    await user.click(screen.getByRole("button", { name: "Zamknij zapytanie" }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Zamknij zapytanie" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Skontaktuj się z ModularHub");
    });
    expect(refreshMock).not.toHaveBeenCalled();
  });
});
