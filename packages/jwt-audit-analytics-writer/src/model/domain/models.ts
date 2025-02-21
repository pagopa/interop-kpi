import { SQS } from "pagopa-interop-kpi-commons";
import { S3BodySchema } from "pagopa-interop-kpi-models";
import { decodeSQSEventMessageError } from "./errors.js";

export function decodeSQSEventMessage(message: SQS.Message): string {
  try {
    if (!message.Body) {
      throw new Error("Message body is undefined");
    }

    const s3Body: S3BodySchema = JSON.parse(message.Body);
    if (!s3Body.Records?.length) {
      throw new Error("S3Body doesn't contain records");
    }

    const key = s3Body.Records[0].s3.object.key;
    if (!key) {
      throw new Error(`S3 key must not be empty`);
    }

    return key;
  } catch (error: unknown) {
    throw decodeSQSEventMessageError(message.MessageId, error);
  }
}
