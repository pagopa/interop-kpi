import { initFileManager, SQS } from "pagopa-interop-kpi-commons";
import { config } from "./config/config.js";
import { processMessage } from "./handlers/messageHandler.js";
import {
  JwtAuditService,
  jwtAuditServiceBuilder,
} from "./services/jwtAuditService.js";

const sqsClient: SQS.SQSClient = SQS.instantiateClient({
  region: config.awsRegion,
  endpoint: config.sqsNotificationEndpoint,
});

const jwtAuditService: JwtAuditService = jwtAuditServiceBuilder(
  initFileManager(config)
);

await SQS.runConsumer(
  sqsClient,
  {
    queueUrl: config.sqsNotificationEndpoint,
    consumerPollingTimeout: config.consumerPollingTimeout,
    serviceName: config.serviceName,
    runUntilQueueIsEmpty: config.runUntilQueueIsEmpty,
  },
  processMessage(jwtAuditService)
);
