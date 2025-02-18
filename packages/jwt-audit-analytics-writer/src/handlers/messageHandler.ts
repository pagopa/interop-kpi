import {
  AppContext,
  SQS,
  WithSQSMessageId,
  logger,
} from "pagopa-interop-kpi-commons";
import { CorrelationId, generateId } from "pagopa-interop-kpi-models";
import { decodeSQSEventMessage } from "../model/domain/models.js";
import { JwtAuditService } from "../services/jwtAuditService.js";
import { errorMapper } from "../utilities/errorMapper.js";
import { config } from "../config/config.js";

export function processMessage(
  jwtAuditService: JwtAuditService
): (message: SQS.Message) => Promise<void> {
  return async (message: SQS.Message) => {
    const ctx: WithSQSMessageId<AppContext> = {
      serviceName: config.serviceName,
      correlationId: generateId<CorrelationId>(),
      messageId: message.MessageId,
    };

    try {
      await jwtAuditService.handleMessage(decodeSQSEventMessage(message), ctx);
    } catch (error) {
      throw errorMapper(error, logger(ctx));
    }
  };
}
