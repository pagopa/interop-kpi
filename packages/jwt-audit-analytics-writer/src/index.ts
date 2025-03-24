import {
  DBContext,
  initDB,
  initFileManager,
  logger,
  SQS,
  retryConnection,
} from "pagopa-interop-kpi-commons";
import { config } from "./config/config.js";
import { processMessage } from "./handlers/messageHandler.js";
import {
  JwtAuditService,
  jwtAuditServiceBuilder,
} from "./services/jwtAuditService.js";
import { DBService, dbServiceBuilder } from "./services/dbService.js";
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

const dbService: DBService = dbServiceBuilder(dbContext);

const sqsClient: SQS.SQSClient = SQS.instantiateClient({
  region: config.awsRegion,
  endpoint: config.sqsNotificationEndpoint,
});

const jwtAuditService: JwtAuditService = jwtAuditServiceBuilder(
  dbService,
  initFileManager(config)
);

await SQS.runConsumer(
  sqsClient,
  {
    queueUrl: config.sqsNotificationEndpoint,
    maxNumberOfMessages: config.maxNumberOfMessages,
    waitTimeSeconds: config.waitTimeSeconds,
    visibilityTimeout: config.visibilityTimeout,
    serviceName: config.serviceName,
  },
  processMessage(jwtAuditService),
  logger({ serviceName: config.serviceName })
);
