import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { reopenRequest } from "@/lib/project-request-actions";
import { ReopenRequestButton } from "./ReopenRequestButton";

const refreshMock = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useRouter: () => ({ refresh: refreshMock }),
}));
vi.mock("@/lib/project-request-actions", () => ({
  reopenRequest: vi.fn(),
}));

const mockedReopenRequest = vi.mocked(reopenRequest);

beforeEach(() => {
  mockedReopenRequest.mockReset();
  refreshMock.mockReset();
});

// Spec 0070 AC-19, AC-39: wznowienie zamkniętego zapytania, z komunikatem przy limicie.
describe("ReopenRequestButton", () => {
  it("reopens the request and refreshes the list", async () => {
    mockedReopenRequest.mockResolvedValue({ ok: true });
    const user = userEvent.setup();
    render(<ReopenRequestButton id="req-1" kind="product" />);

    await user.click(screen.getByRole("button", { name: "Wznów zapytanie" }));

    await waitFor(() => {
      expect(mockedReopenRequest).toHaveBeenCalledWith("req-1", "product");
      expect(refreshMock).toHaveBeenCalled();
    });
  });

  it("tells the client which limit blocked the reopening and does not refresh", async () => {
    mockedReopenRequest.mockResolvedValue({ ok: false, errorCode: "email_limit" });
    const user = userEvent.setup();
    render(<ReopenRequestButton id="req-1" kind="request" />);

    await user.click(screen.getByRole("button", { name: "Wznów zapytanie" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("3 z 3 aktywnych zapytań");
    });
    expect(refreshMock).not.toHaveBeenCalled();
  });

  it("shows the too late message when the request cannot be reopened any more", async () => {
    mockedReopenRequest.mockResolvedValue({ ok: false, errorCode: "not_reopenable" });
    const user = userEvent.setup();
    render(<ReopenRequestButton id="req-1" kind="request" />);

    await user.click(screen.getByRole("button", { name: "Wznów zapytanie" }));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("nie można już wznowić");
    });
  });
});
