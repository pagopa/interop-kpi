/* eslint-disable functional/immutable-data */
import { KafkaMessage } from "kafkajs";
import { decodeKafkaMessage, Logger } from "pagopa-interop-kpi-commons";
import {
  ApplicationAuditBeginRequest,
  ApplicationAuditEndRequest,
  ApplicationAuditEvent,
  kafkaMissingMessagesValue,
} from "pagopa-interop-kpi-models";
import { match } from "ts-pattern";
import { config } from "../config/config.js";
import { handleBeginRequestsMessages } from "./beginRequestsHandler.js";
import { handleEndRequestsMessages } from "./endRequestsHandler.js";

export async function handleMessages(
  messages: KafkaMessage[],
  logger: Logger
): Promise<void> {
  if (!messages) {
    throw kafkaMissingMessagesValue(config.kafkaTopic);
  }

  const beginRequestsMsgs: ApplicationAuditBeginRequest[] = [];
  const endRequestsMsgs: ApplicationAuditEndRequest[] = [];

  for (const message of messages) {
    const decodedMessage = decodeKafkaMessage(message, ApplicationAuditEvent);
    match(decodedMessage)
      .with({ phase: "BEGIN_REQUEST" }, ({ data }) => {
        beginRequestsMsgs.push(data);
      })
      .with({ phase: "END_REQUEST" }, ({ data }) => {
        endRequestsMsgs.push(data);
      })
      .exhaustive();
  }

  await handleBeginRequestsMessages(beginRequestsMsgs, logger);
  await handleEndRequestsMessages(endRequestsMsgs, logger);
}
