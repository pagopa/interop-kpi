import { z } from "zod";
import { match } from "ts-pattern";

const ApplicationAuditBeginRequest = z.object({
  correlationId: z.string(),
  service: z.string(),
  serviceVersion: z.string(),
  endpoint: z.string(),
  httpMethod: z.string(),
  phase: z.literal("BEGIN_REQUEST"),
  requesterIpAddress: z.string(),
  nodeIp: z.string(),
  podName: z.string(),
  uptimeSeconds: z.number(),
  timestamp: z.number(),
  amazonTraceId: z.string(),
});

const ApplicationAuditEndRequest = ApplicationAuditBeginRequest.extend({
  phase: z.literal("END_REQUEST"),
  organizationId: z.string(),
  userId: z.string().optional(),
  httpResponseStatus: z.number(),
  executionTimeMs: z.number(),
});

export const ApplicationAuditEvent = z
  .discriminatedUnion("phase", [
    ApplicationAuditBeginRequest,
    ApplicationAuditEndRequest,
  ])
  .transform((obj, ctx) => {
    const res = match(obj)
      .with({ phase: "BEGIN_REQUEST" }, () =>
        ApplicationAuditBeginRequest.safeParse(obj)
      )
      .with({ phase: "END_REQUEST" }, () =>
        ApplicationAuditEndRequest.safeParse(obj)
      )
      .exhaustive();

    if (!res.success) {
      res.error.issues.forEach(ctx.addIssue);
      return z.NEVER;
    }
    return res.data;
  });

export type ApplicationAuditEvent = z.infer<typeof ApplicationAuditEvent>;
