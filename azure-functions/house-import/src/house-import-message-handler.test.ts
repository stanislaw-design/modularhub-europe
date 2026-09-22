import { describe, expect, it, vi } from "vitest";
import { HouseImportWorkerError } from "@/lib/ai/house-import-worker";
import {
  handleHouseImportMessage,
  type HouseImportMessageHandlerDependencies,
  type HouseImportMessageSettlement,
} from "./house-import-message-handler";

const SESSION_ID = "00000000-0000-4000-8000-000000000001";
const message = { sessionId: SESSION_ID };

function settlement(): HouseImportMessageSettlement {
  return {
    complete: vi.fn().mockResolvedValue(undefined),
    deadLetter: vi.fn().mockResolvedValue(undefined),
  };
}

function dependencies(
  workerResult: unknown,
): HouseImportMessageHandlerDependencies {
  return {
    runWorker: vi.fn().mockImplementation(async () => {
      if (workerResult instanceof Error) throw workerResult;
      return workerResult;
    }),
    scheduler: { schedule: vi.fn().mockResolvedValue(undefined) },
  } as HouseImportMessageHandlerDependencies;
}

describe("house import Service Bus message handler", () => {
  it("completes a successful message", async () => {
    const actions = settlement();
    const deps = dependencies({
      status: "review_ready",
      candidateCount: 2,
      evidenceCount: 3,
      issueCount: 0,
      conflictCount: 0,
    });

    await expect(handleHouseImportMessage(message, actions, deps)).resolves.toEqual({
      settlement: "completed",
      workerStatus: "review_ready",
    });
    expect(actions.complete).toHaveBeenCalledOnce();
    expect(actions.deadLetter).not.toHaveBeenCalled();
  });

  it("schedules a retry before completing the current delivery", async () => {
    const order: string[] = [];
    const actions = settlement();
    vi.mocked(actions.complete).mockImplementation(async () => { order.push("complete"); });
    const deps = dependencies(
      new HouseImportWorkerError("AZURE_DOCUMENT_ANALYSIS_FAILED", true, {
        retryAfterSeconds: 120,
      }),
    );
    vi.mocked(deps.scheduler.schedule).mockImplementation(async () => { order.push("schedule"); });

    await expect(handleHouseImportMessage(message, actions, deps)).resolves.toEqual({
      settlement: "scheduled",
      retryAfterSeconds: 120,
    });
    expect(deps.scheduler.schedule).toHaveBeenCalledWith(message, 120);
    expect(order).toEqual(["schedule", "complete"]);
  });

  it("does not complete the current delivery when scheduling fails", async () => {
    const actions = settlement();
    const deps = dependencies(new HouseImportWorkerError("AZURE_OPENAI_REQUEST_FAILED", true));
    vi.mocked(deps.scheduler.schedule).mockRejectedValue(new Error("schedule failed"));

    await expect(handleHouseImportMessage(message, actions, deps)).rejects.toThrow("schedule failed");
    expect(actions.complete).not.toHaveBeenCalled();
  });

  it("dead letters an exhausted session", async () => {
    const actions = settlement();
    const deps = dependencies({ status: "failed", reason: "AI_IMPORT_RETRIES_EXHAUSTED" });

    await expect(handleHouseImportMessage(message, actions, deps)).resolves.toEqual({
      settlement: "dead_lettered",
      reason: "AI_IMPORT_RETRIES_EXHAUSTED",
    });
    expect(actions.deadLetter).toHaveBeenCalledWith(
      "AI_IMPORT_RETRIES_EXHAUSTED",
      expect.stringContaining("AI_IMPORT_RETRIES_EXHAUSTED"),
    );
    expect(actions.complete).not.toHaveBeenCalled();
  });

  it("dead letters an invalid message without calling the worker", async () => {
    const actions = settlement();
    const deps = dependencies({ status: "skipped", reason: "terminal" });

    await expect(handleHouseImportMessage({ sessionId: "invalid", extra: true }, actions, deps))
      .resolves.toEqual({
        settlement: "dead_lettered",
        reason: "HOUSE_IMPORT_MESSAGE_INVALID",
      });
    expect(deps.runWorker).not.toHaveBeenCalled();
  });

  it("completes a duplicate delivery that lost its lease", async () => {
    const actions = settlement();
    const deps = dependencies(new HouseImportWorkerError("AI_IMPORT_LEASE_LOST", true));

    await expect(handleHouseImportMessage(message, actions, deps)).resolves.toEqual({
      settlement: "completed",
      workerStatus: "skipped",
    });
    expect(deps.scheduler.schedule).not.toHaveBeenCalled();
    expect(actions.complete).toHaveBeenCalledOnce();
  });
});
