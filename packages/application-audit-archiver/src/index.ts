import { runBatchConsumer } from "kafka-connector";
import { initFileManager, logger } from "pagopa-interop-kpi-commons";
import { EachBatchPayload } from "kafkajs";
import { batchConsumerConfig, config } from "./config/config.js";
import { handleMessages } from "./handler/messagesHandler.js";

const fileManager = initFileManager(config);
const loggerInstance = logger({
  serviceName: config.serviceName,
});

async function processMessage({ batch }: EachBatchPayload): Promise<void> {
  await handleMessages(batch.messages, fileManager, loggerInstance);

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
