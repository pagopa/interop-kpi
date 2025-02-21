import { SQS, logger, decodeSQSEventMessage } from "pagopa-interop-kpi-commons";
import { CorrelationId, generateId } from "pagopa-interop-kpi-models";
import { errorMapper } from "../utilities/errorMapper.js";

export function processMessage(): (message: SQS.Message) => Promise<void> {
  return async (message: SQS.Message): Promise<void> => {
    const decodedMessage = decodeSQSEventMessage(message);

    const loggerInstance = logger({
      serviceName: "serviceName",
      correlationId: generateId<CorrelationId>(),
      messageId: message.MessageId,
    });

    try {
      console.log("message", decodedMessage);
    } catch (error) {
      throw errorMapper(error, loggerInstance);
    }
  };
}
