import {
  DBContext,
  initDB,
  initFileManager,
  SQS,
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
  maxConnectionPool: config.maxConnectionPool,
});

const connection = await dbInstance.connect();

const dbContext: DBContext = {
  conn: connection,
  pgp: dbInstance.$config.pgp,
};

await setupDbServiceBuilder(dbContext).setupStagingTables();

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
