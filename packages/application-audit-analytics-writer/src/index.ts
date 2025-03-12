import { runBatchConsumer } from "kafka-connector";
import { logger } from "pagopa-interop-kpi-commons";
import { EachBatchPayload } from "kafkajs";
import { CorrelationId, generateId } from "pagopa-interop-kpi-models";
import { batchConsumerConfig, config } from "./config/config.js";
import { handleMessages } from "./handlers/messagesHandler.js";

const loggerInstance = logger({
  serviceName: config.serviceName,
  correlationId: generateId<CorrelationId>(),
});

async function processMessage({ batch }: EachBatchPayload): Promise<void> {
  await handleMessages(batch.messages, loggerInstance);

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
