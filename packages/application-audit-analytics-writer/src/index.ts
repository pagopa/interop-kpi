/* eslint-disable functional/immutable-data */
import { runBatchConsumer } from "kafka-connector";
import {
  DBContext,
  initDB,
  initFileManager,
  Logger,
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
import { KafkaMessage } from "kafkajs";
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

const accumulator: {
  messages: KafkaMessage[];
  correlationId: CorrelationId;
  firstOffset?: string;
  lastOffset?: string;
  lastFlushTime: number;
} = {
  messages: [],
  correlationId: generateId<CorrelationId>(),
  lastFlushTime: Date.now(),
};

async function processAccumulator(logger: Logger): Promise<void> {
  if (accumulator.messages.length === 0) {
    return;
  }

  accumulator.firstOffset = accumulator.messages[0].offset;
  accumulator.lastOffset =
    accumulator.messages[accumulator.messages.length - 1].offset;

  logger.info(
    `Process ${accumulator.messages.length} accumulated messages. Offset: ${accumulator.firstOffset} -> ${accumulator.lastOffset}`
  );

  await handleMessages(
    accumulator.messages,
    dbContext,
    initFileManager(config),
    logger
  );

  accumulator.messages = [];
  accumulator.correlationId = generateId<CorrelationId>();
  accumulator.lastFlushTime = Date.now();
}

async function processMessage({ batch }: EachBatchPayload): Promise<void> {
  const loggerInstance = logger({
    serviceName: config.serviceName,
    correlationId: accumulator.correlationId,
  });

  accumulator.messages.push(...batch.messages);

  const now = Date.now();
  const shouldProcessAccumulator =
    accumulator.messages.length >= config.accumulatorMaxMessages ||
    now - accumulator.lastFlushTime >= config.accumulatorFlushTimeoutMs;

  loggerInstance.info(
    `Batch handled. Partition ${
      batch.partition
    }. Offset: ${batch.firstOffset()} -> ${batch.lastOffset()}.`
  );

  if (shouldProcessAccumulator) {
    await processAccumulator(loggerInstance);
  }
}

await runBatchConsumer(
  config,
  batchConsumerConfig,
  [config.kafkaTopic],
  processMessage
);
