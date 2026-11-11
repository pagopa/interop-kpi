import {
  CreateBucketCommand,
  S3Client,
  S3ServiceException,
} from "@aws-sdk/client-s3";
import {
  DbConfig,
  FileManagerConfig,
  S3Config,
} from "pagopa-interop-kpi-commons";
import { GenericContainer } from "testcontainers";

export const TEST_POSTGRES_DB_PORT = 5432;
export const TEST_POSTGRES_DB_IMAGE = "postgres:15";

export const TEST_RUSTFS_PORT = 9000;
export const TEST_RUSTFS_IMAGE = "rustfs/rustfs:1.0.0";
const TEST_RUSTFS_REGION = "eu-south-1";
const TEST_RUSTFS_BUCKET_CREATION_RETRIES = 15;
const TEST_RUSTFS_BUCKET_CREATION_RETRY_DELAY_MS = 1000;

/**
 * Starts a PostgreSQL container for testing purposes.
 *
 * @param config - The configuration for the PostgreSQL container.
 * @returns A promise that resolves to the started test container.
 */
export const postgreSQLContainer = (config: DbConfig): GenericContainer =>
  new GenericContainer(TEST_POSTGRES_DB_IMAGE)
    .withEnvironment({
      POSTGRES_DB: config.dbName,
      POSTGRES_USER: config.dbUsername,
      POSTGRES_PASSWORD: config.dbPassword,
    })
    .withCopyFilesToContainer([
      {
        source: "../../docker/postgres/init-db.sql",
        target: "/docker-entrypoint-initdb.d/01-init.sql",
      },
    ])
    .withExposedPorts(TEST_POSTGRES_DB_PORT);

/**
 * Starts a RustFS container for testing purposes.
 *
 * @returns A promise that resolves to the started test container.
 */
export const rustfsContainer = (): GenericContainer =>
  new GenericContainer(TEST_RUSTFS_IMAGE)
    .withEnvironment({
      RUSTFS_ACCESS_KEY: "testawskey",
      RUSTFS_SECRET_KEY: "testawssecret",
      RUSTFS_REGION: TEST_RUSTFS_REGION,
      RUSTFS_VOLUMES: "/data",
    })
    .withExposedPorts(TEST_RUSTFS_PORT);

const isBucketAlreadyExistsError = (error: unknown): boolean =>
  error instanceof S3ServiceException &&
  (error.name === "BucketAlreadyOwnedByYou" ||
    error.name === "BucketAlreadyExists");

const createBucketWithRetry = async (
  client: S3Client,
  bucket: string,
  retriesLeft: number
): Promise<void> => {
  try {
    await client.send(new CreateBucketCommand({ Bucket: bucket }));
  } catch (error) {
    if (isBucketAlreadyExistsError(error)) {
      return;
    }
    if (retriesLeft <= 0) {
      throw error;
    }
    await new Promise((resolve) =>
      setTimeout(resolve, TEST_RUSTFS_BUCKET_CREATION_RETRY_DELAY_MS)
    );
    await createBucketWithRetry(client, bucket, retriesLeft - 1);
  }
};

export const createS3Buckets = async (
  config: FileManagerConfig & S3Config,
  bucketNames: string[]
): Promise<void> => {
  if (!config.s3CustomServer) {
    return;
  }

  const client = new S3Client({
    endpoint: `${config.s3ServerHost}:${config.s3ServerPort}`,
    forcePathStyle: true,
    region: TEST_RUSTFS_REGION,
  });

  for (const bucket of bucketNames) {
    await createBucketWithRetry(
      client,
      bucket,
      TEST_RUSTFS_BUCKET_CREATION_RETRIES
    );
  }
};
