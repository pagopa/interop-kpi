import { SQS, decodeSQSEventMessage, logger } from "pagopa-interop-kpi-commons";
import { CorrelationId, generateId } from "pagopa-interop-kpi-models";
import { JwtAuditService } from "../services/jwtAuditService.js";
import { config } from "../config/config.js";
import { errorMapper } from "../utilities/errorMapper.js";

export function processBatch(
  jwtAuditService: JwtAuditService
): (messages: SQS.Message[]) => Promise<void> {
  return async (messages: SQS.Message[]): Promise<void> => {
    const s3Keys = messages.map((msg) => decodeSQSEventMessage(msg));

    const loggerInstance = logger({
      serviceName: config.serviceName,
      correlationId: generateId<CorrelationId>(),
    });

    try {
      await jwtAuditService.handleMessages(s3Keys, loggerInstance);
    } catch (error) {
      throw errorMapper(error, loggerInstance);
    }
  };
}
