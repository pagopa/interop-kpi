import { z } from "zod";

const LoadBalancerLogSchema = z.object({
  type: z.literal("http"),
  time: z.string(),
  elb: z.string(),
  clientIp: z.string(),
  clientPort: z.string().regex(/\d+/),
  targetIp: z.string().optional(),
  targetPort: z.string().regex(/\d+/).optional(),
  requestProcessingTime: z.string(),
  targetProcessingTime: z.string(),
  responseProcessingTime: z.string(),
  elbStatusCode: z.string(),
  targetStatusCode: z.string().optional(),
  receivedBytes: z.string().regex(/\d+/),
  sentBytes: z.string().regex(/\d+/),
  request: z.string(),
  userAgent: z.string(),
  sslCipher: z.string().optional(),
  sslProtocol: z.string().optional(),
  targetGroupArn: z.string().optional(),
  traceId: z.string().optional(),
  domainName: z.string().optional(),
  chosenCertArn: z.string().optional(),
  matchedRulePriority: z.string().optional(),
  requestCreationTime: z.string().optional(),
  actionsExecuted: z.string().optional(),
  redirectUrl: z.string().optional(),
  errorReason: z.string().optional(),
  targetPortList: z.array(z.string()).optional(),
  targetStatusCodeList: z.array(z.string()).optional(),
  classification: z.string().optional(),
  classificationReason: z.string().optional(),
});

export type LoadBalancerLog = z.infer<typeof LoadBalancerLogSchema>;
export { LoadBalancerLogSchema };
