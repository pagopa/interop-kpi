/* eslint-disable functional/immutable-data */
import { KafkaMessage } from "kafkajs";
import {
  DBContext,
  decodeKafkaMessage,
  FileManager,
  Logger,
} from "pagopa-interop-kpi-commons";
import {
  ApplicationAuditBeginRequest,
  ApplicationAuditEndRequest,
  ApplicationAuditEndRequestAuthServer,
  ApplicationAuditEndRequestSessionTokenExchange,
  ApplicationAuditEvent,
  ApplicationDbTable,
  isEndRequestAuthServer,
  isEndRequestSessionTokenExchange,
} from "pagopa-interop-kpi-models";
import { match } from "ts-pattern";
import {
  beginRequestMapping,
  BeginRequestRepository,
  beginRequestRepository,
} from "../repositories/beginRequest.repository.js";
import {
  endRequestMapping,
  EndRequestRepository,
  endRequestRepository,
} from "../repositories/endRequest.repository.js";
import {
  endRequestSessionTokenExchangeMapping,
  endRequestSessionTokenExchangeRepository,
  EndRequestSessionTokenExchangeRepository,
} from "../repositories/endRequestSessionTokenExchange.repository.js";
import {
  endRequestAuthServerMapping,
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
  fileManager: FileManager,
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
    ApplicationDbTable.begin_request,
    beginRequestMapping,
    fileManager,
    logger
  );

  await processBatch<ApplicationAuditEndRequest, EndRequestRepository>(
    decodedMessages.endRequest,
    endRequestRepository(db.conn, db.pgp),
    ApplicationDbTable.end_request,
    endRequestMapping,
    fileManager,
    logger
  );

  await processBatch<
    ApplicationAuditEndRequestSessionTokenExchange,
    EndRequestSessionTokenExchangeRepository
  >(
    decodedMessages.endRequestSessionTokenExchange,
    endRequestSessionTokenExchangeRepository(db.conn, db.pgp),
    ApplicationDbTable.end_request_session_token_exchange,
    endRequestSessionTokenExchangeMapping,
    fileManager,
    logger
  );

  await processBatch<
    ApplicationAuditEndRequestAuthServer,
    EndRequestAuthServerRepository
  >(
    decodedMessages.endRequestAuthServer,
    endRequestAuthServerRepository(db.conn, db.pgp),
    ApplicationDbTable.end_request_auth_server,
    endRequestAuthServerMapping,
    fileManager,
    logger
  );
}
