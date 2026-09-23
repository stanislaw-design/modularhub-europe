import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { markChannelRead, sendMessage } from "@/lib/case-actions";
import type { CaseMessageDto } from "@/lib/case-schemas";
import { CaseChat } from "./CaseChat";

vi.mock("@/lib/case-actions", () => ({
  sendMessage: vi.fn(),
  markChannelRead: vi.fn().mockResolvedValue({ ok: true }),
}));

const mockedSend = vi.mocked(sendMessage);
const mockedRead = vi.mocked(markChannelRead);

const INQUIRY_ID = "0b6e4f5e-7d84-4b6b-9c3f-1a2b3c4d5e6f";
const CHANNEL_ID = "1c7f5a6f-8e95-4c7c-8d4a-2b3c4d5e6f70";

function makeMessage(id: string, overrides: Partial<CaseMessageDto> = {}): CaseMessageDto {
  const createdAt = "2026-09-21T12:00:00.000000Z";
  return {
    id,
    authorKind: "advisor",
    type: "text",
    body: `Treść ${id}`,
    payload: null,
    locale: "pl",
    createdAt,
    cursor: `${createdAt}|${id}`,
    redacted: false,
    ...overrides,
  };
}

const fetchMock = vi.fn();

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
  mockedSend.mockReset();
  mockedRead.mockClear();
  fetchMock.mockResolvedValue({ ok: true, json: async () => ({ messages: [] }) });
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("CaseChat (spec 0048 AC-6)", () => {
  it("renders the initial messages with author labels and a live log region", () => {
    render(
      <CaseChat
        inquiryId={INQUIRY_ID}
        channelId={CHANNEL_ID}
        viewer="client"
        initialMessages={[
          makeMessage("m1", { authorKind: "system", body: "Otrzymaliśmy Twoje zapytanie." }),
          makeMessage("m2", { authorKind: "client", body: "Dzień dobry" }),
        ]}
      />,
    );

    expect(screen.getByRole("log")).toBeInTheDocument();
    expect(screen.getByText("Otrzymaliśmy Twoje zapytanie.")).toBeInTheDocument();
    expect(screen.getByText("Ty")).toBeInTheDocument();
  });

  it("polls every 5 seconds and appends only new messages without duplicates", async () => {
    render(<CaseChat inquiryId={INQUIRY_ID} channelId={CHANNEL_ID} viewer="client" initialMessages={[makeMessage("m1")]} />);
    fetchMock.mockResolvedValue({ ok: true, json: async () => ({ messages: [makeMessage("m1"), makeMessage("m2")] }) });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5_000);
    });

    await waitFor(() => expect(screen.getByText("Treść m2")).toBeInTheDocument());
    expect(screen.getAllByText("Treść m1")).toHaveLength(1);
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain(`/api/cases/${INQUIRY_ID}/channels/${CHANNEL_ID}/messages`);
    expect(url).toContain("after=");
  });

  it("does not poll before 5 seconds have passed", async () => {
    render(<CaseChat inquiryId={INQUIRY_ID} channelId={CHANNEL_ID} viewer="client" initialMessages={[]} />);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(4_000);
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sends a message with an idempotency key and appends it", async () => {
    mockedSend.mockResolvedValue({ ok: true, message: makeMessage("m9", { authorKind: "client", body: "Pytanie" }) });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<CaseChat inquiryId={INQUIRY_ID} channelId={CHANNEL_ID} viewer="client" initialMessages={[]} />);

    await user.type(screen.getByLabelText("Twoja wiadomość"), "Pytanie");
    await user.click(screen.getByRole("button", { name: "Wyślij" }));

    await waitFor(() => expect(screen.getByText("Pytanie")).toBeInTheDocument());
    expect(mockedSend).toHaveBeenCalledWith(
      expect.objectContaining({ inquiryId: INQUIRY_ID, channelId: CHANNEL_ID, body: "Pytanie", locale: "pl" }),
    );
    expect(mockedSend.mock.calls[0][0].idempotencyKey).toMatch(/[0-9a-f-]{36}/);
  });

  it("keeps the draft and retries with the same key after a send failure", async () => {
    mockedSend.mockResolvedValueOnce({ ok: false, error: "generic" });
    mockedSend.mockResolvedValueOnce({ ok: true, message: makeMessage("m9", { authorKind: "client", body: "Pytanie" }) });
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<CaseChat inquiryId={INQUIRY_ID} channelId={CHANNEL_ID} viewer="client" initialMessages={[]} />);

    await user.type(screen.getByLabelText("Twoja wiadomość"), "Pytanie");
    await user.click(screen.getByRole("button", { name: "Wyślij" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Nie udało się wysłać wiadomości");
    expect(screen.getByLabelText("Twoja wiadomość")).toHaveValue("Pytanie");

    await user.click(screen.getByRole("button", { name: "Ponów wysyłanie" }));
    await waitFor(() => expect(mockedSend).toHaveBeenCalledTimes(2));
    expect(mockedSend.mock.calls[1][0].idempotencyKey).toBe(mockedSend.mock.calls[0][0].idempotencyKey);
  });

  it("shows a redaction notice instead of the body for redacted messages", () => {
    render(
      <CaseChat
        inquiryId={INQUIRY_ID}
        channelId={CHANNEL_ID}
        viewer="advisor"
        initialMessages={[makeMessage("m1", { authorKind: "client", body: null, redacted: true })]}
      />,
    );
    expect(screen.getByText("Treść usunięta na prośbę klienta.")).toBeInTheDocument();
  });

  it("backs off and shows a status message when polling fails", async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 500, json: async () => ({}) });
    render(<CaseChat inquiryId={INQUIRY_ID} channelId={CHANNEL_ID} viewer="client" initialMessages={[]} />);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5_000);
    });
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Nie możemy odświeżyć rozmowy"));

    // Po jednym błędzie następny odstęp to 10 s, więc po kolejnych 5 s nie ma drugiego zapytania.
    const callsAfterFirst = fetchMock.mock.calls.length;
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5_000);
    });
    expect(fetchMock.mock.calls.length).toBe(callsAfterFirst);
  });
});
