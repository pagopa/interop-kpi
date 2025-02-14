import { CorrelationId } from "pagopa-interop-kpi-models";
import { z } from "zod";

export const InteropHeaders = z.object({
  "X-Correlation-Id": CorrelationId,
  Authorization: z.string(),
});

export type InteropHeaders = z.infer<typeof InteropHeaders>;

export const getInteropHeaders = ({
  token,
  correlationId,
}: {
  token: string;
  correlationId: CorrelationId;
}): InteropHeaders => ({
  "X-Correlation-Id": correlationId,
  Authorization: `Bearer ${token}`,
});
