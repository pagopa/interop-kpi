import {
  DBContext,
  SQS,
  initDB,
  initFileManager,
  logger,
  retryConnection,
} from "pagopa-interop-kpi-commons";
import { processMessage } from "./handlers/messageHandler.js";
import { config } from "./config/config.js";
import {
  AlbLogsAuditService,
  albLogsAuditServiceBuilder,
} from "./services/albLogsAuditService.js";
import { dbServiceBuilder } from "./services/dbService.js";
import { setupDbServiceBuilder } from "./services/setupDbService.js";

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
    await setupDbServiceBuilder(db.conn).setupStagingTables();
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
    serviceName: config.serviceName,
    maxNumberOfMessages: 1,
  },
  processMessage(albLogsAuditService)
);
