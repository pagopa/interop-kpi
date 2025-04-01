import { z } from "zod";
import { LoadBalancerLog } from "./load-balancer-log.js";

export const LoadBalancerLogSchema = z.object({
  trace_id: z.string(),
  type: z.string(),
  time: z.string(),
  elb: z.string(),
  client: z.string(),
  target: z.string().optional(),
  request_processing_time: z.string(),
  target_processing_time: z.string(),
  response_processing_time: z.string(),
  elb_status_code: z.string(),
  target_status_code: z.string().optional(),
  received_bytes: z.string(),
  sent_bytes: z.string(),
  request: z.string(),
  user_agent: z.string(),
  ssl_cipher: z.string().optional(),
  ssl_protocol: z.string().optional(),
  target_group_arn: z.string().optional(),
  domain_name: z.string().optional(),
  chosen_cert_arn: z.string().optional(),
  matched_rule_priority: z.string(),
  request_creation_time: z.string(),
  actions_executed: z.string(),
  redirect_url: z.string().optional(),
  error_reason: z.string().optional(),
  target_port_list: z.string().optional(),
  target_status_code_list: z.string().optional(),
  classification: z.string().optional(),
  classification_reason: z.string().optional(),
  conn_trace_id: z.string().optional(),
});
export type LoadBalancerLogSchema = z.infer<typeof LoadBalancerLogSchema>;

/**
 * LoadBalancerLogMapping is a type alias that defines a mapping interface to convert
 * a LoadBalancerLog record into a shape that conforms to LoadBalancerLogSchema.
 * It ensures that the output of each mapping function exactly matches the expected type
 * for the corresponding column defined in LoadBalancerLogSchema.
 */
export type LoadBalancerLogMapping = {
  [K in keyof LoadBalancerLogSchema]: (
    record: LoadBalancerLog
  ) => LoadBalancerLogSchema[K];
};
