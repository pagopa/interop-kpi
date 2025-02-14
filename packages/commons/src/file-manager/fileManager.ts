/* eslint-disable max-params */
import { GetObjectCommand, S3Client, S3ClientConfig } from "@aws-sdk/client-s3";
import { FileManagerConfig } from "../config/fileManagerConfig.js";
import { Logger, LoggerConfig } from "../index.js";
import { fileManagerGetError } from "./fileManagerErrors.js";

export type FileManager = {
  get: (bucket: string, path: string, logger: Logger) => Promise<Uint8Array>;
};

export function initFileManager(
  config: FileManagerConfig & LoggerConfig
): FileManager {
  const s3ClientConfig: S3ClientConfig = {
    endpoint: config.s3CustomServer
      ? `${config.s3ServerHost}:${config.s3ServerPort}`
      : undefined,
    forcePathStyle: config.s3CustomServer,
    logger: config.logLevel === "debug" ? console : undefined,
  };
  const client = new S3Client(s3ClientConfig);

  return {
    get: async (
      bucket: string,
      path: string,
      logger: Logger
    ): Promise<Uint8Array> => {
      logger.info(`Getting file ${path} in bucket ${bucket}`);
      try {
        const response = await client.send(
          new GetObjectCommand({
            Bucket: bucket,
            Key: path,
          })
        );
        const body = response.Body;
        if (!body) {
          throw fileManagerGetError(bucket, path, "File is empty");
        }
        return await body.transformToByteArray();
      } catch (error) {
        throw fileManagerGetError(bucket, path, error);
      }
    },
  };
}
