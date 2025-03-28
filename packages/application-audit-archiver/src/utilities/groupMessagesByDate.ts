/* eslint-disable functional/immutable-data */
import { KafkaMessage } from "kafkajs";
import { decodeKafkaMessage } from "pagopa-interop-kpi-commons";
import { ApplicationAuditEvent } from "pagopa-interop-kpi-models";

/**
 * Groups Kafka messages by UTC date (YYYY-MM-DD)
 *
 * @param messages - Array of KafkaMessage objects to group
 * @returns A Map where each key is a date string (YYYY-MM-DD) and the value is an array of ApplicationAuditEvent
 */
export function groupMessagesByDate(
  messages: KafkaMessage[]
): Map<string, ApplicationAuditEvent[]> {
  const grouped = new Map<string, ApplicationAuditEvent[]>();

  for (const message of messages) {
    const event = decodeKafkaMessage(message, ApplicationAuditEvent);
    const date = new Date(event.timestamp);
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const day = String(date.getUTCDate()).padStart(2, "0");
    const key = `${year}-${month}-${day}`;

    const existing = grouped.get(key) ?? [];
    grouped.set(key, [...existing, event]);
  }

  return grouped;
}
