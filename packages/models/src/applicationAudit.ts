import { z } from "zod";

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
  amazonTraceId: z.string().optional(),
});

export type ApplicationAuditBeginRequest = z.infer<
  typeof ApplicationAuditBeginRequest
>;

const ApplicationAuditEndRequest = ApplicationAuditBeginRequest.extend({
  phase: z.literal("END_REQUEST"),
  organizationId: z.string().optional(),
  userId: z.string().optional(),
  httpResponseStatus: z.number(),
  executionTimeMs: z.number(),
  selfcareId: z.string().optional(),
});

export type ApplicationAuditEndRequest = z.infer<
  typeof ApplicationAuditEndRequest
>;

export const ApplicationAuditEvent = z.discriminatedUnion("phase", [
  z.object({
    phase: z.literal("BEGIN_REQUEST"),
    data: ApplicationAuditBeginRequest,
  }),
  z.object({
    phase: z.literal("END_REQUEST"),
    data: ApplicationAuditEndRequest,
  }),
]);

export type ApplicationAuditEvent = z.infer<typeof ApplicationAuditEvent>;
