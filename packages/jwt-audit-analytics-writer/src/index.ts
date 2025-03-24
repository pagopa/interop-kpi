import {
  DBContext,
  initDB,
  initFileManager,
  logger,
  SQS,
  retryConnection,
  setupDbServiceBuilder,
} from "pagopa-interop-kpi-commons";
import { config } from "./config/config.js";
import { processMessage } from "./handlers/messageHandler.js";
import {
  JwtAuditService,
  jwtAuditServiceBuilder,
} from "./services/jwtAuditService.js";
import { DBService, dbServiceBuilder } from "./services/dbService.js";
import { JwtDbTable } from "pagopa-interop-kpi-models";

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
      JwtDbTable.client_assertion,
      JwtDbTable.generated_token,
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

await SQS.runConsumer(
  sqsClient,
  {
    queueUrl: config.sqsNotificationEndpoint,
    maxNumberOfMessages: config.maxNumberOfMessages,
    serviceName: config.serviceName,
  },
  processMessage(jwtAuditService)
);
