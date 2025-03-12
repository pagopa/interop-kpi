import { z } from "zod";
import { logLevel } from "kafkajs";

export const KafkaConfig = z
  .object({
    KAFKA_BROKERS: z
      .string()
      .transform((s) => s.split(","))
      .pipe(z.array(z.string())),
    KAFKA_CLIENT_ID: z.string(),
    KAFKA_GROUP_ID: z.string(),
    KAFKA_DISABLE_AWS_IAM_AUTH: z.literal("true").optional(),
    KAFKA_BROKER_CONNECTION_STRING: z.string().optional(),
    KAFKA_LOG_LEVEL: z
      .enum(["NOTHING", "ERROR", "WARN", "INFO", "DEBUG"])
      .default("WARN"),
    KAFKA_REAUTHENTICATION_THRESHOLD: z
      .number()
      .default(20)
      .transform((n) => n * 1000),
  })

  .transform((c) => ({
    kafkaBrokers: c.KAFKA_BROKERS,
    kafkaClientId: c.KAFKA_CLIENT_ID,
    kafkaGroupId: c.KAFKA_GROUP_ID,
    kafkaDisableAwsIamAuth: c.KAFKA_DISABLE_AWS_IAM_AUTH === "true",
    kafkaLogLevel: logLevel[c.KAFKA_LOG_LEVEL],
    kafkaReauthenticationThreshold: c.KAFKA_REAUTHENTICATION_THRESHOLD,
    kafkaBrokerConnectionString: c.KAFKA_BROKER_CONNECTION_STRING,
  }));

export const KafkaTopicConfig = z
  .object({
    KAFKA_TOPIC: z.string(),
  })
  .transform((c) => ({
    kafkaTopic: c.KAFKA_TOPIC,
  }));

export type KafkaTopicConfig = z.infer<typeof KafkaTopicConfig>;
export type KafkaConfig = z.infer<typeof KafkaConfig>;
