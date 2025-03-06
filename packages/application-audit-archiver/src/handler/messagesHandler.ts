import { EachMessagePayload } from "kafkajs";
import {
  FileManager,
  decodeKafkaMessage,
  genericLogger,
  logger,
} from "pagopa-interop-kpi-commons";
import { kafkaMissingMessageValue } from "pagopa-interop-kpi-models";
import { errorMapper } from "../utilities/errorMapper.js";
import { config } from "../config/config.js";
import { ApplicationAuditEvent } from "../model/model.js";

export function processMessage(fileManager: FileManager) {
  return async ({ message, partition }: EachMessagePayload): Promise<void> => {
    if (!message) {
      throw kafkaMissingMessageValue(config.kafkaTopic);
    }

    try {
      const applicationAuditMessage = decodeKafkaMessage(
        message,
        ApplicationAuditEvent
      );

      const s3File = {
        bucket: config.s3BucketName,
        path: "TODO",
        name: `${applicationAuditMessage.correlationId}.json`,
        content: Buffer.from(JSON.stringify(applicationAuditMessage)),
      };

      await fileManager.storeBytes(s3File, genericLogger);

      genericLogger.info(
        `Message processed. Partition: ${partition}, Offset: ${message.offset}`
      );
    } catch (error) {
      throw errorMapper(error, logger({}), message.value?.toString());
    }
  };
}
