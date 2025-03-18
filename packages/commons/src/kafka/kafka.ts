/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { z } from "zod";
import { KafkaMessage } from "kafkajs";
import { Message } from "pagopa-interop-kpi-models";

/**
 * Decodes a Kafka message using the provided event schema.
 *
 * @param {KafkaMessage} message - The Kafka message to decode.
 * @param {TEvent} event - The event schema to use for decoding.
 * @returns The decoded message payload for the event definition provided.
 * @throws {Error} - If the message is invalid or missing required data.
 */
export function decodeKafkaMessage<TEvent extends z.ZodType>(
  message: KafkaMessage,
  event: TEvent
) {
  const parsed = Message(event).safeParse(message);
  if (!parsed.success) {
    throw new Error("Invalid message: " + JSON.stringify(parsed.error));
  }
  // Even if the preprocess returns null, safeParse will fail because the event schema does not accept null values,
  // so using the non-null assertion here is safe.
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-unnecessary-type-assertion
  return parsed.data.value!;
}
