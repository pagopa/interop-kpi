import { SQS, logger } from "pagopa-interop-kpi-commons";
import { CorrelationId, generateId } from "pagopa-interop-kpi-models";
import { errorMapper } from "../utilities/errorMapper.js";
import { config } from "../config/config.js";
import { AlbLogsAuditService } from "../services/albLogsAuditService.js";

export function processMessage(
  albLogsAuditService: AlbLogsAuditService
): (message: SQS.Message) => Promise<void> {
  return async (message: SQS.Message): Promise<void> => {
    const decodedMessage = decodeSQSEventMessage(message);

    const loggerInstance = logger({
      serviceName: config.serviceName,
      correlationId: generateId<CorrelationId>(),
      messageId: message.MessageId,
    });

    try {
      albLogsAuditService.handleMessage(decodedMessage, loggerInstance);
    } catch (error) {
      throw errorMapper(error, loggerInstance);
    }
  };
}
