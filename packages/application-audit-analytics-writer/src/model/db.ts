import {
  ApplicationAuditBeginRequest,
  ApplicationAuditEndRequest,
  ApplicationAuditEndRequestAuthServer,
  ApplicationAuditEndRequestSessionTokenExchange,
} from "pagopa-interop-kpi-models";
import { z } from "zod";

export const ApplicationAuditBeginRequestSchema = z.object({
  correlation_id: z.string(),
  span_id: z.string(),
  service: z.string(),
  service_version: z.string(),
  endpoint: z.string(),
  http_method: z.string(),
  phase: z.literal("BEGIN_REQUEST"),
  requester_ip_address: z.string().optional(),
  node_ip: z.string(),
  pod_name: z.string(),
  uptime_seconds: z.number(),
  timestamp: z.number().int(),
  timestamp_tz: z.date(),
  amazon_trace_id: z.string().optional(),
  jwt_id: z.string().optional(),
});
export type ApplicationAuditBeginRequestSchema = z.infer<
  typeof ApplicationAuditBeginRequestSchema
>;

export const ApplicationAuditEndRequestSchema =
  ApplicationAuditBeginRequestSchema.omit({
    phase: true,
  }).extend({
    phase: z.literal("END_REQUEST"),
    organization_id: z.string().optional(),
    user_id: z.string().optional(),
    http_response_status: z.number(),
    execution_time_ms: z.number(),
  });
export type ApplicationAuditEndRequestSchema = z.infer<
  typeof ApplicationAuditEndRequestSchema
>;

export const ApplicationAuditEndRequestSessionTokenExchangeSchema =
  ApplicationAuditEndRequestSchema.omit({
    user_id: true,
    jwt_id: true,
  }).extend({
    self_care_id: z.string().optional(),
    request_jwt_id: z.string().optional(),
    produced_jwt_id: z.string().optional(),
  });
export type ApplicationAuditEndRequestSessionTokenExchangeSchema = z.infer<
  typeof ApplicationAuditEndRequestSessionTokenExchangeSchema
>;

export const ApplicationAuditEndRequestAuthServerSchema =
  ApplicationAuditEndRequestSchema.omit({
    user_id: true,
  }).extend({
    client_id: z.string().optional(),
    client_kind: z.string().optional(),
  });
export type ApplicationAuditEndRequestAuthServerSchema = z.infer<
  typeof ApplicationAuditEndRequestAuthServerSchema
>;

export type Mapping<T, E> = {
  [K in keyof T]: (event: E) => T[K];
};

/**
 * ApplicationAuditBeginRequestMapping is a type alias that defines a mapping interface to convert
 * a ApplicationAuditBeginRequest event into a shape that conforms to ApplicationAuditBeginRequestSchema.
 * It ensures that the output of each mapping function exactly matches the expected type
 * for the corresponding column defined in ApplicationAuditBeginRequestSchema.
 */
export type ApplicationAuditBeginRequestMapping = Mapping<
  ApplicationAuditBeginRequestSchema,
  ApplicationAuditBeginRequest
>;

/**
 * ApplicationAuditEndRequestMapping is a type alias that defines a mapping interface to convert
 * a ApplicationAuditEndRequest event into a shape that conforms to ApplicationAuditEndRequestSchema.
 * It ensures that the output of each mapping function exactly matches the expected type
 * for the corresponding column defined in ApplicationAuditEndRequestSchema.
 */
export type ApplicationAuditEndRequestMapping = Mapping<
  ApplicationAuditEndRequestSchema,
  ApplicationAuditEndRequest
>;

/**
 * ApplicationAuditEndRequestAuthServerMapping is a type alias that defines a mapping interface to convert
 * a ApplicationAuditEndRequestAuth event into a shape that conforms to ApplicationAuditEndRequestAuthServerSchema.
 * It ensures that the output of each mapping function exactly matches the expected type
 * for the corresponding column defined in ApplicationAuditEndRequestAuthServerSchema.
 */
export type ApplicationAuditEndRequestAuthServerMapping = Mapping<
  ApplicationAuditEndRequestAuthServerSchema,
  ApplicationAuditEndRequestAuthServer
>;

/**
 * ApplicationAuditEndRequestSessionTokenExchangeMapping is a type alias that defines a mapping interface to convert
 * a ApplicationAuditEndRequestSessionTokenExchangeMapping event into a shape that conforms to ApplicationAuditEndRequestSessionTokenExchangeSchema.
 * It ensures that the output of each mapping function exactly matches the expected type
 * for the corresponding column defined in ApplicationAuditEndRequestSessionTokenExchangeSchema.
 */
export type ApplicationAuditEndRequestSessionTokenExchangeMapping = Mapping<
  ApplicationAuditEndRequestSessionTokenExchangeSchema,
  ApplicationAuditEndRequestSessionTokenExchange
>;
