/* eslint-disable @typescript-eslint/explicit-function-return-type */
import {
  FileManager,
  Logger,
  decodeKafkaMessage,
} from "pagopa-interop-kpi-commons";
import {
  ApplicationAuditEvent,
  kafkaMissingMessagesValue,
} from "pagopa-interop-kpi-models";
import { KafkaMessage } from "kafkajs";
import { config } from "../config/config.js";

export async function handleMessages(
  messages: KafkaMessage[],
  fileManager: FileManager,
  logger: Logger
) {
  if (!messages) {
    throw kafkaMissingMessagesValue(config.kafkaTopic);
  }

  try {
    for (const message of messages) {
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

      await fileManager.storeBytes(s3File, logger);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "generic error";
    throw Error(`Write operation failed - ${message}`);
  }
}
