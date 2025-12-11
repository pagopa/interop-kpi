/* eslint-disable no-constant-condition */
/* eslint-disable sonarjs/cognitive-complexity */
/* eslint-disable @typescript-eslint/no-non-null-assertion */
/* eslint-disable functional/immutable-data */
import {
  SQSClient,
  ReceiveMessageCommand,
  DeleteMessageCommand,
  Message,
  SQSClientConfig,
  DeleteMessageBatchCommand,
} from "@aws-sdk/client-sqs";
import { InternalError } from "pagopa-interop-kpi-models";
import { match } from "ts-pattern";
import { genericLogger, Logger } from "../logging/index.js";
import { SQSConsumerConfig } from "../config/consumerConfig.js";
import { validateSqsMessage } from "./messageValidation.js";

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
  } & SQSConsumerConfig,
  consumerHandler: (messagePayload: Message) => Promise<void>,
  loggerInstance: Logger
): Promise<void> => {
  const command = new ReceiveMessageCommand({
    QueueUrl: config.queueUrl,
    MaxNumberOfMessages: config.maxNumberOfMessages,
    MessageAttributeNames: ["All"],
    WaitTimeSeconds: config.waitTimeSeconds,
    VisibilityTimeout: config.visibilityTimeout,
  });

  do {
    const receiveMessageStartTime = Date.now();
    const { Messages } = await sqsClient.send(command);

    if (Messages?.length) {
      loggerInstance.debug(`Receive Messages`, receiveMessageStartTime);

      for (const message of Messages) {
        const processMessageStartTime = Date.now();
        loggerInstance.debug(`[START] Consuming Message ${message.MessageId}`);

        if (!message.ReceiptHandle) {
          throw new Error(
            `ReceiptHandle not found in Message: ${JSON.stringify(message)}`
          );
        }

        try {
          const result = validateSqsMessage(message);
          if (!message.ReceiptHandle) {
            throw new Error(
              `ReceiptHandle not found in Message: ${JSON.stringify(message)}`
            );
          }
          const receiptHandle = message.ReceiptHandle;

          await match(result)
            .with("InvalidEvent", async () => {
              await deleteMessage(sqsClient, config.queueUrl, receiptHandle);
              loggerInstance.debug(
                `[END] Delete Invalid Message ${message.MessageId}`,
                processMessageStartTime
              );
            })
            .with("ValidEvent", async () => {
              await consumerHandler(message);
              loggerInstance.debug(
                `[END] Process Message ${message.MessageId}`,
                processMessageStartTime
              );

              const deleteMessageStartTime = Date.now();
              await deleteMessage(sqsClient, config.queueUrl, receiptHandle);
              loggerInstance.debug(
                `[END] Delete Message ${message.MessageId}`,
                deleteMessageStartTime
              );
            })
            .exhaustive();
        } catch (e) {
          loggerInstance.error(
            `Unexpected error consuming message: ${JSON.stringify(
              message
            )}. QueueUrl: ${config.queueUrl}. ${e}`
          );
          if (!(e instanceof InternalError)) {
            throw e;
          }
        } finally {
          loggerInstance.debug(
            `[END] Consuming Message ${message.MessageId}`,
            processMessageStartTime
          );
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
  } & SQSConsumerConfig,
  consumerHandler: (messagePayload: Message) => Promise<void>,
  loggerInstance: Logger
): Promise<void> => {
  loggerInstance.info(`Consumer processing on Queue: ${config.queueUrl}`);

  try {
    await processQueue(sqsClient, config, consumerHandler, loggerInstance);
  } catch (e) {
    loggerInstance.error(
      `Generic error occurs processing Queue: ${
        config.queueUrl
      }. Details: ${serializeError(e)}`
    );
    await processExit();
  }

  loggerInstance.info(
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

export const runBatchConsumer = async (
  sqsClient: SQSClient,
  config: { serviceName: string; queueUrl: string } & SQSConsumerConfig,
  consumerBatchHandler: (messages: Message[]) => Promise<void>,
  loggerInstance: Logger
): Promise<void> => {
  loggerInstance.info(`Batch consumer processing on Queue: ${config.queueUrl}`);

  try {
    await processBatchQueue(
      sqsClient,
      config,
      consumerBatchHandler,
      loggerInstance
    );
  } catch (e) {
    loggerInstance.error(
      `Generic error occurs processing Batch Queue: ${
        config.queueUrl
      }. Details: ${serializeError(e)}`
    );
    await processExit();
  }

  loggerInstance.info(
    `Queue processing Completed for Queue: ${config.queueUrl}`
  );
};

const processBatchQueue = async (
  sqsClient: SQSClient,
  config: { queueUrl: string } & SQSConsumerConfig,
  consumerBatchHandler: (messages: Message[]) => Promise<void>,
  loggerInstance: Logger
): Promise<void> => {
  const command = new ReceiveMessageCommand({
    QueueUrl: config.queueUrl,
    MaxNumberOfMessages: config.maxNumberOfMessages,
    MessageAttributeNames: ["All"],
    WaitTimeSeconds: config.waitTimeSeconds,
    VisibilityTimeout: config.visibilityTimeout,
  });

  do {
    const receiveMessagesStartTime = Date.now();
    const receiveMessagesPromises = Array.from(
      { length: config.receiveMsgsCalls },
      () => sqsClient.send(command)
    );
    const receiveMessagesresults = await Promise.all(receiveMessagesPromises);

    const Messages = receiveMessagesresults.flatMap((r) => r.Messages ?? []);
    if (Messages?.length) {
      const processMessageStartTime = Date.now();
      loggerInstance.debug(
        `Receive Batch Messages with receiveMsgsCalls ${config.receiveMsgsCalls}`,
        receiveMessagesStartTime
      );

      const validMessages: Message[] = [];
      const invalidMessages: Message[] = [];
      for (const message of Messages) {
        const result = validateSqsMessage(message);
        await match(result)
          .with("InvalidEvent", async () => {
            invalidMessages.push(message);
          })
          .with("ValidEvent", async () => {
            validMessages.push(message);
          })
          .exhaustive();
      }

      if (invalidMessages.length) {
        await deleteBatchMessages(sqsClient, config.queueUrl, invalidMessages);
        loggerInstance.debug(
          `[END] Delete Batch Invalid Messages`,
          processMessageStartTime
        );
      }

      if (validMessages.length) {
        try {
          await consumerBatchHandler(validMessages);
          loggerInstance.debug(
            `[END] Process Batch Messages`,
            processMessageStartTime
          );
          const deleteMessageStartTime = Date.now();
          await deleteBatchMessages(sqsClient, config.queueUrl, validMessages);
          loggerInstance.debug(
            `[END] Delete Batch Messages`,
            deleteMessageStartTime
          );
        } catch (batchError) {
          loggerInstance.error(
            `Error processing Batch Messages: ${serializeError(batchError)}`
          );
        } finally {
          loggerInstance.debug(
            `[END] Consuming Batch Messages ${JSON.stringify(
              Messages.map(({ MessageId }) => MessageId)
            )}`,
            processMessageStartTime
          );
        }
      }
    }
  } while (true);
};

export const deleteBatchMessages = async (
  sqsClient: SQSClient,
  queueUrl: string,
  messages: Message[]
): Promise<void> => {
  const entries = messages
    .filter((msg) => msg.ReceiptHandle && msg.MessageId)
    .map((msg) => ({
      Id: msg.MessageId!,
      ReceiptHandle: msg.ReceiptHandle!,
    }));

  if (entries.length === 0) return;

  let index = 0;

  do {
    const deleteBatch = entries.slice(index, index + 10);

    await sqsClient.send(
      new DeleteMessageBatchCommand({
        QueueUrl: queueUrl,
        Entries: deleteBatch,
      })
    );

    index += 10;
  } while (index < entries.length);
};

export { SQSClient };
export type { SQSClientConfig, Message };
