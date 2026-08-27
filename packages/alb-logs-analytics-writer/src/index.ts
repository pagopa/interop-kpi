import {
  DBContext,
  SQS,
  initDB,
  initFileManager,
  logger,
  retryConnection,
  setupDbServiceBuilder,
} from "pagopa-interop-kpi-commons";
import { LoadBalancerLogTable } from "pagopa-interop-kpi-models";
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
  maxConnectionPool: config.dbMaxConnectionPool,
});

const connection = await dbInstance.connect();

const dbContext: DBContext = {
  conn: connection,
  pgp: dbInstance.$config.pgp,
};

await retryConnection(
  dbInstance,
  dbContext,
  config,
  async (db) => {
    await setupDbServiceBuilder(db.conn, config).setupStagingTables([
      LoadBalancerLogTable.logs,
    ]);
  },
  logger({ serviceName: config.serviceName })
);

const sqsClient: SQS.SQSClient = SQS.instantiateClient({
  region: config.awsRegion,
  endpoint: config.sqsNotificationEndpoint,
});

const albLogsAuditService: AlbLogsAuditService = albLogsAuditServiceBuilder(
  dbServiceBuilder(dbContext),
  initFileManager(config)
);

await SQS.runConsumer(
  sqsClient,
  {
    queueUrl: config.sqsNotificationEndpoint,
    maxNumberOfMessages: config.maxNumberOfMessages,
    waitTimeSeconds: config.waitTimeSeconds,
    visibilityTimeout: config.visibilityTimeout,
    receiveMsgsCalls: config.receiveMsgsCalls,
    receiveMsgsConcurrency: config.receiveMsgsConcurrency,
    serviceName: config.serviceName,
  },
  processMessage(albLogsAuditService),
  logger({ serviceName: config.serviceName })
);
