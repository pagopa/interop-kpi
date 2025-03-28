/* eslint-disable functional/immutable-data */
import { KafkaMessage } from "kafkajs";
import { decodeKafkaMessage } from "pagopa-interop-kpi-commons";
import { ApplicationAuditEvent } from "pagopa-interop-kpi-models";

/**
 * Groups Kafka messages by UTC date (YYYY-MM-DD) extracted from the decoded message
 *
 * Each message is decoded using `decodeKafkaMessage`, and its timestamp is used
 * to build a grouping key in the format `YYYY-MM-DD`.
 *
 * @param messages - An array of KafkaMessage objects to group
 * @returns A record where each key is a date string (YYYY-MM-DD) and the value is an array of ApplicationAuditEvent
 */
export function groupMessagesByDate(
  messages: KafkaMessage[]
): Record<string, ApplicationAuditEvent[]> {
  return messages.reduce<Record<string, ApplicationAuditEvent[]>>(
    (acc, message) => {
      const item = decodeKafkaMessage(message, ApplicationAuditEvent);
      const date = new Date(item.timestamp);
      const year = date.getUTCFullYear();
      const month = String(date.getUTCMonth() + 1).padStart(2, "0");
      const day = String(date.getUTCDate()).padStart(2, "0");

      const key = `${year}-${month}-${day}`;
      acc[key] = [...(acc[key] ?? []), item];
      return acc;
    },
    {}
  );
}
