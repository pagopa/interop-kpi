import { z } from "zod";

const LoadBalancerLogSchema = z.object({
  type: z.string(),
  time: z.string(),
  elb: z.string(),
  client: z.string(),
  target: z.string(),
  request_processing_time: z.string(),
  target_processing_time: z.string(),
  response_processing_time: z.string(),
  elb_status_code: z.string(),
  target_status_code: z.string(),
  received_bytes: z.string().regex(/^\d+$/),
  sent_bytes: z.string().regex(/^\d+$/),
  request: z.string(),
  user_agent: z.string(),
  ssl_cipher: z.string(),
  ssl_protocol: z.string(),
  target_group_arn: z.string(),
  trace_id: z.string(),
  domain_name: z.string(),
  chosen_cert_arn: z.string(),
  matched_rule_priority: z.string(),
  request_creation_time: z.string(),
  actions_executed: z.string(),
  redirect_url: z.string(),
  error_reason: z.string(),
  target_port_list: z.string(),
  target_status_code_list: z.string(),
  classification: z.string(),
  classification_reason: z.string(),
  conn_trace_id: z.string().optional(),
});

export type LoadBalancerLog = z.infer<typeof LoadBalancerLogSchema>;
export { LoadBalancerLogSchema };
