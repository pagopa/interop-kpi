import { z } from "zod";
import { CorrelationId } from "pagopa-interop-kpi-models";
import { logger, Logger } from "../logging/index.js";

export const AppContext = z.object({
  serviceName: z.string(),
  correlationId: CorrelationId,
});

export type AppContext = z.infer<typeof AppContext>;

export type WithLogger<T> = T & { logger: Logger };
export type WithSQSMessageId<T> = T & { messageId?: string | undefined };

export function fromAppContext(ctx: AppContext): WithLogger<AppContext> {
  return { ...ctx, logger: logger({ ...ctx }) };
}
