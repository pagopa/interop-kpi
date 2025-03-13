/* eslint-disable @typescript-eslint/explicit-function-return-type */
import { KafkaMessage } from "kafkajs";
import {
  FileManager,
  Logger,
  decodeKafkaMessage,
  formatDateyyyyMMdd,
  formatTimehhmmss,
} from "pagopa-interop-kpi-commons";
import { ApplicationAuditEvent, generateId } from "pagopa-interop-kpi-models";
import { config } from "../config/config.js";
import { compressJson } from "../utilities/compression.js";

export async function handleMessages(
  messages: KafkaMessage[],
  fileManager: FileManager,
  logger: Logger
) {
  try {
    const batch = messages.map((message) =>
      decodeKafkaMessage(message, ApplicationAuditEvent)
    );

    const jsonString = JSON.stringify(batch);
    const compressedBuffer = await compressJson(jsonString);

    const date = new Date();
    const ymdDate = formatDateyyyyMMdd(date);
    const hmsTime = formatTimehhmmss(date);

    const fileName = `${ymdDate}_${hmsTime}_${generateId()}.json.gz`;
    const filePath = `application-audit/${ymdDate}`;

    const s3File = {
      bucket: config.s3BucketName,
      path: filePath,
      name: fileName,
      content: compressedBuffer,
    };

    await fileManager.storeBytes(s3File, logger);
  } catch (error) {
    const message = error instanceof Error ? error.message : "generic error";
    throw Error(`Write operation failed - ${message}`);
  }
}
