import { initDB, initFileManager, SQS } from "pagopa-interop-kpi-commons";
import { config } from "./config/config.js";
import { processMessage } from "./handlers/messageHandler.js";
import {
  JwtAuditService,
  jwtAuditServiceBuilder,
} from "./services/jwtAuditService.js";
import { dbServiceBuilder } from "./services/dbService.js";

const dbInstance = initDB({
  username: config.dbUsername,
  password: config.dbPassword,
  host: config.dbHost,
  port: config.dbPort,
  database: config.dbName,
  schema: config.dbSchemaName,
  useSSL: config.dbUseSSL,
  maxConnectionPool: config.maxConnectionPool,
});

const sqsClient: SQS.SQSClient = SQS.instantiateClient({
  region: config.awsRegion,
  endpoint: config.sqsNotificationEndpoint,
});

const jwtAuditService: JwtAuditService = jwtAuditServiceBuilder(
  dbServiceBuilder(dbInstance),
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
