/* eslint-disable no-constant-condition */
/* eslint-disable sonarjs/cognitive-complexity */
import {
  SQSClient,
  ReceiveMessageCommand,
  DeleteMessageCommand,
  Message,
  SQSClientConfig,
} from "@aws-sdk/client-sqs";
import { InternalError } from "pagopa-interop-kpi-models";
import { genericLogger } from "../logging/index.js";
import { ConsumerConfig } from "../config/consumerConfig.js";

const serializeError = (error: unknown): string => {
  try {
    return JSON.stringify(error, Object.getOwnPropertyNames(error));
  } catch (e) {
    return `${error}`;
  }
};

const processExit = async (exitStatusCode: number = 1): Promise<void> => {
  genericLogger.error(`Process exit with code ${exitStatusCode}`);
  await new Promise((resolve) => setTimeout(resolve, 1000));
  process.exit(exitStatusCode);
};

export const instantiateClient = (config: SQSClientConfig): SQSClient =>
  new SQSClient(config);

const processQueue = async (
  sqsClient: SQSClient,
  config: {
    queueUrl: string;
  } & ConsumerConfig,
  consumerHandler: (messagePayload: Message) => Promise<void>
): Promise<void> => {
  const command = new ReceiveMessageCommand({
    QueueUrl: config.queueUrl,
    MaxNumberOfMessages: config.maxNumberOfMessages,
    MessageAttributeNames: ["All"],
  });

  do {
    const { Messages } = await sqsClient.send(command);
    if (Messages?.length) {
      for (const message of Messages) {
        if (!message.ReceiptHandle) {
          throw new Error(
            `ReceiptHandle not found in Message: ${JSON.stringify(message)}`
          );
        }

        try {
          await consumerHandler(message);
          await deleteMessage(
            sqsClient,
            config.queueUrl,
            message.ReceiptHandle
          );
        } catch (e) {
          genericLogger.error(
            `Unexpected error consuming message: ${JSON.stringify(
              message
            )}. QueueUrl: ${config.queueUrl}. ${e}`
          );
          if (!(e instanceof InternalError)) {
            throw e;
          }
        }
      }
    }
  } while (true);
};

export const runConsumer = async (
  sqsClient: SQSClient,
  config: {
    serviceName: string;
    queueUrl: string;
  } & ConsumerConfig,
  consumerHandler: (messagePayload: Message) => Promise<void>
): Promise<void> => {
  genericLogger.info(`Consumer processing on Queue: ${config.queueUrl}`);

  try {
    await processQueue(sqsClient, config, consumerHandler);
  } catch (e) {
    genericLogger.error(
      `Generic error occurs processing Queue: ${
        config.queueUrl
      }. Details: ${serializeError(e)}`
    );
    await processExit();
  }

  genericLogger.info(
    `Queue processing Completed for Queue: ${config.queueUrl}`
  );
};

export const deleteMessage = async (
  sqsClient: SQSClient,
  queueUrl: string,
  receiptHandle: string
): Promise<void> => {
  const deleteCommand = new DeleteMessageCommand({
    QueueUrl: queueUrl,
    ReceiptHandle: receiptHandle,
  });

  await sqsClient.send(deleteCommand);
};

export { SQSClient };
export type { SQSClientConfig, Message };
