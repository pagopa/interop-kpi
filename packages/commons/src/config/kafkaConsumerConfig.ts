import { z } from "zod";
import { AWSConfig } from "./awsConfig.js";
import { KafkaConfig } from "./kafkaConfig.js";

export const KafkaConsumerConfig = KafkaConfig.and(AWSConfig).and(
  z
    .object({
      KAFKA_GROUP_ID: z.string(),
      KAFKA_TOPIC_STARTING_OFFSET: z
        .union([z.literal("earliest"), z.literal("latest")])
        .default("latest"),
      KAFKA_RESET_CONSUMER_OFFSETS: z.string().default("false"),
    })
    .transform((c) => ({
      kafkaGroupId: c.KAFKA_GROUP_ID,
      topicStartingOffset: c.KAFKA_TOPIC_STARTING_OFFSET,
      resetConsumerOffsets:
        c.KAFKA_RESET_CONSUMER_OFFSETS.toLowerCase() === "true",
    }))
);
export type KafkaConsumerConfig = z.infer<typeof KafkaConsumerConfig>;

export const KafkaBatchConsumerConfig = z
  .object({
    KAFKA_AVERAGE_MESSAGE_SIZE_IN_BYTES: z.coerce.number(),
    KAFKA_MESSAGES_TO_READ_PER_BATCH: z.coerce.number(),
    KAFKA_MAX_WAIT_KAFKA_BATCH_MILLIS: z.coerce.number(),
  })
  .transform((c) => {
    const minBytes =
      c.KAFKA_AVERAGE_MESSAGE_SIZE_IN_BYTES *
      c.KAFKA_MESSAGES_TO_READ_PER_BATCH;
    return {
      minBytes,
      maxWaitKafkaBatchMillis: c.KAFKA_MAX_WAIT_KAFKA_BATCH_MILLIS,
      sessionTimeoutMillis: Math.round(
        c.KAFKA_MAX_WAIT_KAFKA_BATCH_MILLIS * 1.5
      ),
      maxBytes: Math.round(minBytes * 1.25),
    };
  });
export type KafkaBatchConsumerConfig = z.infer<typeof KafkaBatchConsumerConfig>;
