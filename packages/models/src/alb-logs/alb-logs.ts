import { z } from "zod";

export const AlbLogsAuditDetails = z.object({
  id: z.string(),
});
export type AlbLogsAuditDetails = z.infer<typeof AlbLogsAuditDetails>;
