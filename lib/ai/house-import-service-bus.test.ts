import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { sendMessages, createSender, clientClose, senderClose, clientArgs } = vi.hoisted(() => ({
  sendMessages: vi.fn(),
  createSender: vi.fn(),
  clientClose: vi.fn(),
  senderClose: vi.fn(),
  clientArgs: [] as unknown[][],
}));

vi.mock("server-only", () => ({}));
vi.mock("@azure/identity", () => ({ DefaultAzureCredential: class FakeCredential {} }));
vi.mock("@azure/service-bus", () => ({
  ServiceBusClient: class FakeServiceBusClient {
    constructor(...args: unknown[]) {
      clientArgs.push(args);
    }
    createSender(queue: string) {
      createSender(queue);
      return { sendMessages, close: senderClose };
    }
    close() {
      return clientClose();
    }
  },
}));

const ORIGINAL_ENV = { ...process.env };

beforeEach(async () => {
  process.env.AZURE_SERVICE_BUS_NAMESPACE = "mh-house-import";
  process.env.AZURE_SERVICE_BUS_QUEUE = "house-import";
  sendMessages.mockReset().mockResolvedValue(undefined);
  createSender.mockReset();
  clientArgs.length = 0;
  const { resetHouseImportServiceBusForTests } = await import("./house-import-service-bus");
  await resetHouseImportServiceBusForTests();
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
});

describe("house import Service Bus producer", () => {
  it("sends only the session identifier with a deterministic duplicate key", async () => {
    const { enqueueHouseImportSession } = await import("./house-import-service-bus");

    await enqueueHouseImportSession("d3f21fca-f208-4d21-8853-5fc45d6f205a");

    expect(clientArgs[0]?.[0]).toBe("mh-house-import.servicebus.windows.net");
    expect(createSender).toHaveBeenCalledWith("house-import");
    expect(sendMessages).toHaveBeenCalledWith({
      body: { sessionId: "d3f21fca-f208-4d21-8853-5fc45d6f205a" },
      contentType: "application/json",
      messageId: "house-import:d3f21fca-f208-4d21-8853-5fc45d6f205a",
      subject: "house-project-import",
    });
  });
});
