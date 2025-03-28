import { runBatchConsumer } from "kafka-connector";
import {
  DBContext,
  initDB,
  logger,
  retryConnection,
  setupDbServiceBuilder,
} from "pagopa-interop-kpi-commons";
import { EachBatchPayload } from "kafkajs";
import {
  ApplicationDbTable,
  CorrelationId,
  generateId,
} from "pagopa-interop-kpi-models";
import { batchConsumerConfig, config } from "./config/config.js";
import { handleMessages } from "./handlers/messagesHandler.js";

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
      ApplicationDbTable.begin_request,
      ApplicationDbTable.end_request,
      ApplicationDbTable.end_request_session_token_exchange,
      ApplicationDbTable.end_request_auth_server,
    ]);
  },
  logger({ serviceName: config.serviceName })
);

async function processMessage({ batch }: EachBatchPayload): Promise<void> {
  const loggerInstance = logger({
    serviceName: config.serviceName,
    correlationId: generateId<CorrelationId>(),
  });

  await handleMessages(batch.messages, dbContext, loggerInstance);

  loggerInstance.info(
    `Handling application audit messages. Partition number: ${
      batch.partition
    }. Offset: ${batch.firstOffset()} -> ${batch.lastOffset()}`
  );
}

await runBatchConsumer(
  config,
  batchConsumerConfig,
  [config.kafkaTopic],
  processMessage
);
