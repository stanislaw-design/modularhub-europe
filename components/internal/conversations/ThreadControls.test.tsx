import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { closeThreadAction, reopenThreadAction } from "@/app/[locale]/internal/conversations/actions";
import { CloseThreadControl } from "./ThreadControls";

const refreshMock = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: refreshMock }) }));
vi.mock("@/app/[locale]/internal/conversations/actions", () => ({
  closeThreadAction: vi.fn(),
  reopenThreadAction: vi.fn(),
  createThreadAction: vi.fn(),
  updateThreadAction: vi.fn(),
}));
vi.mock("./PlatformLinkPicker", () => ({ PlatformLinkPicker: () => null }));
const mockedClose = vi.mocked(closeThreadAction);
const mockedReopen = vi.mocked(reopenThreadAction);

const openTasks = [
  { id: "task-a", title: "Wysłać zapytanie" },
  { id: "task-b", title: "Odpowiedź z wyceną" },
];

beforeEach(() => {
  mockedClose.mockReset();
  mockedReopen.mockReset();
  refreshMock.mockReset();
});

// Spec 0080 AC-12: zamknięcie sprawy wymaga decyzji dla każdego otwartego zadania.
describe("CloseThreadControl", () => {
  it("nie pozwala zamknąć, dopóki każde zadanie nie ma decyzji, potem wysyła wszystkie naraz", async () => {
    const user = userEvent.setup();
    mockedClose.mockResolvedValue({ ok: true });
    render(<CloseThreadControl threadId="thread-1" closed={false} openTasks={openTasks} />);

    await user.click(screen.getByRole("button", { name: "Zamknij sprawę" }));
    const confirm = () => screen.getAllByRole("button", { name: "Zamknij sprawę" }).at(-1)!;
    expect(confirm()).toBeDisabled();

    await user.click(screen.getByRole("group", { name: "Wysłać zapytanie" }).querySelector("input[type=radio]")!);
    expect(confirm()).toBeDisabled();

    const second = screen.getByRole("group", { name: "Odpowiedź z wyceną" });
    await user.click(second.querySelectorAll("input[type=radio]")[1]);
    expect(confirm()).toBeEnabled();

    await user.click(confirm());
    await waitFor(() => expect(mockedClose).toHaveBeenCalledWith("thread-1", { "task-a": "done", "task-b": "cancelled" }));
    await waitFor(() => expect(refreshMock).toHaveBeenCalled());
  });

  it("sprawa bez otwartych zadań zamyka się bez żadnych decyzji", async () => {
    const user = userEvent.setup();
    mockedClose.mockResolvedValue({ ok: true });
    render(<CloseThreadControl threadId="thread-2" closed={false} openTasks={[]} />);

    await user.click(screen.getByRole("button", { name: "Zamknij sprawę" }));
    expect(screen.getByText("Sprawa nie ma otwartych zadań. Zamknąć ją?")).toBeInTheDocument();
    await user.click(screen.getAllByRole("button", { name: "Zamknij sprawę" }).at(-1)!);

    await waitFor(() => expect(mockedClose).toHaveBeenCalledWith("thread-2", {}));
  });

  it("odrzucone zamknięcie pokazuje błąd i niczego nie odświeża", async () => {
    const user = userEvent.setup();
    mockedClose.mockResolvedValue({ ok: false, error: "W międzyczasie pojawiło się nowe otwarte zadanie." });
    render(<CloseThreadControl threadId="thread-3" closed={false} openTasks={[]} />);

    await user.click(screen.getByRole("button", { name: "Zamknij sprawę" }));
    await user.click(screen.getAllByRole("button", { name: "Zamknij sprawę" }).at(-1)!);

    expect(await screen.findByRole("alert")).toHaveTextContent("nowe otwarte zadanie");
    expect(refreshMock).not.toHaveBeenCalled();
  });

  it("zamkniętą sprawę można otworzyć ponownie", async () => {
    const user = userEvent.setup();
    mockedReopen.mockResolvedValue({ ok: true });
    render(<CloseThreadControl threadId="thread-4" closed openTasks={[]} />);

    expect(screen.queryByRole("button", { name: "Zamknij sprawę" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Otwórz sprawę ponownie" }));
    await waitFor(() => expect(mockedReopen).toHaveBeenCalledWith("thread-4"));
  });
});
