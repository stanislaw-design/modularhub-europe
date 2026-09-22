import { randomUUID } from "node:crypto";
import { z } from "zod";
import {
  HouseImportWorkerError,
  houseImportWorkerMessageSchema,
  runHouseImportWorker,
  type HouseImportWorkerResult,
} from "@/lib/ai/house-import-worker";

const retrySchedulerConfigSchema = z.object({
  AZURE_SERVICE_BUS_NAMESPACE: z.string().min(1),
  AZURE_SERVICE_BUS_QUEUE: z.string().min(1),
}).passthrough();

export interface HouseImportMessageSettlement {
  complete: () => Promise<void>;
  deadLetter: (reason: string, description: string) => Promise<void>;
}

export interface HouseImportRetryScheduler {
  schedule: (
    message: { sessionId: string },
    delaySeconds: number,
  ) => Promise<void>;
}

export interface HouseImportMessageHandlerDependencies {
  runWorker: typeof runHouseImportWorker;
  scheduler: HouseImportRetryScheduler;
}

export type HouseImportMessageOutcome =
  | { settlement: "completed"; workerStatus: HouseImportWorkerResult["status"] }
  | { settlement: "scheduled"; retryAfterSeconds: number }
  | { settlement: "dead_lettered"; reason: string };

function deadLetterDescription(reason: string): string {
  return `House import worker stopped with safe code ${reason}.`;
}

export async function handleHouseImportMessage(
  body: unknown,
  settlement: HouseImportMessageSettlement,
  dependencies: HouseImportMessageHandlerDependencies,
): Promise<HouseImportMessageOutcome> {
  const parsed = houseImportWorkerMessageSchema.safeParse(body);
  if (!parsed.success) {
    const reason = "HOUSE_IMPORT_MESSAGE_INVALID";
    await settlement.deadLetter(reason, deadLetterDescription(reason));
    return { settlement: "dead_lettered", reason };
  }

  try {
    const result = await dependencies.runWorker(parsed.data);
    if (result.status === "failed") {
      await settlement.deadLetter(result.reason, deadLetterDescription(result.reason));
      return { settlement: "dead_lettered", reason: result.reason };
    }

    await settlement.complete();
    return { settlement: "completed", workerStatus: result.status };
  } catch (error) {
    if (error instanceof HouseImportWorkerError && error.code === "AI_IMPORT_LEASE_LOST") {
      await settlement.complete();
      return { settlement: "completed", workerStatus: "skipped" };
    }

    if (error instanceof HouseImportWorkerError && !error.retryable) {
      await settlement.deadLetter(error.code, deadLetterDescription(error.code));
      return { settlement: "dead_lettered", reason: error.code };
    }

    const retryAfterSeconds = error instanceof HouseImportWorkerError
      ? error.retryAfterSeconds ?? 30
      : 30;
    await dependencies.scheduler.schedule(parsed.data, retryAfterSeconds);
    await settlement.complete();
    return { settlement: "scheduled", retryAfterSeconds };
  }
}

function fullyQualifiedNamespace(value: string): string {
  const normalized = value.trim().replace(/^sb:\/\//, "").replace(/\/$/, "");
  return normalized.includes(".") ? normalized : `${normalized}.servicebus.windows.net`;
}

let serviceBusClient:
  | import("@azure/service-bus").ServiceBusClient
  | undefined;
let serviceBusSender:
  | import("@azure/service-bus").ServiceBusSender
  | undefined;

export function createAzureServiceBusRetryScheduler(
  environment: Readonly<Record<string, string | undefined>> = process.env,
): HouseImportRetryScheduler {
  const config = retrySchedulerConfigSchema.parse(environment);

  return {
    schedule: async (message, delaySeconds) => {
      const [{ ServiceBusClient }, { DefaultAzureCredential }] = await Promise.all([
        import("@azure/service-bus"),
        import("@azure/identity"),
      ]);
      serviceBusClient ??= new ServiceBusClient(
        fullyQualifiedNamespace(config.AZURE_SERVICE_BUS_NAMESPACE),
        new DefaultAzureCredential(),
      );
      serviceBusSender ??= serviceBusClient.createSender(config.AZURE_SERVICE_BUS_QUEUE);
      await serviceBusSender.scheduleMessages({
        body: message,
        contentType: "application/json",
        messageId: `${message.sessionId}:${randomUUID()}`,
        subject: "house-project-import-retry",
      }, new Date(Date.now() + delaySeconds * 1_000));
    },
  };
}

export async function closeHouseImportRetryScheduler(): Promise<void> {
  await serviceBusSender?.close();
  await serviceBusClient?.close();
  serviceBusSender = undefined;
  serviceBusClient = undefined;
}
