import { SQS } from "pagopa-interop-kpi-commons";
import { processMessage } from "./handlers/messageHandler.js";
import { config } from "./config/config.js";

const sqsClient: SQS.SQSClient = SQS.instantiateClient({
  region: config.awsRegion,
  endpoint: config.sqsNotificationEndpoint,
});

await SQS.runConsumer(
  sqsClient,
  {
    queueUrl: config.sqsNotificationEndpoint,
    consumerPollingTimeout: config.consumerPollingTimeout,
    serviceName: config.serviceName,
    runUntilQueueIsEmpty: config.runUntilQueueIsEmpty,
  },
  processMessage()
);
