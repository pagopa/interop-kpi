import { z } from "zod";

export const ConsumerConfig = z
  .object({
    MAX_NUMBER_OF_MSGS: z.coerce.number().min(1).max(10).default(1),
  })
  .transform((c) => ({
    maxNumberOfMessages: c.MAX_NUMBER_OF_MSGS,
  }));

export type ConsumerConfig = z.infer<typeof ConsumerConfig>;
