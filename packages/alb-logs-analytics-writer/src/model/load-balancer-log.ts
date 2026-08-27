import { z } from "zod";

const LoadBalancerLogSchema = z.object({
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
  received_bytes: z.string().regex(/^\d+$/),
  sent_bytes: z.string().regex(/^\d+$/),
  request: z.string(),
  user_agent: z.string(),
  ssl_cipher: z.string().optional(),
  ssl_protocol: z.string().optional(),
  target_group_arn: z.string().optional(),
  trace_id: z.string(),
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

const LoadBalancerLogArraySchema = z.array(LoadBalancerLogSchema);

export type LoadBalancerLog = z.infer<typeof LoadBalancerLogSchema>;
export { LoadBalancerLogSchema, LoadBalancerLogArraySchema };

export const EXCLUDED_USER_AGENT = "ELB-HealthChecker/2.0";
