import { SQS, decodeSQSEventMessage, logger } from "pagopa-interop-kpi-commons";
import { CorrelationId, generateId } from "pagopa-interop-kpi-models";
import { JwtAuditService } from "../services/jwtAuditService.js";
import { config } from "../config/config.js";
import { errorMapper } from "../utilities/errorMapper.js";

export function processMessage(
  jwtAuditService: JwtAuditService
): (message: SQS.Message) => Promise<void> {
  return async (message: SQS.Message): Promise<void> => {
    const decodedMessage = decodeSQSEventMessage(message);

    const loggerInstance = logger({
      serviceName: config.serviceName,
      correlationId: generateId<CorrelationId>(),
      messageId: message.MessageId,
    });

    try {
      await jwtAuditService.handleMessage(decodedMessage, loggerInstance);
    } catch (error) {
      throw errorMapper(error, loggerInstance);
    }
  };
}
