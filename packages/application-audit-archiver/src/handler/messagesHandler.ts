/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { KafkaMessage } from "kafkajs";
import {
  FileManager,
  Logger,
  formatTimehhmmss,
} from "pagopa-interop-kpi-commons";
import { generateId, genericInternalError } from "pagopa-interop-kpi-models";
import { config } from "../config/config.js";
import { compressJson } from "../utilities/compression.js";
import { groupMessagesByDate } from "../utilities/groupMessagesByDate.js";

export async function handleMessages(
  messages: KafkaMessage[],
  fileManager: FileManager,
  logger: Logger
) {
  try {
    const groupedMessages = groupMessagesByDate(messages);

    for (const [dateKey, groupMessages] of groupedMessages.entries()) {
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
