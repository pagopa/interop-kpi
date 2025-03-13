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
import { handleBeginRequestMessages } from "./beginRequestHandler.js";
import { handleEndRequestMessages } from "./endRequestHandler.js";

export async function handleMessages(
  messages: KafkaMessage[],
  logger: Logger
): Promise<void> {

  const beginRequestMsgs: ApplicationAuditBeginRequest[] = [];
  const endRequestMsgs: ApplicationAuditEndRequest[] = [];

  for (const message of messages) {
    const decodedMessage = decodeKafkaMessage(message, ApplicationAuditEvent);
    match(decodedMessage)
      .with({ phase: "BEGIN_REQUEST" }, ({ data }) => {
        beginRequestMsgs.push(data);
      })
      .with({ phase: "END_REQUEST" }, ({ data }) => {
        endRequestMsgs.push(data);
      })
      .exhaustive();
  }

  await handleBeginRequestMessages(beginRequestMsgs, logger);
  await handleEndRequestMessages(endRequestMsgs, logger);
}
