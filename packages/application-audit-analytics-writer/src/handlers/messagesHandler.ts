import { EachMessagePayload } from "kafkajs";
import { decodeKafkaMessage, logger } from "pagopa-interop-kpi-commons";
import {
  ApplicationAuditEvent,
  CorrelationId,
  generateId,
  kafkaMissingMessageValue,
  unsafeBrandId,
} from "pagopa-interop-kpi-models";
import { match } from "ts-pattern";
import { config } from "../config/config.js";
import { DBService } from "../services/dbService.js";

export function processMessage(dbService: DBService) {
  return async ({ message, partition }: EachMessagePayload): Promise<void> => {
    if (!message) {
      throw kafkaMissingMessageValue(config.kafkaTopic);
    }

    const decodedMessage = decodeKafkaMessage(message, ApplicationAuditEvent);
    const loggerInstance = logger({
      serviceName: config.serviceName,
      streamId: decodedMessage.stream_id,
      correlationId: decodedMessage.correlation_id
        ? unsafeBrandId<CorrelationId>(decodedMessage.correlation_id)
        : generateId<CorrelationId>(),
    });

    await match(decodedMessage)
      .with({ phase: "BEGIN_REQUEST" }, async ({ data }) => {
        await dbService.insertBeginRequest(data);
      })
      .with({ phase: "END_REQUEST" }, async ({ data }) => {
        await dbService.insertEndRequest(data);
      })
      .exhaustive();

    loggerInstance.info(
      `Message was processed. Partition number: ${partition}. Offset: ${message.offset}`
    );
  };
}
