import "@azure/functions-extensions-servicebus";
import { app, type InvocationContext } from "@azure/functions";
import {
  messageBodyAsJson,
  type ServiceBusMessageContext,
} from "@azure/functions-extensions-servicebus";
import { runHouseImportWorker } from "@/lib/ai/house-import-worker";
import {
  createAzureServiceBusRetryScheduler,
  handleHouseImportMessage,
} from "./house-import-message-handler";

const retryScheduler = createAzureServiceBusRetryScheduler();

export async function houseImportServiceBusHandler(
  serviceBusContext: ServiceBusMessageContext,
  invocationContext: InvocationContext,
): Promise<void> {
  for (const message of serviceBusContext.messages) {
    let body: unknown;
    try {
      body = messageBodyAsJson(message);
    } catch {
      await serviceBusContext.actions.deadletter(
        message,
        undefined,
        "HOUSE_IMPORT_MESSAGE_INVALID",
        "House import message body is not valid JSON.",
      );
      invocationContext.log("house_import_message_settled", {
        messageId: message.messageId,
        settlement: "dead_lettered",
      });
      continue;
    }
    const outcome = await handleHouseImportMessage(
      body,
      {
        complete: () => serviceBusContext.actions.complete(message),
        deadLetter: (reason, description) => serviceBusContext.actions.deadletter(
          message,
          undefined,
          reason,
          description,
        ),
      },
      { runWorker: runHouseImportWorker, scheduler: retryScheduler },
    );
    invocationContext.log("house_import_message_settled", {
      messageId: message.messageId,
      settlement: outcome.settlement,
    });
  }
}

app.serviceBusQueue<ServiceBusMessageContext>("houseImportServiceBus", {
  connection: "HouseImportServiceBus",
  queueName: "%AZURE_SERVICE_BUS_QUEUE%",
  cardinality: "many",
  sdkBinding: true,
  autoCompleteMessages: false,
  handler: houseImportServiceBusHandler,
});
