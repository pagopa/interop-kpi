/* eslint-disable functional/immutable-data */
import { KafkaMessage } from "kafkajs";
import {
  DBContext,
  decodeKafkaMessage,
  Logger,
} from "pagopa-interop-kpi-commons";
import {
  ApplicationAuditBeginRequest,
  ApplicationAuditEndRequest,
  ApplicationAuditEndRequestAuthServer,
  ApplicationAuditEndRequestSessionTokenExchange,
  ApplicationAuditEvent,
  isEndRequestAuthServer,
  isEndRequestSessionTokenExchange,
} from "pagopa-interop-kpi-models";
import { match } from "ts-pattern";
import {
  BeginRequestRepository,
  beginRequestRepository,
} from "../repositories/beginRequest.repository.js";
import {
  EndRequestRepository,
  endRequestRepository,
} from "../repositories/endRequest.repository.js";
import {
  endRequestSessionTokenExchangeRepository,
  EndRequestSessionTokenExchangeRepository,
} from "../repositories/endRequestSessionTokenExchange.repository.js";
import {
  endRequestAuthServerRepository,
  EndRequestAuthServerRepository,
} from "../repositories/endRequestAuthServer.repository.js";
import { processBatch } from "./batchHandler.js";

interface DecodedMessages {
  beginRequest: ApplicationAuditBeginRequest[];
  endRequest: ApplicationAuditEndRequest[];
  endRequestSessionTokenExchange: ApplicationAuditEndRequestSessionTokenExchange[];
  endRequestAuthServer: ApplicationAuditEndRequestAuthServer[];
}

export async function handleMessages(
  messages: KafkaMessage[],
  db: DBContext,
  logger: Logger
): Promise<void> {
  const decodedMessages: DecodedMessages = {
    beginRequest: [],
    endRequest: [],
    endRequestSessionTokenExchange: [],
    endRequestAuthServer: [],
  };

  for (const message of messages) {
    const decodedMessage = decodeKafkaMessage(message, ApplicationAuditEvent);
    match(decodedMessage)
      .with({ phase: "BEGIN_REQUEST" }, (data) => {
        decodedMessages.beginRequest.push(data);
      })
      .with({ phase: "END_REQUEST" }, (data) => {
        if (isEndRequestSessionTokenExchange(data)) {
          decodedMessages.endRequestSessionTokenExchange.push(data);
        } else if (isEndRequestAuthServer(data)) {
          decodedMessages.endRequestAuthServer.push(data);
        } else {
          decodedMessages.endRequest.push(data);
        }
      })
      .exhaustive();
  }

  await processBatch<ApplicationAuditBeginRequest, BeginRequestRepository>(
    decodedMessages.beginRequest,
    beginRequestRepository(db.conn, db.pgp),
    "BeginRequest",
    logger
  );

  await processBatch<ApplicationAuditEndRequest, EndRequestRepository>(
    decodedMessages.endRequest,
    endRequestRepository(db.conn, db.pgp),
    "EndRequest",
    logger
  );

  await processBatch<
    ApplicationAuditEndRequestSessionTokenExchange,
    EndRequestSessionTokenExchangeRepository
  >(
    decodedMessages.endRequestSessionTokenExchange,
    endRequestSessionTokenExchangeRepository(db.conn, db.pgp),
    "EndRequestSessionTokenExchange",
    logger
  );

  await processBatch<
    ApplicationAuditEndRequestAuthServer,
    EndRequestAuthServerRepository
  >(
    decodedMessages.endRequestAuthServer,
    endRequestAuthServerRepository(db.conn, db.pgp),
    "EndRequestAuthServer",
    logger
  );
}
