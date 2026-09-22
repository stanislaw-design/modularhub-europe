import "server-only";

import { DefaultAzureCredential } from "@azure/identity";
import { ServiceBusClient, type ServiceBusSender } from "@azure/service-bus";
import { z } from "zod";

const serviceBusConfigSchema = z
  .object({
    AZURE_SERVICE_BUS_NAMESPACE: z.string().trim().min(1),
    AZURE_SERVICE_BUS_QUEUE: z.string().trim().min(1),
  })
  .passthrough();

let client: ServiceBusClient | null = null;
let sender: ServiceBusSender | null = null;

function fullyQualifiedNamespace(value: string): string {
  const normalized = value.replace(/^sb:\/\//, "").replace(/\/$/, "");
  return normalized.includes(".") ? normalized : `${normalized}.servicebus.windows.net`;
}

function getSender(environment: Readonly<Record<string, string | undefined>> = process.env): ServiceBusSender {
  if (sender) return sender;
  const config = serviceBusConfigSchema.parse(environment);
  client = new ServiceBusClient(
    fullyQualifiedNamespace(config.AZURE_SERVICE_BUS_NAMESPACE),
    new DefaultAzureCredential(),
  );
  sender = client.createSender(config.AZURE_SERVICE_BUS_QUEUE);
  return sender;
}

export async function enqueueHouseImportSession(sessionId: string): Promise<void> {
  await getSender().sendMessages({
    body: { sessionId },
    contentType: "application/json",
    messageId: `house-import:${sessionId}`,
    subject: "house-project-import",
  });
}

export async function resetHouseImportServiceBusForTests(): Promise<void> {
  await sender?.close();
  await client?.close();
  sender = null;
  client = null;
}
