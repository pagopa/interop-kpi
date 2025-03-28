/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable functional/immutable-data */
import { KafkaMessage } from "kafkajs";
import {
  FileManager,
  Logger,
  decodeKafkaMessage,
  formatTimehhmmss,
} from "pagopa-interop-kpi-commons";
import {
  ApplicationAuditEvent,
  generateId,
  genericInternalError,
} from "pagopa-interop-kpi-models";
import { config } from "../config/config.js";
import { compressJson } from "../utilities/compression.js";

export async function handleMessages(
  messages: KafkaMessage[],
  fileManager: FileManager,
  logger: Logger
) {
  try {
    const grouped: Record<string, ApplicationAuditEvent[]> = {};

    for (const message of messages) {
      const item = decodeKafkaMessage(message, ApplicationAuditEvent);
      const date = new Date(item.timestamp);
      const year = date.getUTCFullYear();
      const month = String(date.getUTCMonth() + 1).padStart(2, "0");
      const day = String(date.getUTCDate()).padStart(2, "0");

      const key = `${year}-${month}-${day}`;
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(item);
    }

    for (const [dateKey, groupMessages] of Object.entries(grouped)) {
      const [year, month, day] = dateKey.split("-");
      const jsonString = JSON.stringify(groupMessages);
      const compressedBuffer = await compressJson(jsonString);

      const time = formatTimehhmmss(new Date());
      const fileName = `${year}${month}${day}_${time}_${generateId()}.json.gz`;
      const filePath = `year=${year}/month=${month}/day=${day}`;

      const s3File = {
        bucket: config.s3BucketName,
        path: filePath,
        name: fileName,
        content: compressedBuffer,
      };

      await fileManager.storeBytes(s3File, logger);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "generic error";
    throw genericInternalError(`Write operation failed - ${message}`);
  }
}
