import {
  DBContext,
  initDB,
  initFileManager,
  logger,
  SQS,
  retryConnection,
  setupDbServiceBuilder,
} from "pagopa-interop-kpi-commons";
import { M2MJwtDbTable } from "pagopa-interop-kpi-models";
import { config } from "./config/config.js";
import { processBatch } from "./handlers/messagesHandler.js";
import {
  JwtAuditService,
  jwtAuditServiceBuilder,
} from "./services/jwtAuditService.js";
import { DBService, dbServiceBuilder } from "./services/dbService.js";

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
      M2MJwtDbTable.generated_token,
      M2MJwtDbTable.client_assertion,
      M2MJwtDbTable.dpop,
    ]);
  },
  logger({ serviceName: config.serviceName })
);

const dbService: DBService = dbServiceBuilder(dbContext);

const sqsClient: SQS.SQSClient = SQS.instantiateClient({
  region: config.awsRegion,
  endpoint: config.sqsNotificationEndpoint,
});

const jwtAuditService: JwtAuditService = jwtAuditServiceBuilder(
  dbService,
  initFileManager(config)
);

await SQS.runBatchConsumer(
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
  processBatch(jwtAuditService),
  logger({ serviceName: config.serviceName })
);
