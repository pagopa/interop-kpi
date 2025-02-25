import { EachMessagePayload } from "kafkajs";
import {
  decodeKafkaMessage,
  genericLogger,
  logger,
} from "pagopa-interop-kpi-commons";
import { kafkaMissingMessageValue } from "pagopa-interop-kpi-models";
import { errorMapper } from "../utilities/errorMapper.js";
import { config } from "../config/config.js";
import { ApplicationAuditEvent } from "../model/model.js";

export function processMessage(): ({
  message,
  partition,
}: EachMessagePayload) => Promise<void> {
  return async ({ message, partition }: EachMessagePayload): Promise<void> => {
    try {
      if (!message) {
        throw kafkaMissingMessageValue(config.kafkaTopic);
      }

      const applicationAuditMessage = decodeKafkaMessage(
        message,
        ApplicationAuditEvent
      );
      console.log(applicationAuditMessage);

      genericLogger.info(
        `Message was processed. Partition number: ${partition}. Offset: ${message.offset}`
      );
    } catch (error: unknown) {
      throw errorMapper(error, logger({}), message.value?.toString());
    }
  };
}
