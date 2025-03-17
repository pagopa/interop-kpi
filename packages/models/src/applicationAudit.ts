import { z } from "zod";

export const applicationAuditPhase = {
  BEGIN_REQUEST: "BEGIN_REQUEST",
  END_REQUEST: "END_REQUEST",
} as const;

export const ApplicationAuditPhase = z.enum([
  applicationAuditPhase.BEGIN_REQUEST,
  applicationAuditPhase.END_REQUEST,
]);

export type ApplicationAuditPhase = z.infer<typeof ApplicationAuditPhase>;

const ApplicationAuditBeginRequest = z.object({
  correlationId: z.string(),
  service: z.string(),
  serviceVersion: z.string(),
  endpoint: z.string(),
  httpMethod: z.string(),
  phase: z.literal(applicationAuditPhase.BEGIN_REQUEST),
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
  phase: z.literal(applicationAuditPhase.END_REQUEST),
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
  ApplicationAuditBeginRequest,
  ApplicationAuditEndRequest,
]);

export type ApplicationAuditEvent = z.infer<typeof ApplicationAuditEvent>;
