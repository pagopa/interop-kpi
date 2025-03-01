import { SQS, initDB, initFileManager } from "pagopa-interop-kpi-commons";
import { processMessage } from "./handlers/messageHandler.js";
import { config } from "./config/config.js";
import {
  AlbLogsAuditService,
  albLogsAuditServiceBuilder,
} from "./services/albLogsAuditService.js";
import { dbServiceBuilder } from "./services/dbService.js";

const dbInstance = initDB({
  username: config.dbUsername,
  password: config.dbPassword,
  host: config.dbHost,
  port: config.dbPort,
  database: config.dbName,
  useSSL: config.dbUseSSL,
  maxConnectionPool: config.maxConnectionPool,
});

const sqsClient: SQS.SQSClient = SQS.instantiateClient({
  region: config.awsRegion,
  endpoint: config.sqsNotificationEndpoint,
});

const albLogsAuditService: AlbLogsAuditService = albLogsAuditServiceBuilder(
  dbServiceBuilder(dbInstance),
  initFileManager(config)
);

await SQS.runConsumer(
  sqsClient,
  {
    queueUrl: config.sqsNotificationEndpoint,
    serviceName: config.serviceName,
    maxNumberOfMessages: 1,
  },
  processMessage(albLogsAuditService)
);
